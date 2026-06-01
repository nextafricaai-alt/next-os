/**
 * The WhatsApp Hand — Hand #6
 * ---------------------------
 * Bidirectional WhatsApp interface. WhatsApp is not a notification channel
 * for NEXT — it IS the interface for most users. A headteacher should be
 * able to approve a budget by replying "YES" to a Sentinel WhatsApp.
 *
 * This hand wraps the existing sentinel/whatsapp-bridge so the agent can:
 *   - send a message
 *   - send an advisory (with action buttons / numbered replies)
 *   - parse an inbound reply and route it to the right hand
 *
 * The bridge handles Twilio specifics. This hand stays vendor-agnostic.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";
import type { Advisory } from "../../shared/src/health-signal.js";

export type WhatsappArgs =
  | { op: "send"; to: string; body: string }
  | { op: "send-advisory"; to: string; advisory: Advisory }
  | { op: "parse-reply"; from: string; body: string; messageId?: string };

export interface ParsedReply {
  intent: "approve" | "deny" | "ask" | "command" | "freeform";
  actionId?: string;
  message: string;
}

export interface WhatsappResult {
  op: WhatsappArgs["op"];
  delivered?: boolean;
  parsed?: ParsedReply;
}

export interface WhatsappAdapters {
  send: (to: string, body: string) => Promise<{ delivered: boolean }>;
  sendAdvisory: (to: string, advisory: Advisory) => Promise<{ delivered: boolean }>;
}

/** Lightweight intent parser. Good enough for now; swap for LLM later. */
function parseInboundReply(body: string): ParsedReply {
  const trimmed = body.trim();
  const lower = trimmed.toLowerCase();

  // Approval keywords across English + a few African languages.
  const approvals = ["yes", "y", "ok", "okay", "approve", "approved", "go", "go ahead", "do it", "ndio", "eeh"];
  const denials = ["no", "n", "deny", "cancel", "stop", "hapana", "nedda"];

  if (approvals.includes(lower)) return { intent: "approve", message: trimmed };
  if (denials.includes(lower)) return { intent: "deny", message: trimmed };

  // Numbered replies → action selection. Brain knows which actionId is at which index.
  if (/^[1-9]\d?$/.test(trimmed)) {
    return { intent: "command", actionId: `option-${trimmed}`, message: trimmed };
  }
  if (lower.endsWith("?") || lower.startsWith("how") || lower.startsWith("what") || lower.startsWith("when")) {
    return { intent: "ask", message: trimmed };
  }
  return { intent: "freeform", message: trimmed };
}

export function createWhatsappHand(adapters: WhatsappAdapters): Hand<WhatsappArgs, WhatsappResult> {
  return {
    name: "whatsapp",
    description:
      "Send a WhatsApp message, send a formatted advisory, or parse an inbound reply " +
      "to detect approval/denial/question/command intent.",
    permissionTier: "autonomous",
    inputSchema: {
      op: "One of 'send', 'send-advisory', or 'parse-reply'.",
      to: "(for send/send-advisory) Recipient phone in E.164 format.",
      body: "(for send) Plain text message body.",
      advisory: "(for send-advisory) An Advisory object.",
      from: "(for parse-reply) Sender phone in E.164.",
      messageId: "(for parse-reply) Optional Twilio message id for audit chain.",
    },

    async execute(args: WhatsappArgs, ctx: HandContext): Promise<HandResult<WhatsappResult>> {
      try {
        if (args.op === "send") {
          const r = await adapters.send(args.to, args.body);
          await ctx.audit({
            hand: "whatsapp",
            args,
            result: r.delivered ? "ok" : "error",
            by: ctx.user.userId,
            notes: `Sent to ${args.to}: ${args.body.slice(0, 80)}`,
          });
          return { ok: r.delivered, data: { op: "send", delivered: r.delivered } };
        }

        if (args.op === "send-advisory") {
          const r = await adapters.sendAdvisory(args.to, args.advisory);
          await ctx.audit({
            hand: "whatsapp",
            args,
            result: r.delivered ? "ok" : "error",
            by: ctx.user.userId,
            notes: `Advisory ${args.advisory.id} sent to ${args.to}`,
          });
          return { ok: r.delivered, data: { op: "send-advisory", delivered: r.delivered } };
        }

        // parse-reply
        const parsed = parseInboundReply(args.body);
        await ctx.audit({
          hand: "whatsapp",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: `Parsed reply from ${args.from} → intent=${parsed.intent}`,
        });
        return { ok: true, data: { op: "parse-reply", parsed } };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "whatsapp", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
