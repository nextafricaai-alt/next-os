/**
 * The Teacher Hand — Hand #12
 * ---------------------------
 * The agent that builds the OS should also be the agent that teaches the
 * user how to use it. The Teacher Hand answers "how do I…" questions,
 * walks new users through guided tours, and explains why the agent did
 * what it did (transparency = trust in the African market).
 *
 * It's grounded in a knowledge base of feature articles + the live tenant
 * state (e.g. "your school has 3 classes set up — here's how to add a 4th").
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

export type TeacherArgs =
  | { op: "answer"; question: string }
  | { op: "start-tour"; tourId: string }
  | { op: "next-step"; tourId: string; cursor: number }
  | { op: "explain-decision"; decisionId: string };

export interface TourStep {
  index: number;
  title: string;
  body: string;
  /** Optional UI hint: which element to highlight on the dashboard. */
  uiHint?: { selector: string; placement: "top" | "bottom" | "left" | "right" };
}

export interface TeacherResult {
  op: TeacherArgs["op"];
  answer?: string;
  citations?: Array<{ source: string; snippet: string }>;
  tour?: { tourId: string; total: number; step: TourStep };
  explanation?: string;
}

export interface TeacherAdapters {
  answer: (
    question: string,
    tenantId: string | null
  ) => Promise<{ answer: string; citations: Array<{ source: string; snippet: string }> }>;
  loadTour: (tourId: string) => Promise<TourStep[]>;
  explainDecision: (decisionId: string) => Promise<string>;
}

export function createTeacherHand(adapters: TeacherAdapters): Hand<TeacherArgs, TeacherResult> {
  return {
    name: "teacher",
    description:
      "Answer 'how do I…' questions, walk users through guided tours, and explain " +
      "why the agent took a past decision. Builds trust through transparency.",
    permissionTier: "autonomous",
    inputSchema: {
      op: "One of 'answer', 'start-tour', 'next-step', or 'explain-decision'.",
      question: "(answer) Free-form question from the user.",
      tourId: "(start-tour/next-step) Tour identifier (e.g. 'onboard-headteacher').",
      cursor: "(next-step) Zero-based index of the step to return.",
      decisionId: "(explain-decision) Audit-log id of a past hand call to explain.",
    },

    async execute(args: TeacherArgs, ctx: HandContext): Promise<HandResult<TeacherResult>> {
      try {
        if (args.op === "answer") {
          const { answer, citations } = await adapters.answer(args.question, ctx.tenant?.tenantId ?? null);
          await ctx.audit({
            hand: "teacher",
            args,
            result: "ok",
            by: ctx.user.userId,
            notes: `Answered: ${args.question.slice(0, 80)}`,
          });
          return { ok: true, data: { op: "answer", answer, citations }, message: answer };
        }
        if (args.op === "start-tour" || args.op === "next-step") {
          const steps = await adapters.loadTour(args.tourId);
          const cursor = args.op === "start-tour" ? 0 : args.cursor;
          const step = steps[cursor];
          if (!step) return { ok: false, error: `tour ${args.tourId} has no step ${cursor}` };
          await ctx.audit({
            hand: "teacher",
            args,
            result: "ok",
            by: ctx.user.userId,
            notes: `Tour ${args.tourId} step ${cursor}/${steps.length - 1}`,
          });
          return {
            ok: true,
            data: { op: args.op, tour: { tourId: args.tourId, total: steps.length, step } },
          };
        }
        // explain-decision
        const explanation = await adapters.explainDecision(args.decisionId);
        await ctx.audit({
          hand: "teacher",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: `Explained decision ${args.decisionId}`,
        });
        return { ok: true, data: { op: "explain-decision", explanation }, message: explanation };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "teacher", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
