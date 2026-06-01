/**
 * Brain Runtime — the Claude-powered implementation of BrainReasoner.
 * -------------------------------------------------------------------
 * The contract (brain.ts) says: input → output.
 * This file says: how to actually get there using Claude.
 *
 * Vendor-isolated. If we ever swap Anthropic for someone else, only this
 * file changes. The hands, the agent loop, the system prompt — untouched.
 *
 * Uses fetch directly rather than the @anthropic-ai/sdk package so we keep
 * dependencies near-zero and the runtime portable (works in Node, Deno,
 * Cloudflare Workers, etc.).
 */

import type {
  BrainInput,
  BrainOutput,
  BrainReasoner,
  HandDescriptor,
} from "./brain.js";
import { buildSystemPrompt } from "./system-prompt.js";

export interface BrainRuntimeConfig {
  /** Anthropic API key. */
  apiKey: string;
  /** Model id. Default: 'claude-sonnet-4-6'. */
  model?: string;
  /** Display name of the agent. Default: 'Nia'. */
  agentName?: string;
  /** Max output tokens per call. Default: 1024. */
  maxTokens?: number;
  /** API base URL (mockable). Default: official Anthropic endpoint. */
  apiBaseUrl?: string;
  /** Optional extra system-prompt instructions. */
  extraPromptInstructions?: string;
}

interface ClaudeContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

interface ClaudeResponse {
  content: ClaudeContentBlock[];
  stop_reason: string;
  usage?: { input_tokens: number; output_tokens: number };
}

/* -------------------------------------------------------------------------
 * Converters: HandDescriptor → Claude tool definition, and conversation
 * messages → Claude messages format.
 * ----------------------------------------------------------------------- */

function handsToTools(hands: HandDescriptor[]) {
  return hands.map((h) => ({
    name: h.name,
    description: `[${h.permissionTier}] ${h.description}`,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(h.inputSchema).map(([k, v]) => [
          k,
          { type: "string", description: v },
        ])
      ),
    },
  }));
}

function formatMessages(input: BrainInput) {
  // Claude expects alternating user/assistant messages. We collapse hand
  // outputs into user messages prefixed with [Hand: name].
  return input.conversation.map((m) => {
    if (m.role === "agent") {
      return { role: "assistant" as const, content: m.content };
    }
    if (m.role === "hand") {
      return {
        role: "user" as const,
        content: `[Result from hand '${m.handName}']: ${m.content}`,
      };
    }
    // user, system
    return { role: "user" as const, content: m.content };
  });
}

/* -------------------------------------------------------------------------
 * The factory. Pass config, get a BrainReasoner.
 * ----------------------------------------------------------------------- */

export function createAnthropicBrain(config: BrainRuntimeConfig): BrainReasoner {
  const apiKey = config.apiKey;
  const model = config.model ?? "claude-sonnet-4-6";
  const agentName = config.agentName ?? "Nia";
  const maxTokens = config.maxTokens ?? 1024;
  const apiBaseUrl = config.apiBaseUrl ?? "https://api.anthropic.com/v1/messages";

  return async (input: BrainInput): Promise<BrainOutput> => {
    const tools = handsToTools(input.availableHands);
    const systemPrompt = buildSystemPrompt({
      agentName,
      tenant: input.tenant,
      user: input.user,
      extra: config.extraPromptInstructions,
    });
    const messages = formatMessages(input);

    const response = await fetch(apiBaseUrl, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools,
        messages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Claude API ${response.status}: ${errBody}`);
    }

    const data = (await response.json()) as ClaudeResponse;

    // Walk Claude's response: text blocks become reasoning, tool_use becomes
    // a decision. If only text, treat as plain "respond".
    let reasoning = "";
    let decision: BrainOutput["decision"] = {
      kind: "respond",
      message: "",
    };

    for (const block of data.content ?? []) {
      if (block.type === "text" && block.text) {
        reasoning += (reasoning ? "\n" : "") + block.text;
      } else if (block.type === "tool_use" && block.name) {
        const handDesc = input.availableHands.find((h) => h.name === block.name);
        if (!handDesc) {
          // Claude tried to call a hand we didn't expose. Fall back to text.
          continue;
        }

        const tier = handDesc.permissionTier;
        const userRole = input.user.role;

        if (tier === "admin-only" && userRole !== "admin" && userRole !== "owner") {
          decision = {
            kind: "respond",
            message:
              `I can't run '${block.name}' — that action requires an admin or owner role.`,
          };
          break;
        }

        if (tier === "needs-approval") {
          decision = {
            kind: "wait-for-approval",
            hand: block.name,
            args: block.input ?? {},
            preview: reasoning || `Run ${block.name} with the proposed inputs.`,
          };
          break;
        }

        // autonomous (or admin-only with proper role)
        decision = {
          kind: "call-hand",
          hand: block.name,
          args: block.input ?? {},
          rationale: reasoning || `Calling ${block.name}.`,
        };
        break;
      }
    }

    // If no tool_use happened, decision is a plain text response.
    if (decision.kind === "respond" && !decision.message) {
      decision = { kind: "respond", message: reasoning || "Okay." };
    }

    return { reasoning: reasoning || "(no reasoning text)", decision };
  };
}
