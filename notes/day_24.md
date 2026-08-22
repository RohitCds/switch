---
day: 24
title: "Advanced LLM Topics: MoE, QLoRA, DPO & GRPO"
topics:
  - advanced-llm
  - moe
  - qlora
  - dpo
  - grpo
tags:
  - advanced-llm
  - moe
  - qlora
  - dpo
  - grpo
priority_distribution:
  must_know: 4
  should_know: 0
  nice_to_know: 0
---

# DAY 24 — Advanced LLM Topics: MoE, QLoRA, DPO & GRPO

## Daily Objective
Understand advanced mechanisms and frontier research in LLMs, focusing on efficiency, fine-tuning, and alignment. This includes Mixture of Experts (MoE) for scaling, QLoRA for efficient tuning, Direct Preference Optimization (DPO) as an alternative to PPO, and Group Relative Policy Optimization (GRPO) for reasoning.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Mixture of Experts (MoE) routing and parameter economics, QLoRA (NF4 + LoRA + Paged Optimizers), DPO mathematical shift from PPO, GRPO mechanics (group-based baselines, zero-shot reasoning connections).

---

## Knowledge Cards

---

### [CARD: Mixture of Experts (MoE)]
<!-- id: d24-mixture-of-experts -->

- **Priority:** must_know
- **Category:** advanced-llm
- **Tags:** moe, efficiency, architecture
**Core Concept**

Mixture of Experts (MoE) is a neural network architecture that increases the total number of parameters (model capacity) without proportionately increasing the compute cost per token. A routing mechanism directs each input token to only a small subset of "expert" subnetworks.

**Why It Matters**

MoE allows building massive models (e.g., Mixtral 8x7B) that have high capacity and capabilities but run at the speed of much smaller models, dramatically balancing compute efficiency with memory costs.

**Mental Model / Mechanics**

Instead of a single dense feed-forward network (FFN) applied to every token, MoE has multiple FFNs (experts) and a router network.
- **Router:** A small network (often a linear layer + softmax) that predicts which experts are best for a given token.
- **Top-K Routing:** Only the top $K$ (e.g., 2) experts are activated for a token.
- **Active vs Total Parameters:** While a model might have 47B total parameters, only 13B might be "active" for any single token during the forward pass.

**Example**

In Mixtral 8x7B, there are 8 experts per layer. For each token, the router selects the top 2 experts. The output is a weighted sum of the outputs from these two experts. This means inference speed is similar to a 13B parameter model, even though the total parameter count is much higher.

**Failure Modes / Tradeoffs**

- **High VRAM Usage:** Even though compute is low (only active parameters run), all parameters must be loaded into memory, leading to high VRAM requirements.
- **Expert Imbalance:** The router might favor a few experts and ignore others (load balancing issues), which requires auxiliary losses during training to encourage balanced routing.

**Interview-Ready Explanation**

> Mixture of Experts increases a model's total capacity without proportional compute costs. It uses a routing mechanism to send each token to only a few "expert" subnetworks. While it requires significant memory to store all experts, its active parameter count per token is small, enabling fast inference.

---

### [CARD: QLoRA]
<!-- id: d24-qlora -->

- **Priority:** must_know
- **Category:** advanced-llm
- **Tags:** qlora, fine-tuning, quantization
**Core Concept**

QLoRA (Quantized Low-Rank Adaptation) is an highly efficient fine-tuning technique that combines 4-bit quantization of the base model with Low-Rank Adapters (LoRA) to train large models on consumer hardware without catastrophic degradation.

**Why It Matters**

It drastically reduces memory requirements for fine-tuning LLMs, democratizing access to customizing large models. A 65B parameter model can be fine-tuned on a single 48GB GPU using QLoRA.

**Mental Model / Mechanics**

