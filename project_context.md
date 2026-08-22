# Project Context: MLE Theory Curator & Flashcard System

---

## 1. What This Project Is

An intensive interview-preparation system for Machine Learning Engineering (MLE) and AI Engineering. Raw daily study notes are ingested, curated, and stored as structured Markdown — the **single source of truth** for all downstream outputs (flashcard app, Anki export, JSON datasets).

---

## 2. Core Architecture Decision

**Markdown is the canonical format. No parallel JSON, CSV, or Anki files are maintained alongside it.**

The reasoning:

| Responsibility | Owner | Why |
|---|---|---|
| Semantic work: raw notes → structured knowledge cards | LLM (curator) | LLMs excel at understanding, simplifying, and structuring concepts |
| Mechanical work: structured Markdown → JSON / Anki / app data | Deterministic script | Scripts excel at exact repetition, consistency, validation, zero interpretation |

If the LLM were to independently author both Markdown and JSON, the two copies would inevitably drift over repeated updates, corrections, and backfills — subtle mismatches in wording, missing cards, priority/tag disagreements, broken cross-references. A single Markdown source eliminates this entire class of bugs.

The converter script's job is deliberately boring: find a card heading → read its stable ID, priority, category, tags → copy its Markdown body unchanged → write JSON. It cannot hallucinate or reinterpret content. If the Markdown violates schema, the script fails loudly with a clear error message — then you fix the one source and rebuild.

**Pipeline:**
```
Raw study notes (pasted by user)
        ↓
  LLM curates into strict Markdown
        ↓
  notes/day_XX.md  (single source of truth)
        ↓
  Deterministic converter script (built once, run on every change)
        ↓
  generated/day_XX.json → mobile PWA / Anki export / flashcard app
```

---

## 3. Content Philosophy

### Flashcard Identity: Knowledge Cards, Not Trivia Cards

The primary output is a deck of **Knowledge Flashcards** — each card teaches a concept comprehensively. A separate Q&A drill section exists for rapid-fire self-testing, but the learning cards stand alone as complete explanations.

### Language & Readability Rules

- **Simple language always.** If a concept is complex, unpack it with clear analogies and step-by-step reasoning — never dense academic jargon. The reader should not need to Google terms to understand the card.
- **Length over complexity.** When forced to choose, a card should be lengthy but easy to understand, rather than short but overwhelming. Day 1's explanation of "bias" is the gold standard — simple examples, clear mental models, no handwaving.
- **Example-driven.** Ground every concept in a concrete, relatable example.
- **One card = one atomic concept.** But "atomic" means a coherent idea, not a tiny trivia fragment. A card can be detailed and multi-paragraph if that's what the concept requires.
- **No invented facts.** When curating supplied notes, cards must only contain information supported by that material. When the user explicitly requests a new curriculum day to be authored directly, use well-established technical knowledge and keep the scope explicit in that day's objective and out-of-scope section.

---

## 4. File Structure

```
Flashcards/
├── project_context.md          ← this file
├── notes/
│   ├── day_01.md               ← curated Markdown (source of truth)
│   ├── day_02.md
│   ├── ...
│   └── day_XX.md
├── generated/                  ← (future) script output, never hand-edited
│   ├── day_01.json
│   └── ...
└── scripts/                    ← (future) converter & validator
    └── md_to_json.py
```

- **`notes/`** — Human-curated Markdown files. The LLM writes here. This is the only place content is authored.
- **`generated/`** — Machine-generated JSON. Never hand-edited. Rebuilt from `notes/` by the converter script.
- **`scripts/`** — The deterministic converter and schema validator.

---

## 5. The Markdown Schema (Strict Specification)

Every `notes/day_XX.md` file must follow this exact structure, in this order:

### 5.1 YAML Frontmatter

Valid YAML only. Priority counts must be calculated from the actual cards, not guessed.

```yaml
---
day: XX
title: "Day title"
topics:
  - topic-one
  - topic-two
tags:
  - normalized-lowercase-tag
priority_distribution:
  must_know: 0
  should_know: 0
  nice_to_know: 0
---
```

### 5.2 Sections (in order)

1. **Daily Objective** — what the day covers at a high level.
2. **Syllabus & Priority Breakdown** — quick list of must/should/nice-to-know topics.
3. **Knowledge Cards** — the core content (see 5.3 below).
4. **Key Connections** — how today's topics link to previous/future days.
5. **Common Misconceptions** — Myth vs Reality pairs.
6. **Out of Scope** — explicit boundaries on what NOT to study.
7. **Q&A Drill** — self-test questions, enclosed in `<!-- QA_START -->` / `<!-- QA_END -->` (see 5.4 below).

### 5.3 Knowledge Card Format

Every distinct concept uses this exact structure:

```markdown
### [CARD: Clear Concept Title]
<!-- id: dXX-descriptive-stable-slug -->

- **Priority:** must_know
- **Category:** normalized-category-name
- **Tags:** tag-one, tag-two

**Core Concept**

Clear, simple explanation of the concept.

**Why It Matters**

Explain the practical reason, problem solved, or consequence.

**Mental Model / Mechanics**

Explain how it works step by step. Preserve useful formulas, code, tables, and diagrams.

**Example**

Include a simple, concrete example whenever it improves understanding.

**Failure Modes / Tradeoffs**

Explain common mistakes, limitations, leakage risks, or tradeoffs when relevant.

**Interview-Ready Explanation**

Give a concise but technically accurate answer suitable for an MLE interview.
```

