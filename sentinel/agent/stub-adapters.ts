/**
 * Stub adapters.
 * --------------
 * In-memory fakes for every adapter every hand needs. They let the runtime
 * work end-to-end BEFORE Layer 3 wires real Supabase / Twilio / M-Pesa.
 *
 * Use them for the demo, tests, and local development. Do not use them in
 * production — they keep nothing across restarts.
 *
 * To swap a single hand to a real adapter, just pass a real one to
 * createStubAdapters via overrides:
 *   const adapters = createStubAdapters({ whatsapp: realTwilioAdapter });
 */

import type { AllAdapters } from "./hands/index.js";
import type { SpawnAdapters } from "./hands/spawn.js";
import type { MemoryAdapters, MemoryRecord } from "./hands/memory.js";
import type { ConfigureAdapters } from "./hands/configure.js";
import type { WatchAdapters } from "./hands/watch.js";
import type { AdviseAdapters } from "./hands/advise.js";
import type { WhatsappAdapters } from "./hands/whatsapp.js";
import type { VoiceAdapters } from "./hands/voice.js";
import type { PayAdapters, PaymentIntent } from "./hands/pay.js";
import type { SyncAdapters } from "./hands/sync.js";
import type { TranslateAdapters } from "./hands/translate.js";
import type { StorytellerAdapters } from "./hands/storyteller.js";
import type { TeacherAdapters } from "./hands/teacher.js";
import type { VerticalTemplate } from "./configurator.js";
import type { HealthSignal, Advisory } from "../shared/src/health-signal.js";

/* ----- generic id helper ----- */
function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ============================ SPAWN ============================ */
function stubSpawnAdapters(): SpawnAdapters {
  return {
    async loadTemplate(vertical): Promise<VerticalTemplate> {
      // Minimal hard-coded template per vertical so the demo runs without
      // disk reads. Real implementation reads sentinel/templates/<vertical>/...
      return {
        templateId: `stub-${vertical}-v1`,
        vertical: vertical as VerticalTemplate["vertical"],
        description: `Stub ${vertical} template`,
        requiredProfileFields: ["institutionId", "name", "country", "currency"],
        kpiDefaults: {},
        thresholds: {},
        advisoryTone: { style: "warm", decisionModel: "human-in-the-loop", example: "" },
        modules: ["dashboard"],
      };
    },
    async persistTenant(_config) {
      return { tenantId: uid("tenant") };
    },
    async deployFrontend(_config, subdomain) {
      return {
        loginUrl: `https://${subdomain}.nextos.africa/login`,
        dashboardUrl: `https://${subdomain}.nextos.africa`,
      };
    },
    async wireWhatsApp(_tenantId, _number) {
      return { wired: true };
    },
    async activateMonitoring(_tenantId) {
      return { active: true };
    },
  };
}

/* ============================ MEMORY ============================ */
function stubMemoryAdapters(): MemoryAdapters {
  const store: MemoryRecord[] = [];
  return {
    async insert(record) {
      const full = { ...record, id: uid("mem") };
      store.push(full);
      return full;
    },
    async search(tenantId, query, tags, limit = 10) {
      const q = query.toLowerCase();
      return store
        .filter((r) => r.tenantId === tenantId)
        .filter((r) => r.content.toLowerCase().includes(q) || r.tags.some((t) => q.includes(t)))
        .filter((r) => !tags?.length || tags.every((t) => r.tags.includes(t)))
        .slice(0, limit);
    },
    async remove(id, tenantId) {
      const idx = store.findIndex((r) => r.id === id && r.tenantId === tenantId);
      if (idx === -1) return false;
      store.splice(idx, 1);
      return true;
    },
  };
}

/* ============================ CONFIGURE ============================ */
function stubConfigureAdapters(): ConfigureAdapters {
  const tenants = new Map<string, Record<string, unknown>>();
  return {
    async readTenant(tenantId) {
      return tenants.get(tenantId) ?? { tenantId };
    },
    async writeTenant(tenantId, patch) {
      const existing = tenants.get(tenantId) ?? { tenantId };
      tenants.set(tenantId, { ...existing, ...patch });
    },
  };
}

/* ============================ WATCH ============================ */
function stubWatchAdapters(): WatchAdapters {
  return {
    async fetchSignals(_tenantId, _sinceMinutes): Promise<HealthSignal[]> {
      // Returns one fake school signal that triggers the financial-leak rule.
      const now = new Date().toISOString();
      return [
        {
          tenantId: "demo-school",
          timestamp: now,
          signature: "stub",
          kpis: {
            vertical: "school",
            data: {
              revenueThisTerm: 1_200_000_000,
              expensesThisTerm: 1_496_000_000,
              activeStudents: 420,
              capacityThreshold: 500,
              feesOutstandingTotal: 180_000_000,
              feesOutstandingFamilyCount: 38,
            },
          },
        },
      ];
    },
  };
}