- **4-bit NormalFloat (NF4):** An information-theoretically optimal data type for normally distributed weights. The base model weights are frozen and quantized to NF4.
- **Double Quantization:** Quantizing the quantization constants themselves to save even more memory.
- **LoRA Adapters:** Small, trainable low-rank matrices are injected into the model. During the forward pass, the 4-bit base weights are dequantized to 16-bit (compute data type) to multiply with activations, and the LoRA gradients are updated in 16-bit.
- **Paged Optimizers:** Uses NVIDIA unified memory features to page optimizer states to CPU RAM during VRAM spikes, preventing out-of-memory errors.

**Example**

You want to fine-tune Llama-3-70B but only have limited VRAM. By applying QLoRA, the 70B parameters are frozen in 4-bit NF4, saving massive VRAM. You only train the LoRA adapters (e.g., 1-2% of total parameters). If a memory spike occurs, the Paged Optimizer temporarily offloads to CPU RAM.

**Failure Modes / Tradeoffs**

- Slightly slower training speed compared to standard LoRA because of the continuous dequantization overhead during the forward/backward pass.
- Fine-tuning too aggressively can still lead to overfitting or forgetting, though QLoRA's base quantization itself avoids significant degradation compared to post-training quantization.

**Interview-Ready Explanation**

> QLoRA enables highly efficient fine-tuning by freezing the base model in a specialized 4-bit format (NF4) and training small Low-Rank Adapters (LoRA) on top. It uses double quantization and paged optimizers to dramatically reduce VRAM requirements while preserving model performance.

---

### [CARD: DPO (Direct Preference Optimization)]
<!-- id: d24-dpo -->

- **Priority:** must_know
- **Category:** advanced-llm
- **Tags:** dpo, alignment, rlhf
**Core Concept**

Direct Preference Optimization (DPO) aligns LLMs with human preferences without explicitly training a separate Reward Model (RM) or using complex reinforcement learning algorithms like PPO.

**Why It Matters**

It simplifies the RLHF (Reinforcement Learning from Human Feedback) pipeline, making model alignment much more stable, computationally cheaper, and easier to implement while achieving comparable or better performance.

**Mental Model / Mechanics**

- **The PPO Way:** 1) Train a reward model on preference data. 2) Use PPO to optimize the policy (LLM) to maximize the reward model's score, constrained by a reference model.
- **The DPO Way:** Through a mathematical equivalency, DPO defines the reward function directly in terms of the optimal policy. It transforms the RL objective into a simple binary cross-entropy loss over preference pairs (chosen vs. rejected).
- The language model itself acts as the reward model. We update the model to increase the probability of the chosen response and decrease the probability of the rejected response, scaled by the reference model's probabilities.

**Example**

Given a prompt and two model outputs, human raters prefer Response A over Response B. Instead of training a reward model to score A higher than B, DPO directly updates the LLM: it increases the log-likelihood of A and decreases the log-likelihood of B, using a reference model to prevent the LLM from collapsing into degenerate text.

**Failure Modes / Tradeoffs**

- DPO heavily relies on the quality of the preference pairs. Noisy or contradictory preferences can degrade the model.
- It can be prone to overfitting the specific preference dataset compared to a robust reward model.

**Interview-Ready Explanation**

> DPO simplifies LLM alignment by eliminating the separate reward model and PPO reinforcement learning loop. It uses a mathematical mapping to directly optimize the policy on human preference data via a cross-entropy loss, making alignment more stable and efficient.

---

### [CARD: GRPO (Group Relative Policy Optimization)]
<!-- id: d24-grpo -->

- **Priority:** must_know
- **Category:** advanced-llm
- **Tags:** grpo, reinforcement-learning, reasoning
**Core Concept**

Group Relative Policy Optimization (GRPO) is a reinforcement learning algorithm that improves upon PPO by eliminating the need for a separate critic (value) network. It evaluates actions by comparing them against a group of outputs generated from the same prompt.

**Why It Matters**

GRPO significantly reduces the memory and compute overhead of RL training for LLMs. It is heavily associated with models like DeepSeek-R1, which use pure RL to develop complex zero-shot reasoning trajectories.

**Mental Model / Mechanics**

