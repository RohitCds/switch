---
day: 22
title: "LLM Inference & Serving"
topics:
  - llm-inference
  - vllm
  - quantization
  - serving
tags:
  - inference
  - systems
  - engineering
priority_distribution:
  must_know: 8
  should_know: 5
  nice_to_know: 0
---

# DAY 22 — LLM Inference & Serving

## Daily Objective
Understand the bottlenecks in LLM inference, specifically the differences between compute-bound and memory-bound operations, the mechanics of the KV cache and PagedAttention, throughput engineering (TTFT vs TPOT, continuous batching), and modern quantization strategies for efficient serving.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Compute vs Memory bounds, KV Cache scaling, PagedAttention (vLLM), TTFT vs TPOT, Prefill vs Decode, Continuous Batching, Precision Formats (FP8/INT8/INT4), PTQ vs QAT.
- 🟡 **SHOULD KNOW:** GPU Memory Footprint Calculation, Chunked Prefill, Speculative Decoding, AWQ vs GPTQ, KV Cache Quantization.
- 🟢 **NICE TO KNOW:** Custom CUDA kernel implementations for Attention, hardware-specific optimization details (e.g., specific Tensor Core scheduling).

---

## Knowledge Cards

---

### [CARD: Compute-Bound vs Memory-Bandwidth-Bound]
<!-- id: d22-compute-vs-memory-bound -->

- **Priority:** must_know
- **Category:** llm-inference
- **Tags:** gpu-architecture, bottlenecks, arithmetic-intensity
**Core Concept**

Operations are **compute-bound** when the limiting factor is how fast the GPU can perform math operations (FLOPs). They are **memory-bandwidth-bound** when the bottleneck is how fast data can be moved from GPU memory (HBM) to the compute cores (SRAM).

**Why It Matters**

LLM inference shifts dynamically between these two states. Optimization strategies depend entirely on which regime you are in; throwing more compute at a memory-bound problem yields zero improvement.

**Mental Model / Mechanics**
  - **Arithmetic Intensity:** Ratio of FLOPs performed per byte of data transferred.
  - **High intensity (Compute-bound):** Matrix multiplications with large batch sizes (e.g., Prefill phase).
  - **Low intensity (Memory-bound):** Reading the entire model weights to generate a single token (e.g., Decode phase at batch size 1).

**Example**
  During the prefill phase (processing a prompt), a large input sequence is multiplied against the weights in parallel. This is high arithmetic intensity and is **compute-bound**. During auto-regressive decoding, generating one token requires loading the entire model weights and KV cache, doing relatively little math, making it strictly **memory-bandwidth-bound**.

**Failure Modes / Tradeoffs**
  - Failing to batch requests means inference remains perpetually memory-bound, resulting in horrific GPU utilization.

**Interview-Ready Explanation**
  > An operation is compute-bound if limited by FLOPs, and memory-bandwidth-bound if limited by memory transfer speeds. In LLMs, prompt processing (prefill) is typically compute-bound due to parallel matrix multiplications, while token generation (decode) is memory-bound because we load the full model weights to do very little math per token.

---

### [CARD: The KV Cache and Its Scaling]
<!-- id: d22-kv-cache-scaling -->

- **Priority:** must_know
- **Category:** llm-inference
- **Tags:** kv-cache, memory, attention
**Core Concept**

The **KV Cache** stores the Key and Value vectors of previously computed tokens during auto-regressive generation. This prevents recomputing them at every step.

**Why It Matters**

Without the KV cache, generation complexity would be O(N^3) instead of O(N^2) per sequence. However, the KV cache consumes massive amounts of GPU memory and scales linearly with sequence length, batch size, and model dimensions.

**Mental Model / Mechanics**
  - Memory required = 2 (Key, Value) × `batch_size` × `sequence_length` × `num_layers` × `hidden_size` × `bytes_per_parameter`.
  - As context windows grow (e.g., 32k, 128k), the KV cache can easily exceed the size of the model weights themselves.

