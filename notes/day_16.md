---
day: 16
title: "RAG Evaluation & Production GenAI"
topics:
  - rag-evaluation
  - production
  - latency
  - cost
  - security
tags:
  - evaluation
  - production
  - security
priority_distribution:
  must_know: 8
  should_know: 2
  nice_to_know: 0
---

# DAY 16 — RAG EVALUATION + PRODUCTION GENAI

## Daily Objective

By the end of today you should be able to explain why RAG needs its own evaluation framework distinct from standard generation metrics, evaluate retrieval and generation as separate failure modes (and know why that separation has real diagnostic value), and discuss the production-engineering side of RAG — latency, cost, caching, and the security-specific risks (prompt injection, context poisoning) that come from a system that automatically ingests external content into its prompts.

This is the last new-content day before **Checkpoint 3**, which closes out the entire LLM/RAG arc.

---

## Syllabus & Priority Breakdown

- 🔴 **MUST KNOW:** why RAG needs decomposed evaluation, precision/recall@K for retrieval, faithfulness/groundedness, the faithfulness-vs-relevance distinction, the RAG triad's diagnostic value, latency and cost drivers, prompt injection risk specific to RAG, guardrail concepts.
- 🟡 **SHOULD KNOW:** MRR, evaluation dataset construction (including synthetic generation), caching strategies.
- 🟢 **NICE TO KNOW:** NDCG, exact NLI-based faithfulness scoring mechanics, specific prompt-injection defense library implementations.

---

## Knowledge Cards

---

### [CARD: Why RAG Needs Its Own Evaluation Framework]
<!-- id: d16-why-rag-needs-evaluation -->

- **Priority:** must_know
- **Category:** rag-evaluation
- **Tags:** evaluation, failure-modes

**Core Concept**

A RAG system has two components — retrieval and generation — and each can fail *independently*. Standard generation metrics (perplexity) or classification metrics don't directly capture "did the system find the right information, and did it actually use that information correctly?"

**Why It Matters**

