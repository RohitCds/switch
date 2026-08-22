---
day: 23
title: "Interview Coding, DSA & Testing"
topics:
  - dsa
  - testing
  - data-structures
  - code-quality
tags:
  - interview-prep
  - mle-coding
priority_distribution:
  must_know: 7
  should_know: 5
  nice_to_know: 0
---

# DAY 23 — Interview Coding, DSA & Testing

## Daily Objective
Master essential DSA patterns, core data structures, testing strategies, and code quality practices tailored for Machine Learning Engineering interviews. Focus on recognizing algorithm patterns in MLE contexts (streaming data, feature processing) and writing robust, testable ML code.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Sliding Window, Top-K (Heaps), Hash Maps & Sets, Boundary Test Cases, Mocking External Services, Handling Edge Cases, Time & Space Complexity
- 🟡 **SHOULD KNOW:** Two Pointers, BFS / DFS, Deques, Parameterized Testing, Testing Stochastic Functions
- 🟢 **NICE TO KNOW:** None for today

---

## Knowledge Cards

---

### [CARD: Sliding Window Pattern]
<!-- id: d23-sliding-window -->

- **Priority:** must_know
- **Category:** coding
- **Tags:** dsa, sliding-window, streaming
**Core Concept**

Maintains a subset of items (a "window") that moves over a larger dataset. Useful for running metrics (e.g., moving average).
**Why It Matters**

In MLE, this pattern is heavily used in stream processing, calculating rolling features, or managing fixed-size context windows for language models.
**Mental Model / Mechanics**

Use two pointers to define the window boundaries. Expand the right pointer to add new elements, and shrink the left pointer when the window condition is violated.
**Example**

```python
def moving_average(stream, k):
    window_sum = 0
    left = 0
    res = []
    for right in range(len(stream)):
        window_sum += stream[right]
        if right - left + 1 > k:
            window_sum -= stream[left]
            left += 1
        if right - left + 1 == k:
            res.append(window_sum / k)
    return res
```
**Failure Modes / Tradeoffs**

- Off-by-one errors when adjusting window boundaries.
- Recomputing the entire window instead of incrementally updating the state.
**Interview-Ready Explanation**

> The sliding window pattern maintains a continuous subset of data, updating state incrementally. It optimizes O(N*K) naive approaches to O(N) by adding the new element and removing the old one.

---

### [CARD: Two Pointers Pattern]
<!-- id: d23-two-pointers -->

- **Priority:** should_know
- **Category:** coding
- **Tags:** dsa, two-pointers, arrays
**Core Concept**

Using two indices to traverse an array simultaneously, often from opposite ends or at different speeds.
**Why It Matters**

Useful for finding pairs in sorted feature arrays, or merging ranked lists (e.g., combining results from two different recommendation models).
**Mental Model / Mechanics**

Initialize pointers at `start` and `end`. Move them inwards based on a condition until they meet, narrowing down the search space in O(N) instead of O(N^2).
**Example**

```python
def two_sum_sorted(features, target):
    l, r = 0, len(features) - 1
    while l < r:
        s = features[l] + features[r]
        if s == target: return (l, r)
        elif s < target: l += 1
        else: r -= 1
    return None
```
**Failure Modes / Tradeoffs**

- Array must usually be sorted first, adding O(N log N) overhead if not already sorted.
- Handling duplicate values gracefully.
**Interview-Ready Explanation**

> Two pointers involves traversing a sequence with two indices, often from both ends, to optimize pair finding or merging tasks from O(N^2) to O(N) for sorted data.

---

### [CARD: Top-K Pattern (Heaps)]
<!-- id: d23-top-k-heaps -->

- **Priority:** must_know
- **Category:** coding
- **Tags:** dsa, heaps, ranking
**Core Concept**

Using a min-heap or max-heap to efficiently track the K largest or smallest elements in a dataset or stream.
**Why It Matters**

This is the core algorithmic primitive for ranking systems, recommendation retrieval, and nearest-neighbor search.
**Mental Model / Mechanics**