**Failure Modes / Tradeoffs**
  - Out of Memory (OOM) errors during inference are most often caused by the KV cache growing too large for the available GPU VRAM.

**Interview-Ready Explanation**
  > The KV cache stores past Key and Value vectors to avoid redundant computations during token generation. While it makes inference computationally feasible, its memory footprint scales linearly with batch size and sequence length, often becoming the primary bottleneck for serving large context windows.

---

### [CARD: PagedAttention & vLLM]
<!-- id: d22-paged-attention-vllm -->

- **Priority:** must_know
- **Category:** llm-inference
- **Tags:** vllm, paged-attention, memory-management
**Core Concept**

**PagedAttention** (introduced by vLLM) manages KV cache memory like an operating system manages virtual memory. It partitions the KV cache into fixed-size blocks (pages) that do not need to be contiguous in physical memory.

**Why It Matters**

Traditional serving engines pre-allocate contiguous chunks of memory for the maximum possible sequence length, leading to massive internal fragmentation (wasted memory). PagedAttention eliminates this, allowing batch sizes to increase by up to 4x.

**Mental Model / Mechanics**
  ```
  OS Virtual Memory: Virtual Pages -> Page Table -> Physical Frames
  PagedAttention: Logical Token Blocks -> Block Table -> Physical KV Blocks
  ```
  - Blocks are allocated on-demand during generation.
  - Allows memory sharing for complex decoding (e.g., beam search, parallel sampling) since multiple sequences can point to the same physical blocks.

**Failure Modes / Tradeoffs**
  - Block size is a hyperparameter. Too small = high overhead for the block table. Too large = internal fragmentation within the block.

**Interview-Ready Explanation**
  > PagedAttention brings OS-style virtual memory to LLM serving. Instead of pre-allocating contiguous memory for the maximum sequence length, it breaks the KV cache into non-contiguous blocks allocated on-demand. This eliminates memory fragmentation and drastically increases achievable batch sizes.

---

### [CARD: Calculating GPU Memory Footprints]
<!-- id: d22-gpu-memory-footprints -->

- **Priority:** should_know
- **Category:** engineering
- **Tags:** memory, hardware, sizing
**Core Concept**

Estimating the VRAM required to serve a model involves summing the model weights footprint and the KV cache footprint.

**Why It Matters**

Essential for infrastructure planning, determining how many GPUs are needed, and configuring serving engines (e.g., max batch sizes).

**Mental Model / Mechanics**
  - **Weights:** `Parameters × bytes_per_param`. (e.g., 70B in FP16 = 70B × 2 bytes = 140GB).
  - **KV Cache:** `2 × batch_size × seq_len × layers × hidden_size × bytes_per_param`.
  - *Example 70B model (FP16):* 80 layers, 8192 hidden size.
    KV cache per token = 2 × 80 × 8192 × 2 bytes ≈ 2.6 MB.
    For 32K context (batch size 1) = 32,768 × 2.6 MB ≈ 85 GB.
  - **Total:** 140GB + 85GB = 225GB minimum VRAM (Requires 3x 80GB A100s).

**Failure Modes / Tradeoffs**
  - Forgetting to account for the context window length, leading to unexpected OOMs in production.
  - Ignoring context sharing techniques (like GQA/MQA) which reduce KV cache size.

**Interview-Ready Explanation**
  > To calculate VRAM, sum the model weights and maximum KV cache size. A 70B model in FP16 takes ~140GB for weights. The KV cache uses roughly 2.6MB per token for a 70B model, meaning a 32K context adds ~85GB. You'd need multiple 80GB GPUs just to serve a single request of that length.

---

### [CARD: TTFT vs TPOT]
<!-- id: d22-ttft-vs-tpot -->

- **Priority:** must_know
- **Category:** engineering
- **Tags:** metrics, throughput, latency
**Core Concept**

