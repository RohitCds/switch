---
day: 18
title: "Python Concurrency: GIL, Threading, Multiprocessing & Asyncio"
topics:
  - python-concurrency
  - threading
  - multiprocessing
  - asyncio
  - synchronization
tags:
  - python
  - concurrency
  - software-engineering
  - mle-systems
priority_distribution:
  must_know: 14
  should_know: 2
  nice_to_know: 0
---

# DAY 18 — PYTHON CONCURRENCY

## Daily Objective
Understand how to choose and safely use Python's three main concurrency models: threads, processes, and `asyncio`. By the end, you should be able to explain the CPython GIL precisely, recognize race conditions and blocking calls, and select an appropriate model for CPU-bound work, blocking I/O, or large numbers of waiting network requests.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** concurrency vs. parallelism, I/O-bound vs. CPU-bound work, CPython GIL, threads, race conditions, locks, thread pools, processes, the asyncio event loop, coroutines/`await`, blocking the event loop, tasks, cancellation/timeouts, choosing threads vs. processes vs. asyncio.
- 🟡 **SHOULD KNOW:** queues, semaphores/backpressure, process start/pickling constraints.
- 🟢 **NICE TO KNOW:** advanced event-loop implementations, lock-free programming, distributed concurrency patterns.

---

## Knowledge Cards

---

### [CARD: Concurrency vs. Parallelism]
<!-- id: d18-concurrency-vs-parallelism -->

- **Priority:** must_know
- **Category:** python-concurrency
- **Tags:** concurrency, parallelism, scheduling

**Core Concept**

**Concurrency** is the ability to make progress on multiple tasks during the same overall period by interleaving them. **Parallelism** is literally executing multiple computations at the same instant on separate CPU cores or hardware resources.

**Why It Matters**

The distinction prevents a common mistake: assuming every concurrency tool makes CPU computation faster. A single-threaded `asyncio` program is highly concurrent but is not CPU-parallel.

**Example**

```text
Concurrency:  start API request A → wait → start API request B → handle A
Parallelism:   CPU core 1 computes batch A while CPU core 2 computes batch B
```

**Interview-Ready Explanation**

> Concurrency coordinates many in-progress tasks, often by switching when one waits. Parallelism runs computations simultaneously on multiple execution resources. They overlap, but they are not the same thing.

---

### [CARD: I/O-Bound vs. CPU-Bound Work]
<!-- id: d18-io-bound-vs-cpu-bound -->

- **Priority:** must_know
- **Category:** python-concurrency
- **Tags:** io-bound, cpu-bound, workload-selection

**Core Concept**

An I/O-bound task spends most of its time waiting for an external system: network responses, disks, databases, or a remote model API. A CPU-bound task spends most of its time executing computations locally: image transforms, tokenization at scale, or pure-Python numerical work.

**Why It Matters**

The workload, not personal preference, should determine the concurrency tool. While one I/O task waits, another can proceed. CPU-bound work needs actual parallel compute or optimized native libraries.

**Example**

| Workload | Typical best starting point |
|---|---|
| Call 500 HTTP APIs | `asyncio` or threads |
| Read many blocking SDK/database clients | threads |
| Run pure-Python CPU-heavy transforms | processes |
| NumPy/PyTorch compute | let optimized native/GPU libraries manage parallelism |

**Interview-Ready Explanation**

> I/O-bound tasks benefit from overlapping waiting time. CPU-bound tasks need parallel compute, so in CPython I usually consider processes or optimized native libraries rather than expecting threads or asyncio to speed up the computation.

---

### [CARD: The CPython Global Interpreter Lock]
<!-- id: d18-cpython-gil -->

- **Priority:** must_know
- **Category:** python-concurrency
- **Tags:** gil, cpython, threads, cpu-bound

**Core Concept**

In the standard CPython interpreter, the Global Interpreter Lock (GIL) allows only one thread at a time to execute Python bytecode within a process. It simplifies parts of CPython's memory-management implementation, but limits CPU-parallel execution of pure Python code by threads.

**Why It Matters**

The GIL explains why threads remain useful for I/O but normally do not accelerate CPU-bound pure-Python workloads on multiple cores.

**Mental Model / Mechanics**

