---
day: 11
title: "Attention Mechanisms"
topics:
  - deep-learning
  - nlp
  - transformers
tags:
  - attention
  - qkv
  - transformers
priority_distribution:
  must_know: 6
  should_know: 2
  nice_to_know: 0
---

# DAY 11 — ATTENTION MECHANISMS

## Daily Objective
By the end of today you should be able to explain, from first principles, why attention exists, what Query/Key/Value actually represent and why that framing is genuinely useful, the full step-by-step computation of scaled dot-product attention, the difference between self-attention and cross-attention, and why multi-head attention is used instead of one large attention computation.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** why attention exists, Q/K/V intuition, the full attention computation (score → scale → softmax → weighted sum), self-attention vs. cross-attention, why multi-head attention.
- 🟡 **SHOULD KNOW:** causal masking's purpose, attention's O(n²) cost and why it matters practically.
- 🟢 **NICE TO KNOW:** flash attention / efficient-attention variants, the original paper's exact notation.

---

## Knowledge Cards

---

### [CARD: The Problem Attention Solves]
<!-- id: d11-why-attention-exists -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** attention, rnn-limitations
**Core Concept**

Attention solves two core limitations of RNNs: processing sequentially (no parallelization) and information loss over long distances. It allows every position in a sequence to directly attend to every other position in a single, parallel computation.
**Why It Matters**

Distance between two tokens no longer limits how easily information flows between them. This parallelization enables modern large-scale training and long-context understanding.
**Mental Model / Mechanics**

Instead of information flowing step-by-step through a hidden state, every token looks directly at every other token simultaneously.
**Interview-Ready Explanation**

> Attention solves RNNs' sequential bottleneck and vanishing gradients over distance by letting every position in a sequence directly attend to every other position in a single, parallel computation, regardless of distance.

---

### [CARD: Attention as Relevance-Weighted Averaging]
<!-- id: d11-attention-as-relevance-weighted-averaging -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** attention, weighted-sum
**Core Concept**

For each token, attention computes an output that's a weighted combination of every other token's representation. The weights reflect how relevant each other token is to understanding the current one.
**Example**

"The animal didn't cross the street because it was too tired." To correctly represent what "it" refers to, the model needs to attend strongly to "animal" specifically.
**Interview-Ready Explanation**

> Attention is essentially a relevance-weighted average. For a given token, it computes a new representation by taking a weighted sum of all other tokens, where the weights are based on relevance.

---

### [CARD: Query, Key, Value (Q/K/V)]
<!-- id: d11-query-key-value -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** qkv, attention
**Core Concept**

Every input token embedding gets projected via three separate learned weight matrices into three vectors: Query (Q), Key (K), and Value (V).
**Why It Matters**

This search-like mechanism allows tokens to dynamically request context, advertise their content, and provide actual values based on relevance.
**Mental Model / Mechanics**

- **Query (Q):** "what am I looking for?" — the current token's request for relevant context.
- **Key (K):** "what do I contain?" — what each token advertises about itself to be matched against queries.
- **Value (V):** "what do I actually give you if you attend to me?" — the actual content aggregated once relevance is determined.

The search system analogy: Query is your search query. Keys are like index summaries. Values are the actual document content.
**Failure Modes / Tradeoffs**

- Important clarification: Q, K, and V are NOT three different pieces of the raw input text. They're all derived from the same input token embeddings via three different learned linear projections.
**Interview-Ready Explanation**