A RAG system can fail in genuinely distinct ways: **retrieval fails** (the relevant chunk was never found at all), or **retrieval succeeds but generation fails** (the right chunk was retrieved, but the answer ignores it, contradicts it, or blends it incorrectly with the model's own parametric knowledge).

**Mental Model / Mechanics**

Evaluating retrieval and generation **separately**, rather than only end-to-end, is the key insight for diagnosing issues in RAG systems.

**Failure Modes / Tradeoffs**

Relying solely on end-to-end generation metrics masks whether poor outputs are caused by bad retrieval or poor model reasoning.

**Interview-Ready Explanation**

> "Standard generation metrics don't capture the two independent failure modes of RAG. Evaluating retrieval and generation separately is crucial because a bad answer could stem from the relevant chunk never being found, or from the model failing to correctly use a successfully retrieved chunk."

---

### [CARD: Retrieval Evaluation]
<!-- id: d16-retrieval-evaluation -->

- **Priority:** must_know
- **Category:** rag-evaluation
- **Tags:** precision, recall, mrr, ndcg

**Core Concept**

Retrieval evaluation adapts standard precision and recall to a ranked-retrieval setting, measuring how well the system surfaces relevant document chunks.

**Why It Matters**

Without measuring retrieval performance independently, you cannot tell if bad answers are caused by the embedding or search process.

**Mental Model / Mechanics**

- Precision@K = (relevant chunks in top K) / K
- Recall@K = (relevant chunks in top K) / (all relevant chunks that exist in the corpus)
- MRR (Mean Reciprocal Rank) 🟡: takes the reciprocal of the rank position of the first relevant result. Rewards surfacing relevant results earlier.
- NDCG (Normalized Discounted Cumulative Gain) 🟢: handles graded relevance and rewards correct ordering.

**Failure Modes / Tradeoffs**

Requires a labeled evaluation set: (query, set of relevant chunk IDs) pairs, which can be expensive to curate manually.

**Interview-Ready Explanation**

> "Retrieval evaluation uses metrics like Precision@K and Recall@K to measure if relevant chunks are found. MRR adds nuance by rewarding systems that place relevant chunks higher in the ranking."

---

### [CARD: Generation Evaluation — Faithfulness & Groundedness]
<!-- id: d16-generation-evaluation -->

- **Priority:** must_know
- **Category:** rag-evaluation
- **Tags:** faithfulness, groundedness, relevance

**Core Concept**

Faithfulness (or groundedness) measures whether every claim in the generated answer can be traced back to, and supported by, the retrieved context.

**Why It Matters**

A response can be fluent and factually true but still unfaithful if the model used its own trained-in knowledge instead of grounding in the provided context. Faithfulness is about grounding in the retrieved context, not general truth.

**Mental Model / Mechanics**

- Faithfulness: "Is the answer supported by the context?"
- Relevance: "Does the answer actually address what was asked?"

How faithfulness gets measured:
- Human evaluation (gold standard, slow).
- LLM-as-judge (scalable, uses a separate LLM to assess grounding).
- NLI-style approaches 🟢 (treats claims as hypotheses and context as premise).

**Failure Modes / Tradeoffs**

A RAG system can be faithful but irrelevant (answering a different question using the context), or appear relevant while quietly being unfaithful (blending in outside plausible knowledge).

**Interview-Ready Explanation**

> "Faithfulness and relevance are separate failure modes. Faithfulness asks whether the answer is grounded in the retrieved context; relevance asks whether the answer addresses the actual question. A RAG system can be faithful but irrelevant, or seem relevant while quietly being unfaithful."

---

### [CARD: The RAG Triad]
<!-- id: d16-rag-triad -->

- **Priority:** must_know
- **Category:** rag-evaluation
- **Tags:** rag-triad, context-relevance, faithfulness, answer-relevance

**Core Concept**

The RAG Triad decomposes evaluation into three metrics: Context Relevance, Faithfulness, and Answer Relevance.

**Why It Matters**

This decomposition lets you localize where a RAG system is failing, rather than staring at one blended end-to-end quality score.

**Mental Model / Mechanics**

1. **Context Relevance**: is the RETRIEVED CONTEXT actually relevant to the query? (retrieval quality)
2. **Faithfulness**: is the GENERATED ANSWER supported by the retrieved context? (generation grounding)
3. **Answer Relevance**: does the generated answer actually address the QUESTION? (generation usefulness)

Flow: Query → [Context Relevance] → Retrieved Context → [Faithfulness] → Generated Answer → [Answer Relevance] → (back to original Query)

**Failure Modes / Tradeoffs**

- Context relevance low → problem is in retrieval (chunking, embeddings, reranking).
- Context relevance high but faithfulness low → problem is in generation (model isn't using good context well, possible prompting issue).
- Faithfulness high but answer relevance low → model is grounded, but answering the wrong aspect of the question.

**Interview-Ready Explanation**

> "Decomposing RAG evaluation into context relevance, faithfulness, and answer relevance has real diagnostic value. A low end-to-end score alone doesn't tell you what to fix. High context relevance with low faithfulness points squarely at the generation step, not the retrieval step."

---

### [CARD: Evaluation Datasets]
<!-- id: d16-evaluation-datasets -->

- **Priority:** should_know
- **Category:** rag-evaluation
- **Tags:** evaluation-datasets, synthetic-data

**Core Concept**

Evaluating RAG requires datasets of queries paired with ground-truth relevant chunks and ideal answers, which are often generated synthetically to achieve scale.

**Why It Matters**

Real user queries with human annotations are expensive and slow to build. Synthetic generation allows for scalable evaluation set construction.

**Mental Model / Mechanics**

Use an LLM to generate plausible questions from each document chunk. The "ground truth" relevant chunk for that generated question is automatically known.

A good evaluation set mixes:
- Easy direct factual lookups.
- Harder multi-chunk queries (requiring synthesis across chunks).
- Queries with no good answer in the corpus (to test if the system correctly says 'I don't know').

**Failure Modes / Tradeoffs**

Synthetic generation trades some realism for scale, as synthetic questions may not perfectly match real user phrasing patterns.

**Interview-Ready Explanation**

> "To scale RAG evaluation, we often use synthetic datasets where an LLM generates questions based on document chunks. This provides automatic ground truth, though it trades off some realism compared to actual user queries."

---

### [CARD: Production Concerns — Latency]
<!-- id: d16-production-latency -->

- **Priority:** must_know
- **Category:** production
- **Tags:** latency, performance, generation

**Core Concept**

RAG adds multiple sequential steps (embedding, retrieval, reranking, generation), each contributing to overall system latency.

**Why It Matters**

More retrieved chunks or a bigger LLM generally mean better quality but worse latency — a fundamental production engineering tradeoff.

**Mental Model / Mechanics**

1. Embed query → usually fast (single forward pass).
2. ANN retrieval → fast by design.
3. Reranking → can be a meaningful latency chunk if run against many candidates.
4. LLM generation → often the LARGEST latency contributor, especially for longer outputs, because generation is inherently sequential (one token at a time).

**Failure Modes / Tradeoffs**

Retrieving too much context or generating excessively long answers will heavily degrade user-facing latency.

**Interview-Ready Explanation**

> "In a RAG pipeline, LLM generation is typically the largest latency contributor because it is sequential. Adding steps like reranking or retrieving more chunks improves quality but directly trades off against latency."

---

### [CARD: Production Concerns — Cost]
<!-- id: d16-production-cost -->

- **Priority:** must_know
- **Category:** production
- **Tags:** cost, tokens, trade-offs

**Core Concept**

Cost in RAG systems scales directly with input and output token counts, as well as the compute required for embeddings and reranking.

**Why It Matters**

RAG design choices like chunking strategy, top-K selection, and reranking are not purely quality decisions — they are direct cost levers.

**Mental Model / Mechanics**

- Generation cost: More retrieved context means more input tokens, leading to higher API or compute costs.
- Embedding cost: Cheaper per call but adds up at scale for corpus embedding and high query volumes.
- Reranking cost: Adds compute cost, especially with hosted cross-encoders.

**Failure Modes / Tradeoffs**

Pushing for maximum accuracy by increasing top-K or using heavy cross-encoders can make the per-query cost economically unviable in production.

**Interview-Ready Explanation**

> "RAG architecture decisions like top-K retrieval and reranking are cost and latency levers, not just quality knobs. More retrieved context directly increases input token counts, which drives up generation costs at scale."

---

### [CARD: Caching]
<!-- id: d16-caching -->

- **Priority:** should_know
- **Category:** production
- **Tags:** caching, latency, cost-reduction

**Core Concept**

Caching stores previous results at various stages of the RAG pipeline to avoid redundant computation for repeated or similar queries.

**Why It Matters**

Caching trades a bit of staleness risk for significant latency and cost reductions, particularly for high-repeat workloads like FAQs.

**Mental Model / Mechanics**

- **Embedding cache**: Repeated queries skip re-computing the query embedding.
- **Retrieval cache**: Identical queries skip the ANN search entirely.
- **Full response ("semantic") cache**: Skip the entire pipeline and return a previously-generated answer directly for identical or highly similar queries (biggest latency/cost win).

**Failure Modes / Tradeoffs**

Requires a robust invalidation strategy — cached answers become incorrect if the underlying documents change.

**Interview-Ready Explanation**

> "Caching at different pipeline stages — like embedding, retrieval, or full semantic response caching — drastically reduces latency and cost. However, it requires a strict invalidation strategy to handle document updates."

---

### [CARD: Prompt Injection — A RAG-Specific Amplification]
<!-- id: d16-prompt-injection -->

- **Priority:** must_know
- **Category:** production
- **Tags:** security, prompt-injection, context-poisoning

**Core Concept**

RAG automatically inserts external, potentially untrusted document content into the prompt, widening the attack surface for prompt injection compared to standard chat interfaces.

**Why It Matters**

The LLM cannot inherently distinguish between "trusted instructions from the developer" and "adversarial instructions embedded in retrieved documents."

**Mental Model / Mechanics**

- **Prompt Injection in RAG**: Adversarial instructions hidden in a document are retrieved and executed by the model as if they were legitimate commands.
- **Context Poisoning**: An attacker gets malicious content into the underlying document corpus. This "supply-chain" style attack means the poisoned content could manipulate the system for other, unrelated users' queries.

**Failure Modes / Tradeoffs**

RAG systems are often falsely assumed to be more secure because they "just retrieve documents," when in fact they expose the model to unvetted external inputs.

**Interview-Ready Explanation**

> "RAG widens the prompt injection attack surface because it inserts external content directly into the model's prompt. If an attacker poisons the document corpus, those adversarial instructions can be retrieved and executed, manipulating the system's behavior for unrelated queries."

---

### [CARD: Guardrails]
<!-- id: d16-guardrails -->

- **Priority:** must_know
- **Category:** production
- **Tags:** security, guardrails, mitigations

**Core Concept**

Guardrails are active mitigation strategies used to protect RAG pipelines against prompt injection, context poisoning, and hallucination.

**Why It Matters**

Because the risk of manipulation is high when ingesting external content, production systems need defenses, even if imperfect.

**Mental Model / Mechanics**

- Clearly delimiting retrieved content as data, not instructions (e.g., using specific XML tags).
- Input/output filtering: scanning retrieved content or model output for suspicious patterns.
- Least-privilege data access: retrieving only from vetted, access-controlled sources.
- Human-in-the-loop verification for high-stakes actions.

**Failure Modes / Tradeoffs**

These are mitigations, not complete guarantees. Adversaries constantly find new ways to bypass filtering and delimiting strategies.

**Interview-Ready Explanation**

> "Securing RAG involves guardrails like delimiting content as data, input/output filtering, and least-privilege access. While this is an active research area and no single technique is foolproof, these mitigations are essential for systems that ingest unvetted external content."

---

## Key Connections

- **Day 4 (precision/recall)** → reused directly, adapted to ranked retrieval evaluation
- **Day 12 (sequential generation, context windows, hallucination)** → generation's sequential nature is the largest latency contributor; hallucination risk is exactly why faithfulness gets evaluated as its own dimension
- **Day 15 (chunking, top-K, reranking)** → every one of those design choices is now reframed as a cost/latency lever, not just a quality lever

---

## Common Misconceptions

1. "If the answer sounds fluent and confident, the RAG system is working well." Fluency says nothing about faithfulness — a fluent answer can still be ungrounded in the retrieved context.
2. "Faithfulness and relevance are the same thing." They're genuinely distinct failure modes — a response can be faithful but irrelevant, or seem relevant while being unfaithful.
3. "A bad end-to-end RAG answer means the LLM is bad." It could just as easily be a retrieval failure — this is exactly why decomposed evaluation matters.
4. "RAG is inherently more secure since it's 'just retrieving documents.'" It's the opposite — automatically inserting external content into the prompt widens the attack surface versus a system that only processes direct user input.
5. "Caching a RAG response once is safe indefinitely." It needs an invalidation strategy — stale cached answers become wrong the moment underlying documents change.

---

## Out of Scope

- Exact RAGAS or NLI-based scoring implementation mechanics.
- NDCG's exact formula.
- Specific prompt-injection defense library implementations.
- Formal AI-security research literature beyond conceptual awareness of the risks.

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d16-qa-001]

**Question:** Why can't standard generation metrics alone properly evaluate a RAG system?

**Answer:** A RAG system has two independent components: retrieval and generation. Standard metrics don't capture whether the correct information was found (retrieval) and whether it was used properly without hallucination (generation). Decomposed evaluation is needed to isolate failures.

**Tags:** evaluation, failure-modes

**Linked Cards:** d16-why-rag-needs-evaluation

#### [QA: d16-qa-002]

**Question:** Define Precision@K and Recall@K for retrieval.

**Answer:** Precision@K is the proportion of retrieved chunks in the top K that are relevant. Recall@K is the proportion of all truly relevant chunks in the corpus that successfully appeared in the top K.

**Tags:** precision, recall

**Linked Cards:** d16-retrieval-evaluation

#### [QA: d16-qa-003]

**Question:** What does MRR reward that Recall@K alone doesn't?

**Answer:** MRR (Mean Reciprocal Rank) rewards surfacing the first relevant result higher up in the ranking, rather than just having it appear somewhere within the top K.

**Tags:** mrr, ranking

**Linked Cards:** d16-retrieval-evaluation

#### [QA: d16-qa-004]

**Question:** Define faithfulness/groundedness precisely — what specifically is it checking?

**Answer:** It checks whether every claim in the generated answer is directly supported by the retrieved context, ensuring the model didn't rely on its own trained-in parametric knowledge instead.

**Tags:** faithfulness, groundedness

**Linked Cards:** d16-generation-evaluation

#### [QA: d16-qa-005]

**Question:** Give an example of a response that's faithful but irrelevant, and one that's relevant but unfaithful.

**Answer:** Faithful but irrelevant: The model summarizes the retrieved text accurately, but ignores the specific question asked. Relevant but unfaithful: The model answers the question perfectly, but uses its own outside knowledge instead of the provided context.

**Tags:** faithfulness, relevance

**Linked Cards:** d16-generation-evaluation

#### [QA: d16-qa-006]

**Question:** Walk through the RAG triad and explain its diagnostic value with a concrete example.

**Answer:** 1) Context Relevance (did we retrieve good chunks?), 2) Faithfulness (did the answer stick to those chunks?), 3) Answer Relevance (did the answer address the prompt?). If context relevance is high but faithfulness is low, the retrieval worked but generation failed, meaning you should fix the prompt or model, not the search index.

