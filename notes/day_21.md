---
day: 21
title: "ML System Design & MLOps Foundations"
topics:
  - ml-system-design
  - mlops
  - model-serving
  - monitoring
  - experimentation
tags:
  - mle-systems
  - mlops
  - system-design
  - interview-prep
priority_distribution:
  must_know: 13
  should_know: 1
  nice_to_know: 0
---

# DAY 21 — ML SYSTEM DESIGN & MLOPS FOUNDATIONS

## Daily Objective
Learn to design and explain an end-to-end ML system under real constraints: data freshness, latency, scale, evaluation, safe deployment, monitoring, and failure recovery. The goal is to make defensible tradeoffs—not to memorize one architecture.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** requirements and success metrics, data/label definition, training-serving consistency, offline/online features, batch/online serving, retrieval-ranking-re-ranking, embedding freshness/cold start, offline/online evaluation, experimentation, monitoring/drift, model registry/reproducibility, safe deployment, rollback/fallbacks, and incident diagnosis.
- 🟡 **SHOULD KNOW:** privacy/access control and capacity/cost planning.
- 🟢 **NICE TO KNOW:** detailed distributed-consensus, service-mesh, and infrastructure-as-code internals.

---

## Knowledge Cards

---

### [CARD: Start System Design with Requirements and Success Metrics]
<!-- id: d21-requirements-and-success-metrics -->

- **Priority:** must_know
- **Category:** ml-system-design
- **Tags:** requirements, metrics, latency, scale, product

**Core Concept**

An ML design begins by defining the product decision, target users, input/output, success metric, scale, latency, freshness, cost, and safety constraints. Architecture is a response to these requirements—not the starting point.

**Why It Matters**

The same model can be appropriate for overnight recommendations and unacceptable for fraud blocking within 50 milliseconds. Interviewers evaluate whether you ask the questions that change the design.

**Example**

For “rank jobs for a user,” clarify: one-time feed or real-time search? candidates per request? p95 latency? update frequency? relevance metric? exposure/fairness constraints? available user history for new users?

**Interview-Ready Explanation**

> I first define the decision and measurable success, then state scale, latency, freshness, cost, and safety constraints. Only then do I choose batch versus online features, model complexity, retrieval, and serving architecture.

---

### [CARD: Data, Labels, and Point-in-Time Correctness]
<!-- id: d21-data-labels-and-point-in-time-correctness -->

- **Priority:** must_know
- **Category:** ml-data
- **Tags:** labels, leakage, point-in-time, training-data

**Core Concept**

Training examples must reflect the information available at prediction time. A label must be defined with an outcome window, and every feature must be computed using data from at or before that example's prediction timestamp.

**Why It Matters**

Future information leaks can create excellent offline metrics and a failing production model. This is especially common when joining slowly updated tables or using aggregates computed after the label event.

**Example**

To predict whether a user will purchase in the next 7 days at time `t`, a feature such as “purchases in the prior 30 days” must use only events before `t`; the purchase label uses the interval after `t`.

**Interview-Ready Explanation**

> I define an example timestamp, a feature lookback window, and a label horizon. Every training feature must be point-in-time correct—available no later than the time at which the model would have made that prediction.

---

### [CARD: Training-Serving Consistency and Feature Stores]
<!-- id: d21-training-serving-consistency -->

- **Priority:** must_know
- **Category:** ml-data
- **Tags:** training-serving-skew, feature-store, consistency, features

**Core Concept**

Training-serving skew occurs when the features, transformations, defaults, or data timing used in production differ from those used during training. A feature store or shared transformation layer can provide offline historical features and online low-latency features with the same definitions.

**Why It Matters**

A model can be mathematically correct and still underperform because production provides a stale, missing, differently normalized, or differently ordered feature.

**Example**

Define one `days_since_last_purchase` feature contract: source events, event-time logic, null default, owner, freshness SLA, and version. Both training and serving use that contract rather than separate ad hoc implementations.

**Interview-Ready Explanation**

> I prevent training-serving skew by versioning feature definitions and using the same transformation semantics offline and online. A feature store is useful when it provides point-in-time offline retrieval, low-latency online retrieval, and clear freshness ownership.

