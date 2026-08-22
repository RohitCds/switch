---
day: 12
title: "Transformers: Full Architecture + LLM Training/Inference/Decoding"
topics:
  - transformers
  - llm-architecture
  - training-inference
  - decoding
tags:
  - deep-learning
  - llm
priority_distribution:
  must_know: 10
  should_know: 4
  nice_to_know: 0
---

# DAY 12 — Transformers: Full Architecture + LLM Training/Inference/Decoding

## Daily Objective
By the end of today you should be able to assemble a complete Transformer block from the pieces built across Days 8–11, explain residual connections and why they matter at real depth, explain the training/inference asymmetry, and confidently walk through how an LLM actually generates text — temperature, top-k, top-p, context windows, hallucinations, and why quantization exists.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** the full Transformer block (attention + FFN + residuals + LayerNorm), why residual connections exist, causal masking mechanics, the training-parallel/inference-sequential asymmetry, next-token-prediction pretraining, temperature/top-k/top-p, why context windows are limited.
- 🟡 **SHOULD KNOW:** Pre-LN vs. Post-LN, positional encoding mechanics (sinusoidal vs. learned), quantization's purpose and tradeoff.
- 🟢 **NICE TO KNOW:** exact sinusoidal formula, RoPE mechanics, GELU's formula, distributed pretraining strategies, specific quantization algorithms (GPTQ/AWQ).

---

## Knowledge Cards

---

### [CARD: The Feed-Forward Network (FFN) Sublayer]
<!-- id: d12-ffn-sublayer -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** ffn, transformers, non-linearity
**Core Concept**

After the attention sublayer, each token's representation independently passes through a small two-layer network: linear → activation (ReLU, or more commonly GELU in modern Transformers) → linear, typically expanding to a larger hidden dimension and back down.

**Why It Matters**

Division of labor: attention mixes information across tokens ("gather relevant context"); the FFN adds additional non-linear processing capacity per token ("transform what was gathered"). Just like stacked linear layers collapse into one linear layer, a Transformer needs something beyond attention alone to add real per-token processing power.

**Mental Model / Mechanics**

Critically, this is applied identically (same weights) to every position, but each position is processed independently of the others — no cross-token mixing happens here.

---

### [CARD: Residual Connections]
<!-- id: d12-residual-connections -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** residual-connections, gradient-flow
**Core Concept**

The output of each sublayer (attention, and separately the FFN) is added back to its own input:
`output = Sublayer(x) + x`

**Why It Matters**

Modern Transformers stack dozens to 100+ layers. Without residual connections, gradients would have to flow back through every single one of those layers' non-linear transformations, causing the vanishing-gradient problem and making training this deep essentially impossible.

**Mental Model / Mechanics**

The `+x` term gives gradients a direct, unimpeded path backward.

---

### [CARD: Pre-LN vs Post-LN]
<!-- id: d12-pre-ln-vs-post-ln -->

- **Priority:** should_know
- **Category:** deep-learning
- **Tags:** layer-norm, transformers
**Core Concept**

LayerNorm normalizes across the feature dimension per individual example, independent of batch size. It can be placed before or after the residual addition.

**Mental Model / Mechanics**

- **Post-LN** (original Transformer paper): normalize after the residual addition.
- **Pre-LN** (modern default): normalize the input before it enters the sublayer, then add the residual afterward. Pre-LN tends to give more stable gradient flow when training very deep Transformers.

---

### [CARD: One Full Transformer Block, Assembled]
<!-- id: d12-full-transformer-block -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** transformer-block, architecture
**Core Concept**

A full Transformer block chains LayerNorm, Multi-Head Attention, and a residual connection, followed by LayerNorm, a Feed-Forward Network, and another residual connection.

**Mental Model / Mechanics**

```
Input
  │
  ▼
LayerNorm ──► Multi-Head Attention ──► (+ residual, add back Input)
  │
  ▼
LayerNorm ──► Feed-Forward Network ──► (+ residual, add back previous output)
  │
  ▼
Output  →  feeds into the NEXT stacked block
```
A full Transformer model is this block stacked N times — 12, 24, 96+ layers.

