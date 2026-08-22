---
day: 13
title: "FINE-TUNING: SFT, PEFT/LoRA, RLHF/PPO"
topics:
  - fine-tuning
  - peft
  - lora
  - rlhf
  - ppo
tags:
  - fine-tuning
  - llm
priority_distribution:
  must_know: 11
  should_know: 0
  nice_to_know: 1
---

# DAY 13 — FINE-TUNING: SFT, PEFT/LoRA, RLHF/PPO

## Daily Objective
This is the single highest-stakes day in the sprint so far. PEFT/LoRA and RLHF/PPO are literally on the user's resume — the Flan-T5 project fine-tuned with LoRA and used PPO for toxicity reduction. By the end of today you should be able to explain why full fine-tuning is expensive, how LoRA's low-rank decomposition actually works (with real numbers), the full RLHF pipeline, what PPO is doing and why it's "proximal."

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** From Base Model to Deployable Assistant, Supervised Fine-Tuning (SFT) / Instruction Tuning, Why Full Fine-Tuning Is Expensive, PEFT, LoRA mechanism, LoRA parameter count math, LoRA benefits and limitations, RLHF pipeline, PPO, KL-divergence penalty, Project mapping
- 🟢 **NICE TO KNOW:** Preference Optimization Beyond PPO (DPO)

---

## Knowledge Cards

---

### [CARD: From Base Model to Deployable Assistant Landscape]
<!-- id: d13-base-model-to-assistant-landscape -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** base-model, sft, rlhf
**Core Concept**

A raw pretrained model is good at plausible text continuation, not at following instructions. The gap is bridged via SFT (learning format/style) and RLHF (aligning behavior).

**Why It Matters**

Pretraining gives broad language competence, but fine-tuning (SFT + RLHF) transforms it into an interactive assistant.

**Mental Model / Mechanics**
```text
Pretraining              SFT / Instruction Tuning         RLHF / Preference Optimization
(next-token prediction,  (smaller curated dataset of      (further aligns behavior using
 massive unlabeled        instruction→good-response        human/proxy preference signals,
 corpus)                  pairs, same next-token            e.g. PPO)
                           objective, now on
                           targeted data)
       │                          │                                  │
       ▼                          ▼                                  ▼
Broad language           Learns the FORMAT/STYLE of         Refines behavior along dimensions
competence                the target behavior                hard to specify with fixed
                                                               labeled examples alone
```

**Interview-Ready Explanation**
> A base model learns broad language competence from pretraining. SFT uses targeted data to teach it the format and style of the target behavior. RLHF refines its behavior further using preference signals to align it with human values along hard-to-specify dimensions.

---

### [CARD: Supervised Fine-Tuning]
<!-- id: d13-supervised-fine-tuning -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** sft, instruction-tuning
**Core Concept**

Supervised Fine-Tuning (SFT) continues training the pretrained model on a smaller, curated dataset of (instruction, good response) pairs, using the same next-token prediction objective.

**Why It Matters**

SFT teaches the model the format and style of the target behavior rather than building new capability from scratch. It adapts the broad language competence to follow instructions.

**Interview-Ready Explanation**
> SFT or Instruction Tuning adapts a pretrained model to follow instructions. It uses a curated dataset of instruction-response pairs and the exact same next-token prediction objective. It's adaptation, not capability creation.

---

### [CARD: Why Full Fine-Tuning Is Expensive]
<!-- id: d13-why-full-fine-tuning-is-expensive -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** full-fine-tuning, cost, memory
**Core Concept**

Full fine-tuning updates every parameter in the model, incurring huge memory, storage, and catastrophic forgetting costs.

**Mental Model / Mechanics**
- **Memory:** Gradients AND optimizer state for every parameter are required. Adam needs 2–3× the model's parameter memory just for optimizer state.
- **Storage:** A complete separate copy per fine-tuned variant is needed.
- **Catastrophic forgetting:** Aggressive updating of all parameters on narrow data degrades broader pretrained capabilities.

**Interview-Ready Explanation**
> Full fine-tuning is extremely expensive. It requires 2-3x memory for Adam optimizer states, massive storage for full separate model copies, and risks catastrophic forgetting of the model's broader pretrained capabilities.

---

### [CARD: PEFT Overview]
<!-- id: d13-peft-overview -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** peft, efficiency
**Core Concept**

Parameter-Efficient Fine-Tuning (PEFT) freezes the vast majority of pretrained parameters and trains only a small number of additional or selected parameters instead.

