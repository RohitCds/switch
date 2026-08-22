---
day: 19
title: "SQL Theory for MLE Interviews"
topics:
  - sql
  - relational-modeling
  - query-performance
  - transactions
tags:
  - sql
  - data-engineering
  - mle-systems
  - interview-prep
priority_distribution:
  must_know: 13
  should_know: 3
  nice_to_know: 0
---

# DAY 19 — SQL THEORY FOR MLE INTERVIEWS

## Daily Objective
Understand the relational model and write, reason about, and debug the SQL patterns most relevant to MLE work: joins, aggregation, windows, nulls, CTEs, indexes, transactions, and query plans. The goal is not vendor-specific memorization; it is correct data reasoning.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** tables/keys, logical query order, joins, one-to-many join duplication, aggregation, `NULL`, window functions, CTEs, indexes, query plans, transactions/isolation, parameterized queries.
- 🟡 **SHOULD KNOW:** `UNION` vs. `UNION ALL`, normalization vs. denormalization, partitioning, and data-quality checks.
- 🟢 **NICE TO KNOW:** database-engine internals, vendor-specific hints, recursive CTEs, and stored procedures.

---

## Knowledge Cards

---

### [CARD: Relational Tables, Primary Keys, and Foreign Keys]
<!-- id: d19-relational-model-and-keys -->

- **Priority:** must_know
- **Category:** sql-foundations
- **Tags:** relational-model, primary-key, foreign-key, schema

**Core Concept**

A relational database stores data in tables: rows are records and columns are attributes. A primary key uniquely identifies a row. A foreign key records a relationship by referring to a key in another table.

**Why It Matters**

MLE pipelines routinely join labels, features, users, events, predictions, and experiment metadata. Correct key reasoning prevents duplicate training examples, dropped records, and label leakage.

**Example**

```text
users(user_id PRIMARY KEY, country)
events(event_id PRIMARY KEY, user_id FOREIGN KEY → users.user_id, event_time)
```

One user can have many events. Therefore a join from `users` to `events` can produce many rows per user.

**Interview-Ready Explanation**

> A primary key uniquely identifies each row. A foreign key expresses a relationship to another table's key. Before joining tables, I establish the cardinality—one-to-one, one-to-many, or many-to-many—because it determines whether rows can multiply.

---

### [CARD: SQL Logical Query Processing Order]
<!-- id: d19-logical-query-order -->

- **Priority:** must_know
- **Category:** sql-foundations
- **Tags:** select, where, group-by, having, order-by

**Core Concept**

SQL is written in one order but logically processed roughly as: `FROM`/`JOIN` → `WHERE` → `GROUP BY` → aggregate calculations → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`.

**Why It Matters**

This explains common bugs, such as trying to use a `SELECT` alias in `WHERE`, or filtering grouped results in the wrong place.

**Example**

```sql
SELECT user_id, COUNT(*) AS event_count
FROM events
WHERE event_time >= DATE '2026-01-01'
GROUP BY user_id
HAVING COUNT(*) >= 10
ORDER BY event_count DESC;
```

`WHERE` filters individual rows before grouping. `HAVING` filters groups after `COUNT(*)` exists.

**Interview-Ready Explanation**

> I reason about SQL in logical processing order, not visual order: first form and filter rows, then group and aggregate, then filter groups, project columns, and finally sort or limit.

---

### [CARD: Inner, Left, Right, and Full Joins]
<!-- id: d19-join-types -->

- **Priority:** must_know
- **Category:** sql-joins
- **Tags:** joins, inner-join, left-join, nulls

**Core Concept**

An inner join keeps only matching rows from both inputs. A left join keeps every row from the left input and fills unmatched right-side columns with `NULL`. Right and full joins are symmetric variants, though a left join is often clearer when choosing a preserved population.

**Why It Matters**

The join type encodes a product and data decision. For example, a feature table may need every eligible user even if some have no recent events.

**Example**

```sql
SELECT u.user_id, e.event_time
FROM users AS u
LEFT JOIN events AS e
  ON e.user_id = u.user_id;