---

### [CARD: Positional Encoding Mechanics]
<!-- id: d12-positional-encoding-mechanics -->

- **Priority:** should_know
- **Category:** llm
- **Tags:** positional-encoding, attention
**Core Concept**

Attention has no inherent sense of order. Positional encoding gives tokens a sense of sequence position.

**Mental Model / Mechanics**

- **Sinusoidal positional encoding** (original Transformer): a fixed, non-learned pattern using sine/cosine functions at different frequencies, added directly to each token's embedding.
- **Learned positional embeddings**: just learn a separate embedding vector per position index. Simpler, but generalizes worse beyond max sequence length seen during training.
- **RoPE (Rotary Positional Embeddings)**: the modern standard in many current LLMs — encodes relative position by rotating query/key vectors.

---

### [CARD: Causal Masking]
<!-- id: d12-causal-masking -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** causal-masking, attention, autoregressive
**Core Concept**

Before softmax, every "future" position's attention score is set to -∞. After softmax, those positions collapse to exactly zero weight — position `i` can only attend to positions `1...i`.

**Why It Matters**

This causal constraint is why decoder-only LLMs can be trained efficiently. During training, the entire target sequence is fed in at once ("teacher forcing") and causal masking guarantees that position `i`'s prediction still only "sees" positions `1...i-1`. Loss for every position can be computed in a single, parallel forward pass.

---

### [CARD: Training-Parallel vs Inference-Sequential Asymmetry]
<!-- id: d12-training-inference-asymmetry -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** training, inference
**Core Concept**

Training an LLM can be heavily parallelized over the sequence, whereas inference generation fundamentally has to happen one token at a time sequentially.

**Mental Model / Mechanics**

- **Training:** The entire sequence is fed in at once. Causal masking ensures no token looks ahead, allowing loss computation for all tokens simultaneously in a single forward pass.
- **Inference:** Because token `i+1` does not exist yet, the model must sequentially generate it before feeding it back in to predict token `i+2`.

---

### [CARD: Next-Token Prediction Pretraining]
<!-- id: d12-next-token-prediction-pretraining -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** pretraining, objective
**Core Concept**

The base LLM training objective is to predict the next token given everything before it.

**Mental Model / Mechanics**

This process is self-supervised: no manual labeling required — the "label" for predicting token `i+1` is just the actual next token in the raw text. It reuses cross-entropy loss over the vocabulary via softmax, at every position, in every sequence, simultaneously.

---

### [CARD: From Base Model to Usable Assistant]
<!-- id: d12-base-model-to-assistant -->

- **Priority:** should_know
- **Category:** llm
- **Tags:** alignment, sft, rlhf
**Core Concept**

A raw pretrained model is good at "continuing text plausibly", but it is not automatically good at following instructions.

**Why It Matters**

To close this gap and create a helpful assistant, models undergo Supervised Fine-Tuning (SFT) and Reinforcement Learning from Human Feedback (RLHF).

---

### [CARD: Autoregressive Decoding at Inference]
<!-- id: d12-autoregressive-decoding -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** inference, decoding
**Core Concept**

At generation time, the model follows a loop: feed in the prompt + tokens generated so far → get probability distribution over vocabulary for next token (softmax) → select a token via decoding strategy → append to sequence → repeat.

**Why It Matters**

This sequential dependency is exactly why generation is inherently slower than training's parallelized forward pass.

---

### [CARD: Decoding Strategies (Temperature, Top-k, Top-p)]
<!-- id: d12-decoding-strategies -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** decoding, sampling, generation
**Core Concept**

Decoding strategies determine how the model selects the next token from the output probability distribution.

**Mental Model / Mechanics**