**TTFT (Time To First Token):** Latency from receiving the request to outputting the first generated token.
**TPOT (Time Per Output Token):** The average time taken to generate each subsequent token.

**Why It Matters**

These are the core user-facing metrics for LLM serving. They represent competing tradeoffs between responsiveness and total throughput.

**Mental Model / Mechanics**
  - **TTFT** is driven by the **Prefill** phase (processing the prompt). Compute-bound.
  - **TPOT** is driven by the **Decode** phase (autoregressive generation). Memory-bandwidth-bound.
  - *Tradeoff:* Increasing batch size improves overall throughput (tokens/sec) but degrades TTFT and TPOT for individual users.

**Interview-Ready Explanation**
  > TTFT measures responsiveness—how long until the user sees the first word. TPOT measures generation speed—how fast the rest of the text appears. Optimizing a serving engine requires balancing these; large batch sizes improve system throughput but worsen individual TPOT and TTFT.

---

### [CARD: Prefill vs Decode Phases]
<!-- id: d22-prefill-vs-decode -->

- **Priority:** must_know
- **Category:** llm-inference
- **Tags:** architecture, generation
**Core Concept**

LLM generation happens in two distinct phases with different computational profiles: **Prefill** (processing the input prompt in parallel) and **Decode** (generating tokens one by one sequentially).

**Why It Matters**

Because they have different bottlenecks (compute vs memory), serving engines must handle them differently to maximize hardware utilization.

**Mental Model / Mechanics**
  - **Prefill:** The entire prompt is passed through the model at once. Highly parallel, compute-bound matrix multiplications. Generates the initial KV cache.
  - **Decode:** Uses the KV cache to generate the next token. Then adds the new token to the KV cache, and repeats. Sequential, memory-bandwidth-bound.

**Failure Modes / Tradeoffs**
  - If prefill and decode are handled synchronously in the same batch, the fast decode steps must wait for the slow prefill step to finish (the "bubble").

**Interview-Ready Explanation**
  > Prefill is the highly parallel, compute-bound phase where the model digests the input prompt and builds the initial KV cache. Decode is the sequential, memory-bound phase where tokens are generated one by one. Modern engines must multiplex these phases to keep GPU utilization high.

---

### [CARD: Continuous Batching]
<!-- id: d22-continuous-batching -->

- **Priority:** must_know
- **Category:** engineering
- **Tags:** batching, throughput, serving
**Core Concept**

Instead of waiting for all requests in a static batch to finish generating, **Continuous Batching** inserts new requests and removes finished requests at the iteration level (per token).

**Why It Matters**

Static batching is incredibly inefficient because requests have different prompt and output lengths; GPUs sit idle waiting for the longest request to finish. Continuous batching increases throughput by up to 20x.

**Mental Model / Mechanics**
  - *Iteration N:* Request A finishes. Request B is still decoding.
  - *Iteration N+1:* Request A is evicted. Request C (a new prompt) is slotted in. Request C undergoes prefill while Request B undergoes a decode step.
  - Engine dynamically schedules prefill and decode operations together in the same forward pass.

**Failure Modes / Tradeoffs**
  - High scheduling complexity.
  - Merging prefill (compute-bound) and decode (memory-bound) in the same batch requires careful tuning to avoid stalling the decode tokens while the prefill processes.

**Interview-Ready Explanation**
  > Continuous batching dynamically adds and removes requests at the token level, rather than waiting for an entire batch to finish. This eliminates GPU idle time caused by varying request lengths, dramatically increasing overall system throughput.

---

### [CARD: Chunked Prefill]
<!-- id: d22-chunked-prefill -->

- **Priority:** should_know
- **Category:** engineering
- **Tags:** prefill, scheduling, throughput
**Core Concept**

**Chunked Prefill** splits a very long input prompt into smaller "chunks" and processes them over multiple forward passes, interleaved with decode steps of other requests.