```

Users without events remain, with `event_time = NULL`.

**Failure Modes / Tradeoffs**

Putting a right-table condition in `WHERE` after a left join can discard the `NULL` rows and accidentally turn the result into an inner join. Put that condition in the `ON` clause when preserving unmatched left rows is intended.

**Interview-Ready Explanation**

> I choose the join type from the population I must preserve. A left join preserves the left table, but I am careful not to filter its unmatched right-side `NULL`s away in the `WHERE` clause.

---

### [CARD: Join Cardinality and Row Multiplication]
<!-- id: d19-join-cardinality-and-duplication -->

- **Priority:** must_know
- **Category:** sql-joins
- **Tags:** joins, cardinality, duplicates, data-quality

**Core Concept**

Joining tables does not automatically preserve row count. A one-to-many join repeats the “one” row for every matching “many” row. A many-to-many join can multiply rows dramatically.

**Why It Matters**

This is one of the most dangerous ML data bugs: duplicate examples can bias aggregate features, inflate metrics, or assign the same label to multiple unintended rows.

**Example**

```text
users:          1 row for user 42
events:         3 rows for user 42
joined result:  3 rows containing user 42
```

To build one feature row per user, aggregate events to `user_id` first, then join that result to `users`.

**Interview-Ready Explanation**

> Before every join, I state the expected key uniqueness and cardinality. If I need one row per entity, I aggregate or deduplicate the many-side first and then validate the result with row counts and uniqueness checks.

---

### [CARD: Aggregation and GROUP BY]
<!-- id: d19-aggregation-and-group-by -->

- **Priority:** must_know
- **Category:** sql-aggregation
- **Tags:** group-by, aggregates, count, sum, average

**Core Concept**

`GROUP BY` partitions rows into groups, and aggregate functions such as `COUNT`, `SUM`, `AVG`, `MIN`, and `MAX` reduce each group to a summary value.

**Why It Matters**

Feature engineering frequently turns event-level data into entity-level features: number of purchases, average session length, or last activity time.

**Example**

```sql
SELECT
  user_id,
  COUNT(*) AS sessions,
  AVG(duration_seconds) AS avg_session_seconds
FROM sessions
GROUP BY user_id;
```

`COUNT(*)` counts rows; `COUNT(column)` counts only rows where that column is not `NULL`.

**Failure Modes / Tradeoffs**

Every selected expression must either be aggregated or appear in `GROUP BY` (subject to database-specific functional-dependency rules). Be explicit about the grain of the result: here it is one row per `user_id`.

**Interview-Ready Explanation**

> `GROUP BY` changes the grain of a dataset. I name the intended grain first—such as one row per user—then aggregate each event-level signal to that same level.

---

### [CARD: NULL and Three-Valued Logic]
<!-- id: d19-null-and-three-valued-logic -->

- **Priority:** must_know
- **Category:** sql-foundations
- **Tags:** null, three-valued-logic, coalesce, missing-data

**Core Concept**

`NULL` represents missing or unknown information. Comparisons involving `NULL` generally evaluate to `UNKNOWN`, not `TRUE` or `FALSE`; `WHERE` retains only rows whose condition is `TRUE`.

**Why It Matters**

Missing values are common in joined features and labels. Incorrect null handling can silently remove records or create misleading aggregations.

**Example**

```sql
WHERE country = 'IN'       -- excludes NULL country values
WHERE country IS NULL      -- correct null test
SELECT COALESCE(score, 0)  -- replace NULL score with 0 deliberately
```

**Failure Modes / Tradeoffs**

Do not assume `NULL = NULL` is true; use `IS NULL`. Treating missing as zero with `COALESCE` is a feature decision, not merely syntax—add a missingness indicator when that distinction is meaningful.

**Interview-Ready Explanation**

> SQL uses three-valued logic: comparisons with `NULL` become unknown, and `WHERE` keeps only true. I use `IS NULL` for null checks and make missing-value imputation an explicit data decision.

---

### [CARD: Window Functions]
<!-- id: d19-window-functions -->

- **Priority:** must_know
- **Category:** sql-analytics
- **Tags:** windows, partition-by, order-by, rank, lag

**Core Concept**

A window function computes a value across related rows while retaining the original row granularity. `PARTITION BY` defines each group, and `ORDER BY` defines sequence-sensitive calculations inside that group.

**Why It Matters**

Windows are the right tool for “previous event,” “latest record per user,” ranking, rolling features, and session-style analysis without collapsing data as `GROUP BY` does.

**Example**

```sql
SELECT
  user_id,
  event_time,
  LAG(event_time) OVER (
    PARTITION BY user_id ORDER BY event_time
  ) AS previous_event_time,
  ROW_NUMBER() OVER (
    PARTITION BY user_id ORDER BY event_time DESC
  ) AS recency_rank