---

### [CARD: Batch, Online, and Hybrid ML Serving]
<!-- id: d21-batch-online-and-hybrid-serving -->

- **Priority:** must_know
- **Category:** model-serving
- **Tags:** batch-inference, online-inference, latency, freshness

**Core Concept**

Batch inference computes predictions for many entities ahead of time and stores them for later lookup. Online inference computes a prediction during a request. Hybrid systems precompute stable work and combine it with fresh request-time signals.

**Why It Matters**

Batch is cheaper and simpler; online is fresher and more personalized but requires latency budgets, feature availability, fallbacks, and operational reliability.

**Example**

For a homepage feed, precompute item embeddings and candidate lists in batch, then use the current session and recent clicks to re-rank a small set online.

**Interview-Ready Explanation**

> I choose batch when freshness requirements allow it, online when a request needs current context, and hybrid when stable expensive work can be precomputed while a small online stage adds recency or personalization.

---

### [CARD: Retrieval, Ranking, and Re-Ranking Funnel]
<!-- id: d21-retrieval-ranking-reranking -->

- **Priority:** must_know
- **Category:** ml-system-design
- **Tags:** retrieval, ranking, reranking, latency, candidates

**Core Concept**

Large-scale recommendation and search systems use a funnel. Retrieval quickly selects hundreds or thousands of plausible candidates; ranking applies a more expensive model to score them; re-ranking applies diversity, freshness, policy, and business constraints to the final small list.

**Why It Matters**

Scoring every catalog item with a heavy model violates latency and cost budgets. Each stage spends compute only on a progressively smaller, more relevant set.

**Example**

```text
10 million items
  → ANN / rules retrieve 1,000
  → learned ranker scores 100
  → re-ranker returns 20 diverse, eligible items
```

**Interview-Ready Explanation**

> I use a multi-stage funnel: cheap high-recall retrieval, richer ranking, then policy-aware re-ranking. This makes latency a first-class design constraint rather than an afterthought.

---

### [CARD: Two-Tower Retrieval, Embedding Freshness, and Cold Start]
<!-- id: d21-two-tower-freshness-and-cold-start -->

- **Priority:** must_know
- **Category:** retrieval-systems
- **Tags:** two-tower, embeddings, freshness, cold-start, ann

**Core Concept**

A two-tower retrieval model maps users/queries and items/documents into one embedding space, allowing approximate nearest-neighbor search. Item embeddings can be precomputed and indexed; user/query embeddings are often computed or updated close to request time.

**Why It Matters**

The system must answer practical questions beyond similarity: how does a new item enter the index, how does a new user get recommendations, and how quickly do embeddings reflect changing behavior?

**Example**

For a new user, use popular or content-based candidates until interaction history exists. For a new item, embed its metadata immediately and insert it into the index before enough engagement data exists to learn collaborative signals.

**Interview-Ready Explanation**

> Two-tower models make retrieval scalable through vector search. I separately design item-index freshness, user-context freshness, and cold-start fallbacks; otherwise a retrieval system systematically misses new content and new users.

---

### [CARD: Offline Evaluation, Online Evaluation, and Guardrails]
<!-- id: d21-offline-online-evaluation-and-guardrails -->

- **Priority:** must_know
- **Category:** ml-evaluation
- **Tags:** offline-evaluation, online-evaluation, metrics, guardrails

**Core Concept**

Offline evaluation estimates model quality on held-out historical data. Online experiments measure user and business impact under real behavior. Guardrail metrics protect against harmful side effects even if the primary metric improves.

**Why It Matters**

Offline lift does not guarantee online lift because logged data is biased by the old system, user behavior changes, and production constraints differ from a static dataset.

**Example**

For a ranking model, primary online metric might be long-term conversion; guardrails may include latency, complaint rate, diversity, cancellation rate, or fairness indicators.

**Interview-Ready Explanation**

> Offline metrics select promising candidates; controlled online experiments validate causal product impact. I define guardrails so a local gain such as click-through rate does not silently harm latency, quality, or user trust.

---