**Card rules:**
- One card = one atomic concept (but may be detailed and multi-paragraph).
- Do NOT split a concept into tiny trivia cards merely to inflate count.
- Preserve technical depth while using simple language.
- Priority values must be exactly one of: `must_know`, `should_know`, `nice_to_know`.
- Card IDs must be unique and stable. Format: `dXX-descriptive-slug` (e.g., `d05-normalization-vs-standardization`).
- Never change an existing card ID merely because its title or wording changes.
- Do not introduce facts not supported by the supplied study material.
- Use standard Markdown for equations, tables, code blocks, and diagrams.

### 5.4 Q&A Drill Format

```markdown
<!-- QA_START -->

#### [QA: dXX-qa-001]

**Question:** Clear self-test question.

**Answer:** Clear, technically accurate answer.

**Tags:** tag-one, tag-two

**Linked Cards:** dXX-related-card-id

<!-- QA_END -->
```

**Q&A rules:**
- Each Q&A item has a unique stable ID (format: `dXX-qa-NNN`).
- Focused on active recall and interview practice.
- Each question links to one or more relevant Knowledge Card IDs.
- Do NOT duplicate long Knowledge Card explanations in answers.

---

## 6. Validation Checklist (LLM runs before finishing)

Before completing any day's file, verify:

- [ ] YAML frontmatter is valid
- [ ] Every `[CARD: ...]` has exactly one unique `<!-- id: ... -->`
- [ ] Every card has Priority, Category, and Tags
- [ ] Priority values are one of: `must_know`, `should_know`, `nice_to_know`
- [ ] Frontmatter `priority_distribution` counts match actual card counts
- [ ] Every Q&A item has ID, Question, Answer, Tags, and Linked Cards
- [ ] No concept is duplicated across cards
- [ ] File is complete Markdown only — no JSON or implementation output

---

## 7. Current Phase

**Phase: Ingestion, Structuring & Schema Migration**

- User pastes raw study notes, or explicitly commissions an independent curriculum day.
- LLM curates or authors strict Markdown following the schema above.
- Output: `notes/day_XX.md` files.
- `notes/day_01.md` is the canonical reference implementation of the strict schema.
- Days written under the earlier schema are migrated one file at a time before any converter is relied upon for them.

**NOT yet building:** the converter script, the web/mobile app, or any JSON/Anki exports. Those come after the theory sprint is complete (or once enough days exist to validate the converter).

---

## 8. Progress

| Day | Title | Status |
|-----|-------|--------|
| 1 | Python Mental Model + Core ML Framing | ✅ Canonical schema reference |
| 2 | Supervised Learning, Data Splits, Generalization & Regularization | ✅ Migrated to strict schema |
| 3 | Loss Functions, Optimization & Gradient Descent | ✅ Migrated to strict schema |
| 4 | Classification Evaluation Metrics | ✅ Migrated to strict schema |
| 5 | Preprocessing & Feature Engineering | ✅ Migrated to strict schema |
| 6 | Classical Algorithms: Trees, Ensembles, k-NN, Naive Bayes, SVM | ✅ Written in strict schema |
| 7 | Unsupervised Learning + ML Pipeline Fundamentals | ✅ Written in strict schema |
| 8 | Neural Networks: Architecture & Forward Propagation | ✅ Written in strict schema |
| 9 | Backpropagation & Training Mechanics | ✅ Written in strict schema |
| 10 | CNNs/RNNs (Compressed) + NLP Foundations | ✅ Written in strict schema |
| 11 | Attention Mechanisms | ✅ Written in strict schema |
| 12 | Transformers: Full Architecture + LLM Training/Inference/Decoding | ✅ Written in strict schema |
| 13 | Fine-Tuning: SFT, PEFT/LoRA, RLHF/PPO | ✅ Written in strict schema |
| 14 | Embeddings, Vector Search & ANN/HNSW | ✅ Migrated to strict schema |
| 15 | RAG Architecture: Chunking, Retrieval, Reranking | ✅ Migrated to strict schema |
| 16 | RAG Evaluation & Production GenAI | ✅ Migrated to strict schema |
| 17 | Python Execution Model: Scopes, Iterators, Generators, Decorators, Context Managers, OOP | ✅ Authored directly in strict schema |
| 18 | Python Concurrency: GIL, Threading, Multiprocessing, Asyncio | ✅ Authored directly in strict schema |
| 19 | SQL Theory for MLE Interviews | ✅ Authored directly in strict schema |
| 20 | Kafka, Spark & Airflow (Compressed) | ✅ Authored directly in strict schema |
| 21 | ML System Design & MLOps Foundations | ✅ Authored directly in strict schema |
| 22 | LLM Inference Serving & GPU Tradeoffs | ✅ Authored directly in strict schema |
| 23 | Interview Coding, DSA & Testing | ✅ Authored directly in strict schema |
| 24 | Advanced LLM Topics: MoE, QLoRA, DPO & GRPO | ✅ Authored directly in strict schema |
| 25+ | Pending | — |

All existing days are on the strict schema. New days should follow the format defined in Section 5 from the start.