```text
One CPython process
  Thread A ─┐
  Thread B ─┼─ only one can execute Python bytecode at a time
  Thread C ─┘
```

When a thread waits on I/O, another thread can run. Some native extensions can release the GIL while doing heavy native work, so the exact behavior of NumPy, PyTorch, or a library call depends on that library.

**Failure Modes / Tradeoffs**

The GIL is specific to CPython; do not make blanket claims about every Python implementation. It also does not make shared Python state automatically safe from logical race conditions.

**Interview-Ready Explanation**

> In CPython, one process's threads cannot execute Python bytecode in parallel because of the GIL. Threads are still effective for I/O because a waiting thread does not need the CPU; for CPU-bound pure Python, I use processes or native code that can run outside the GIL.

---

### [CARD: Threads and Shared Address Space]
<!-- id: d18-threads-and-shared-memory -->

- **Priority:** must_know
- **Category:** python-threading
- **Tags:** threads, shared-memory, io-bound

**Core Concept**

Threads are independently scheduled execution paths within one process. They share the process's memory, open resources, and object graph.

**Why It Matters**

Shared memory makes threads convenient for wrapping blocking I/O libraries, but it creates shared-state hazards. Day 1's reference semantics now matter across execution paths, not just across function calls.

**Example**

```python
import threading

def fetch(url):
    # blocking network call
    ...

thread = threading.Thread(target=fetch, args=("https://example.com",))
thread.start()
thread.join()
```

**Failure Modes / Tradeoffs**

Do not create an unbounded number of threads for an unbounded workload. Thread creation and context switching have costs; a bounded thread pool is often the safer abstraction.

**Interview-Ready Explanation**

> Threads share a process's memory, which is convenient for blocking I/O but requires synchronization around mutable state. I generally use a bounded pool instead of manually creating unlimited threads.

---

### [CARD: Race Conditions and Critical Sections]
<!-- id: d18-race-conditions -->

- **Priority:** must_know
- **Category:** python-threading
- **Tags:** race-condition, shared-state, critical-section

**Core Concept**

A race condition occurs when the result depends on an unpredictable interleaving of concurrent operations. A critical section is code that reads or changes shared state and must not be interleaved unsafely.

**Why It Matters**

The GIL does not make a read-modify-write business operation atomic. Lost updates, duplicate jobs, corrupt counters, and incorrect cache state can still occur.

**Example**

```python
# Not safely atomic as a business operation:
counter = counter + 1

# Two workers can both read 10, then both write 11.
```

**Failure Modes / Tradeoffs**

The best solution is often to avoid shared mutable state: return values, use message queues, partition work, or let a database enforce atomicity. Locks are necessary sometimes, but they add deadlock and contention risks.

**Interview-Ready Explanation**

> A race condition occurs when correctness depends on timing between concurrent operations. I first try to eliminate shared mutable state; if a critical section is unavoidable, I protect it with the appropriate synchronization primitive.

---

### [CARD: Locks and Safe Synchronization]
<!-- id: d18-locks-and-synchronization -->

- **Priority:** must_know
- **Category:** python-threading
- **Tags:** locks, mutex, synchronization, deadlock

**Core Concept**

A lock allows only one thread at a time to enter a protected critical section. `with lock:` acquires the lock and reliably releases it, including when an exception occurs.

**Example**

```python
import threading

lock = threading.Lock()
counter = 0

def increment():
    global counter
    with lock:
        counter += 1
```

**Failure Modes / Tradeoffs**

- Keep critical sections short; holding a lock during network I/O harms throughput.
- Acquire multiple locks in a consistent order to reduce deadlock risk.
- A lock protects only code that consistently uses that same lock.

**Interview-Ready Explanation**

> A mutex protects a critical section by allowing one thread at a time. I use `with lock:` for reliable release, keep the section small, and prefer designs that minimize shared state to avoid contention and deadlocks.

---

### [CARD: ThreadPoolExecutor for Blocking I/O]
<!-- id: d18-threadpoolexecutor -->

- **Priority:** must_know
- **Category:** python-threading
- **Tags:** threadpool, executor, blocking-io, futures

**Core Concept**

`concurrent.futures.ThreadPoolExecutor` manages a bounded set of worker threads and returns `Future` objects representing work that may finish later. It is a practical default for many blocking I/O tasks.

