/**
 * The Voice Hand — Hand #7
 * ------------------------
 * Voice is the universal interface in Africa. Many users have a phone and
 * a voice but limited literacy or no patience for typing on a tiny keyboard.
 *
 * The Voice Hand accepts an audio file (sent as a WhatsApp voice note, an
 * upload, or a phone call recording), transcribes it in the speaker's
 * preferred language, and structures it into an action the brain can route.
 *
 * This single hand opens up 10x your addressable market. Build the adapter
 * around Whisper (open) + a small classifier; swap to better models later.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

export interface VoiceArgs {
  /** URL or file path to the audio. */
  audioUrl: string;
  /** Hint about language ('lg' = Luganda, 'sw' = Swahili, 'yo' = Yoruba, 'en' = English, 'fr' = French). */
  languageHint?: string;
  /** Optional context: which conversation is this voice note part of? */
  conversationId?: string;
}

export interface VoiceResult {
  transcript: string;
  detectedLanguage: string;
  /** Best-guess structured intent the brain can act on. */
  intent: {
    kind: "approve" | "deny" | "ask" | "report-event" | "command" | "unknown";
    summary: string;
    /** Free-form structured payload — varies by intent. */
    payload?: Record<string, unknown>;
  };
}

export interface VoiceAdapters {
  transcribe: (audioUrl: string, languageHint?: string) => Promise<{ transcript: string; detectedLanguage: string }>;
  classifyIntent: (transcript: string) => Promise<VoiceResult["intent"]>;
}

export function createVoiceHand(adapters: VoiceAdapters): Hand<VoiceArgs, VoiceResult> {
  return {
    name: "voice",
    description:
      "Transcribe a voice note and classify it into an actionable intent. " +
      "Use whenever a user sends an audio message instead of text.",
    permissionTier: "autonomous",
    inputSchema: {
      audioUrl: "URL or path to the audio file.",
      languageHint: "Optional ISO code: lg, sw, yo, en, fr, ha, am, ...",
      conversationId: "Optional. Tie this transcript back to an ongoing conversation.",
    },

    async execute(args: VoiceArgs, ctx: HandContext): Promise<HandResult<VoiceResult>> {
      try {
        const { transcript, detectedLanguage } = await adapters.transcribe(args.audioUrl, args.languageHint);
        const intent = await adapters.classifyIntent(transcript);
        const result: VoiceResult = { transcript, detectedLanguage, intent };
        await ctx.audit({
          hand: "voice",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: `Transcribed (${detectedLanguage}) intent=${intent.kind}: ${transcript.slice(0, 80)}`,
        });
        return {
          ok: true,
          data: result,
          message: `Heard "${transcript.slice(0, 60)}${transcript.length > 60 ? "…" : ""}" — intent: ${intent.kind}.`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "voice", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