To find Top-K largest items, maintain a **min-heap** of size K. When a new item arrives, push it. If heap size > K, pop the smallest item. The heap retains the K largest seen so far.
**Example**

```python
import heapq
def get_top_k(scores, k):
    min_heap = []
    for score in scores:
        heapq.heappush(min_heap, score)
        if len(min_heap) > k:
            heapq.heappop(min_heap)
    return min_heap
```
**Failure Modes / Tradeoffs**

- Memory usage is O(K), which is highly efficient for streaming compared to sorting the entire array O(N log N).
- Remember to invert values for a max-heap in Python since `heapq` only implements min-heaps.
**Interview-Ready Explanation**

> The Top-K pattern uses a heap to keep track of the largest or smallest items efficiently. By maintaining a min-heap of size K, we can find the K largest items in a stream in O(N log K) time without storing the entire dataset.

---

### [CARD: BFS / DFS for Graphs]
<!-- id: d23-bfs-dfs -->

- **Priority:** should_know
- **Category:** coding
- **Tags:** dsa, graphs, traversal
**Core Concept**

Breadth-First Search explores level by level; Depth-First Search explores as far along a branch as possible before backtracking.
**Why It Matters**

Graph processing in MLE includes resolving computational dependencies (DAGs in ML pipelines), parsing ontologies, or traversing user-item interaction graphs.
**Mental Model / Mechanics**

BFS uses a Queue (FIFO) and is ideal for finding the shortest path or level-order traversal. DFS uses a Stack (LIFO) or recursion and is ideal for topological sorting or exhaustively exploring paths.
**Example**

```python
from collections import deque
def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```
**Failure Modes / Tradeoffs**

- Forgetting to track `visited` nodes will result in infinite loops in cyclic graphs.
- DFS recursion depth can exceed system limits for deep graphs.
**Interview-Ready Explanation**

> BFS and DFS are graph traversal algorithms. BFS explores level-by-level using a queue, useful for shortest path. DFS explores deep using recursion or a stack, useful for topological sorting. Always track visited nodes to avoid cycles.

---

### [CARD: Hash Maps & Sets]
<!-- id: d23-hash-maps-sets -->

- **Priority:** must_know
- **Category:** data-structures
- **Tags:** data-structures, hashing, lookups
**Core Concept**

Data structures providing O(1) average-case time complexity for insertions, deletions, and lookups using hash functions.
**Why It Matters**

Essential for feature matching, deduplication of datasets, frequency counting (TF-IDF), and fast lookups during model inference.
**Mental Model / Mechanics**

Maps link a unique key to a value. Sets store unique keys. If you need to quickly check "Have I seen this user ID before?" or "What is the precomputed embedding for this token?", use a hash map/set.
**Example**

```python
def count_feature_frequencies(data_stream):
    freq = {}
    for item in data_stream:
        freq[item] = freq.get(item, 0) + 1
    return freq
```
**Failure Modes / Tradeoffs**

- O(1) is average case; poor hash functions or many collisions degrade performance to O(N).
- Keys must be hashable (immutable in Python).
**Interview-Ready Explanation**

> Hash maps and sets provide O(1) average lookup times. They are indispensable for fast feature lookups, caching, and frequency counting, dramatically optimizing O(N) linear scans.

---

### [CARD: Deques (Double-Ended Queues)]
<!-- id: d23-deques -->

- **Priority:** should_know
- **Category:** data-structures
- **Tags:** data-structures, queues
**Core Concept**

A queue that allows O(1) appending and popping from both ends.
**Why It Matters**

Used for maintaining rolling windows of fixed sizes (like recent interaction history) or implementing BFS.
**Mental Model / Mechanics**

Unlike a standard Python list where `pop(0)` is O(N), a `collections.deque` makes operations on both the left and right ends O(1).
**Example**

```python
from collections import deque
# Maintain last 3 active sessions
history = deque(maxlen=3)
history.append("session_1")
history.append("session_2")
history.append("session_3")
history.append("session_4") # session_1 is automatically removed
```
**Failure Modes / Tradeoffs**

- Random access (e.g., `d[5]`) in a deque is O(N), whereas it is O(1) for a list. Only use if operating strictly on the ends.
**Interview-Ready Explanation**