**Why It Matters**

It addresses the memory, storage, and catastrophic forgetting issues of full fine-tuning.

**Mental Model / Mechanics**
LoRA is the most prominent PEFT technique, but others like adapters and prefix tuning exist.

**Interview-Ready Explanation**
> PEFT drastically reduces costs by freezing the vast majority of pretrained weights and only training a tiny fraction of parameters. This cuts memory usage, storage needs, and catastrophic forgetting.

---

### [CARD: LoRA Mechanism]
<!-- id: d13-lora-mechanism -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** lora, low-rank
**Core Concept**

Low-Rank Adaptation (LoRA) decomposes the weight update matrix (ΔW) into the product of two much smaller matrices, A and B.

**Mental Model / Mechanics**
Empirically, the change a weight matrix needs has a much lower "effective rank" than the full matrix.
`ΔW ≈ B · A`
For a d × d weight matrix, A is r × d and B is d × r, with a small rank r (e.g., 4, 8, 16).
Original W is frozen. Only A and B are trained. The effective forward computation is:
`output = W·x + (B·A)·x = (W + BA)·x`

**Failure Modes / Tradeoffs**
- LoRA's capacity is bounded by the low-rank assumption.

**Interview-Ready Explanation**
> Instead of learning a full weight update matrix ΔW, LoRA decomposes it into two much smaller low-rank matrices, A and B. The original weights are frozen, and only A and B are trained, dramatically reducing trainable parameters.

---

### [CARD: LoRA Parameter Count]
<!-- id: d13-lora-parameter-count -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** lora, parameter-math
**Core Concept**

LoRA drastically reduces trainable parameters.

**Example**
```text
If d = 4096:
  Full ΔW:        4096 × 4096        ≈ 16,800,000 parameters
  LoRA, r = 8:     A (8×4096) + B (4096×8)
                 = 32,768 + 32,768   ≈    65,500 parameters
                 → roughly 250× fewer trainable parameters
```

**Interview-Ready Explanation**
> With a dimension of 4096, a full weight update needs about 16.8 million parameters. With LoRA rank 8, you only train two matrices of size 8x4096 and 4096x8, totaling around 65,000 parameters. That is roughly 250 times fewer trainable parameters.

---

### [CARD: LoRA Benefits and Limitations]
<!-- id: d13-lora-benefits-and-limitations -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** lora, tradeoffs
**Core Concept**

LoRA is highly efficient but bounded by its low-rank assumption.

**Mental Model / Mechanics**
- **Benefits:** Dramatically fewer trainable parameters, small storage footprint per task (save only A/B matrices), no inference latency cost (B·A can be merged directly into W after training). Catastrophic forgetting drops because W is structurally preserved.
- **Limitations:** Rank r is a hyperparameter tradeoff. Capacity is bounded.

**Interview-Ready Explanation**
> LoRA offers a massive reduction in trainable parameters and storage, with no inference latency if weights are merged. However, its capacity to learn is bounded by the low-rank assumption, making full fine-tuning preferable if ample compute and data are available.

---

### [CARD: RLHF Pipeline]
<!-- id: d13-rlhf-pipeline -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** rlhf, pipeline
**Core Concept**

Reinforcement Learning from Human Feedback (RLHF) optimizes for human preference over output quality using a three-stage pipeline.

**Mental Model / Mechanics**
```text
1. SFT model (starting point)
2. Train a REWARD MODEL: collect human preference data (given a prompt, show 2+ candidate responses, human picks better one), train a separate model to predict a scalar reward
3. Use REINFORCEMENT LEARNING (commonly PPO) to further fine-tune the SFT model, using the reward model's scores as the training signal
```
Text generation is treated as a sequence of actions, optimizing for an overall output reward instead of token-level cross-entropy.

**Interview-Ready Explanation**
> The RLHF pipeline starts with an SFT model. Next, it trains a separate reward model on human preference data. Finally, it uses reinforcement learning to fine-tune the SFT model against the reward model's scalar scores.

---

### [CARD: PPO]
<!-- id: d13-ppo -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** ppo, reinforcement-learning
**Core Concept**

Proximal Policy Optimization (PPO) is an RL algorithm that updates the model's parameters to increase expected reward without drastic changes in a single update.

**Why It Matters**

Updating too aggressively risks destabilizing training or reward hacking (degenerate ways to score well). PPO's clipped objective limits the policy change per update, keeping it "proximal".

