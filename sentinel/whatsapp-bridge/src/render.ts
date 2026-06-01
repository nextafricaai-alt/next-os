/**
 * Advisory -> WhatsApp message renderer.
 * Tolerant: accepts both legacy schema (severity uppercase, actions as string[])
 * and new HealthSignal schema (severity lowercase, actions as objects).
 */

export interface RenderableAdvisory {
  vertical?: string;
  advisoryType?: string;
  severity: string;
  title: string;
  message: string;
  recommendedActions: Array<string | { label: string }>;
  humanApprovalRequired?: boolean;
  evidence?: Record<string, unknown>;
  timestamp?: string;
}

const SEVERITY_PREFIX: Record<string, string> = {
  info: "ℹ️",
  warn: "⚠️",
  warning: "⚠️",
  error: "🔴",
  critical: "🔴",
};

export interface RenderContext {
  tenantName: string;
  currency?: string;
}

export function formatCurrency(amount: number, currency = "UGX"): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B ${currency}`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ${currency}`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${currency}`;
  return `${amount.toFixed(0)} ${currency}`;
}

function normalizeActionLabel(a: string | { label: string }): string {
  return typeof a === "string" ? a : a.label;
}

export function renderAdvisory(advisory: RenderableAdvisory, ctx: RenderContext): string {
  const prefix = SEVERITY_PREFIX[advisory.severity.toLowerCase()] ?? "i";
  const lines: string[] = [];

  lines.push(`${prefix} ${ctx.tenantName} — ${advisory.title}`);
  lines.push("");
  lines.push(advisory.message);

  const ev = advisory.evidence;
  if (ev && typeof ev.revenue === "number" && typeof ev.expenses === "number") {
    const leak = ev.expenses - ev.revenue;
    if (leak > 0) {
      lines.push("");
      lines.push(
        `Revenue ${formatCurrency(ev.revenue, ctx.currency)} - ` +
          `Expenses ${formatCurrency(ev.expenses, ctx.currency)} - ` +
          `Gap ${formatCurrency(leak, ctx.currency)}`
      );
    }
  }

  if (advisory.recommendedActions && advisory.recommendedActions.length > 0) {
    lines.push("");
    if (advisory.recommendedActions.length === 1) {
      const label = normalizeActionLabel(advisory.recommendedActions[0]);
      lines.push(`${label} - reply YES to approve, NO to defer.`);
    } else {
      lines.push("Choose one:");
      advisory.recommendedActions.slice(0, 3).forEach((a, i) => {
        lines.push(`  ${i + 1}. ${normalizeActionLabel(a)}`);
      });
      lines.push("Reply with the number, or NO to defer.");
    }
  }

  lines.push("");
  lines.push("- NEXT Sentinel");

  const body = lines.join("\n");
  return body.length > 4000 ? body.slice(0, 3997) + "..." : body;
}