**Example**

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=10) as pool:
    results = list(pool.map(fetch_document, document_urls))
```

**Why It Matters**

It avoids manually managing thread lifecycle and limits concurrency so a service does not overwhelm downstream APIs, database pools, or the local machine.

**Interview-Ready Explanation**

> For a blocking I/O client, a bounded `ThreadPoolExecutor` is often the simplest correct design. It overlaps waiting, controls concurrency, and avoids creating a thread per request.

---

### [CARD: Processes and Multiprocessing]
<!-- id: d18-processes-and-multiprocessing -->

- **Priority:** must_know
- **Category:** python-multiprocessing
- **Tags:** processes, multiprocessing, cpu-bound, isolation

**Core Concept**

Processes have separate memory spaces and separate CPython interpreters. A process pool can therefore run CPU-bound Python work in parallel across CPU cores, without one process's GIL blocking another.

**Why It Matters**

Processes are the usual Python-level option for CPU-bound pure-Python work, but the isolation that enables parallelism also makes data exchange more expensive.

**Example**

```python
from concurrent.futures import ProcessPoolExecutor

with ProcessPoolExecutor() as pool:
    features = list(pool.map(expensive_python_transform, records))
```

**Failure Modes / Tradeoffs**

Arguments and results typically need to be serialized between processes. Large data transfer can erase the performance gain. On macOS, process start behavior means workers should be started under an `if __name__ == "__main__":` guard in scripts.

**Interview-Ready Explanation**

> Processes provide true CPU parallelism because each has its own interpreter and GIL. The tradeoff is separate memory, serialization overhead, and higher startup cost, so I use them for sufficiently substantial CPU-bound tasks.

---

### [CARD: The Asyncio Event Loop]
<!-- id: d18-asyncio-event-loop -->

- **Priority:** must_know
- **Category:** python-asyncio
- **Tags:** asyncio, event-loop, cooperative-concurrency

**Core Concept**

`asyncio` is Python's framework for cooperative asynchronous I/O. An event loop coordinates many tasks in one thread, running a task until it reaches an `await` point and can let another ready task make progress.

**Why It Matters**

It can efficiently manage many network-bound operations without needing one operating-system thread per operation, provided the whole I/O path is asynchronous.

**Mental Model / Mechanics**

```text
task A starts HTTP request → await (yields control)
task B starts database request → await (yields control)
event loop resumes whichever task's I/O is now ready
```

**Interview-Ready Explanation**

> Asyncio uses one event loop to coordinate many cooperative tasks. A task must explicitly yield at `await`; while it waits for non-blocking I/O, the event loop runs other ready tasks.

---

### [CARD: Coroutines, await, and Async I/O]
<!-- id: d18-coroutines-and-await -->

- **Priority:** must_know
- **Category:** python-asyncio
- **Tags:** coroutines, await, async, non-blocking-io

**Core Concept**

Calling an `async def` function creates a coroutine object; it does not immediately run its body to completion. `await` pauses the current coroutine until an awaitable completes, giving the event loop a chance to run other work.

**Example**

```python
async def fetch_score(client, record_id):
    response = await client.get(f"/scores/{record_id}")
    return response.json()["score"]
```

Coroutines need to be awaited or scheduled as tasks. At a program boundary, `asyncio.run(main())` creates and runs the event loop for a top-level coroutine.

**Failure Modes / Tradeoffs**

Creating a coroutine and forgetting to await or schedule it means the intended work never runs. Python commonly warns about an un-awaited coroutine.

**Interview-Ready Explanation**

> `async def` creates a coroutine. `await` suspends that coroutine at an asynchronous boundary so the event loop can make progress on other tasks; it does not make arbitrary synchronous code non-blocking.

---

### [CARD: Blocking the Event Loop]
<!-- id: d18-blocking-the-event-loop -->

- **Priority:** must_know
- **Category:** python-asyncio
- **Tags:** asyncio, blocking, cooperative-scheduling, performance

**Core Concept**

Asyncio concurrency is cooperative. If a coroutine runs blocking I/O, `time.sleep`, or a long CPU-bound loop without awaiting, it blocks the event-loop thread and prevents every other task on that loop from progressing.

**Example**

```python
# Bad inside async code: blocks the entire event loop
time.sleep(1)