> A deque allows O(1) appends and pops from both ends. It is preferred over lists when implementing queues or fixed-size sliding windows, avoiding the O(N) cost of list prepends.

---

### [CARD: Boundary Test Cases]
<!-- id: d23-boundary-test-cases -->

- **Priority:** must_know
- **Category:** testing
- **Tags:** testing, edge-cases
**Core Concept**

Testing the extreme limits of input domains (empty lists, 0, negative values, very large arrays, NaNs).
**Why It Matters**

ML pipelines frequently crash or produce silent errors when encountering unexpected boundary data (e.g., zero variance causing division by zero).
**Mental Model / Mechanics**

For every function, explicitly test: empty input, minimum valid input, maximum valid input, and invalid inputs (NaN, null).
**Example**

```python
def normalize(features):
    if not features: return []
    import numpy as np
    variance = np.var(features)
    if variance == 0: return [0.0] * len(features)
    return (features - np.mean(features)) / variance
```
**Failure Modes / Tradeoffs**

- Silent numerical failures (NaN propagation) are much harder to debug than outright exceptions.
**Interview-Ready Explanation**

> Boundary testing validates behavior at the extreme ends of input ranges. For ML code, this means rigorously testing empty data, single-item arrays, zero variance, and NaN values to prevent silent mathematical failures.

---

### [CARD: Parameterized Testing]
<!-- id: d23-parameterized-testing -->

- **Priority:** should_know
- **Category:** testing
- **Tags:** testing, pytest
**Core Concept**

Running the same test function repeatedly with different sets of inputs and expected outputs.
**Why It Matters**

ML preprocessing logic requires testing many variations of inputs. Parameterization avoids duplicated test code and clearly isolates failing cases.
**Mental Model / Mechanics**

Define a single test logic block, and feed it a list of `(input, expected_output)` tuples.
**Example**

```python
import pytest

@pytest.mark.parametrize("input_val, expected", [
    ([1, 2, 3], 2.0),
    ([0, 0, 0], 0.0),
    ([-1, 1], 0.0)
])
def test_mean(input_val, expected):
    assert calculate_mean(input_val) == expected
```
**Failure Modes / Tradeoffs**

- Parameterized tests can become hard to read if the test tuples are extremely large or complex objects.
**Interview-Ready Explanation**

> Parameterized testing executes the same test logic over multiple input-output pairs. It cleanly scales test coverage for data transformations without duplicating test boilerplate.

---

### [CARD: Mocking External Services]
<!-- id: d23-mocking -->

- **Priority:** must_know
- **Category:** testing
- **Tags:** testing, mocking
**Core Concept**

Replacing real external dependencies (databases, APIs, LLM calls) with simulated objects that return predictable responses.
**Why It Matters**

You cannot reliably test an ML service if it depends on an unpredictable, rate-limited, or paid external API (like OpenAI).
**Mental Model / Mechanics**

Use `unittest.mock.patch` to intercept a function call and return a static response. Assert that the external function was called with the expected prompts/arguments.
**Example**

```python
from unittest.mock import patch

@patch("openai.ChatCompletion.create")
def test_llm_chain(mock_create):
    mock_create.return_value = {"choices": [{"message": {"content": "mocked text"}}]}
    
    result = run_my_chain("test prompt")
    
    assert result == "mocked text"
    mock_create.assert_called_once()
```
**Failure Modes / Tradeoffs**

- Mocks can drift from reality if the external API changes its signature.
- Over-mocking leads to tests that just verify the mock setup, not the business logic.
**Interview-Ready Explanation**

> Mocking replaces real external calls with predictable stubs. This isolates the code under test, prevents flaky tests due to network issues, and avoids burning API credits during CI/CD.

---

### [CARD: Testing Stochastic Functions]
<!-- id: d23-testing-stochastic -->

- **Priority:** should_know
- **Category:** testing
- **Tags:** testing, randomness
**Core Concept**

Testing functions that involve randomness (e.g., sampling, model initialization) by fixing seeds or checking statistical bounds.
**Why It Matters**

