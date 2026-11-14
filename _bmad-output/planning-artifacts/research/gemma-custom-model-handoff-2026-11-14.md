# Handoff: Custom Gemma Beekeeping Model → Mac mini

**Date:** 2026-11-14
**Branch:** `claude/gemma-beekeeping-model-training-liv77d` in `combsmith/broodly`
(`combsmith/broodminder-data` has no changes; use its default branch)
**From:** cloud Claude Code session (exploration only)
**To:** Mac mini (local Claude Code + Apple Silicon for MLX experiments)

## Where things stand

- **Phase:** exploration. No architecture, PRD or code changes have been made, and no decisions
  have been taken.
- **Output so far:** the research report
  [`technical-gemma-custom-model-research-2026-11-14.md`](./technical-gemma-custom-model-research-2026-11-14.md)
  covering suitability, options, decisions, training inputs, costs and timeline.
- **Headline:** keep knowledge in RAG (already planned in `architecture.md`); use a LoRA-tuned
  Gemma 4 E4B for one narrow job — an offline, on-device voice → structured inspection parser that
  supports the zero-tap beeyard.
- **`broodminder-data`:** untouched. Relevant later as a source of inspection-note text and sensor
  features (sensor time series should go through statistical/ML models, not the LLM).

## Open questions for the owner

1. Mac mini chip and unified memory (determines which Gemma 4 sizes can be fine-tuned locally —
   see the hardware note in the research report).
2. Confirm the first job: offline voice parser, or something else?
3. Deployment target: on-device only, or also a server-side model?
4. Which beekeepers can review evaluation/training examples, and how many hours they can give.
5. Consent and licensing stance for using Broodly transcripts and extension publications.

## Next steps (in order)

1. **Decide** the open questions above; record decisions as an ADR in `docs/adr/`.
2. **Build the evaluation set** (200–500 gold examples) for the chosen job. Decide where it lives
   (this repo vs a separate data repo — it may contain user data, so not in a public repo).
3. **Measure the baseline:** Gemini + RAG (and off-the-shelf Gemma 4 E4B via MLX/Ollama on the Mac
   mini) against the eval set.
4. **Assemble training data:** curated sources + teacher-generated examples with expert review
   (check teacher model terms first).
5. **LoRA pilot on the Mac mini** with `mlx-lm` on Gemma 4 E4B, scoped to **text parsing**
   (transcript → inspection JSON); compare to baseline. `mlx-lm` loads only the language model and
   drops Gemma 4's audio weights, so it cannot test speech recognition.
6. **Evaluate offline speech recognition separately** (beekeeping vocabulary under wind, bee noise
   and accents), using an audio-capable stack, before treating the pilot as evidence for the full
   offline voice pipeline.
7. If both win, run the LiteRT-LM export go/no-go (see the research report's Timeline section),
   then plan on-device integration and a spring field test.
8. When the direction is set, follow BMAD: update PRD/architecture, then epics and stories.

## Setting up the Mac mini

```bash
# 1. Get both repos (broodly on the handoff branch)
git clone https://github.com/combsmith/broodly.git
git clone https://github.com/combsmith/broodminder-data.git
git -C broodly checkout claude/gemma-beekeeping-model-training-liv77d

# 2. Python env for local model work (keep it outside the repos)
python3 -m venv ~/venvs/gemma && source ~/venvs/gemma/bin/activate
pip install "mlx-lm[train]" huggingface_hub

# 3. Gemma weights require accepting the licence on Hugging Face, then:
hf auth login
```

Keep model weights, datasets and adapters out of git (large, and datasets may contain user data).

## Resume prompt for Claude Code on the Mac mini

Start Claude Code in the parent folder that holds both clones and paste:

> Continue the custom Gemma beekeeping model exploration. Read
> `broodly/_bmad-output/planning-artifacts/research/gemma-custom-model-handoff-2026-11-14.md` and
> the research report it links. Work on branch `claude/gemma-beekeeping-model-training-liv77d`.
> Start by asking me the open questions in the handoff, then help me with next step 1.