# Good: yields control while waiting
await asyncio.sleep(1)
```

**Why It Matters**

A single accidental blocking library call can make an apparently concurrent API service slow under load.

**Failure Modes / Tradeoffs**

Use an asynchronous client library when available. For unavoidable blocking I/O, offload it with `await asyncio.to_thread(blocking_function, arg)`. For CPU work, use a process pool or move the computation to an optimized service—not `asyncio` alone.

**Interview-Ready Explanation**

> Asyncio is cooperative, so a blocking call blocks all tasks sharing that loop. I use async-native I/O, offload unavoidable blocking calls to a thread, and move CPU-heavy work to processes or optimized infrastructure.

---

### [CARD: Tasks, gather, and Bounded Fan-Out]
<!-- id: d18-asyncio-tasks-and-gather -->

- **Priority:** must_know
- **Category:** python-asyncio
- **Tags:** asyncio, tasks, gather, concurrency-limit

**Core Concept**

A Task schedules a coroutine to run concurrently on the event loop. `asyncio.gather()` waits for a group of awaitables and collects their results. Creating thousands of tasks without a limit can overload memory or downstream dependencies.

**Example**

```python
async def fetch_all(ids, client):
    return await asyncio.gather(
        *(fetch_score(client, record_id) for record_id in ids)
    )
```

This is appropriate only when the input size and remote-service capacity are controlled. For large inputs, combine tasks with a semaphore or queue.

**Interview-Ready Explanation**

> Tasks make coroutines concurrently schedulable and `gather` joins their results. I do not blindly fan out unlimited tasks; I bound concurrency to protect the service, remote dependency, and memory.

---

### [CARD: Cancellation, Timeouts, and Cleanup]
<!-- id: d18-asyncio-cancellation-and-timeouts -->

- **Priority:** must_know
- **Category:** python-asyncio
- **Tags:** asyncio, cancellation, timeout, cleanup

**Core Concept**

Cancellation is a normal control-flow path in asynchronous systems: client requests end, deadlines expire, or a parent operation fails. Cancellation is delivered to a coroutine at an await point, so coroutines must release resources promptly and should not swallow cancellation accidentally.

**Example**

```python
async with asyncio.timeout(2):
    result = await fetch_score(client, record_id)
```

Use `try`/`finally` or `async with` around resources that must be released. Let cancellation propagate after necessary cleanup unless there is a clear, documented reason to transform it.

**Interview-Ready Explanation**

> I treat cancellation and deadlines as normal production behavior. I put timeouts around remote work, clean up in `finally` or `async with`, and avoid swallowing cancellation because callers need to know the operation stopped.

---

### [CARD: Queues, Semaphores, and Backpressure]
<!-- id: d18-backpressure-with-queues-and-semaphores -->

- **Priority:** should_know
- **Category:** python-concurrency
- **Tags:** queue, semaphore, backpressure, producer-consumer

**Core Concept**

A queue decouples producers from consumers and can bound pending work. A semaphore limits how many tasks may use a constrained resource at once. Both create backpressure: producers cannot create unlimited work faster than the system can safely consume it.

**Example**

```python
semaphore = asyncio.Semaphore(20)

async def limited_fetch(record_id):
    async with semaphore:
        return await fetch_score(client, record_id)
