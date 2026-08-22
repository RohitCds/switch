---
day: 20
title: "Kafka, Spark & Airflow: Compressed Data Platform Fundamentals"
topics:
  - kafka
  - apache-spark
  - airflow
  - data-pipelines
  - streaming
tags:
  - data-engineering
  - mle-systems
  - streaming
  - orchestration
priority_distribution:
  must_know: 11
  should_know: 3
  nice_to_know: 0
---

# DAY 20 — KAFKA, SPARK & AIRFLOW (COMPRESSED)

## Daily Objective
Learn the mental model and interview-level tradeoffs of the three data-platform tools most likely to appear around ML systems: Kafka for durable event streams, Spark for distributed data processing, and Airflow for workflow orchestration. This is deliberately foundational rather than an operations manual.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** batch vs. streaming, Kafka topics/partitions/offsets, consumer groups, ordering, delivery semantics and idempotency, Spark's lazy execution model, partitions and shuffles, join skew, structured streaming, Airflow DAGs/tasks, scheduling/retries/backfills, and the distinct role of each tool.
- 🟡 **SHOULD KNOW:** schema evolution, watermarks/checkpoints, and Airflow's separation of orchestration from data processing.
- 🟢 **NICE TO KNOW:** Kafka transactions internals, Spark RDD internals, custom Airflow operators, and cluster administration.

---

## Knowledge Cards

---

### [CARD: Batch Processing vs. Stream Processing]
<!-- id: d20-batch-vs-stream-processing -->

- **Priority:** must_know
- **Category:** data-pipelines
- **Tags:** batch, streaming, latency, freshness

**Core Concept**

Batch processing handles a bounded set of accumulated data on a schedule, such as yesterday's events. Stream processing handles an ongoing sequence of events and aims to make results available with lower latency.

**Why It Matters**

Feature freshness and system complexity should follow a real product need. A fraud signal may need seconds-level freshness; a weekly model-training table usually does not need a streaming pipeline.

**Example**

| Need | Typical approach |
|---|---|
| Recompute daily training features | Batch |
| React to a user click in a ranking system | Stream / online path |
| Train a model every Sunday | Batch |
| Update a real-time abuse counter | Stream |

**Interview-Ready Explanation**

> Batch processes a finite snapshot on a schedule; streaming processes an unbounded event flow with lower latency. I choose streaming only when the freshness benefit justifies its extra operational complexity.

---

### [CARD: Kafka Topics, Partitions, Brokers, and Offsets]
<!-- id: d20-kafka-core-model -->

- **Priority:** must_know
- **Category:** kafka
- **Tags:** kafka, topics, partitions, brokers, offsets

**Core Concept**

Kafka stores ordered, durable event logs. Producers write records to named topics. Each topic is divided into partitions, which are stored and served by brokers. Within one partition, every record has an increasing offset that identifies its position.

**Why It Matters**

Kafka decouples event producers from multiple downstream consumers: feature pipelines, monitoring, analytics, and notifications can read the same event stream at their own pace.

**Mental Model / Mechanics**

```text
topic: user-events
  partition 0: [offset 0][offset 1][offset 2] ...
  partition 1: [offset 0][offset 1] ...

producer → broker writes event
consumer → reads from a remembered offset
```

**Interview-Ready Explanation**

> Kafka is a durable, partitioned event log. Topics organize event types, partitions provide scalable ordered logs, brokers store them, and offsets let consumers track their reading position.

---

### [CARD: Kafka Consumer Groups and Ordering]
<!-- id: d20-kafka-consumer-groups-and-ordering -->

- **Priority:** must_know
- **Category:** kafka
- **Tags:** kafka, consumer-groups, ordering, partition-key

**Core Concept**

A consumer group divides a topic's partitions among its members so each partition is processed by at most one group member at a time. Kafka guarantees record order within a partition, not across an entire multi-partition topic.

**Why It Matters**

If order matters per user, model, or account, choose that entity as the record key so its events map consistently to the same partition. Global ordering would restrict scalability to one partition.

**Example**

```text
key = user_id
events for user 42 → always the same partition → ordered for that user
```