**Interview-Ready Explanation**
> PPO is a reinforcement learning algorithm used in RLHF. It updates the model to maximize reward but restricts the size of each update to stay "proximal" to the previous policy. This prevents training instability and reward hacking.

---

### [CARD: KL-Divergence Penalty]
<!-- id: d13-kl-divergence-penalty -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** kl-divergence, regularization
**Core Concept**

An additional penalty in PPO based on how much the fine-tuned model's output distribution diverges from the original SFT model.

**Why It Matters**

It discourages the model from drifting too far from its original behavior (similar to regularization), ensuring the model remains fluent and helpful while optimizing for the reward.

**Interview-Ready Explanation**
> During PPO, a KL-divergence penalty is used to ensure the RL-tuned model doesn't drift too far from the original SFT model's distribution. This prevents degenerate behaviors and preserves language fluency.

---

### [CARD: Toxicity Reduction Project Mapping]
<!-- id: d13-toxicity-reduction-project-mapping -->

- **Priority:** must_know
- **Category:** fine-tuning
- **Tags:** project, toxicity, flan-t5
**Core Concept**

Applying PEFT/LoRA and PPO to Flan-T5 to reduce toxicity.

**Mental Model / Mechanics**
- **Reward signal:** A toxicity classifier serves as the reward source (lower toxicity = higher reward).
- **PPO's job:** Adjust the LoRA-adapted model to produce lower-toxicity outputs without losing fluency.
- **PPO on top of LoRA:** PPO's updates flow exclusively into the LoRA adapter parameters (A/B), not the full frozen base model.

**Interview-Ready Explanation**
> In my project, I fine-tuned Flan-T5 with LoRA and then used PPO for toxicity reduction. The reward signal came from a toxicity classifier. Crucially, the PPO updates only affected the LoRA adapter parameters, allowing the model to generate less toxic text while preserving the frozen base model's capabilities.

---

### [CARD: Preference Optimization Beyond PPO]
<!-- id: d13-dpo -->

- **Priority:** nice_to_know
- **Category:** fine-tuning
- **Tags:** dpo, preference-optimization
**Core Concept**

Direct Preference Optimization (DPO) skips the separate reward model and PPO's RL machinery.

**Mental Model / Mechanics**
It directly optimizes on preference pairs using a derived loss function, vastly simplifying the RLHF process.

**Interview-Ready Explanation**
> DPO directly optimizes on preference pairs without needing a separate reward model or complex PPO training, simplifying the preference alignment process.

---

## Key Connections
- **Day 2 (regularization, catastrophic forgetting):** LoRA's parameter efficiency and the KL penalty are both "don't let this change too much" — same instinct as L1/L2.
- **Day 3 (cross-entropy):** SFT reuses this directly; RLHF genuinely departs from it.
- **Day 9 (frozen weights, no gradient flow):** literally what LoRA relies on.
- **Day 11 (Q/K/V matrices):** LoRA is typically applied exactly to these projection matrices.
- **Day 12 (next-token prediction, base model gap):** SFT continues the same objective on curated data; RLHF closes the remaining gap.

## Common Misconceptions
1. "LoRA fine-tunes the whole model, just more efficiently." — No, it freezes the base model completely.
2. "PEFT and LoRA are the same thing." — LoRA is one specific PEFT technique among several.
3. "RLHF replaces SFT." — It comes after and on top of SFT.
4. "PPO directly uses human labels as the reward at every step." — No, a learned reward model or classifier provides the reward.
5. "Merging LoRA weights permanently alters the base model." — The original frozen base file isn't altered.

## Out of Scope
- The exact PPO clipped surrogate objective formula.
- Generalized Advantage Estimation (GAE) mechanics.
- DPO's mathematical derivation.
- Exact reward model architecture/training loss specifics.

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d13-qa-001]
**Question:** What are the three stages of the RLHF pipeline?
**Answer:** 1. Supervised Fine-Tuning (SFT) of the base model. 2. Training a Reward Model on human preference data. 3. Reinforcement Learning (commonly PPO) to fine-tune the SFT model using the reward model's signal.
**Tags:** rlhf, pipeline
**Linked Cards:** d13-rlhf-pipeline

#### [QA: d13-qa-002]
**Question:** How does Supervised Fine-Tuning differ from pretraining in its objective?
**Answer:** It doesn't differ in its objective; both use next-token prediction via cross-entropy loss. SFT just applies it to a smaller, curated dataset of instruction-response pairs to teach format and style.
**Tags:** sft, pretraining
**Linked Cards:** d13-supervised-fine-tuning