/* ============================ ADVISE ============================ */
function stubAdviseAdapters(): AdviseAdapters {
  const store: Advisory[] = [];
  return {
    async persistAdvisory(advisory) {
      store.push(advisory);
      return advisory;
    },
  };
}

/* ============================ WHATSAPP ============================ */
function stubWhatsappAdapters(): WhatsappAdapters {
  return {
    async send(to, body) {
      console.log(`[stub whatsapp → ${to}]`, body);
      return { delivered: true };
    },
    async sendAdvisory(to, advisory) {
      console.log(`[stub whatsapp advisory → ${to}]`, advisory.title);
      return { delivered: true };
    },
  };
}

/* ============================ VOICE ============================ */
function stubVoiceAdapters(): VoiceAdapters {
  return {
    async transcribe(audioUrl, languageHint) {
      return {
        transcript: `[stub transcript of ${audioUrl}]`,
        detectedLanguage: languageHint ?? "en",
      };
    },
    async classifyIntent(transcript) {
      return { kind: "freeform" as const, summary: transcript.slice(0, 80) };
    },
  };
}

/* ============================ PAY ============================ */
function stubPayAdapters(): PayAdapters {
  const intents = new Map<string, PaymentIntent>();
  return {
    async createIntent(intent) {
      const full: PaymentIntent = {
        ...intent,
        id: uid("pi"),
        status: "pending-approval",
        proposedAt: new Date().toISOString(),
      };
      intents.set(full.id, full);
      return full;
    },
    async getIntent(id) {
      return intents.get(id) ?? null;
    },
    async updateIntent(id, patch) {
      const existing = intents.get(id);
      if (!existing) throw new Error(`intent ${id} not found`);
      const updated = { ...existing, ...patch };
      intents.set(id, updated);
      return updated;
    },
    async execute(intent) {
      return { providerRef: uid("ref"), settled: true };
    },
  };
}

/* ============================ SYNC ============================ */
function stubSyncAdapters(): SyncAdapters {
  return {
    async applyOps(_tenantId, ops) {
      return { accepted: ops.map((o) => o.opId), conflicts: [] };
    },
    async fetchOps(_tenantId, _sinceIso, _tables) {
      return [];
    },
    async queueDepth(_tenantId) {
      return 0;
    },
  };
}

/* ============================ TRANSLATE ============================ */
function stubTranslateAdapters(): TranslateAdapters {
  return {
    async translate(text, from, to, _preserveTokens) {
      return {
        text: `[${to}] ${text}`,
        detectedFrom: from === "auto" ? "en" : from,
        to,
        confidence: 0.9,
      };
    },
  };
}

/* ============================ STORYTELLER ============================ */
function stubStorytellerAdapters(): StorytellerAdapters {
  return {
    async fetchData(_tenantId, paths) {
      return Object.fromEntries(paths.map((p) => [p, `[stub data for ${p}]`]));
    },
    async compose(format, topic, _data, _options) {
      return {
        title: `${format}: ${topic}`,
        body: `This is a stub ${format} draft about "${topic}". Real composer wires here.`,
        hints: { cta: "Read more", hashtags: ["#NEXTOS", "#Africa"] },
      };
    },
  };
}

/* ============================ TEACHER ============================ */
function stubTeacherAdapters(): TeacherAdapters {
  return {
    async answer(question, _tenantId) {
      return {
        answer: `Stub answer to: "${question}". Real teacher will pull from the docs knowledge base.`,
        citations: [],
      };
    },
    async loadTour(tourId) {
      return [
        { index: 0, title: `${tourId}: Welcome`, body: "Welcome to NEXT OS." },
        { index: 1, title: `${tourId}: Dashboard`, body: "This is your dashboard." },
        { index: 2, title: `${tourId}: Done`, body: "You're ready to go." },
      ];
    },
    async explainDecision(decisionId) {
      return `Decision ${decisionId} was made because of stub reasoning.`;
    },
  };
}

/* ============================ AGGREGATE ============================ */

export function createStubAdapters(overrides: Partial<AllAdapters> = {}): AllAdapters {
  return {
    spawn: overrides.spawn ?? stubSpawnAdapters(),
    memory: overrides.memory ?? stubMemoryAdapters(),
    configure: overrides.configure ?? stubConfigureAdapters(),
    watch: overrides.watch ?? stubWatchAdapters(),
    advise: overrides.advise ?? stubAdviseAdapters(),
    whatsapp: overrides.whatsapp ?? stubWhatsappAdapters(),
    voice: overrides.voice ?? stubVoiceAdapters(),
    pay: overrides.pay ?? stubPayAdapters(),
    sync: overrides.sync ?? stubSyncAdapters(),
    translate: overrides.translate ?? stubTranslateAdapters(),
    storyteller: overrides.storyteller ?? stubStorytellerAdapters(),
    teacher: overrides.teacher ?? stubTeacherAdapters(),
  };
}