**Why It Matters**

Without chunking, a massive prompt (e.g., 100K tokens) will monopolize the GPU for seconds during prefill, stalling the generation of all other active requests in the batch and destroying TPOT for those users.

**Mental Model / Mechanics**
  - Prompt: 10,000 tokens.
  - Chunk size: 2,048 tokens.
  - Engine processes 2048 prompt tokens + decodes 1 token for other requests in the batch -> repeat 5 times.
  - First token generated after 5 iterations.

**Failure Modes / Tradeoffs**
  - Increases TTFT for the long request slightly.
  - Preserves consistent TPOT (no latency spikes) for other requests in the batch.

**Interview-Ready Explanation**
  > Chunked prefill breaks long prompts into smaller segments processed over multiple iterations. This prevents a massive prompt from monopolizing the GPU and causing latency spikes (stuttering) for other users whose tokens are currently decoding.

---

### [CARD: Speculative Decoding]
<!-- id: d22-speculative-decoding -->

- **Priority:** should_know
- **Category:** engineering
- **Tags:** latency, decoding, optimization
**Core Concept**

**Speculative Decoding** uses a smaller, faster "draft" model to predict the next tokens. The large "target" model then verifies these tokens in a single parallel forward pass.

**Why It Matters**

It accelerates inference (improving TPOT) without changing the final output distribution. It exploits the fact that modern GPUs have excess compute capacity during the memory-bound decode phase.

**Mental Model / Mechanics**
  1. Draft model (e.g., 1B params) autoregressively generates 4 tokens very quickly.
  2. Target model (e.g., 70B params) processes those 4 tokens in parallel (compute-bound).
  3. If Target model agrees with the Draft's tokens, we just generated 4 tokens in the time it usually takes to generate 1.
  4. If Target disagrees at token 3, it rejects tokens 3 & 4, and uses its own output for token 3.

**Failure Modes / Tradeoffs**
  - Only works well if the draft model has a high acceptance rate.
  - If acceptance rate is low, it actually slows down inference due to overhead.

**Interview-Ready Explanation**
  > Speculative decoding uses a fast, small model to draft multiple tokens, which a large model verifies in a single parallel pass. Because the large model evaluates the draft tokens in parallel, it speeds up generation without degrading output quality, provided the draft model's predictions are accurate enough.

---

### [CARD: Precision Formats (FP8, INT8, INT4)]
<!-- id: d22-precision-formats -->

- **Priority:** must_know
- **Category:** llm-inference
- **Tags:** quantization, precision, memory
**Core Concept**

Lowering the bit-width of model parameters (Quantization). FP16/BF16 use 16 bits (2 bytes). FP8 uses 8 bits. INT8 uses 8-bit integers. INT4 uses 4-bit integers.

**Why It Matters**

Reduces memory footprint and memory bandwidth bottlenecks. 4-bit quantization allows a 70B model to fit on a single 40GB GPU instead of three 80GB GPUs.

**Mental Model / Mechanics**
  - **FP8 (Floating Point 8):** Retains dynamic range with an exponent and mantissa. Supported natively on Hopper (H100) architecture.
  - **INT8 / INT4:** Linear quantization to integer buckets. Requires scale and zero-point parameters to map back to floating point space.

**Failure Modes / Tradeoffs**
  - Extreme quantization (INT4) introduces quantization noise and perplexity degradation.
  - Requires specific hardware support (e.g., Tensor Cores) for the math to actually be faster; otherwise, you only save memory, not compute time.

**Interview-Ready Explanation**
  > Quantization reduces the bit-width of weights from 16 bits down to 8 or 4 bits. This slashes the memory footprint and accelerates memory-bound decoding. FP8 is a hardware-native floating-point format on modern GPUs, while INT8 and INT4 map values to integers using scales and zero-points.

---

### [CARD: Post-Training Quantization vs Quantization-Aware Training]
<!-- id: d22-ptq-vs-qat -->