### [CARD: Experimentation and A/B Testing]
<!-- id: d21-ab-testing -->

- **Priority:** must_know
- **Category:** experimentation
- **Tags:** ab-testing, randomization, experimentation, metrics

**Core Concept**

An A/B test randomly assigns comparable units—often users—to variants, then compares predeclared metrics. Randomization aims to make the variants differ only in the treatment, allowing a causal estimate of the change's effect.

**Why It Matters**

Without controlled assignment, a model may appear better merely because it served easier users, a different season, or a different traffic source.

**Failure Modes / Tradeoffs**

Avoid repeatedly checking results until significance appears, changing metrics mid-test, or ignoring interference between users. Ensure event logging identifies variant, model version, and exposure.

**Interview-Ready Explanation**

> I randomize at the correct unit, predefine the success and guardrail metrics, log assignment and exposure, and run long enough for a reliable decision. Offline evaluation narrows candidates; A/B tests establish online causal impact.

---

### [CARD: Monitoring: Data, Prediction, and Business Health]
<!-- id: d21-monitoring-and-drift -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** monitoring, data-drift, concept-drift, observability

**Core Concept**

Production monitoring spans multiple layers: service health (errors, latency, throughput), data health (freshness, nulls, distributions), prediction health (score distributions, calibration), and delayed business/model outcomes. Data drift changes input distributions; concept drift changes the relationship between inputs and outcomes.

**Why It Matters**

Models often fail silently. A system may return valid responses while upstream data has gone stale, a categorical feature has changed meaning, or relevance is degrading.

**Example**

Alert if a critical feature's null rate spikes, the model's score distribution collapses, p95 latency breaches the SLA, or conversion declines after a rollout. Diagnose the layer before retraining blindly.

**Interview-Ready Explanation**

> I monitor the full chain: infrastructure, input freshness and distributions, predictions, and eventual outcomes. Drift is a signal to investigate—possible causes include data breakage, changing users, seasonality, or a genuine concept shift.

---

### [CARD: Reproducibility, Model Registry, and Lineage]
<!-- id: d21-reproducibility-model-registry-and-lineage -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** reproducibility, model-registry, lineage, versioning

**Core Concept**

Every deployable model should be traceable to its code version, training-data snapshot or query, feature definitions, hyperparameters, environment, evaluation results, and approval status. A model registry manages versioned artifacts and lifecycle states such as candidate, approved, deployed, and archived.

**Why It Matters**

When a model regresses, you need to answer “what changed?” and roll back safely. Reproducibility is operational control, not academic perfection.

**Interview-Ready Explanation**

> I record data, code, feature, environment, and metric lineage for each model version. The registry makes promotion and rollback explicit, so production never depends on an untraceable local artifact.

---

### [CARD: Safe Deployment: Shadow, Canary, Blue-Green, and Rollback]
<!-- id: d21-safe-deployment-and-rollback -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** deployment, shadow, canary, blue-green, rollback

**Core Concept**

Safe release patterns limit blast radius. Shadow deployment sends live inputs to a new model without returning its output. Canary deployment serves a small traffic share first. Blue-green deployment keeps two full environments and switches traffic between them. Rollback returns traffic to a known-good version.

**Why It Matters**

Offline validation cannot reveal every production failure: feature availability, latency, schema changes, cost, and unexpected user behavior all appear only under real traffic.

**Example**

Shadow a new ranker to compare predictions and latency, canary to 1% of eligible traffic with guardrail alerts, then increase gradually. Keep the old model and feature contract available for fast rollback.

**Interview-Ready Explanation**

> I release ML systems progressively: shadow for production validation without user impact, canary for limited real impact, automated guardrails, and a tested rollback path to a compatible previous model and feature version.

---

### [CARD: Fallbacks, Timeouts, and Graceful Degradation]
<!-- id: d21-fallbacks-and-graceful-degradation -->

- **Priority:** must_know
- **Category:** model-serving
- **Tags:** fallbacks, timeouts, reliability, degradation

**Core Concept**

A serving system should define what happens when a model, feature source, vector index, or downstream service is slow or unavailable. A timeout prevents waiting indefinitely; a fallback gives a useful, safe response at reduced quality.

