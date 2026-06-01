/**
 * Hand registry — wires all 12 hands into one map the brain consumes.
 * -------------------------------------------------------------------
 * To add a 13th hand: create the file in this directory, import it here,
 * register it in createAllHands. NO other code changes.
 *
 * Each create*Hand factory takes its own adapter set so the registry is
 * pure composition — no hidden globals, easy to test, easy to swap
 * adapters per environment (local vs production).
 */

import type { Hand } from "../hand.js";

import { createSpawnHand, type SpawnAdapters } from "./spawn.js";
import { createMemoryHand, type MemoryAdapters } from "./memory.js";
import { createConfigureHand, type ConfigureAdapters } from "./configure.js";
import { createWatchHand, type WatchAdapters } from "./watch.js";
import { createAdviseHand, type AdviseAdapters } from "./advise.js";
import { createWhatsappHand, type WhatsappAdapters } from "./whatsapp.js";
import { createVoiceHand, type VoiceAdapters } from "./voice.js";
import { createPayHand, type PayAdapters } from "./pay.js";
import { createSyncHand, type SyncAdapters } from "./sync.js";
import { createTranslateHand, type TranslateAdapters } from "./translate.js";
import { createStorytellerHand, type StorytellerAdapters } from "./storyteller.js";
import { createTeacherHand, type TeacherAdapters } from "./teacher.js";

/** Everything the registry needs to construct the full hand set. */
export interface AllAdapters {
  spawn: SpawnAdapters;
  memory: MemoryAdapters;
  configure: ConfigureAdapters;
  watch: WatchAdapters;
  advise: AdviseAdapters;
  whatsapp: WhatsappAdapters;
  voice: VoiceAdapters;
  pay: PayAdapters;
  sync: SyncAdapters;
  translate: TranslateAdapters;
  storyteller: StorytellerAdapters;
  teacher: TeacherAdapters;
}

/** Name → Hand. Brain looks up by name. */
export type HandRegistry = Record<string, Hand>;

/** Construct all 12 hands and return them as a name→Hand map. */
export function createAllHands(adapters: AllAdapters): HandRegistry {
  const hands: Hand[] = [
    createSpawnHand(adapters.spawn),
    createMemoryHand(adapters.memory),
    createConfigureHand(adapters.configure),
    createWatchHand(adapters.watch),
    createAdviseHand(adapters.advise),
    createWhatsappHand(adapters.whatsapp),
    createVoiceHand(adapters.voice),
    createPayHand(adapters.pay),
    createSyncHand(adapters.sync),
    createTranslateHand(adapters.translate),
    createStorytellerHand(adapters.storyteller),
    createTeacherHand(adapters.teacher),
  ];
  const registry: HandRegistry = {};
  for (const h of hands) {
    if (registry[h.name]) {
      throw new Error(`Hand name collision: '${h.name}' is registered twice.`);
    }
    registry[h.name] = h;
  }
  return registry;
}

/** Helper for the brain: emit the descriptor view of all hands. */
export function describeAll(registry: HandRegistry) {
  return Object.values(registry).map((h) => ({
    name: h.name,
    description: h.description,
    permissionTier: h.permissionTier,
    inputSchema: h.inputSchema,
  }));
}

// Re-export the individual factories for direct use in tests.
export {
  createSpawnHand,
  createMemoryHand,
  createConfigureHand,
  createWatchHand,
  createAdviseHand,
  createWhatsappHand,
  createVoiceHand,
  createPayHand,
  createSyncHand,
  createTranslateHand,
  createStorytellerHand,
  createTeacherHand,
};