#### [QA: d13-qa-003]
**Question:** What are three main reasons full fine-tuning is extremely expensive?
**Answer:** 1. Memory cost (optimizer states like Adam take 2-3x parameter memory). 2. Storage footprint (storing full copies per task). 3. Catastrophic forgetting of pretrained capabilities.
**Tags:** fine-tuning, memory
**Linked Cards:** d13-why-full-fine-tuning-is-expensive

#### [QA: d13-qa-004]
**Question:** What does PEFT stand for and what is its core idea?
**Answer:** Parameter-Efficient Fine-Tuning. Its core idea is freezing the vast majority of pretrained parameters and training only a small number of additional/selected parameters.
**Tags:** peft
**Linked Cards:** d13-peft-overview

#### [QA: d13-qa-005]
**Question:** How does LoRA decompose the weight update matrix $\Delta W$?
**Answer:** LoRA decomposes $\Delta W$ into the product of two much smaller matrices, $B$ and $A$, such that $\Delta W \approx B \cdot A$, where $A$ and $B$ have a small rank $r$.
**Tags:** lora, math
**Linked Cards:** d13-lora-mechanism

#### [QA: d13-qa-006]
**Question:** During LoRA fine-tuning, which weights receive gradients?
**Answer:** Only the newly added low-rank matrices $A$ and $B$. The original model weights $W$ are completely frozen.
**Tags:** lora, gradients
**Linked Cards:** d13-lora-mechanism

#### [QA: d13-qa-007]
**Question:** What is the formula for the effective forward computation in LoRA?
**Answer:** $output = W \cdot x + (B \cdot A) \cdot x = (W + BA) \cdot x$
**Tags:** lora, forward-pass
**Linked Cards:** d13-lora-mechanism

#### [QA: d13-qa-008]
**Question:** What is the main advantage of merging LoRA weights back into the base model after training?
**Answer:** It eliminates any inference latency cost because $B \cdot A$ is added directly into $W$.
**Tags:** lora, inference
**Linked Cards:** d13-lora-benefits-and-limitations

#### [QA: d13-qa-009]
**Question:** Where in the transformer architecture is LoRA most commonly applied?
**Answer:** It is most commonly applied to the attention mechanism's Q, K, and V projection matrices.
**Tags:** lora, architecture
**Linked Cards:** d13-lora-mechanism

#### [QA: d13-qa-010]
**Question:** What specific problem does RLHF solve that SFT alone does not?
**Answer:** SFT only teaches the model to imitate good examples, bounded by the dataset. RLHF optimizes directly for human preferences and overall output quality dimensions that are hard to capture via static labels.
**Tags:** rlhf, sft
**Linked Cards:** d13-rlhf-pipeline

#### [QA: d13-qa-011]
**Question:** Why is PPO called "proximal"?
**Answer:** Because it restricts the policy (model) from changing too drastically in any single update (staying "proximal" to the previous version) to avoid training instability and reward hacking.
**Tags:** ppo
**Linked Cards:** d13-ppo

#### [QA: d13-qa-012]
**Question:** What is reward hacking?
**Answer:** When the reinforcement learning model finds degenerate or unintended ways to score highly on the reward model without actually producing a genuinely good output.
**Tags:** rlhf, ppo
**Linked Cards:** d13-ppo

#### [QA: d13-qa-013]
**Question:** What is the purpose of the KL-divergence penalty in RLHF/PPO?
**Answer:** It penalizes the model for diverging too far from the original SFT model's probability distribution, preventing degenerate behavior and preserving language fluency.
**Tags:** kl-divergence, ppo
**Linked Cards:** d13-kl-divergence-penalty

#### [QA: d13-qa-014]
**Question:** In the toxicity reduction project, where did PPO's updates flow?
**Answer:** They flowed exclusively into the LoRA adapter parameters (A and B), while the full base model remained frozen.
**Tags:** project, ppo, lora
**Linked Cards:** d13-toxicity-reduction-project-mapping

#### [QA: d13-qa-015]
**Question:** How does DPO differ from PPO in the preference optimization pipeline?
**Answer:** Direct Preference Optimization (DPO) skips training a separate reward model and skips PPO entirely, optimizing directly on preference pairs using a derived loss function.
**Tags:** dpo, rlhf
**Linked Cards:** d13-dpo
<!-- QA_END -->