- **Greedy decoding:** always pick highest-probability token. Simple, deterministic, but repetitive and can get locked in.
- **Temperature:** scaling factor applied to logits before softmax (`logits / T`). `T < 1` → more deterministic. `T > 1` → more random. `T = 1` → unmodified.
- **Top-k sampling:** restrict sampling to only the `k` highest-probability tokens, renormalize, then sample.
- **Top-p (nucleus) sampling:** include the smallest set of highest-probability tokens whose cumulative probability exceeds threshold `p`, then sample from that dynamically-sized set. Adapts to model's confidence at each step.

---

### [CARD: Context Windows]
<!-- id: d12-context-windows -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** context-window, attention
**Core Concept**

The context window is the maximum number of tokens (prompt + generation combined) a model can process in one forward pass.

**Why It Matters**

It is directly limited by attention's O(n²) computational cost and positional encoding's effective range. This strict limit is exactly why Retrieval-Augmented Generation (RAG) matters as a real engineering necessity.

---

### [CARD: Hallucinations]
<!-- id: d12-hallucinations -->

- **Priority:** must_know
- **Category:** llm
- **Tags:** hallucinations, alignment
**Core Concept**

Hallucination occurs when the model generates fluent, confident-sounding text that's factually incorrect.

**Why It Matters**

The training objective is "predict a plausible next token," not "only say true things." There is no built-in mechanism distinguishing linguistically fluent patterns from factually correct statements.

---

### [CARD: Quantization]
<!-- id: d12-quantization -->

- **Priority:** should_know
- **Category:** llm
- **Tags:** quantization, inference
**Core Concept**

Quantization involves representing model weights with fewer bits (e.g., 8-bit or 4-bit integers) instead of 16/32-bit floats.

**Why It Matters**

It dramatically cuts memory footprint and increases inference speed, at some cost to precision.

**Mental Model / Mechanics**

Typically applied post-training.
- **GGUF + llama.cpp:** GGUF is a file format for storing quantized LLM weights efficiently for CPU/consumer-hardware inference; llama.cpp is the inference engine for running models in that format.
- **The tradeoff:** lower bit-width means smaller and faster, but some accuracy degradation.

---

## Key Connections

- Day 8 (non-linearity): the FFN sublayer's entire reason for existing.
- Day 9 (vanishing gradients, residual connections, LayerNorm): residual connections and Pre-LN are the exact forward pointers from Day 9, fully cashed in.
- Day 11 (attention, O(n²)): causal masking's full mechanics, and WHY context windows are cost-constrained.
- Day 3 (cross-entropy): reused unchanged as the pretraining objective.
- Day 8 (softmax): reused unchanged for next-token probabilities.
- Forward: Day 13 (SFT and RLHF), Days 15-16 (RAG motivation from context limits + hallucinations).

---

## Common Misconceptions

1. "Transformers don't need positional encoding since attention is so powerful." — They do.
2. "LLM training happens one token at a time, sequentially, just like inference." — No, training is parallelized via causal masking + teacher forcing.
3. "Greedy decoding is what's typically used in production." — Sampling-based strategies are common for open-ended generation.
4. "Temperature = 0 and greedy decoding are different mechanisms." — They converge to the same behavior.
5. "Hallucination means the model is malfunctioning." — It's an inherent consequence of the training objective.
6. "Quantization always destroys model quality significantly." — At well-calibrated 4-bit, degradation can be quite small.

---

## Out of Scope

- Exact sinusoidal positional encoding formula, or RoPE's rotation math.
- GELU's exact formula.
- Distributed pretraining strategies.
- Specific quantization algorithms (GPTQ, AWQ) beyond knowing they exist.

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d12-qa-001]

**Question:** What is the division of labor between the Attention sublayer and the Feed-Forward Network (FFN) sublayer?

**Answer:** Attention mixes information across tokens to gather relevant context. The FFN processes each token independently, adding non-linear transformation capacity to process what was gathered.

**Tags:** ffn, attention

**Linked Cards:** d12-ffn-sublayer

#### [QA: d12-qa-002]

**Question:** Why are residual connections critical in modern deep Transformers?

**Answer:** They provide an unimpeded path for gradients to flow backward, preventing the vanishing gradient problem and allowing networks with dozens or hundreds of layers to be trained effectively.

**Tags:** residual-connections, gradient-flow