**Why It Matters**

An unavailable personalized ranker should not necessarily take down a product page. Reliability and product behavior must be designed together.

**Example**

If online features miss the freshness SLA, serve a cached candidate list or popularity-based ranking, emit a metric, and avoid silently treating stale data as fresh.

**Interview-Ready Explanation**

> I set explicit timeouts and define a safe fallback for each critical dependency. I prefer a measurable quality degradation over a complete outage, while making the fallback observable so it cannot become the unnoticed normal path.

---

### [CARD: Incident Diagnosis for ML Systems]
<!-- id: d21-ml-incident-diagnosis -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** incident-response, debugging, telemetry, rollback

**Core Concept**

When model quality or latency degrades, diagnose from the outside in: verify serving health, compare recent versions, inspect feature freshness and distribution changes, inspect prediction changes, and examine outcome slices. Stabilize first, then identify root cause.

**Why It Matters**

Immediate retraining is not a universal fix. The cause could be a failed feature job, schema change, traffic shift, bad deployment, index lag, or genuine population change.

**Mental Model / Mechanics**

```text
Alert → assess blast radius → apply fallback/rollback if needed
      → compare model + feature + data versions
      → isolate changed layer → remediate → verify → document
```

**Interview-Ready Explanation**

> I stabilize the user-facing system first using a fallback or rollback, then compare versions and telemetry across service, features, predictions, and outcomes. That prevents treating every ML incident as a retraining problem.

---

### [CARD: Privacy, Access Control, and Cost Constraints]
<!-- id: d21-privacy-access-and-cost -->

- **Priority:** should_know
- **Category:** ml-system-design
- **Tags:** privacy, access-control, cost, security

**Core Concept**

Data access and cost are design constraints. A system should minimize use of sensitive data, enforce authorization at the data and serving layers, retain data only as required, and make expensive model or retrieval calls observable and bounded.

**Why It Matters**

The technically best model may be unacceptable if it exposes restricted data, cannot meet budget, or relies on a sensitive feature that cannot be used in production.

**Interview-Ready Explanation**

> I include data classification, access control, retention, and per-request cost in the initial requirements. Privacy and budget constraints shape the feasible architecture just as strongly as latency does.

---

## Key Connections

- **Days 5–7:** Feature engineering, leakage, monitoring, experiment tracking, feature stores, and training-serving skew are operationalized here.
- **Days 14–16:** RAG is another retrieval-and-serving system; it needs the same requirements, evaluation, monitoring, safety, and fallback discipline.
- **Days 19–20:** SQL defines data grain and validation; Kafka/Spark/Airflow deliver freshness, idempotency, and scheduled computation.
- **Day 22:** LLM serving applies the same latency, cost, rollout, and observability reasoning to GPU-bound generation.

---

## Common Misconceptions

- **Myth:** Choosing a model is the first system-design step.  
  **Reality:** Requirements, data availability, metrics, and constraints determine the viable model and architecture.

- **Myth:** Strong offline metrics prove production value.  
  **Reality:** They are necessary screening evidence; online experiments and guardrails validate real impact.

- **Myth:** A feature store automatically eliminates skew.  
  **Reality:** It helps only when feature definitions, timing, versioning, and serving behavior are governed consistently.

- **Myth:** Monitoring only means tracking accuracy.  
  **Reality:** Inputs, service health, prediction distributions, and delayed outcomes can fail independently.

- **Myth:** A canary release removes the need for rollback.  
  **Reality:** Canary limits blast radius; rollback is still required when guardrails fail.

- **Myth:** Retraining fixes every production issue.  
  **Reality:** First isolate whether the issue is data, features, serving, indexing, deployment, or a genuine model/data shift.

---

## Out of Scope

- Detailed distributed-system consensus, autoscaling, and service-mesh internals
- Exact statistical power calculations for experiments
- Domain-specific fairness policy and regulatory implementation
- Detailed RAG architecture and evaluation mechanics (Days 14–16)
- GPU kernel optimization and LLM inference internals (Day 22)

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d21-qa-001]

