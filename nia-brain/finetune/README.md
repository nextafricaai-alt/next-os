# Nia Fine-Tune — Runbook

Goal: fine-tune an open Llama model so Nia's **voice and marketing/business-advisory
instinct** match NEXT's. This does NOT add tools/abilities (monitoring, school
replication) — those are built separately. Fine-tuning = voice + judgment only.

## Files
- `nia-voice-dataset.jsonl` — full dataset, **154 examples**, conversational format
  (`{"messages":[{system},{user},{assistant}]}`). Validated: all well-formed, one
  consistent system prompt, no empty turns.
- `nia-train.jsonl` — **139** examples (training split).
- `nia-val.jsonl` — **15** examples (held-out validation split).

## Recommended setup
- **Model:** `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference` (LoRA). Cheap to train,
  fast — plenty for voice + advisory. (70B is overkill and costly to serve.)
- **Platform:** Together.ai (LoRA fine-tune + dedicated-endpoint inference).
- CLI is now `tg` (the `together` command still works as an alias).

## Steps (Together.ai)
1. Create a Together.ai account -> add billing -> create an API key.
2. Install CLI:  `pip install together`
3. Export key:   `export TOGETHER_API_KEY=...`
4. Upload data:
   ```
   tg files upload nia-train.jsonl     # -> returns a training file id (file-...)
   tg files upload nia-val.jsonl       # -> returns a validation file id (file-...)
   ```
5. Start LoRA fine-tune (validation requires BOTH --validation-file AND --n-evals > 0):
   ```
   tg fine-tuning create \
     --training-file   file-TRAIN_ID \
     --validation-file file-VAL_ID \
     --n-evals 3 \
     --model "meta-llama/Meta-Llama-3.1-8B-Instruct-Reference" \
     --lora \
     --n-epochs 3 \
     --suffix nia-voice
   ```
6. Watch:  `tg fine-tuning list`  -> when status is `completed`, copy the
   resulting **output_name** (e.g. `yourorg/Meta-Llama-3.1-8B-Instruct-Reference-nia-voice-xxxx`).

## Evaluate before going live
Ask the new model 5 held-out prompts (use `nia-val.jsonl` plus a couple fresh ones), e.g.:
- "A church wants more youth attendance — advise them."
- "Rewrite: 'Kindly be informed of our value-added offerings.'"
- "Which tier for a 400-student school doing fees on Excel, and the ROI line?"
Confirm: leads with the point, concrete, no jargon, closes with a next step.

## Serving / inference — IMPORTANT cost note (changed)
Together no longer auto-serves LoRA models per-token on the cheap serverless tier.
A fine-tuned LoRA is now deployed behind a **dedicated endpoint** — billed by the
GPU-hour while it's running. For an always-on 8B endpoint that is a real recurring
monthly cost, not a few cents per chat.

So the honest sequencing:
- **Now (free):** Nia's voice is already carried by her system prompt + knowledge
  base in `nia-brain.jsx` (the "Hudson's Voice" doc) running on the free Cloudflare
  Workers AI 70B model. That gets most of the voice with zero hosting cost.
- **Later (paid):** Run this fine-tune and stand up a dedicated endpoint **when**
  either (a) paying schools are using Nia heavily enough to justify the endpoint, or
  (b) you hit a voice/judgment gap the system prompt genuinely can't close.

## Integrate into the worker (only after the endpoint is live)
In `cloudflare-worker/sentinel-worker.js`:
- Replace the `env.AI.run(MODEL, ...)` Workers AI call with a fetch to the Together
  endpoint (`https://api.together.xyz/v1/chat/completions`), `Authorization: Bearer
  ${env.TOGETHER_API_KEY}`, `model: "<your-nia-voice-output_name>"`.
- Keep the same request/response shape; only transport + model id change.
- Add the secret: `wrangler secret put TOGETHER_API_KEY` (or paste in the Cloudflare
  dashboard -> Settings -> Variables).

## Reality check
Fine-tuning sharpens *how Nia sounds and advises*. It will not let her replicate a
school or monitor a system — those are tool/wiring jobs tracked separately.
