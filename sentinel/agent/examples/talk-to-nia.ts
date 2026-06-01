/**
 * Talk to Nia — runnable demo.
 * ----------------------------
 * Reads ANTHROPIC_API_KEY from env, wires Nia with stub adapters, runs a
 * sample conversation, prints what Nia says and what hands she called.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/talk-to-nia.ts
 *
 * The conversation is canned for demo purposes; replace `script` with
 * stdin reading to make it interactive.
 */

import { createNia } from "../nia.js";
import { createStubAdapters } from "../stub-adapters.js";
import type { AgentMessage, TenantContext, UserContext } from "../brain.js";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY env var is required. Aborting.");
    process.exit(1);
  }

  const nia = createNia({
    apiKey,
    adapters: createStubAdapters(),
  });

  const tenant: TenantContext = {
    tenantId: "demo-school",
    vertical: "school",
    name: "St. Mary's Demo School",
    language: "en",
    currency: "UGX",
  };

  const user: UserContext = {
    userId: "hudson",
    role: "admin",
    language: "en",
    channel: "web",
  };

  const script = [
    "Hi Nia, can you scan our health signals from the last day and tell me if anything's wrong?",
    "Yes, please draft an advisory for the most critical one.",
    "Remember that the bursar's name is Margaret and she prefers WhatsApp voice notes.",
  ];

  let conversation: AgentMessage[] = [];

  for (const userMessage of script) {
    console.log(`\n----- USER -----`);
    console.log(userMessage);

    const out = await nia.runTurn({
      userMessage,
      conversation,
      tenant,
      user,
    });

    console.log(`\n----- NIA (${out.steps} step${out.steps === 1 ? "" : "s"}) -----`);
    console.log(out.finalMessage);

    if (out.pendingApproval) {
      console.log(`\n[!] Awaiting approval for hand '${out.pendingApproval.hand}'.`);
      console.log(`    Preview: ${out.pendingApproval.preview}`);
    }

    conversation = out.conversation;
  }

  console.log(`\n========== AUDIT LOG ==========`);
  const auditEntries = await nia.audit.read({ limit: 50 });
  for (const e of auditEntries.reverse()) {
    console.log(`[${e.timestamp}] ${e.hand} → ${e.result}${e.notes ? ` — ${e.notes}` : ""}`);
  }
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