```

**Why It Matters**

Without limits, a batch job can overwhelm an embedding API, database connection pool, rate limit, or memory budget.

**Interview-Ready Explanation**

> A semaphore bounds concurrent access to a scarce resource, while a bounded queue controls accumulated work. They provide backpressure, which keeps a fast producer from overwhelming a slower dependency.

---

### [CARD: Choosing Threads, Processes, or Asyncio]
<!-- id: d18-choosing-a-concurrency-model -->

- **Priority:** must_know
- **Category:** python-concurrency
- **Tags:** threads, processes, asyncio, design-tradeoffs

**Core Concept**

Threads, processes, and asyncio solve different problems. The correct choice follows the workload, library interfaces, desired concurrency level, state-sharing needs, and operational complexity.

**Mental Model / Mechanics**

| Situation | Good default | Main tradeoff |
|---|---|---|
| Few-to-moderate blocking I/O operations | Threads / thread pool | Shared-state safety, thread overhead |
| Very many async-native network operations | `asyncio` | Entire I/O path must avoid blocking |
| CPU-bound pure-Python work | Process pool | Serialization and memory overhead |
| Heavy numerical/ML computation | Native/GPU library or worker service | Library/runtime-specific behavior |

**Interview-Ready Explanation**

> I start from the bottleneck. For blocking I/O I use a bounded thread pool; for large-scale async-native I/O I use asyncio; for CPU-bound pure Python I use processes. I then add limits, timeouts, and observability rather than treating concurrency as a free speed-up.

---

### [CARD: Process Serialization and the Main Guard]
<!-- id: d18-process-serialization-and-main-guard -->

- **Priority:** should_know
- **Category:** python-multiprocessing
- **Tags:** multiprocessing, pickling, main-guard, macos

**Core Concept**

Process workers do not share normal Python memory with the parent. Functions, arguments, and return values commonly need to be serializable. Script entry points should use an `if __name__ == "__main__":` guard so child-process startup does not re-run top-level work unexpectedly.

**Example**

```python
def main():
    with ProcessPoolExecutor() as pool:
        print(list(pool.map(expensive_python_transform, records)))

if __name__ == "__main__":
    main()