Adding consumers beyond the number of partitions does not increase parallelism; extra consumers are idle.

**Interview-Ready Explanation**

> Kafka provides ordering per partition. Consumer groups scale processing by assigning partitions across consumers, so I partition by the entity for which ordering matters and do not promise global ordering.

---

### [CARD: Delivery Semantics and Idempotent Consumers]
<!-- id: d20-delivery-semantics-and-idempotency -->

- **Priority:** must_know
- **Category:** kafka
- **Tags:** delivery-semantics, at-least-once, idempotency, retries

**Core Concept**

Failures can occur after processing a record but before its offset is committed, so a consumer may receive that record again. Many practical pipelines therefore operate with at-least-once delivery and make downstream effects idempotent.

**Why It Matters**

“Exactly once” is not a magic property of a topic alone. End-to-end correctness depends on how offsets, transformations, and external writes are coordinated.

**Example**

For a feature update, store a stable event ID or a `(entity_id, event_time, version)` key and make repeated writes converge on the same final state rather than incrementing blindly.

**Failure Modes / Tradeoffs**

Committing an offset before a durable result risks data loss; committing after processing risks duplicates. Idempotency makes duplicates safe and is usually the most robust design response.

**Interview-Ready Explanation**

> I assume delivery can be at least once and design the consumer's side effect to be idempotent. Then a retry may repeat work, but it does not corrupt the final state.

---

### [CARD: Schema Evolution in Event Streams]
<!-- id: d20-schema-evolution -->

- **Priority:** should_know
- **Category:** kafka
- **Tags:** schema, compatibility, events, contracts

**Core Concept**

An event schema is a contract between producers and consumers. As fields are added, renamed, or removed, producers and consumers must remain compatible during rollout.

**Why It Matters**

An unannounced change to an event field can break feature computation or silently change model inputs. Versioned schemas and compatibility rules make changes deliberate.

**Example**

Adding an optional field with a safe default is often easier to roll out than removing or changing the meaning of an existing required field.

**Interview-Ready Explanation**

> Event schemas are APIs. I version and validate them, prefer backward-compatible additions, and plan migrations so producers and consumers can be deployed independently.

---

### [CARD: Spark DataFrames, Transformations, Actions, and Lazy Execution]
<!-- id: d20-spark-lazy-execution -->

- **Priority:** must_know
- **Category:** spark
- **Tags:** spark, dataframes, transformations, actions, lazy-evaluation

**Core Concept**

Spark distributes large data processing across a cluster. DataFrame transformations such as `select`, `filter`, and `groupBy` describe a computation lazily. An action such as `count`, `collect`, or `write` triggers Spark to build and execute a physical plan.

**Why It Matters**

Lazy execution lets Spark combine operations, eliminate unnecessary work, and plan data movement. It also explains why an error may surface at an action rather than when a transformation line is written.

**Example**

```python
features = events.filter("event_type = 'click'").groupBy("user_id").count()
features.write.parquet("/features/daily")  # action: work happens here
```

**Interview-Ready Explanation**

> Spark transformations build a lazy lineage; actions trigger execution. The engine can optimize the full plan before running it, so I avoid assuming each DataFrame line immediately processes data.

---

### [CARD: Spark Partitions and Shuffles]
<!-- id: d20-spark-partitions-and-shuffles -->

- **Priority:** must_know
- **Category:** spark
- **Tags:** spark, partitions, shuffle, network, performance

**Core Concept**

A Spark dataset is divided into partitions that can be processed in parallel. A shuffle redistributes records across the cluster so related keys end up together, commonly for `groupBy`, joins, distinct operations, and global sorting.

**Why It Matters**

Shuffles are often the most expensive part of a Spark job because they require network transfer, disk spill, coordination, and new task stages.

**Example**

Grouping click events by `user_id` requires all records for the same user to reach the same partition. That redistribution is a shuffle.

**Interview-Ready Explanation**

> Partitions create parallelism in Spark. A shuffle moves data between partitions to co-locate keys for joins or aggregation; it is expensive, so I reduce unnecessary shuffles and inspect the plan when a job is slow.