**Linked Cards:** d12-residual-connections

#### [QA: d12-qa-003]

**Question:** What is the difference between Pre-LN and Post-LN architectures?

**Answer:** Pre-LN normalizes the input before it enters the sublayer (giving more stable gradients for deep networks), while Post-LN normalizes after the residual addition.

**Tags:** layer-norm

**Linked Cards:** d12-pre-ln-vs-post-ln

#### [QA: d12-qa-004]

**Question:** What components make up one full Transformer block?

**Answer:** A LayerNorm followed by Multi-Head Attention and a residual connection, and then another LayerNorm followed by a Feed-Forward Network and another residual connection.

**Tags:** transformer-block

**Linked Cards:** d12-full-transformer-block

#### [QA: d12-qa-005]

**Question:** Since attention has no inherent sense of order, how does a Transformer know the sequence position of tokens?

**Answer:** Through positional encoding, which injects position information into token embeddings either via fixed sinusoidal functions, learned embeddings, or relative rotation (RoPE).

**Tags:** positional-encoding

**Linked Cards:** d12-positional-encoding-mechanics

#### [QA: d12-qa-006]

**Question:** How does causal masking enable parallelized training for LLMs?

**Answer:** By setting future token attention scores to -∞, causal masking ensures position `i` only attends to `1...i`. This allows the entire target sequence to be processed simultaneously (teacher forcing) without tokens "looking ahead" to cheat.

**Tags:** causal-masking, training

**Linked Cards:** d12-causal-masking, d12-training-inference-asymmetry

#### [QA: d12-qa-007]

**Question:** Why is generating text during inference fundamentally slower than training?

**Answer:** Training computes loss for all tokens in parallel. Inference must generate text autoregressively (sequentially), because token `i+1` does not exist until it is generated and fed back in to predict `i+2`.

**Tags:** inference, autoregressive

**Linked Cards:** d12-training-inference-asymmetry, d12-autoregressive-decoding

#### [QA: d12-qa-008]

**Question:** What objective function is used during the pretraining of a base LLM?

**Answer:** Next-token prediction. It uses self-supervised cross-entropy loss over the vocabulary to predict the next token given all previous tokens in the sequence.

**Tags:** pretraining

**Linked Cards:** d12-next-token-prediction-pretraining

#### [QA: d12-qa-009]

**Question:** Is a raw pretrained model immediately good at acting as a helpful assistant?

**Answer:** No. It is only trained to predict plausible text continuations. Closing the gap requires Supervised Fine-Tuning (SFT) and Reinforcement Learning from Human Feedback (RLHF).

**Tags:** alignment

**Linked Cards:** d12-base-model-to-assistant

#### [QA: d12-qa-010]

**Question:** How does adjusting the temperature affect token generation?

**Answer:** Temperature scales logits before the softmax step. `T < 1` makes the model more deterministic and confident, while `T > 1` flattens the distribution, making the output more random.

**Tags:** decoding, temperature

**Linked Cards:** d12-decoding-strategies

#### [QA: d12-qa-011]

**Question:** What is the difference between top-k and top-p sampling?

**Answer:** Top-k samples from the fixed `k` most probable tokens. Top-p (nucleus sampling) dynamically includes tokens whose cumulative probability exceeds `p`, adapting to how confident the model is at that step.

**Tags:** decoding, sampling

**Linked Cards:** d12-decoding-strategies

#### [QA: d12-qa-012]

**Question:** Why are LLM context windows strictly limited?

**Answer:** Primarily because of the O(n²) computational and memory cost of the attention mechanism, as well as the effective range of the positional encodings.

**Tags:** context-window

**Linked Cards:** d12-context-windows

#### [QA: d12-qa-013]

**Question:** Why do LLMs hallucinate facts?

**Answer:** Their training objective is just to predict a plausible linguistic continuation, not to verify truthfulness. There is no built-in mechanism to distinguish fluent text from factually correct text.

**Tags:** hallucinations

**Linked Cards:** d12-hallucinations
<!-- QA_END -->