**Tags:** rag-triad, diagnostics

**Linked Cards:** d16-rag-triad

#### [QA: d16-qa-007]

**Question:** Why is synthetic evaluation-dataset generation a common practical compromise?

**Answer:** Creating real user queries with human-annotated relevant chunks is expensive and slow. Using an LLM to generate plausible questions from known document chunks provides immediate, scalable ground truth, though it may lack some realism.

**Tags:** evaluation-datasets, synthetic-data

**Linked Cards:** d16-evaluation-datasets

#### [QA: d16-qa-008]

**Question:** What are the main latency contributors in a RAG pipeline, and which is usually largest?

**Answer:** Query embedding, ANN retrieval, reranking, and LLM generation. LLM generation is usually the largest contributor because it is inherently sequential (generating one token at a time).

**Tags:** latency, performance

**Linked Cards:** d16-production-latency

#### [QA: d16-qa-009]

**Question:** Why do Day 15's chunking/top-K/reranking decisions double as cost and latency levers?

**Answer:** Increasing top-K or chunk sizes adds more input tokens, directly increasing generation costs and latency. Adding cross-encoder reranking adds compute costs. They are not purely quality optimizations; they drive production expenses.

**Tags:** cost, trade-offs

**Linked Cards:** d16-production-cost

#### [QA: d16-qa-010]