---

### [CARD: Spark Joins, Broadcasts, and Data Skew]
<!-- id: d20-spark-joins-and-skew -->

- **Priority:** must_know
- **Category:** spark
- **Tags:** spark, joins, broadcast, skew, hot-keys

**Core Concept**

Large joins often shuffle both inputs by join key. When one input is small enough, broadcasting it to workers can avoid shuffling the large input. Data skew occurs when a few “hot” keys place far more data in one partition than others.

**Why It Matters**

A single popular user, category, or null-like key can leave most workers idle while one straggler partition runs for a long time or fails from memory pressure.

**Example**

Broadcast a small country lookup table when joining it to billions of event rows. Do not broadcast a table that is too large for each worker's memory.

**Interview-Ready Explanation**

> I use broadcast joins when a dimension table safely fits on every worker. For skew, I inspect key distributions and use approaches such as filtering invalid hot keys, salting, pre-aggregation, or specialized skew handling rather than assuming more executors solve it.

---

### [CARD: Spark Structured Streaming]
<!-- id: d20-spark-structured-streaming -->

- **Priority:** must_know
- **Category:** spark
- **Tags:** spark, structured-streaming, micro-batch, streaming

**Core Concept**

Spark Structured Streaming applies the DataFrame processing model to continuously arriving data, commonly using small micro-batches. It maintains state and checkpoint information so a streaming query can resume consistently after failure.

**Why It Matters**

It provides a familiar path from batch feature transformations to near-real-time processing, but state, late data, and sink semantics still require careful design.

**Interview-Ready Explanation**

> Structured Streaming expresses a streaming pipeline with DataFrame-style transformations and durable checkpoints. I still define lateness, state size, output idempotency, and recovery behavior explicitly.

---

### [CARD: Watermarks, Late Data, and Checkpoints]
<!-- id: d20-watermarks-and-checkpoints -->

- **Priority:** should_know
- **Category:** stream-processing
- **Tags:** watermark, late-data, checkpoint, state

**Core Concept**

Event time is when an event actually happened; processing time is when the system received it. A watermark is a policy for how long a streaming system waits for late event-time data before finalizing or discarding old state. Checkpoints persist progress and state for recovery.

**Why It Matters**

Mobile devices, network delays, and retries make late events normal. Without a bounded lateness policy, stateful operations such as windowed counts can grow indefinitely.

**Interview-Ready Explanation**

> I distinguish event time from processing time. A watermark bounds how much late data I accept and how long I retain state; checkpoints allow the query to resume from a known consistent point.

---

### [CARD: Airflow DAGs, Tasks, and Dependencies]
<!-- id: d20-airflow-dags-and-tasks -->

- **Priority:** must_know
- **Category:** airflow
- **Tags:** airflow, dag, tasks, dependencies, orchestration

**Core Concept**

Airflow orchestrates workflows as directed acyclic graphs (DAGs). A DAG defines tasks and their dependencies; the scheduler decides when eligible task instances should run according to the schedule and dependency rules.

**Why It Matters**

An ML pipeline has ordered steps: ingest data, validate, build features, train, evaluate, register, and deploy. A DAG makes dependencies, retries, ownership, and observability explicit.

**Example**

```text
ingest → validate → build_features → train → evaluate → register
                         └──────────────→ publish_metrics
```

**Interview-Ready Explanation**

> Airflow represents a workflow as a DAG of tasks. It schedules tasks when their dependencies are satisfied and gives the pipeline explicit retries, monitoring, and backfill behavior.

---

### [CARD: Airflow Scheduling, Retries, and Idempotency]
<!-- id: d20-airflow-retries-and-idempotency -->

- **Priority:** must_know
- **Category:** airflow
- **Tags:** airflow, retries, idempotency, backfill, scheduling

**Core Concept**

Scheduled workflows can fail and must be retried. A sound Airflow task is idempotent for its logical data interval: rerunning it produces the same correct partition or version rather than duplicate side effects. Backfills rerun historical intervals intentionally.

**Why It Matters**

