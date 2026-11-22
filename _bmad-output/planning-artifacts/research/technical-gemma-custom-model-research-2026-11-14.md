---
workflowType: 'research'
research_type: 'technical'
research_topic: 'Custom beekeeping model on Google Gemma'
research_goals: 'Assess suitability, options, alternatives, decisions, costs, timing and training inputs for a custom Gemma model'
user_name: 'Humans'
date: '2026-11-14'
web_research_enabled: true
source_verification: partial
status: 'exploration — no decisions made yet'
---

# Research Report: Custom Beekeeping Model on Google Gemma

**Date:** 2026-11-14
**Research Type:** technical
**Status:** Exploration. Nothing here is decided. See [Decisions needed](#decisions-needed).

---

## Summary

Fine-tuning Gemma suits Broodly for narrow, behavioural jobs. It is a poor way to give the model
beekeeping _knowledge_.

- **Fine-tuning changes how a model behaves:** output format, vocabulary, tone, turning messy input
  into structured data. It is unreliable for adding facts. Facts trained into weights get
  hallucinated, go stale and cannot be cited. Treatment rules, regional timing and bloom calendars
  change, and beekeepers need to see where advice came from.
- **Retrieval (RAG) is the right tool for knowledge.** It is already planned:
  `architecture.md` ("Embedding Strategy for Beekeeping Domain") chunks and embeds a beekeeping
  knowledge base into pgvector, and `prd.md` specifies RAG for conversational inspection Q&A.
  Fine-tuning sits on top of RAG; it does not replace it.

**Recommendation:** do not start with fine-tuning. Build the evaluation set and the planned RAG
pipeline and measure them. Then run one LoRA pilot of Gemma 4 E4B for the offline voice parser
(below), the use case where a custom model clearly beats an API call and reinforces the zero-tap
beeyard differentiator.

## Gemma 4 at a glance

Apache 2.0. Four sizes launched on 2026-04-02; a 12B model followed on 2026-06-03:

| Model     | Notes                                                                                  |
| --------- | -------------------------------------------------------------------------------------- |
| E2B, E4B  | Edge models, 128K context, **native audio input**, run on phones (LiteRT-LM)           |
| 12B       | Mid-size, **native audio input** (encoder-free); Google says it runs on a 16 GB laptop |
| 26B MoE   | ~3.8B parameters active per token; fast server-side model, up to 256K context          |
| 31B Dense | Highest quality; bf16 weights fit one 80 GB H100                                       |

Day-one tooling: Hugging Face Transformers/TRL, Unsloth, vLLM, llama.cpp, **MLX** (Apple
Silicon), Ollama, LM Studio, LiteRT-LM, Vertex AI, Colab.

## Where a custom Gemma model fits Broodly

1. **Best case — offline voice parser for the beeyard.** A fine-tuned E2B/E4B on the phone turns
   "Hive 3, capped queen cells on frame 4, moving on" into structured inspection data and
   navigation commands, with no signal, low latency and no per-call cost. Beeyards often have poor
   coverage, so this directly supports the zero-tap experience.
   _MVP caveat:_ the current MVP has no offline writes (mutations require connectivity), so an
   on-device parser cannot yet complete a live inspection offline. A parser-only pilot validates
   parsing accuracy, not the end-to-end zero-tap workflow; that needs the offline-write decision.
2. **Domain vocabulary in speech.** Supersedure, nuc, Varroa, OAV, brood pattern — under wind,
   bee noise and a veil, across regional accents.
3. **Cost/latency at high volume.** Self-hosting beats Gemini calls only at large scale (see
   [Costs](#costs)).
4. **Not a fit — BroodMinder sensor time series.** Swarm/dearth detection from weight and
   temperature is better done with statistical or classic ML models. Feed their outputs to the
   language model as facts.

## Options

| Option                         | What it is                                       | When to choose it                                          |
| ------------------------------ | ------------------------------------------------ | ---------------------------------------------------------- |
| A. Gemini + RAG (current plan) | Prompting plus retrieval                         | Default. Do first and measure.                             |
| B. Gemma 4 off the shelf + RAG | Self-hosted, no training                         | Need on-device/private inference and quality is sufficient |
| C. LoRA/QLoRA fine-tune        | Small adapter layers trained on 1k–10k examples  | A specific task where A/B fall short (voice parser)        |
| D. Distillation                | Teacher model writes examples, experts review, C | Usual way to get enough data for C                         |
| E. Continued pretraining       | Train on a large beekeeping corpus               | Rarely worth it; RAG captures most of the benefit          |
| F. Train from scratch          | —                                                | Not worth it                                               |

**Alternatives:** Gemini supervised tuning on Vertex (managed, nothing to host, not on-device);
other open models (Qwen, Llama, Mistral — check licences; Gemma 4's Apache 2.0 is among the
cleanest); a Vertex-hosted Gemma endpoint instead of self-hosting on Cloud Run.

## Decisions needed

1. **First job.** Suggested: offline voice → structured inspection parser.
2. **Where it runs.** Phone (LiteRT-LM, ~1–3 GB added to the app), Cloud Run GPU, or Vertex
   endpoint. This largely determines model size and running cost.
3. **Model size.** E2B/E4B on-device; 12B as a mid-size option with audio (local Mac or small
   server GPU); 26B MoE or 31B server-side.
4. **What "good" means.** Measurable targets on a held-out set: field-extraction accuracy, command
   recognition rate, unsafe-advice rate.
5. **Data rights.** Extension publication licences; user consent for voice/inspection data; the
   teacher model's terms (some providers restrict using outputs to train other models — check
   before distilling).
6. **Treatment-advice safety boundary.** Miticide labels are legally binding; treatment guidance
   must come from retrieved, cited sources, never model memory.
7. **Ownership.** Who retrains each season and on each new Gemma release.
8. **Training hardware.** Local Apple Silicon (MLX) vs Colab vs Vertex/GCE GPUs (see below).

## Training inputs

- **Evaluation set first:** 200–500 gold examples reviewed by experienced beekeepers. The most
  important input, needed whichever option is chosen.
- **Training examples (LoRA):** ~1,000–10,000 high-quality pairs — transcript → inspection JSON,
  voice command → action, question + retrieved context → cited answer.
- **Sources:** own inspection notes and BroodMinder note fields; extension material (Alabama
  Cooperative Extension, UF/IFAS, Penn State, Honey Bee Health Coalition Varroa guide — check
  licences); Broodly transcripts with consent; teacher-generated examples with expert review.
- **Audio (voice task):** a few hours of real beeyard recordings with transcripts (veil, wind,
  bee noise).
- **Photos (only if vision is added later):** hundreds–thousands of labelled frame photos per class
  (capped brood, queen cells, mites, chalkbrood). A separate project.

## Costs

Rough estimates. Third-party figures conflicted; verify against Google's official Vertex AI
pricing page before budgeting.

| Item                                          | Estimate                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Expert data review (usually the largest cost) | ~35–50 hours per 1,000 examples at 2–3 min each                                             |
| Teacher-model synthetic generation            | ~$10–100                                                                                    |
| LoRA on E2B/E4B — local Apple Silicon (MLX)   | ~$0 marginal; hours per run (see hardware note)                                             |
| LoRA on E2B/E4B — Colab Pro or one L4/A100    | ~$5–50 per run                                                                              |
| QLoRA on 26B/31B — one H100 (~$3–12/hr)       | ~$50–250 per run; plan 5–15 runs (~$250–3,750)                                              |
| Vertex managed Gemma tuning                   | Per training token; one source lists ~$6.83 per million tokens for Gemma 3 27B (unverified) |
| Serving on-device                             | ~$0 per call; costs are app size and device testing                                         |
| Serving in cloud, always on                   | L4 ~$500–700/month; H100 several thousand/month; scale-to-zero adds cold start              |
| Ongoing                                       | Retraining per season/release; keeping the eval set current                                 |

For comparison, `architecture.md` budgets Vertex AI at about $18–40/month in total: Gemini
recommendations $5–15, vision $3–5 and speech-to-text $10–20 (~100 hours of audio). Speech-to-text is
the closest comparison for the voice parser. Cloud self-hosting will not pay off until usage is very
large; on-device is where Gemma pays for itself.

### Hardware note — Apple Silicon (Mac mini)

Gemma 4 has day-one MLX support, and `mlx-lm` supports LoRA/QLoRA fine-tuning. Rough guidance
(estimates, confirm empirically):

- **E2B/E4B LoRA:** practical on 16–24 GB unified memory; more memory allows larger batches and
  longer sequences.
- **26B MoE / 31B QLoRA (4-bit):** realistically needs ~48–64 GB+ and will be slow; rent a cloud
  H100 for these instead.
- `mlx-lm` loads only Gemma 4's language model and drops the audio weights, so MLX LoRA covers
  the text side (transcript → JSON). Speech recognition needs a separate audio-capable stack and
  evaluation.
- Local hardware is ideal for the eval harness, data tooling and the E4B pilot; burst to cloud only
  for the large models.

## Timeline

About 2–3 months of part-time work, spread across Nov–Apr to align with the bee season (Southeast
US):

| When    | Phase         | Work                                                                   |
| ------- | ------------- | ---------------------------------------------------------------------- |
| Nov–Dec | 0 (1–2 weeks) | Pick the job, build the eval set, measure Gemini + RAG baseline        |
| Dec–Jan | 1 (3–4 weeks) | Curate data, generate synthetic examples, expert review, record audio  |
| Jan     | 2 (1–2 weeks) | LoRA experiments on E4B vs baseline                                    |
| Feb–Apr | 3 (3–4 weeks) | On-device integration; field test during spring buildup / swarm season |

Winter suits data and evaluation work; field validation needs active colonies.

**Go/no-go before the on-device pilot (Feb–Apr):** confirm a supported route from the trained
adapter to a LiteRT-LM bundle for the chosen model, with tool versions recorded. Re-run the
held-out eval (voice input and structured output) before and after export, and confirm the
exported bundle keeps audio input. If it does not, evaluate a separate on-device speech recognizer
feeding the text-only adapter as one complete audio → JSON pipeline, before and after export. If
that also fails, fall back to server-side inference or a different model size. The outcome decides
"Where it runs".

## Sources

- [Gemma 4: Byte for byte, the most capable open models (Google)](https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/)
- [Introducing Gemma 4 12B (Google)](https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemma-4-12b/)
- [Announcing Gemma 3 on Vertex AI](https://cloud.google.com/blog/products/ai-machine-learning/announcing-gemma-3-on-vertex-ai)
- [Vertex AI fine-tuning pricing reproduction (developersdigest)](https://www.developersdigest.tech/models/fine-tuning/google)
- [Vertex AI Pricing 2026 guide (nOps)](https://www.nops.io/blog/vertex-ai-pricing/)
- [Pricing – Vertex hosted tuned model (Google Developer forum)](https://discuss.google.dev/t/pricing-vertex-hosted-tuned-model/185475)