FROM events;
```

**Interview-Ready Explanation**

> Aggregation collapses rows; a window function keeps them and adds context from related rows. I use `ROW_NUMBER` for latest-per-entity patterns and `LAG` for time-based features.

---

### [CARD: Common Table Expressions and Subqueries]
<!-- id: d19-ctes-and-subqueries -->

- **Priority:** must_know
- **Category:** sql-query-structure
- **Tags:** cte, subquery, readability, query-design

**Core Concept**

A common table expression (CTE) names an intermediate result for a single query using `WITH`. A subquery is a query nested inside another query. Both help express multi-stage logic.

**Why It Matters**

Clear intermediate stages make feature queries reviewable: define the eligible population, aggregate events, then join the feature table. This is safer than one giant opaque query.

**Example**

```sql
WITH user_event_features AS (
  SELECT user_id, COUNT(*) AS event_count
  FROM events
  GROUP BY user_id
)
SELECT u.user_id, COALESCE(f.event_count, 0) AS event_count
FROM users AS u
LEFT JOIN user_event_features AS f ON f.user_id = u.user_id;
```

**Interview-Ready Explanation**

> I use CTEs to make each data-transformation stage explicit. They improve readability and validation; performance depends on the database optimizer, so I inspect the plan rather than assuming a CTE is always materialized or always free.

---

### [CARD: UNION vs. UNION ALL]
<!-- id: d19-union-vs-union-all -->

- **Priority:** should_know
- **Category:** sql-query-structure
- **Tags:** union, union-all, duplicates

**Core Concept**

`UNION ALL` appends compatible result sets and preserves duplicates. `UNION` also removes duplicate rows, which requires extra work and can hide upstream duplication.

**Example**

```sql
SELECT user_id FROM january_users
UNION ALL
SELECT user_id FROM february_users;
```

**Interview-Ready Explanation**

> I default to `UNION ALL` when I intend to append datasets. I use `UNION` only when deduplication is explicitly required, because it changes semantics and adds cost.

---

### [CARD: Indexes and B-Tree Tradeoffs]
<!-- id: d19-indexes-and-btree-tradeoffs -->

- **Priority:** must_know
- **Category:** sql-performance
- **Tags:** indexes, btree, query-performance, writes

**Core Concept**

An index is an auxiliary data structure that helps a database locate rows without scanning the whole table. A B-tree index is a common general-purpose index for equality, range, and ordered lookups.

**Why It Matters**

Indexes can make selective filters and joins much faster, but every index consumes storage and must be maintained on inserts, updates, and deletes.

**Example**

```sql
CREATE INDEX events_user_time_idx
ON events (user_id, event_time);
```

This can help a query that filters by `user_id` and then restricts or orders by `event_time`. Column order matters; it should follow common access patterns.

**Failure Modes / Tradeoffs**

An index is not automatically useful for a non-selective filter or a query that applies a function to the indexed column. Add indexes based on observed query patterns and plans, not by indexing every column.

**Interview-Ready Explanation**

> An index trades write and storage cost for faster row lookup. I index selective filter and join patterns, consider compound-index column order, and verify benefit with the execution plan.

---

### [CARD: Query Plans and EXPLAIN]
<!-- id: d19-query-plans-and-explain -->

- **Priority:** must_know
- **Category:** sql-performance
- **Tags:** explain, query-plan, scan, join, performance

**Core Concept**

The database optimizer chooses a physical plan to execute SQL: scan tables or indexes, join inputs, sort, aggregate, and estimate row counts. `EXPLAIN` shows the planned operations; some databases provide actual timing and row counts with an analyze variant.

**Why It Matters**

Two queries with the same result can have radically different runtime. Query plans reveal full-table scans, expensive sorts, bad cardinality estimates, and unexpectedly large joins.

**Mental Model / Mechanics**

When a query is slow, check:

1. Which input is largest and how many rows are scanned?
2. Is an expected filter or index being used?
3. Did a join multiply rows?
4. Is a sort, shuffle-like operation, or aggregation dominating work?
5. Do estimated and actual row counts disagree?

**Interview-Ready Explanation**

> I use `EXPLAIN` to reason from the physical execution plan rather than guessing. I look for scans, join order, row counts, sort operations, and whether estimates match reality before changing SQL or adding an index.

---

### [CARD: Transactions and ACID]
<!-- id: d19-transactions-and-acid -->

- **Priority:** must_know
- **Category:** sql-reliability
- **Tags:** transactions, acid, consistency, durability

**Core Concept**

A transaction groups operations into one unit. ACID summarizes desired guarantees: Atomicity (all or none), Consistency (valid state transitions), Isolation (concurrent transactions do not interfere beyond the chosen level), and Durability (committed data survives failures).

**Why It Matters**

Feature pipelines and model-serving metadata often involve multiple related writes. Partial updates can leave a system with a feature version but no corresponding model registration, for example.

**Example**

```sql
BEGIN;
UPDATE model_versions SET status = 'active' WHERE version = 7;
UPDATE model_versions SET status = 'archived' WHERE version = 6;
COMMIT;
```

If either update fails, a rollback can preserve the prior consistent state.

**Interview-Ready Explanation**

> A transaction makes a related set of changes atomic. ACID is about avoiding partial, inconsistent, or lost state when failures and concurrency occur; the exact isolation tradeoff depends on the database and workload.

---

### [CARD: Isolation Levels and Idempotent Data Jobs]
<!-- id: d19-isolation-and-idempotency -->

- **Priority:** must_know
- **Category:** sql-reliability
- **Tags:** isolation, idempotency, retries, upsert

**Core Concept**

Isolation controls what concurrent transactions can observe. Data jobs also need idempotency: repeating a job after a retry should not create duplicate or conflicting output.

**Why It Matters**

Retries are normal in production. A daily feature job that blindly inserts the same rows twice can silently contaminate training or serving data.

**Example**

Use a stable business key such as `(feature_date, user_id, feature_version)` and an upsert/merge pattern supported by the database, rather than an unkeyed append.

**Interview-Ready Explanation**

> I match transaction isolation to the consistency needed, then design jobs to be idempotent using stable keys and upserts or replace-by-partition writes. Retries should converge on one correct result.

---

### [CARD: Normalization vs. Denormalization]
<!-- id: d19-normalization-vs-denormalization -->

- **Priority:** should_know
- **Category:** data-modeling
- **Tags:** normalization, denormalization, modeling, analytics

**Core Concept**

Normalization separates data into related tables to reduce repeated facts and update anomalies. Denormalization deliberately duplicates or precomputes data to make common reads and analytics simpler or faster.

**Why It Matters**

Operational systems often prefer normalized source-of-truth data. Analytics and feature-serving systems may use denormalized, entity-level tables to avoid repeated expensive joins.

**Interview-Ready Explanation**

> Normalization prioritizes consistency and clean updates; denormalization prioritizes read efficiency and simpler access. I choose based on the workload and make freshness and ownership explicit when duplicating data.

---

### [CARD: Parameterized Queries and SQL Injection]
<!-- id: d19-parameterized-queries -->

- **Priority:** must_know
- **Category:** sql-security
- **Tags:** sql-injection, parameters, security, queries

**Core Concept**

Never build SQL by concatenating untrusted input into query text. Use the database driver's parameter-binding mechanism so values are transmitted separately from the SQL structure.

**Why It Matters**

Data products often expose filters, identifiers, and search inputs. String construction can allow malicious input to alter query meaning and can also produce quoting bugs.

**Example**

```python
# Driver placeholder syntax varies by library.
cursor.execute(
    "SELECT * FROM predictions WHERE user_id = %s",
    (user_id,),
)
```

**Failure Modes / Tradeoffs**

Parameters protect values, not SQL identifiers such as column names or sort directions. For dynamic identifiers, select from a fixed allowlist rather than accepting arbitrary strings.

**Interview-Ready Explanation**

> I parameterize values rather than interpolating them into SQL. If query structure must vary, I use a strict allowlist for identifiers because bound parameters do not safely substitute table or column names.

---

### [CARD: Partitioning and Data-Quality Validation]
<!-- id: d19-partitioning-and-data-quality -->

- **Priority:** should_know
- **Category:** data-engineering
- **Tags:** partitioning, data-quality, validation, dates

**Core Concept**

Partitioning organizes a large table into pieces, commonly by date, so queries can scan only relevant partitions. Data-quality validation checks that each output has the expected grain, freshness, row count, uniqueness, and value ranges.

**Why It Matters**

Most MLE feature queries are time-bounded. Partition filters control cost, while validation catches late data, duplicate keys, and accidental full-history scans before they reach a model.

**Interview-Ready Explanation**

> I filter on the partition key whenever possible, then validate data at the output grain: expected row count, unique keys, freshness, null rate, and sensible value distributions.

---

## Key Connections

- **Days 2–7:** SQL creates training datasets, aggregates features, and supports evaluation slices; join cardinality and time filters are major leakage risks.
- **Day 17:** Python clients should parameterize SQL and manage database connections with context managers.
- **Day 20:** Kafka/Spark/Airflow commonly feed, transform, and schedule the tables queried here.
- **System design:** State the data grain, freshness SLA, and source-of-truth keys before proposing a feature store or model pipeline.

---

## Common Misconceptions

- **Myth:** A left join always preserves every left row in the final result.  
  **Reality:** A right-table filter in `WHERE` can remove unmatched rows and undo that intention.

- **Myth:** A join should not change the number of rows.  
  **Reality:** One-to-many and many-to-many joins multiply rows by design.

- **Myth:** `NULL = NULL` is true.  
  **Reality:** It is unknown; use `IS NULL`.

- **Myth:** `GROUP BY` is the right way to obtain the previous event.  
  **Reality:** A window function such as `LAG` preserves event-level rows and is usually the right tool.

- **Myth:** More indexes always improve a database.  
  **Reality:** Indexes cost storage and slow writes; they must match real query patterns.

- **Myth:** `UNION` and `UNION ALL` are interchangeable.  
  **Reality:** `UNION` deduplicates and changes both semantics and cost.

---

## Out of Scope

- Vendor-specific SQL dialect features and optimizer hints
- Stored procedures, triggers, recursive CTEs, and database administration
- Data warehouse-specific storage engines and distributed SQL internals
- Full isolation-anomaly taxonomy and lock implementation details
- Advanced geospatial, JSON, and full-text search queries

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d19-qa-001]

**Question:** Why establish join cardinality before writing a join?

**Answer:** Cardinality determines whether rows can multiply. It lets you protect the intended data grain and avoid duplicate examples or inflated aggregates.

**Tags:** joins, cardinality

**Linked Cards:** d19-relational-model-and-keys, d19-join-cardinality-and-duplication

#### [QA: d19-qa-002]

**Question:** What is the logical difference between `WHERE` and `HAVING`?

**Answer:** `WHERE` filters individual rows before grouping; `HAVING` filters grouped results after aggregate calculations.

**Tags:** where, having, aggregation

**Linked Cards:** d19-logical-query-order

#### [QA: d19-qa-003]

**Question:** How can a `WHERE` clause accidentally defeat a left join?

**Answer:** Filtering a right-table column in `WHERE` removes unmatched rows because that column is `NULL`; put the condition in `ON` when unmatched left rows should remain.

**Tags:** left-join, nulls

**Linked Cards:** d19-join-types

#### [QA: d19-qa-004]

**Question:** How do you create one row per user from an events table?

**Answer:** Group events by `user_id` and aggregate the needed signals, then join the entity-level result to the user table if needed.

**Tags:** group-by, features

**Linked Cards:** d19-aggregation-and-group-by

#### [QA: d19-qa-005]

**Question:** Why does `WHERE value = NULL` not find missing values?

**Answer:** Comparisons with `NULL` evaluate to unknown, not true. Use `WHERE value IS NULL`.

**Tags:** null, three-valued-logic

**Linked Cards:** d19-null-and-three-valued-logic

#### [QA: d19-qa-006]

**Question:** What is the key difference between a window function and `GROUP BY`?

**Answer:** `GROUP BY` collapses rows into one result per group; a window function adds group-aware calculations while keeping each original row.

**Tags:** windows, group-by

**Linked Cards:** d19-window-functions

#### [QA: d19-qa-007]

**Question:** Why use a CTE in a feature query?

**Answer:** It names intermediate stages such as eligibility and aggregation, making the query easier to review and validate.

**Tags:** cte, query-design

**Linked Cards:** d19-ctes-and-subqueries

#### [QA: d19-qa-008]

**Question:** When should `UNION ALL` be preferred over `UNION`?

**Answer:** When appending result sets and preserving duplicates is intended. `UNION` should be used only when deduplication is explicitly required.

**Tags:** union, duplicates

**Linked Cards:** d19-union-vs-union-all

#### [QA: d19-qa-009]

**Question:** What is the main tradeoff of an index?

**Answer:** It can speed selective reads and joins, but consumes storage and adds maintenance cost to inserts, updates, and deletes.

**Tags:** indexes, performance

**Linked Cards:** d19-indexes-and-btree-tradeoffs

#### [QA: d19-qa-010]

**Question:** What do you inspect in a query plan for a slow query?

**Answer:** Scanned rows, index use, join order/cardinality, expensive sorts or aggregations, and whether estimated row counts match actual counts.

**Tags:** explain, query-plan

**Linked Cards:** d19-query-plans-and-explain

#### [QA: d19-qa-011]

**Question:** What does atomicity mean in a transaction?

**Answer:** Either all operations in the transaction commit, or none do; partial updates are not left behind after a failure.

**Tags:** transactions, acid

**Linked Cards:** d19-transactions-and-acid

#### [QA: d19-qa-012]

**Question:** How do you make a retried data job idempotent?

**Answer:** Write using stable business keys and an upsert/merge or replace-by-partition pattern, so repeated execution converges on the same result.

**Tags:** idempotency, retries

**Linked Cards:** d19-isolation-and-idempotency

#### [QA: d19-qa-013]

**Question:** What is the normalization/denormalization tradeoff?

**Answer:** Normalization reduces duplication and update anomalies; denormalization can simplify and accelerate common reads at the cost of duplicated data and freshness management.

**Tags:** data-modeling, normalization

**Linked Cards:** d19-normalization-vs-denormalization

#### [QA: d19-qa-014]

**Question:** Why are parameterized SQL queries safer than string interpolation?

**Answer:** They send values separately from SQL structure, preventing untrusted values from changing the query's meaning.

**Tags:** sql-injection, security

**Linked Cards:** d19-parameterized-queries

#### [QA: d19-qa-015]

**Question:** What quality checks should an entity-level feature query include?

**Answer:** Check expected grain and unique keys, row count, freshness, null rate, and sensible value distributions; also filter relevant partitions to control cost.

**Tags:** data-quality, partitioning

**Linked Cards:** d19-partitioning-and-data-quality

<!-- QA_END -->
