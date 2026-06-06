# Nia Fine-Tune — Runbook

Goal: fine-tune an open Llama model so Nia's **voice and marketing/business-advisory
instinct** match NEXT's. This does NOT add tools/abilities (monitoring, school
replication) — those are built separately. Fine-tuning = voice + judgment only.

## Files
- `nia-voice-dataset.jsonl` — training data, conversational format
  (`{"messages":[{system},{user},{assistant}]}`). 20 seed examples covering:
  client diagnosis, tier + ROI, enrollment marketing, voice rewriting,
  Charis-vs-NEXT routing, warm WhatsApp drafts, pricing objections, NGO/donor advice.

## Before training — grow the dataset
20 is a working seed; aim for **100–300** examples for a strong LoRA. Two ways:
1. Curate more real Q→A pairs from how Hudson actually talks (best signal).
2. Generate more synthetic examples in the same format from the nia-brain docs,
   then Hudson reviews/edits each (quality gate). Keep the same system prompt.

## Recommended setup
- **Model:** `meta-llama/Llama-3.1-8B-Instruct` (LoRA). Cheap to train (~$5–$20),
  cheap to host, fast — plenty for voice + advisory. (70B is overkill and costly to serve.)
- **Platform:** Together.ai (LoRA fine-tune + hosted inference).

## Steps (Together.ai)
1. Create a Together.ai account → add billing → create an API key.
2. Install CLI:  `pip install together`
3. Export key:   `export TOGETHER_API_KEY=...`
4. Upload data:  `together files upload nia-voice-dataset.jsonl`
   → returns a file id (`file-...`).
5. Start LoRA fine-tune:
   ```
   together fine-tuning create \
     --training-file file-XXXX \
     --model meta-llama/Llama-3.1-8B-Instruct \
     --lora \
     --n-epochs 3 \
     --suffix nia-voice
   ```
6. Watch:  `together fine-tuning list`  → when status is `completed`, copy the
   resulting **model name** (e.g. `yourorg/Llama-3.1-8B-Instruct-nia-voice-xxxx`).

## Evaluate before going live
Ask the new model 5 held-out prompts (not in the dataset), e.g.:
- "A church wants more youth attendance — advise them."
- "Rewrite: 'Kindly be informed of our value-added offerings.'"
- "Which tier for a 400-student school doing fees on Excel, and the ROI line?"
Confirm: leads with the point, concrete, no jargon, closes with a next step.

## Integrate into Nia (the worker)
Today the worker calls Cloudflare Workers AI (free). To use the fine-tune, point it
at Together instead. In `cloudflare-worker/sentinel-worker.js`:
- Replace the Workers AI call with a fetch to `https://api.together.xyz/v1/chat/completions`
  using `Authorization: Bearer ${env.TOGETHER_API_KEY}` and `model: "<your-nia-voice-model>"`.
- Keep the same request/response translation; only the transport + model id change.
- Add `TOGETHER_API_KEY` as a Cloudflare secret (`wrangler secret put TOGETHER_API_KEY`).
- Note: this moves Nia from $0 to a small per-token cost.

## Reality check
Fine-tuning sharpens *how Nia sounds and advises*. It will not let her replicate a
school or monitor a system — those are tool/wiring jobs tracked separately.