- **Priority:** must_know
- **Category:** llm-inference
- **Tags:** quantization, training
**Core Concept**

**PTQ (Post-Training Quantization)** quantizes a model after it has been fully trained, using a small calibration dataset. **QAT (Quantization-Aware Training)** simulates quantization noise *during* the training/finetuning process so the model learns to adapt to it.

**Why It Matters**

PTQ is cheap, fast, and easy. QAT is computationally expensive but yields much better performance, especially at aggressive bit-widths (like INT4 or lower).

**Mental Model / Mechanics**
  - **PTQ:** Train in FP16 -> Calibrate -> Convert to INT8. (Can cause accuracy drops).
  - **QAT:** Train in FP16, but inject fake quantization operations during the forward pass. Backpropagate in FP16. (Recovers accuracy).

**Failure Modes / Tradeoffs**
  - PTQ struggles with outliers in LLM activations, often leading to severe degradation if not handled carefully (e.g., using SmoothQuant or AWQ).

**Interview-Ready Explanation**
  > PTQ quantizes a model after training is complete, which is fast but can lose accuracy. QAT simulates quantization during training so the weights adapt to the precision loss, resulting in better accuracy at the cost of significant training overhead.

---

### [CARD: AWQ and GPTQ]
<!-- id: d22-awq-vs-gptq -->

- **Priority:** should_know
- **Category:** llm-inference
- **Tags:** quantization, algorithms
**Core Concept**

Advanced PTQ methods designed specifically for LLMs to handle outlier weights and activations.
**AWQ (Activation-aware Weight Quantization):** Protects the most "salient" weights (based on activation magnitude) by keeping them in higher precision or scaling them.
**GPTQ:** Uses second-order (Hessian) information to iteratively quantize weights in a way that minimizes the error of the layer's output.

**Why It Matters**

Standard PTQ destroys LLMs because a tiny percentage of weights with massive activations drive the model's behavior. AWQ and GPTQ allow for nearly lossless INT4 quantization.

**Failure Modes / Tradeoffs**
  - Requires a calibration dataset to determine which weights/activations are salient.
  - The resulting quantized models require specialized CUDA kernels to run efficiently.

**Interview-Ready Explanation**
  > Standard quantization fails for LLMs due to outlier activations. GPTQ uses second-order optimization to minimize quantization error, while AWQ observes activations to identify and protect the most critical weights. Both enable nearly lossless 4-bit inference.

---

### [CARD: KV Cache Quantization]
<!-- id: d22-kv-cache-quantization -->

- **Priority:** should_know
- **Category:** llm-inference
- **Tags:** kv-cache, quantization, memory
**Core Concept**

Quantizing the Key and Value vectors stored in the KV cache from FP16 down to FP8 or INT8/INT4.

**Why It Matters**

While weight quantization reduces the static memory footprint, the KV cache grows dynamically. For massive context windows, the KV cache dwarfs the model weights. KV cache quantization directly increases the maximum possible sequence length and batch size.

**Mental Model / Mechanics**
  - Instead of saving 2 bytes per element in the cache, save 1 byte (FP8).
  - Cuts KV cache size by 50%, allowing 2x the batch size or 2x the context window.

**Failure Modes / Tradeoffs**
  - Quantizing the KV cache can degrade long-context retrieval capabilities (e.g., needle-in-a-haystack tasks) if the precision loss blurs specific attention patterns.

**Interview-Ready Explanation**
  > While weight quantization shrinks the model, KV cache quantization shrinks the memory required for context. By storing past keys and values in 8-bit or 4-bit precision, we can double or quadruple the sequence length or batch size, though it requires careful tuning to avoid losing information in long contexts.

---