```

**Interview-Ready Explanation**

> Process pools require explicit boundaries: work functions and data must be serializable, and the main guard prevents worker startup from recursively executing the script's top-level code.

---

## Key Connections

- **Day 1:** Shared references and mutability explain why thread races happen; `is`/identity is not a synchronization mechanism.
- **Day 17:** `with`/`async with` and `finally` give concurrency code reliable cleanup; generators and iterators motivate streaming producer-consumer designs.
- **MLE systems:** Threads and `asyncio` are common around model APIs, vector stores, and data ingestion. Processes or native/GPU code handle CPU-heavy preprocessing and inference workloads.
- **Future system design:** Concurrency limits, timeouts, queues, and backpressure are concrete answers to “how does this service survive load?”

---

## Common Misconceptions

- **Myth:** The GIL means threads are useless in Python.  
  **Reality:** Threads are useful for blocking I/O; the GIL mainly limits parallel execution of pure Python CPU work within one process.

- **Myth:** `async def` automatically makes code concurrent.  
  **Reality:** A coroutine must be awaited or scheduled, and it must reach non-blocking `await` points to let other tasks run.

- **Myth:** The GIL prevents race conditions.  
  **Reality:** Multi-step shared-state operations can still interleave incorrectly.

- **Myth:** More workers always make a system faster.  
  **Reality:** Unbounded concurrency can overload CPUs, memory, connection pools, or downstream APIs.

- **Myth:** `asyncio` makes CPU-bound code faster.  
  **Reality:** CPU-heavy code blocks the event loop unless moved elsewhere.

- **Myth:** A process pool has the same sharing behavior as a thread pool.  
  **Reality:** Processes have isolated memory and require data transfer/serialization.

---

## Out of Scope

- Low-level operating-system scheduling and lock-free algorithms
- Distributed queues, actor systems, and Kubernetes worker orchestration
- Writing custom event loops or advanced `asyncio` transports/protocols
- Detailed memory-sharing techniques between processes
- GPU-stream concurrency and distributed training parallelism

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d18-qa-001]

**Question:** What is the difference between concurrency and parallelism?

**Answer:** Concurrency interleaves progress on multiple tasks; parallelism executes computations simultaneously on separate execution resources.

**Tags:** concurrency, parallelism

**Linked Cards:** d18-concurrency-vs-parallelism

#### [QA: d18-qa-002]

**Question:** How should workload type influence a concurrency choice?

**Answer:** I/O-bound work benefits from overlapping waits with threads or asyncio; CPU-bound pure-Python work needs processes or optimized native computation for parallel speedup.

**Tags:** io-bound, cpu-bound

**Linked Cards:** d18-io-bound-vs-cpu-bound

#### [QA: d18-qa-003]

**Question:** What does the CPython GIL do?

**Answer:** Within one CPython process, it permits only one thread at a time to execute Python bytecode, limiting thread-based parallelism for pure Python CPU work.

**Tags:** gil, cpython

**Linked Cards:** d18-cpython-gil

#### [QA: d18-qa-004]

**Question:** Why can threads still help despite the GIL?

**Answer:** While a thread waits for I/O, another thread can run, so threads can overlap blocking network, disk, or database waits.

**Tags:** threads, io-bound, gil

**Linked Cards:** d18-cpython-gil, d18-threads-and-shared-memory

#### [QA: d18-qa-005]

**Question:** What is a race condition?

**Answer:** A correctness bug where the result depends on an unpredictable timing/interleaving of concurrent operations on shared state.

**Tags:** race-condition, shared-state

**Linked Cards:** d18-race-conditions

#### [QA: d18-qa-006]

**Question:** What does a lock protect, and what is one lock-design rule?

**Answer:** A lock protects a critical section that accesses shared mutable state. Keep the protected section short and avoid holding it during slow I/O.

**Tags:** locks, critical-section

**Linked Cards:** d18-locks-and-synchronization

#### [QA: d18-qa-007]

**Question:** Why use a ThreadPoolExecutor instead of manually starting a thread for every request?

**Answer:** It manages a bounded worker set, limits pressure on dependencies, and avoids unbounded thread-creation overhead.

**Tags:** threadpool, blocking-io

**Linked Cards:** d18-threadpoolexecutor

#### [QA: d18-qa-008]

**Question:** Why can processes parallelize CPU-bound pure-Python work?

**Answer:** Each process has its own interpreter and GIL, so separate processes can execute on separate CPU cores.

**Tags:** processes, cpu-bound, gil

**Linked Cards:** d18-processes-and-multiprocessing

#### [QA: d18-qa-009]

**Question:** What does the asyncio event loop do?

**Answer:** It coordinates cooperative tasks, running another ready task when the current one awaits non-blocking work.

**Tags:** asyncio, event-loop

**Linked Cards:** d18-asyncio-event-loop

#### [QA: d18-qa-010]

**Question:** What happens when you call an `async def` function?

**Answer:** It creates a coroutine object. Its work runs only when it is awaited or scheduled as a task.

**Tags:** coroutines, async

**Linked Cards:** d18-coroutines-and-await

#### [QA: d18-qa-011]

**Question:** Why is `time.sleep()` harmful inside an asyncio coroutine?

**Answer:** It blocks the event-loop thread, preventing all other tasks on that loop from progressing; use `await asyncio.sleep()` for an asynchronous delay.

**Tags:** asyncio, blocking

**Linked Cards:** d18-blocking-the-event-loop

#### [QA: d18-qa-012]

**Question:** What does `asyncio.gather()` do, and what risk comes with unlimited fan-out?

**Answer:** It waits for a group of awaitables and collects results. Scheduling too many tasks can exhaust memory or overload downstream services.

**Tags:** asyncio, gather, backpressure

**Linked Cards:** d18-asyncio-tasks-and-gather

#### [QA: d18-qa-013]

**Question:** How should asynchronous code handle timeouts and cancellation?

**Answer:** Set deadlines around remote work, clean up with `finally` or `async with`, and normally let cancellation propagate after cleanup.

**Tags:** asyncio, cancellation, timeout

**Linked Cards:** d18-asyncio-cancellation-and-timeouts

#### [QA: d18-qa-014]

**Question:** What is backpressure, and how can a semaphore provide it?

**Answer:** Backpressure prevents work from accumulating faster than a dependency can handle it. A semaphore bounds how many tasks may access that dependency concurrently.

**Tags:** semaphore, backpressure

**Linked Cards:** d18-backpressure-with-queues-and-semaphores

#### [QA: d18-qa-015]

**Question:** Give the default choice for blocking I/O, async-native high-concurrency I/O, and CPU-bound pure-Python work.

**Answer:** Use a bounded thread pool for blocking I/O, asyncio for async-native high-concurrency I/O, and processes for CPU-bound pure-Python work.

**Tags:** threads, processes, asyncio

**Linked Cards:** d18-choosing-a-concurrency-model

#### [QA: d18-qa-016]

**Question:** Why is the `if __name__ == "__main__":` guard important with multiprocessing scripts?

**Answer:** It prevents child-process startup from re-running top-level script code, and keeps process-pool entry points explicit.

**Tags:** multiprocessing, main-guard

**Linked Cards:** d18-process-serialization-and-main-guard

<!-- QA_END -->
