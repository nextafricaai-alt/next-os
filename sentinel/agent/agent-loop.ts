/**
 * Agent Loop — the orchestrator.
 * ------------------------------
 * One user message in → one final response out. Internally may run multiple
 * brain-call-hand-brain cycles until Nia decides to respond, hits a
 * permission gate, or exhausts the step budget.
 *
 * This is the heartbeat that ties everything together.
 */

import type {
  AgentMessage,
  BrainReasoner,
  TenantContext,
  UserContext,
} from "./brain.js";
import type { HandContext } from "./hand.js";
import type { HandRegistry } from "./hands/index.js";
import { describeAll } from "./hands/index.js";
import type { AuditLogger } from "./audit.ts";

export interface AgentLoopConfig {
  brain: BrainReasoner;
  hands: HandRegistry;
  auditLogger: AuditLogger;
  /** Max hand calls per user turn (prevents runaway loops). Default 5. */
  maxStepsPerTurn?: number;
}

export interface TurnInput {
  userMessage: string;
  conversation: AgentMessage[];
  tenant: TenantContext | null;
  user: UserContext;
}

export interface TurnOutput {
  /** Full conversation including this turn's additions. */
  conversation: AgentMessage[];
  /** The final visible message to send back to the user. */
  finalMessage: string;
  /** If Nia proposed an action that needs human approval, it's here. */
  pendingApproval?: { hand: string; args: unknown; preview: string };
  /** How many brain-call cycles this turn consumed. */
  steps: number;
}

export function createAgentLoop(config: AgentLoopConfig) {
  const maxSteps = config.maxStepsPerTurn ?? 5;

  return async function runTurn(turn: TurnInput): Promise<TurnOutput> {
    const conversation: AgentMessage[] = [
      ...turn.conversation,
      {
        role: "user",
        content: turn.userMessage,
        timestamp: new Date().toISOString(),
      },
    ];

    let pendingApproval: TurnOutput["pendingApproval"];
    let finalMessage = "";
    let steps = 0;

    while (steps < maxSteps) {
      steps++;

      const output = await config.brain({
        conversation,
        tenant: turn.tenant,
        user: turn.user,
        availableHands: describeAll(config.hands),
      });

      // 1. Plain response — done.
      if (output.decision.kind === "respond") {
        finalMessage = output.decision.message;
        conversation.push({
          role: "agent",
          content: finalMessage,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      // 2. Wait for approval — surface the proposal to the caller.
      if (output.decision.kind === "wait-for-approval") {
        pendingApproval = {
          hand: output.decision.hand,
          args: output.decision.args,
          preview: output.decision.preview,
        };
        finalMessage = `${output.decision.preview}\n\nReply YES to approve, or NO to cancel.`;
        conversation.push({
          role: "agent",
          content: finalMessage,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      // 3. Call hand — dispatch, feed result back into the loop.
      const handName = output.decision.hand;
      const hand = config.hands[handName];
      if (!hand) {
        finalMessage = `I tried to use a tool called '${handName}' but it isn't registered.`;
        conversation.push({
          role: "agent",
          content: finalMessage,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      const ctx: HandContext = {
        tenant: turn.tenant,
        user: turn.user,
        audit: async (e) =>
          config.auditLogger.log({ ...e, timestamp: new Date().toISOString() }),
      };
      const result = await hand.execute(output.decision.args, ctx);

      conversation.push({
        role: "hand",
        handName,
        content: result.ok ? result.message ?? "Done." : `Error: ${result.error}`,
        timestamp: new Date().toISOString(),
      });
      // Loop again — brain will see the hand result and decide next move.
    }

    if (!finalMessage) {
      finalMessage = `I've reached my step limit (${maxSteps}) for this turn. Let me know how you'd like to continue.`;
      conversation.push({
        role: "agent",
        content: finalMessage,
        timestamp: new Date().toISOString(),
      });
    }

    return { conversation, finalMessage, pendingApproval, steps };
  };
}