Retries and backfills are normal, not exceptional. A task that appends blindly or reads “now” instead of its scheduled interval produces inconsistent historical features.

**Example**

Write a daily feature task to a deterministic location such as `features/date=2026-08-21/`, validate it, then atomically publish that partition rather than appending undifferentiated output.

**Interview-Ready Explanation**

> I design Airflow tasks around a logical data interval and idempotent output. That makes retries safe and backfills reproducible; task code should not depend implicitly on wall-clock “now.”

---

### [CARD: Airflow Orchestrates Work; It Does Not Replace Compute]
<!-- id: d20-airflow-orchestration-not-compute -->

- **Priority:** should_know
- **Category:** airflow
- **Tags:** airflow, orchestration, compute, architecture

**Core Concept**

Airflow coordinates and monitors tasks; it is not a distributed data-processing engine. A task should usually submit work to the right compute system—Spark, a warehouse, a container job, or a model-training service—and then track the result.

**Why It Matters**

Putting long, heavy computation directly inside a scheduler worker harms scheduler reliability and makes scaling or recovery harder.

**Interview-Ready Explanation**

> Airflow is the conductor, not the orchestra. It manages dependency and schedule state, while Spark, a warehouse, or a training platform performs the heavy computation.

---

### [CARD: Kafka, Spark, and Airflow in One ML Pipeline]
<!-- id: d20-tool-roles-in-ml-pipeline -->

- **Priority:** must_know
- **Category:** data-platform
- **Tags:** kafka, spark, airflow, mle-pipeline, architecture

**Core Concept**

Kafka, Spark, and Airflow are complementary rather than interchangeable:

| Tool | Primary job |
|---|---|
| Kafka | Durable transport and consumption of event streams |
| Spark | Large-scale batch or streaming transformation of data |
| Airflow | Schedule, coordinate, retry, and observe multi-step workflows |

**Example**

```text
application events → Kafka → Spark builds streaming aggregates → feature store

Airflow daily DAG → submit Spark training-data job → train model → evaluate → register
```

**Interview-Ready Explanation**

> Kafka moves durable event streams, Spark transforms data at scale, and Airflow orchestrates workflow dependencies. In a design interview, I choose each only where its role solves a concrete requirement.

---

## Key Connections

- **Day 7:** Training-serving skew, feature stores, monitoring, and batch-vs-online inference become concrete pipeline design choices here.
- **Day 18:** Threads/asyncio may handle service-side I/O; Kafka/Spark/Airflow handle durable, larger-scale pipeline coordination and processing.
- **Day 19:** Spark and Airflow usually read/write the partitioned SQL or warehouse tables used for training and feature computation.
- **System design:** Event ordering, idempotency, late data, backpressure, retries, and data intervals are the operational details behind a credible ML pipeline answer.

---

## Common Misconceptions

- **Myth:** Kafka guarantees one global order for a topic.  
  **Reality:** Ordering is guaranteed only within a partition.

- **Myth:** Exactly-once is solved by committing Kafka offsets carefully.  
  **Reality:** End-to-end correctness also depends on transformation and sink behavior; idempotent side effects are essential.

- **Myth:** Every Spark DataFrame line runs immediately.  
  **Reality:** Transformations are lazy; actions trigger execution.

- **Myth:** More Spark partitions always make jobs faster.  
  **Reality:** Too many tiny tasks add overhead, while skew can still make one partition dominate runtime.

- **Myth:** Airflow is the system that processes terabytes of data.  
  **Reality:** It orchestrates tasks; the task should submit heavy work to an appropriate compute engine.

- **Myth:** Streaming automatically means better architecture.  
  **Reality:** It should be justified by a freshness requirement that exceeds what a batch pipeline can meet.

---

## Out of Scope

- Kafka replication internals, controller design, and cluster tuning
- Spark RDD APIs, custom partitioners, and executor-memory tuning
- Airflow deployment, custom operators, and scheduler internals
- Vendor-specific managed-service configuration
- Stateful stream-processing implementation beyond the core watermark/checkpoint model

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d20-qa-001]

**Question:** When should streaming be chosen over batch processing?

