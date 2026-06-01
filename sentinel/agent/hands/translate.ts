/**
 * The Translate Hand — Hand #10
 * -----------------------------
 * NEXT speaks every African language at the output layer. The brain
 * reasons in English internally (the LLM is strongest there) and the
 * Translate Hand localises just before the message leaves the system —
 * whether by WhatsApp, voice, or dashboard.
 *
 * This hand also goes the other way: incoming local-language text gets
 * translated to English before the brain sees it.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

/** ISO 639 / 639-3 language codes we care about first. Add as you go. */
export type SupportedLanguage =
  | "en" // English
  | "sw" // Swahili
  | "lg" // Luganda
  | "yo" // Yoruba
  | "ha" // Hausa
  | "am" // Amharic
  | "fr" // French
  | "ar"; // Arabic

export interface TranslateArgs {
  text: string;
  /** Source language. 'auto' triggers detection. */
  from: SupportedLanguage | "auto";
  /** Target language. */
  to: SupportedLanguage;
  /** Preserve numbers, currency, dates verbatim (default true). */
  preserveTokens?: boolean;
}

export interface TranslateResult {
  text: string;
  detectedFrom?: SupportedLanguage;
  to: SupportedLanguage;
  confidence?: number;
}

export interface TranslateAdapters {
  translate: (
    text: string,
    from: SupportedLanguage | "auto",
    to: SupportedLanguage,
    preserveTokens: boolean
  ) => Promise<TranslateResult>;
}

export function createTranslateHand(adapters: TranslateAdapters): Hand<TranslateArgs, TranslateResult> {
  return {
    name: "translate",
    description:
      "Translate text between English and African languages (Swahili, Luganda, Yoruba, Hausa, Amharic, French, Arabic). " +
      "Use to localise outbound messages or to normalise inbound user input.",
    permissionTier: "autonomous",
    inputSchema: {
      text: "Source text.",
      from: "Source language code or 'auto'.",
      to: "Target language code.",
      preserveTokens: "Optional. Keep numbers/currency/dates verbatim. Default true.",
    },

    async execute(args: TranslateArgs, ctx: HandContext): Promise<HandResult<TranslateResult>> {
      try {
        const result = await adapters.translate(
          args.text,
          args.from,
          args.to,
          args.preserveTokens ?? true
        );
        await ctx.audit({
          hand: "translate",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: `Translated ${args.from} → ${args.to} (${args.text.length} chars)`,
        });
        return { ok: true, data: result };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "translate", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