## Key Connections
- **Memory vs Compute Bounds:** Defines why we care about the KV cache (memory bound) and batching (shifting towards compute bound).
- **PagedAttention & Continuous Batching:** Symbiotic relationship. PagedAttention provides the memory flexibility required to rapidly swap requests in and out of the batch during Continuous Batching.
- **Chunked Prefill & TTFT/TPOT:** Directly trades off a slight hit to TTFT to maintain stable TPOT for other concurrent users.

---

## Common Misconceptions
- **"More GPUs make token generation faster."** Generating a token is memory-bandwidth bound. Adding GPUs (via tensor parallelism) speeds it up by splitting the weight loading, but purely adding compute FLOPs does nothing for batch size 1 latency.
- **"Quantization makes the model do math faster."** Often false. Unless you have specific hardware (like INT8 Tensor Cores), the math is still done in FP16. The speedup comes purely from loading the weights faster from memory (reducing memory bandwidth bottleneck).

---

## Out of Scope
- Deep dive into hardware architectures (e.g., SMs, Warps, SRAM caches) beyond the basic memory vs compute abstraction.
- Implementing custom CUDA kernels for FlashAttention.
- MoE (Mixture of Experts) specific routing optimizations.

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d22-qa-001]
**Question:** Why does increasing batch size improve overall throughput but potentially degrade TTFT and TPOT?
**Answer:** Increasing batch size improves throughput by shifting operations from memory-bandwidth-bound to compute-bound, utilizing GPU FLOPs more efficiently. However, it degrades TTFT and TPOT because the GPU is doing more total work per forward pass, meaning individual requests wait slightly longer for their specific tokens to be computed.
**Tags:** throughput, metrics, batching
**Linked Cards:** d22-ttft-vs-tpot, d22-compute-vs-memory-bound

#### [QA: d22-qa-002]
**Question:** Explain how PagedAttention solves KV cache memory fragmentation.
**Answer:** Traditional systems pre-allocate a contiguous chunk of memory for a request's maximum possible sequence length. If a request finishes early, that memory is wasted (internal fragmentation). PagedAttention divides the KV cache into fixed-size blocks allocated on-demand, just like OS virtual memory, virtually eliminating fragmentation and allowing much higher batch sizes.
**Tags:** vllm, paged-attention, memory
**Linked Cards:** d22-paged-attention-vllm, d22-kv-cache-scaling

#### [QA: d22-qa-003]
**Question:** What is the primary cause of latency spikes ("stuttering") for users during continuous batching, and how is it mitigated?
**Answer:** Latency spikes occur when a new request with a very long prompt enters the system. Its compute-intensive "prefill" phase monopolizes the GPU, stalling the quick "decode" phases of other requests. This is mitigated using Chunked Prefill, which breaks the long prompt into smaller segments processed across multiple iterations.
**Tags:** latency, chunked-prefill, continuous-batching
**Linked Cards:** d22-chunked-prefill, d22-continuous-batching

#### [QA: d22-qa-004]
**Question:** Under what conditions does Speculative Decoding actually slow down inference?
**Answer:** Speculative decoding relies on a small draft model predicting tokens that a large target model verifies in parallel. If the draft model is highly inaccurate (low acceptance rate), the target model frequently rejects the tokens. The time spent running the draft model and verifying rejected tokens becomes pure overhead, slowing down the overall generation.
**Tags:** speculative-decoding, latency
**Linked Cards:** d22-speculative-decoding

#### [QA: d22-qa-005]
**Question:** Why are standard Post-Training Quantization (PTQ) techniques often insufficient for LLMs, and how do AWQ/GPTQ address this?
**Answer:** Standard PTQ treats all weights equally, but LLMs feature outlier activations—a tiny fraction of weights with huge impacts on the output. Standard quantization destroys these outliers. AWQ observes activations to protect salient weights, and GPTQ uses second-order optimization to adjust remaining weights to compensate for quantization error, preserving accuracy at low bit-widths.
**Tags:** quantization, awq, gptq
**Linked Cards:** d22-ptq-vs-qat, d22-awq-vs-gptq
<!-- QA_END -->