**Answer:** When the product needs lower-latency freshness than a scheduled batch can provide and the added operational complexity is justified.

**Tags:** batch, streaming, freshness

**Linked Cards:** d20-batch-vs-stream-processing

#### [QA: d20-qa-002]

**Question:** What do topics, partitions, brokers, and offsets represent in Kafka?

**Answer:** Topics organize event logs, partitions are the ordered scalable log shards, brokers store them, and offsets identify a consumer's position in a partition.

**Tags:** kafka, partitions, offsets

**Linked Cards:** d20-kafka-core-model

#### [QA: d20-qa-003]

**Question:** What ordering guarantee does Kafka provide?

**Answer:** Kafka preserves order within an individual partition, not across all partitions in a topic.

**Tags:** kafka, ordering, partitions

**Linked Cards:** d20-kafka-consumer-groups-and-ordering

#### [QA: d20-qa-004]

**Question:** Why should a Kafka consumer's side effect be idempotent?

**Answer:** A record can be processed again after a failure before offset commit. Idempotency makes such retries converge on the same correct result.

**Tags:** kafka, idempotency, retries

**Linked Cards:** d20-delivery-semantics-and-idempotency

#### [QA: d20-qa-005]

**Question:** Why treat an event schema as a contract?

**Answer:** Producers and consumers deploy independently; versioning and compatibility rules prevent a field change from breaking or silently altering downstream pipelines.

**Tags:** schema, compatibility

**Linked Cards:** d20-schema-evolution

#### [QA: d20-qa-006]

**Question:** What is the difference between a Spark transformation and an action?

**Answer:** A transformation builds a lazy plan; an action triggers Spark to execute that plan and produce a result or write output.

**Tags:** spark, transformations, actions

**Linked Cards:** d20-spark-lazy-execution

#### [QA: d20-qa-007]

**Question:** Why are shuffles expensive in Spark?

**Answer:** They redistribute data across the cluster, requiring network transfer, coordination, possible disk spill, and new execution stages.

**Tags:** spark, shuffle, performance

**Linked Cards:** d20-spark-partitions-and-shuffles

#### [QA: d20-qa-008]

**Question:** When is a broadcast join useful, and what is skew?

**Answer:** Broadcast a small table to avoid shuffling a large table. Skew means some join keys have much more data than others, creating straggler partitions.

**Tags:** spark, broadcast, skew

**Linked Cards:** d20-spark-joins-and-skew

#### [QA: d20-qa-009]

**Question:** What does a watermark control in stream processing?

**Answer:** It defines how much late event-time data is accepted and bounds how long state is retained for stateful operations.

**Tags:** watermark, late-data, state

**Linked Cards:** d20-watermarks-and-checkpoints

#### [QA: d20-qa-010]

**Question:** What is an Airflow DAG?

**Answer:** A directed acyclic graph of workflow tasks and dependencies that Airflow schedules and monitors.

**Tags:** airflow, dag, orchestration

**Linked Cards:** d20-airflow-dags-and-tasks

#### [QA: d20-qa-011]

**Question:** Why must Airflow tasks be idempotent for their data interval?

**Answer:** Retries and backfills are normal; idempotency ensures rerunning an interval produces one correct output instead of duplicates or inconsistent results.

**Tags:** airflow, idempotency, backfill

**Linked Cards:** d20-airflow-retries-and-idempotency

#### [QA: d20-qa-012]

**Question:** Why should Airflow not perform heavy distributed computation inside the scheduler worker?

**Answer:** Airflow is an orchestrator. Heavy work belongs in Spark, a warehouse, containers, or a training platform so scheduling remains reliable and scalable.

**Tags:** airflow, compute, orchestration

**Linked Cards:** d20-airflow-orchestration-not-compute

#### [QA: d20-qa-013]

**Question:** What distinct role do Kafka, Spark, and Airflow play in an ML platform?

**Answer:** Kafka transports durable event streams, Spark transforms data at scale, and Airflow coordinates scheduled multi-step workflows.

**Tags:** kafka, spark, airflow

**Linked Cards:** d20-tool-roles-in-ml-pipeline

<!-- QA_END -->