**Question:** Name three caching strategies in a RAG pipeline and what each actually saves.

**Answer:** 1) Embedding cache (saves recomputing query embeddings), 2) Retrieval cache (saves ANN search time), 3) Semantic/Full response cache (saves the entire pipeline execution and generation time).

**Tags:** caching, cost-reduction

**Linked Cards:** d16-caching

#### [QA: d16-qa-011]

**Question:** Why does RAG widen the prompt-injection attack surface compared to a plain chat LLM?

**Answer:** A plain chat LLM only sees user input. RAG automatically retrieves and inserts external, potentially unvetted document content directly into the prompt alongside instructions, which the model may interpret as commands.

**Tags:** security, prompt-injection

**Linked Cards:** d16-prompt-injection

#### [QA: d16-qa-012]

**Question:** What is context poisoning, and why is it a supply-chain-style risk?

**Answer:** Context poisoning occurs when an attacker gets malicious instructions into the underlying document corpus. It's a supply-chain risk because this tainted content can subsequently be retrieved and manipulate the system for entirely unrelated users' queries.

**Tags:** security, context-poisoning

**Linked Cards:** d16-prompt-injection

#### [QA: d16-qa-013]

**Question:** Name two guardrail strategies and be honest about their limitations.

**Answer:** 1) Delimiting retrieved content as data (e.g. with XML tags) — helpful but not foolproof against clever injection. 2) Input/output filtering to scan for suspicious patterns — adversaries constantly find ways to evade filters.

**Tags:** security, guardrails

**Linked Cards:** d16-guardrails
<!-- QA_END -->