> In attention, each token produces a Query (what I'm looking for), a Key (what I contain), and a Value (what I provide). These are derived from the input embeddings via learned linear projections. Queries match with Keys to determine relevance weights, which are then used to sum the Values.

---

### [CARD: Scaled Dot-Product Attention]
<!-- id: d11-scaled-dot-product-attention -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** attention-computation, softmax, scaling
**Core Concept**

The computation of attention involves finding relevance scores via dot products, scaling them, converting to probabilities via softmax, and computing a weighted sum.
**Mental Model / Mechanics**

```
Step 1 — SCORE:   score = Q · K            (dot product: similarity)
Step 2 — SCALE:   score = score / √d_k      (d_k = dimension of key vectors)
Step 3 — SOFTMAX: weights = softmax(score)  (turns into probability distribution)
Step 4 — WEIGHTED SUM:  output = Σ (weight_i × V_i)
```
Compactly: `Attention(Q, K, V) = softmax(QKᵀ / √d_k) · V`
**Why It Matters**

The scaling step (`/√d_k`) is crucial. For higher-dimensional key vectors, raw dot products can grow very large. Large values pushed into softmax cause saturation — extremely peaked near-one-hot outputs with tiny gradients. Dividing by `√d_k` keeps scores in a well-behaved range.
**Interview-Ready Explanation**

> We compute attention by taking the dot product of Queries and Keys to get scores, scaling down by the square root of the key dimension to prevent softmax saturation, applying softmax to get weights, and taking a weighted sum of the Values.

---

### [CARD: Self-Attention vs. Cross-Attention]
<!-- id: d11-self-attention-vs-cross-attention -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** self-attention, cross-attention, architectures
**Core Concept**

In self-attention, tokens attend to other tokens within the same sequence. In cross-attention, tokens in one sequence attend to tokens in a different sequence.
**Mental Model / Mechanics**

| | Self-attention | Cross-attention |
|---|---|---|
| Q source | Same sequence | Decoder (or target) sequence |
| K, V source | Same sequence | A different sequence (encoder output) |
| Used in | Encoder-only, decoder-only models | Encoder-decoder models (e.g. Flan-T5) |
**Interview-Ready Explanation**

> Self-attention derives Q, K, and V from the same sequence. Cross-attention derives Queries from one sequence (e.g., a decoder) and Keys and Values from another (e.g., an encoder), linking different parts of a model.

---

### [CARD: Multi-Head Attention]
<!-- id: d11-multi-head-attention -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** multi-head, attention
**Core Concept**

Compute attention multiple times in parallel, each with its own independently-learned Q/K/V projection matrices.
**Why It Matters**

A single attention computation would have to blend several genuinely different types of relevant relationships into one averaged representation.
**Mental Model / Mechanics**

Multiple heads let the model attend to several different kinds of relationships simultaneously (grammatical structure, coreference, local patterns). After all heads compute their outputs, they're concatenated and passed through one final learned linear projection.
**Interview-Ready Explanation**

> Multi-head attention runs multiple attention mechanisms in parallel with independent weights. This allows the model to simultaneously attend to different types of relationships (like syntax or coreference) rather than blending them into a single average.

---

### [CARD: Causal Masking]
<!-- id: d11-causal-masking -->

- **Priority:** should_know
- **Category:** deep-learning
- **Tags:** masking, autoregressive, decoder
**Core Concept**

A technique to prevent tokens from attending to future tokens during generation.
**Mental Model / Mechanics**

A mask is applied to attention scores, setting future-position scores to -∞ before softmax, so they collapse to zero weight. This enforces the left-to-right "causal" constraint for autoregressive generation.
**Interview-Ready Explanation**

> Causal masking sets attention scores for future positions to negative infinity before the softmax step. This ensures that during autoregressive generation, a token can only attend to past and current tokens, not future ones.

---

### [CARD: Attention's Computational Cost]
<!-- id: d11-attention-computational-cost -->

- **Priority:** should_know
- **Category:** deep-learning
- **Tags:** complexity, sequence-length
**Core Concept**

Because attention computes a relevance score between every pair of tokens, its cost scales quadratically with sequence length: O(n²).
**Why It Matters**

This is why context window length is a real, hard engineering constraint for LLMs, and part of why RAG's retrieval step is a practical necessity.
**Interview-Ready Explanation**

> Standard attention requires computing pairwise scores between all tokens, leading to an O(n²) computational and memory complexity with respect to sequence length. This makes extremely long context windows computationally expensive.

---

## Key Connections
- Day 8 (softmax): reused directly and unchanged as the mechanism turning attention scores into weights.
- Day 9 (gradient saturation): exact motivation for attention's √d_k scaling step.
- Day 10 (RNN limitations): attention is the direct fix for both unsolved RNN problems.
- Resume tie-in (Flan-T5): cross-attention is literally the mechanism connecting decoder back to input.
- Forward: Day 12 (causal masking full treatment, complete Transformer block), Day 15 (RAG retrieval is Q/K/V pattern at query-to-document-corpus scale).

---

## Common Misconceptions
1. "Attention only looks at nearby words, like a sliding window." — No, any two positions can attend to each other regardless of distance.
2. "Q, K, and V are three different parts of the input text." — No, they're all derived from the same token embeddings via three separate learned projection matrices.
3. "More attention heads always help." — Diminishing returns, and more compute.
4. "Self-attention and cross-attention are the same mechanism, just different names." — Same formula, but different source of K/V — architecturally significant.

---

## Out of Scope
- Backpropagation through the attention mechanism in detail.
- Positional encoding formulas (sinusoidal vs. learned) — Day 12.
- Flash attention or other efficient-attention implementation variants.
- The original "Attention Is All You Need" paper's exact notation or proofs.

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d11-qa-001]
**Question:** What are the two core limitations of RNNs that attention solves?
**Answer:** RNNs process sequentially (which prevents parallelization) and suffer from information loss over long distances because data must flow through many sequential steps. Attention allows parallel processing and direct connections between all tokens regardless of distance.
**Tags:** rnn, attention
**Linked Cards:** d11-why-attention-exists