- **PPO:** Uses a critic network (same size as the policy network) to estimate the value (baseline) of a state to reduce variance in advantage estimation. This doubles the memory footprint.
- **GRPO:** Instead of a critic network, GRPO samples a group of $N$ outputs (e.g., 4 or 8) for the same prompt. The baseline is calculated relatively—by taking the average reward of this specific group.
- **Advantage:** An output's advantage is based on how much better its reward is compared to the group's average reward.

**Example**

In training DeepSeekMath, the model generates 8 different reasoning paths for a math problem. The rewards (e.g., format correctness, final answer accuracy) for these 8 paths are calculated. The average reward of the 8 paths becomes the baseline. The paths that scored above the average receive a positive advantage (encouraged), and those below receive a negative advantage (discouraged), all without needing a value network.

**Failure Modes / Tradeoffs**

- Requires generating multiple outputs per prompt during training, which costs compute, though it saves massive VRAM by skipping the critic network.
- The group size $N$ needs to be carefully chosen to balance variance reduction and computational cost.

**Interview-Ready Explanation**

> GRPO optimizes LLM policies without a critic network by sampling a group of responses for a prompt and using their average reward as the baseline. This drastically cuts VRAM usage and has been pivotal in training reasoning models like DeepSeek-R1 via pure reinforcement learning.

---

## Key Connections
- **PPO vs DPO vs GRPO:** PPO requires a reward model and a critic network. DPO eliminates the reward model and critic by directly optimizing preferences. GRPO keeps the reward signal but eliminates the critic network by using a group-based baseline.
- **MoE and VRAM:** MoE saves compute but costs VRAM. QLoRA saves VRAM. Combining them (quantizing an MoE model and fine-tuning with LoRA) is a common strategy for handling massive models on limited hardware.

## Common Misconceptions
- **Misconception:** MoE models are smaller in memory because they only use a subset of parameters.
  - **Correction:** The memory requirement corresponds to the *total* parameters because all experts must reside in VRAM, even if only a small fraction are active during a forward pass.
- **Misconception:** DPO completely abandons reward modeling.
  - **Correction:** DPO uses the policy model itself as an implicit reward model, meaning the reward function is still conceptually present, just mathematically integrated into the policy loss.

## Out of Scope
- Detailed derivation of the DPO loss function from the Bradley-Terry model.
- Writing custom Triton kernels for QLoRA dequantization.
- Advanced routing algorithms like Expert Choice Routing (ECR).

## Q&A Drill
<!-- QA_START -->
#### [QA: d24-qa-001]
**Question:** Why does a Mixture of Experts (MoE) model with 47B parameters have faster inference than a dense 47B parameter model?
**Answer:** Because it uses a routing mechanism to activate only a small subset of the total parameters (e.g., 13B "active parameters") for any given token, saving massive compute despite the high total parameter count.
**Tags:** moe, efficiency
**Linked Cards:** d24-mixture-of-experts

#### [QA: d24-qa-002]
**Question:** What specific data type does QLoRA use for the frozen base model, and why?
**Answer:** It uses 4-bit NormalFloat (NF4), which is information-theoretically optimal for representing the normally distributed weights of deep neural networks.
**Tags:** qlora, quantization
**Linked Cards:** d24-qlora

#### [QA: d24-qa-003]
**Question:** How does Direct Preference Optimization (DPO) differ structurally from PPO for model alignment?
**Answer:** DPO eliminates the separate reward model and the critic network used in PPO. It directly optimizes the policy using a simple cross-entropy loss over preference pairs.
**Tags:** dpo, alignment
**Linked Cards:** d24-dpo

#### [QA: d24-qa-004]
**Question:** What major component of PPO does Group Relative Policy Optimization (GRPO) eliminate, and how does it compensate?
**Answer:** GRPO eliminates the value (critic) network. It compensates by generating a group of outputs for the same prompt and using their average reward as the baseline to calculate advantages.
**Tags:** grpo, reinforcement-learning
**Linked Cards:** d24-grpo
<!-- QA_END -->