**Question:** What should you clarify before proposing an ML architecture?

**Answer:** The product decision, success metric, scale, latency, freshness, cost, data availability, and safety constraints.

**Tags:** requirements, system-design

**Linked Cards:** d21-requirements-and-success-metrics

#### [QA: d21-qa-002]

**Question:** What makes a training feature point-in-time correct?

**Answer:** It uses only data that would have been available at the prediction timestamp, never information from after that time.

**Tags:** leakage, point-in-time

**Linked Cards:** d21-data-labels-and-point-in-time-correctness

#### [QA: d21-qa-003]

**Question:** What is training-serving skew?

**Answer:** A mismatch between training and production feature values, transformations, defaults, or timing that makes a deployed model receive different inputs than it was trained on.

**Tags:** features, training-serving-skew

**Linked Cards:** d21-training-serving-consistency

#### [QA: d21-qa-004]

**Question:** When is a hybrid serving design useful?

**Answer:** When stable expensive work can be precomputed, while a small online stage incorporates fresh request context or personalization.

**Tags:** batch, online-serving

**Linked Cards:** d21-batch-online-and-hybrid-serving

#### [QA: d21-qa-005]

**Question:** Why use retrieval, ranking, and re-ranking stages?

**Answer:** They spend increasing compute on progressively smaller candidate sets, balancing high recall, relevance, policy constraints, and latency.

**Tags:** retrieval, ranking, latency

**Linked Cards:** d21-retrieval-ranking-reranking

#### [QA: d21-qa-006]

**Question:** Name two cold-start fallbacks in a two-tower retrieval system.

**Answer:** Use popularity or content-based candidates for new users, and embed new-item metadata immediately so new items enter retrieval before engagement data exists.

**Tags:** cold-start, embeddings

**Linked Cards:** d21-two-tower-freshness-and-cold-start

#### [QA: d21-qa-007]

**Question:** Why is online experimentation needed after offline evaluation?

**Answer:** Offline data is shaped by historical behavior and the old system; an A/B test estimates causal impact under real users and production constraints.

**Tags:** evaluation, ab-testing

**Linked Cards:** d21-offline-online-evaluation-and-guardrails, d21-ab-testing

#### [QA: d21-qa-008]

**Question:** What layers should ML monitoring cover?

**Answer:** Service health, input freshness and distributions, prediction distributions/quality, and delayed business or label outcomes.

**Tags:** monitoring, drift

**Linked Cards:** d21-monitoring-and-drift

#### [QA: d21-qa-009]

**Question:** What lineage should a model registry preserve?

**Answer:** Code, data snapshot/query, features, hyperparameters, environment, evaluation results, artifact version, and approval/deployment status.

**Tags:** model-registry, reproducibility

**Linked Cards:** d21-reproducibility-model-registry-and-lineage

#### [QA: d21-qa-010]

**Question:** How do shadow, canary, and blue-green deployments differ?

**Answer:** Shadow receives live inputs without serving output; canary serves a small traffic share; blue-green switches traffic between two full environments.

**Tags:** deployment, rollback

**Linked Cards:** d21-safe-deployment-and-rollback

#### [QA: d21-qa-011]

**Question:** What should happen when an online feature source times out?

**Answer:** Enforce a timeout, serve a defined safe fallback such as cached or popularity-based results, and emit telemetry for the degraded path.

**Tags:** fallbacks, reliability

**Linked Cards:** d21-fallbacks-and-graceful-degradation

#### [QA: d21-qa-012]

**Question:** What is the first priority in an ML production incident?

**Answer:** Stabilize user impact with a fallback or rollback if necessary, then isolate the cause using version comparisons and telemetry.

**Tags:** incidents, rollback

**Linked Cards:** d21-ml-incident-diagnosis

#### [QA: d21-qa-013]

**Question:** Why are privacy and cost system-design requirements rather than afterthoughts?

**Answer:** They determine which data, models, retrieval paths, and serving patterns are feasible and acceptable in production.

**Tags:** privacy, cost

**Linked Cards:** d21-privacy-access-and-cost

<!-- QA_END -->