#### [QA: d11-qa-002]
**Question:** At a high level, what is attention doing for a given token?
**Answer:** It computes a new representation for the token by taking a relevance-weighted average of every other token's representation.
**Tags:** attention, weighted-average
**Linked Cards:** d11-attention-as-relevance-weighted-averaging

#### [QA: d11-qa-003]
**Question:** In the context of attention, what do Query, Key, and Value represent conceptually?
**Answer:** Query (Q) is "what am I looking for?". Key (K) is "what do I contain?" (advertisement). Value (V) is "what do I actually give you?" (content).
**Tags:** qkv, intuition
**Linked Cards:** d11-query-key-value

#### [QA: d11-qa-004]
**Question:** Are Q, K, and V derived from different parts of the input text?
**Answer:** No, they are all derived from the exact same input token embeddings via three separate learned projection matrices.
**Tags:** qkv, projection
**Linked Cards:** d11-query-key-value

#### [QA: d11-qa-005]
**Question:** What are the four main mathematical steps in computing scaled dot-product attention?
**Answer:** 1) Score (Q · K), 2) Scale (divide by √d_k), 3) Softmax (convert to probabilities), 4) Weighted sum (multiply by V and sum).
**Tags:** formula, math
**Linked Cards:** d11-scaled-dot-product-attention

#### [QA: d11-qa-006]
**Question:** Why is the scaling step (dividing by √d_k) necessary in attention?
**Answer:** For higher-dimensional vectors, raw dot products grow very large. Large values pushed into softmax cause saturation (tiny gradients, near-one-hot outputs). Scaling keeps scores in a well-behaved range.
**Tags:** scaling, softmax, gradient-saturation
**Linked Cards:** d11-scaled-dot-product-attention

#### [QA: d11-qa-007]
**Question:** What is the difference between self-attention and cross-attention?
**Answer:** In self-attention, Q, K, and V all come from the same sequence. In cross-attention, Q comes from one sequence (e.g., decoder) while K and V come from a different sequence (e.g., encoder).
**Tags:** self-attention, cross-attention
**Linked Cards:** d11-self-attention-vs-cross-attention

#### [QA: d11-qa-008]
**Question:** Why do transformers use multi-head attention instead of one single attention computation?
**Answer:** A single attention head would have to blend many different types of relationships into one average. Multiple heads let the model attend to several different kinds of relationships (e.g., grammar, coreference) simultaneously.
**Tags:** multi-head, architecture
**Linked Cards:** d11-multi-head-attention

#### [QA: d11-qa-009]
**Question:** What is the purpose of causal masking in attention?
**Answer:** It prevents tokens from attending to future tokens during autoregressive generation by setting future-position scores to -∞ before the softmax step.
**Tags:** masking, autoregressive
**Linked Cards:** d11-causal-masking

#### [QA: d11-qa-010]
**Question:** What is the computational complexity of standard attention with respect to sequence length, and why?
**Answer:** O(n²), because it computes a relevance score between every possible pair of tokens in the sequence.
**Tags:** complexity, big-o
**Linked Cards:** d11-attention-computational-cost

#### [QA: d11-qa-011]
**Question:** How is cross-attention used in encoder-decoder models like Flan-T5?
**Answer:** The decoder generates Queries to attend to the Keys and Values produced by the encoder, effectively connecting the output generation process to the input context.
**Tags:** cross-attention, encoder-decoder
**Linked Cards:** d11-self-attention-vs-cross-attention

<!-- QA_END -->