ML models inherently involve randomness. Tests must be deterministic to be useful in CI pipelines.
**Mental Model / Mechanics**

Approach 1: Fix the random seed before the function call to ensure identical outputs. Approach 2: Check properties of the output distribution (e.g., mean falls within an expected confidence interval).
**Example**

```python
import numpy as np

def test_random_sampler():
    np.random.seed(42)
    sample_1 = my_sampler(10)
    
    np.random.seed(42)
    sample_2 = my_sampler(10)
    
    assert np.array_equal(sample_1, sample_2) # Determinism check
```
**Failure Modes / Tradeoffs**

- Hardcoding seeds can hide true edge cases that only emerge under specific random states.
- Statistical bounds tests can be flaky if bounds are too tight.
**Interview-Ready Explanation**

> To test stochastic functions reliably, either fix the random seed to guarantee deterministic outputs, or test that the output distribution meets expected statistical properties within acceptable bounds.

---

### [CARD: Handling Edge Cases]
<!-- id: d23-edge-cases -->

- **Priority:** must_know
- **Category:** code-quality
- **Tags:** coding, robust-code
**Core Concept**

Anticipating and gracefully handling unexpected or extreme data states.
**Why It Matters**

In production ML, the data pipeline *will* eventually receive missing features, infinities, empty batches, or unmapped categorical values.
**Mental Model / Mechanics**

Fail fast with clear error messages, or fallback to sensible defaults. Check preconditions (e.g., `len(batch) > 0`) early in the function.
**Example**

```python
def compute_click_through_rate(clicks, impressions):
    if impressions < 0 or clicks < 0:
        raise ValueError("Metrics cannot be negative.")
    if impressions == 0:
        return 0.0 # Handle division by zero
    return clicks / impressions
```
**Failure Modes / Tradeoffs**

- Returning `None` or `0` silently when an exception should be raised can pollute downstream model training.
**Interview-Ready Explanation**

> Robust ML code proactively checks for edge cases like missing values, empty arrays, and division by zero. Handling these gracefully prevents silent propagation of NaNs and catastrophic pipeline failures.

---

### [CARD: Time & Space Complexity]
<!-- id: d23-complexity -->

- **Priority:** must_know
- **Category:** code-quality
- **Tags:** coding, big-o, performance
**Core Concept**

Evaluating how runtime (Time) and memory usage (Space) scale as input size N grows.
**Why It Matters**

ML systems deal with massive datasets. An O(N^2) feature extraction loop will crash the system in production.
**Mental Model / Mechanics**

Always identify the bottleneck. Trade space for time by caching/precomputing (Hash Maps). Trade time for space by processing in chunks (Generators/Iterators).
**Example**

```python
# O(N) Space, O(N) Time -> Hash Map deduplication
seen = set(data)

# O(1) Space, O(N log N) Time -> In-place sort deduplication
data.sort()
```
**Failure Modes / Tradeoffs**

- Optimizing for O(1) space often requires modifying data in-place, which can be dangerous if the caller expects the input to be immutable.
**Interview-Ready Explanation**

> Time and space complexity measure algorithm scalability. In ML coding interviews, you must be able to state the Big-O of your solution and discuss tradeoffs, such as using extra memory (Hash Maps) to reduce time complexity.

---

## Key Connections

**DSA to ML:**
```
Top-K Heaps → Recommendation Ranking
Sliding Window → Streaming Feature Extraction
Hash Maps → O(1) Embedding Lookups
Graphs (BFS/DFS) → DAG execution in Airflow / User-Item bipartite graphs
```

**Testing to Production:**
```
Boundary testing / Mocking → Deterministic CI pipelines → Safe deployments of non-deterministic models.
```

---

## Common Misconceptions

- **Myth:** MLE interviews are purely theoretical ML math.
  **Reality:** You must write clean, optimized Python. Poor time/space complexity or ignoring edge cases will fail you.

- **Myth:** Mocks are only for databases.
  **Reality:** Mocking LLMs and external inference APIs is critical for fast, free, deterministic tests.

- **Myth:** Randomness can't be tested.
  **Reality:** It can be made deterministic with fixed seeds, or validated via statistical bounds.

