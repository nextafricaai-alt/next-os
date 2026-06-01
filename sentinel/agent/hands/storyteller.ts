/**
 * The Storyteller Hand — Hand #11
 * -------------------------------
 * This is Hudson's bridge between NEXT and Charis Creations. The agent
 * isn't just a back-office machine — it's a storytelling engine that turns
 * raw data into reports, case studies, parent newsletters, donor updates,
 * weekly digests, and social-ready posts.
 *
 * The Storyteller Hand pulls structured data from the tenant, frames it
 * through a chosen narrative template, and returns ready-to-publish prose
 * (plus optional formatting hints for docx/pdf/slide rendering).
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

export type StoryFormat =
  | "weekly-digest"
  | "parent-newsletter"
  | "donor-update"
  | "board-memo"
  | "case-study"
  | "social-post"
  | "press-release";

export interface StorytellerArgs {
  format: StoryFormat;
  /** What to talk about. The Storyteller pulls supporting data via dataPaths. */
  topic: string;
  /** Where to fetch supporting facts (e.g. ['finance.thisMonth', 'enrollment.byClass']). */
  dataPaths?: string[];
  /** Optional length cap in words. */
  wordLimit?: number;
  /** Target audience hint. */
  audience?: "parents" | "donors" | "board" | "general-public" | "staff";
  /** Optional target language (Translate Hand can post-process). */
  language?: string;
}

export interface StorytellerResult {
  title: string;
  body: string;
  /** Suggested headline image prompt, CTA text, hashtags — caller picks what to use. */
  hints?: {
    coverImagePrompt?: string;
    cta?: string;
    hashtags?: string[];
  };
  /** Sources cited (data path → value snapshot). Useful for fact-checking. */
  citations?: Record<string, unknown>;
}

export interface StorytellerAdapters {
  fetchData: (tenantId: string, paths: string[]) => Promise<Record<string, unknown>>;
  compose: (
    format: StoryFormat,
    topic: string,
    data: Record<string, unknown>,
    options: { wordLimit?: number; audience?: string; language?: string }
  ) => Promise<StorytellerResult>;
}

export function createStorytellerHand(adapters: StorytellerAdapters): Hand<StorytellerArgs, StorytellerResult> {
  return {
    name: "storyteller",
    description:
      "Generate reports, newsletters, board memos, social posts, and case studies " +
      "from tenant data. The bridge between NEXT data and Charis-quality narrative.",
    permissionTier: "autonomous",
    inputSchema: {
      format: "weekly-digest | parent-newsletter | donor-update | board-memo | case-study | social-post | press-release",
      topic: "What to talk about (e.g. 'Q3 financial recovery', 'this term's top students').",
      dataPaths: "Optional. Which data slices to pull as supporting facts.",
      wordLimit: "Optional. Maximum words.",
      audience: "Optional. parents | donors | board | general-public | staff",
      language: "Optional. Target language code; if set, output is composed in that language.",
    },

    async execute(args: StorytellerArgs, ctx: HandContext): Promise<HandResult<StorytellerResult>> {
      if (!ctx.tenant) return { ok: false, error: "storyteller hand requires a tenant context" };
      try {
        const data = args.dataPaths?.length
          ? await adapters.fetchData(ctx.tenant.tenantId, args.dataPaths)
          : {};
        const composed = await adapters.compose(args.format, args.topic, data, {
          wordLimit: args.wordLimit,
          audience: args.audience,
          language: args.language,
        });
        await ctx.audit({
          hand: "storyteller",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: `Composed ${args.format}: "${composed.title}" (${composed.body.length} chars)`,
        });
        return {
          ok: true,
          data: composed,
          message: `Drafted ${args.format}: "${composed.title}".`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "storyteller", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