---

## Out of Scope
- Implementing balanced binary search trees from scratch
- Obscure graph algorithms (e.g., A* search, network flow)
- Advanced competitive programming DP problems
- Heavy integration testing infrastructure

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d23-qa-001]

**Question:** How does the sliding window pattern improve performance?

**Answer:** It updates state incrementally (adding the new element and removing the old one) instead of recomputing the entire window, optimizing O(N*K) naive approaches to O(N).

**Tags:** sliding-window, streaming

**Linked Cards:** d23-sliding-window

#### [QA: d23-qa-002]

**Question:** When is the Two Pointers pattern useful?

**Answer:** It is useful for finding pairs in sorted arrays or merging ranked lists, narrowing down the search space in O(N) time instead of O(N^2).

**Tags:** two-pointers, arrays

**Linked Cards:** d23-two-pointers

#### [QA: d23-qa-003]

**Question:** What is the most efficient way to track the K largest items in a stream?

**Answer:** Maintain a min-heap of size K. When a new item arrives, push it to the heap and pop the smallest item if the size exceeds K. This takes O(N log K) time.

**Tags:** heaps, ranking

**Linked Cards:** d23-top-k-heaps

#### [QA: d23-qa-004]

**Question:** What data structures are used for BFS and DFS?

**Answer:** BFS uses a Queue (FIFO) to explore level-by-level. DFS uses a Stack (LIFO) or recursion to explore deep paths.

**Tags:** graphs, traversal

**Linked Cards:** d23-bfs-dfs

#### [QA: d23-qa-005]

**Question:** Why are Hash Maps so common in ML pipelines?

**Answer:** They provide O(1) average lookup times, making them essential for fast feature matching, caching embeddings, and frequency counting.

**Tags:** hashing, lookups

**Linked Cards:** d23-hash-maps-sets

#### [QA: d23-qa-006]

**Question:** Why use a deque instead of a list?

**Answer:** A deque allows O(1) appends and pops from both ends, while a list takes O(N) to pop from the beginning. Deques are ideal for fixed-size sliding windows or queues.

**Tags:** data-structures, queues

**Linked Cards:** d23-deques

#### [QA: d23-qa-007]

**Question:** Why is boundary testing important for ML code?

**Answer:** Missing data, single items, or zero variance can cause silent numerical failures (like propagating NaNs). Boundary testing prevents these failures by validating edge cases explicitly.

**Tags:** testing, edge-cases

**Linked Cards:** d23-boundary-test-cases

#### [QA: d23-qa-008]

**Question:** What is parameterized testing?

**Answer:** Running the same test logic repeatedly over a list of input-output pairs. It scales test coverage efficiently without duplicating code.

**Tags:** testing, pytest

**Linked Cards:** d23-parameterized-testing

#### [QA: d23-qa-009]

**Question:** Why do we mock external services in ML tests?

**Answer:** To avoid unpredictable network errors, rate limits, and API costs. Mocking isolates the code being tested by returning deterministic responses.

**Tags:** testing, mocking

**Linked Cards:** d23-mocking

#### [QA: d23-qa-010]

**Question:** How can you write a deterministic test for a stochastic ML function?

**Answer:** Either fix the random seed before the function call to guarantee exact outputs, or assert that the results fall within expected statistical bounds.

**Tags:** testing, randomness

**Linked Cards:** d23-testing-stochastic

#### [QA: d23-qa-011]

**Question:** Why is handling edge cases like zero division critical in feature engineering?

**Answer:** If ignored, they can return incorrect values or raise exceptions mid-pipeline, halting production or silently degrading the ML model with corrupted data (like NaNs).

**Tags:** robust-code, edge-cases

**Linked Cards:** d23-edge-cases

#### [QA: d23-qa-012]

**Question:** How do you typically trade space for time when optimizing algorithms?

**Answer:** By caching or precomputing intermediate results in data structures like Hash Maps (using extra memory) to avoid redundant calculations, effectively reducing time complexity.

**Tags:** big-o, performance

**Linked Cards:** d23-complexity
<!-- QA_END -->
