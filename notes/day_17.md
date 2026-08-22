---
day: 17
title: "Python Execution Model: Scopes, Iterators, Generators, Decorators, Context Managers & OOP"
topics:
  - python-execution-model
  - iterators
  - generators
  - decorators
  - context-managers
  - oop
tags:
  - python
  - software-engineering
  - interview-prep
priority_distribution:
  must_know: 12
  should_know: 3
  nice_to_know: 1
---

# DAY 17 — PYTHON EXECUTION MODEL

## Daily Objective
Understand how Python resolves names and executes function calls, then build the practical tools that follow from that model: iterators, generators, decorators, context managers, exceptions, and object-oriented design. By the end, you should be able to explain these concepts clearly and choose them appropriately in production Python or an interview.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** namespaces and scope, LEGB lookup, mutable default arguments, iterables vs. iterators, the iterator protocol, generators and `yield`, lazy evaluation, decorators, context managers, exception cleanup, classes/instances, instance/class/static methods.
- 🟡 **SHOULD KNOW:** `functools.wraps`, composition vs. inheritance, `dataclass`.
- 🟢 **NICE TO KNOW:** generator delegation with `yield from`.

---

## Knowledge Cards

---

### [CARD: Names, Objects, Namespaces, and Call Frames]
<!-- id: d17-namespaces-and-call-frames -->

- **Priority:** must_know
- **Category:** python-execution-model
- **Tags:** names, namespaces, scope, call-stack

**Core Concept**

Python variables are names bound to objects. A namespace is the mapping from names to objects in a particular context, such as a module, a function call, or an instance. Each function call creates its own local namespace, often called a call frame.

**Why It Matters**

This extends Day 1's object/reference model. It explains why a function's local variable does not normally affect a variable with the same spelling outside the function, and why recursion has separate local state for every call.

**Mental Model / Mechanics**

```text
module namespace:  threshold ──► 0.5

score(record):
  local call frame: threshold ──► 0.8
  local call frame: record    ──► {...}
```

The two `threshold` names are distinct bindings. They can point to different objects without conflict.

**Example**

```python
threshold = 0.5

def is_high_score(score):
    threshold = 0.8
    return score >= threshold

print(is_high_score(0.7))  # False
print(threshold)           # 0.5
```

**Interview-Ready Explanation**

> Python variables are names, not boxes. Names live in namespaces; every function call has its own local namespace, so local bindings normally do not change outer bindings.

---

### [CARD: LEGB Name Resolution and Closures]
<!-- id: d17-legb-and-closures -->

- **Priority:** must_know
- **Category:** python-execution-model
- **Tags:** legb, scope, closures, nonlocal

**Core Concept**

When Python evaluates an unqualified name inside a function, it searches in LEGB order: **Local**, **Enclosing**, **Global**, then **Built-in**. A closure is an inner function that retains access to names from an enclosing function after that outer function has returned.

**Why It Matters**

Closures power decorators and small configurable functions. Understanding the lookup order also prevents accidental shadowing and explains when `global` or `nonlocal` is required.

**Mental Model / Mechanics**

An assignment inside a function creates a local binding by default. To rebind an enclosing function's binding, write `nonlocal`; to rebind a module-level binding, write `global`. Mutating an object is different from rebinding its name.

**Example**

```python
def make_multiplier(factor):
    def multiply(value):
        return value * factor  # factor comes from the enclosing scope
    return multiply

triple = make_multiplier(3)
print(triple(7))  # 21
```

**Failure Modes / Tradeoffs**

- Avoid `global` for ordinary application state; explicit parameters and returned values are easier to test.
- A closure captures a binding, not a frozen snapshot in every situation. Be careful when closing over a loop variable that later changes.

**Interview-Ready Explanation**

> Python resolves names Local → Enclosing → Global → Built-in. A closure is an inner function that keeps access to an enclosing scope, which is why it is useful for factories and decorators.

---

### [CARD: Function Arguments and Mutable Default Values]
<!-- id: d17-function-arguments-and-mutable-defaults -->

- **Priority:** must_know
- **Category:** python-functions
- **Tags:** arguments, defaults, mutability, shared-state

**Core Concept**

Default argument expressions are evaluated once, when the `def` statement runs—not each time the function is called. A mutable default, such as `[]` or `{}`, is therefore shared across calls that omit that argument.

**Why It Matters**

This is a classic Python production and interview bug. It directly follows from Day 1's shared-reference model.

**Example**

```python
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add_item("a"))  # ['a']
print(add_item("b"))  # ['a', 'b']  -- usually surprising

def safe_add_item(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

**Failure Modes / Tradeoffs**

Use `None` as the sentinel when a fresh mutable value is needed per call. Do not use a truthiness check such as `if not bucket:` when an intentionally supplied empty list is valid.

**Interview-Ready Explanation**

> Default arguments are created once at function definition time. A mutable default is shared between calls, so I use `None` and allocate the list or dictionary inside the function.

---

### [CARD: Iterables vs. Iterators]
<!-- id: d17-iterables-vs-iterators -->

- **Priority:** must_know
- **Category:** python-iteration
- **Tags:** iterables, iterators, for-loop

**Core Concept**

An **iterable** is an object you can ask for an iterator, such as a list, string, dictionary, file, or generator. An **iterator** is the stateful object that produces the next item until it is exhausted.

**Why It Matters**

This distinction makes `for` loops, files, streaming data, generators, and many pandas/PyTorch-style data pipelines easier to reason about.

**Mental Model / Mechanics**

```text
list [10, 20, 30]  --iter()-->  iterator at position 0
                                     --next()--> 10
                                     --next()--> 20
```

Many containers are re-iterable: calling `iter(a_list)` again creates a fresh iterator. A generator object is itself an iterator, so after it is consumed, it cannot be restarted.

**Example**

```python
items = ["a", "b"]
it = iter(items)
print(next(it))  # a
print(next(it))  # b
```

**Interview-Ready Explanation**

> An iterable can create an iterator. An iterator carries traversal state and yields one item at a time, eventually becoming exhausted. A `for` loop obtains an iterator and repeatedly advances it.

---

### [CARD: The Iterator Protocol and the for Loop]
<!-- id: d17-iterator-protocol -->

- **Priority:** must_know
- **Category:** python-iteration
- **Tags:** iter, next, stopiteration, protocol

**Core Concept**

Python iteration is a protocol: `iter(obj)` obtains an iterator, and `next(iterator)` obtains the next value. When there are no more values, `next()` raises `StopIteration`. A `for` loop handles that exception for you.

**Why It Matters**

Protocols are a central Python design idea: unrelated types can work together if they support the same operations. You can write custom streaming or batching objects without inheriting from a particular base class.

**Example**

```python
numbers = [2, 4, 6]
it = iter(numbers)

while True:
    try:
        value = next(it)
        print(value)
    except StopIteration:
        break
```

This is conceptually what `for value in numbers:` does.

**Failure Modes / Tradeoffs**

Do not call `next()` repeatedly without handling exhaustion unless you know another value exists. Iterators are useful for memory efficiency but are often one-pass, which can surprise code that needs a second traversal.

**Interview-Ready Explanation**

> The iterator protocol is `iter()` plus `next()`, with `StopIteration` signaling exhaustion. A `for` loop is syntax that drives this protocol safely.

---

### [CARD: Generator Functions and yield]
<!-- id: d17-generator-functions-and-yield -->

- **Priority:** must_know
- **Category:** python-iteration
- **Tags:** generators, yield, lazy-evaluation, streaming

**Core Concept**

A function containing `yield` is a generator function. Calling it returns a generator object immediately; its body runs only as values are requested. Each `yield` emits one value and suspends local state until the next request.

**Why It Matters**

Generators let you process large files, batches, API pages, or model outputs incrementally rather than loading all results into memory.

**Example**

```python
def read_batches(records, batch_size):
    for start in range(0, len(records), batch_size):
        yield records[start : start + batch_size]

for batch in read_batches(list(range(10)), batch_size=4):
    print(batch)
# [0, 1, 2, 3], [4, 5, 6, 7], [8, 9]
```

**Failure Modes / Tradeoffs**

Generators trade memory use for one-pass behavior and deferred errors. An exception in a generator may appear later, when it is consumed rather than when it is created.

**Interview-Ready Explanation**

> A generator function uses `yield` to produce values lazily. It pauses after each yielded value, preserving its local state, which makes it ideal for streaming large data with low memory usage.

---

### [CARD: Generator Expressions and Lazy Evaluation]
<!-- id: d17-generator-expressions-and-laziness -->

- **Priority:** must_know
- **Category:** python-iteration
- **Tags:** generator-expression, laziness, memory

**Core Concept**

A generator expression uses parentheses—`(transform(x) for x in source)`—to create values lazily. A list comprehension uses brackets and materializes every result immediately.

**Why It Matters**

For large datasets, laziness can prevent unnecessary memory use and avoid work when a consumer stops early.

**Example**

```python
scores = [0.1, 0.9, 0.7, 0.2]
first_high = next(score for score in scores if score > 0.8)
print(first_high)  # 0.9
```

Only enough of `scores` is examined to find the first match. In contrast, `[score for score in scores if score > 0.8]` builds the complete filtered list.

**Failure Modes / Tradeoffs**

Use a list when you need indexing, length, repeated traversal, or all results at once. A generator expression is not automatically faster; it is valuable when laziness matches the workload.

**Interview-Ready Explanation**

> A generator expression computes items on demand, while a list comprehension computes and stores them all immediately. I choose laziness for a one-pass or streaming workload, and a list when I need the materialized result.

---

### [CARD: Decorators as Callable Wrappers]
<!-- id: d17-decorators-as-wrappers -->

- **Priority:** must_know
- **Category:** python-functions
- **Tags:** decorators, higher-order-functions, closures

**Core Concept**

A decorator takes a function (or class) and returns a replacement callable that adds behavior around the original. `@decorator` is syntax sugar for `function = decorator(function)`.

**Why It Matters**

Decorators separate cross-cutting concerns—logging, timing, authorization, retries, caching—from business logic. Framework routes and test fixtures frequently use them.

**Example**

```python
from functools import wraps

def log_calls(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@log_calls
def predict(value):
    return value * 2
```

**Mental Model / Mechanics**

The wrapper closes over `func`, receives the original call's arguments, does work before and/or after `func`, and returns the original result.

**Interview-Ready Explanation**

> A decorator is a higher-order function that wraps another callable to add reusable behavior. `@decorator` rebinds the decorated function name to the wrapper returned by the decorator.

---

### [CARD: Decorator Metadata and Parameterized Decorators]
<!-- id: d17-decorator-metadata-and-parameters -->

- **Priority:** should_know
- **Category:** python-functions
- **Tags:** decorators, functools-wraps, closures

**Core Concept**

A wrapper normally hides the original function's `__name__`, docstring, and other metadata. `functools.wraps(original)` copies that metadata onto the wrapper. A parameterized decorator adds one outer factory layer that receives configuration first.

**Example**

```python
from functools import wraps

def retry(times):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return func(*args, **kwargs)
                except ValueError:
                    if attempt == times - 1:
                        raise
        return wrapper
    return decorate
```

`@retry(3)` means `operation = retry(3)(operation)`.

**Failure Modes / Tradeoffs**

Decorators can obscure control flow and complicate debugging. Keep wrapper behavior narrow, preserve metadata with `@wraps`, and be explicit about which exceptions a retry may handle.

**Interview-Ready Explanation**

> `functools.wraps` preserves a decorated function's useful identity and metadata. A parameterized decorator is a factory: configuration first returns the actual decorator, which then receives the function.

---

### [CARD: Context Managers and Deterministic Cleanup]
<!-- id: d17-context-managers -->

- **Priority:** must_know
- **Category:** python-resource-management
- **Tags:** context-manager, with, cleanup, resources

**Core Concept**

A context manager defines setup and cleanup around a block of code. The `with` statement guarantees that cleanup is attempted when the block exits, whether it exits normally or because of an exception.

**Why It Matters**

Files, database connections, locks, temporary resources, and tracing spans must be released reliably. Deterministic cleanup prevents leaks and stuck locks.

**Example**

```python
with open("predictions.txt", "w") as file:
    file.write("0.91\n")
# file is closed after the block, even if writing raises
```

For a class-based context manager, `__enter__` acquires or returns a resource and `__exit__` performs cleanup. The `contextlib.contextmanager` decorator is a concise alternative for simple generator-based managers.

**Failure Modes / Tradeoffs**

`__exit__` can suppress an exception by returning a truthy value; do this only intentionally. Cleanup code should itself be robust and should not silently hide the original failure.

**Interview-Ready Explanation**

> A context manager scopes resource lifetime to a `with` block. Its cleanup runs on both normal and exceptional exit, which is why it is safer than relying on callers to remember `close()` or `release()`.

---

### [CARD: Exceptions, else, finally, and Raising]
<!-- id: d17-exceptions-and-cleanup -->

- **Priority:** must_know
- **Category:** python-error-handling
- **Tags:** exceptions, try, except, else, finally

**Core Concept**

`try` contains code that may fail; `except` handles expected exceptions; `else` runs only when the `try` block succeeds; `finally` runs regardless of success or failure. `raise` propagates an exception, optionally with a clearer domain-specific message.

**Why It Matters**

Correct exception boundaries make pipeline failures visible and recoverable without accidentally turning genuine bugs into silent bad data.

**Example**

```python
try:
    value = int(raw_value)
except ValueError as exc:
    raise ValueError(f"invalid score: {raw_value!r}") from exc
else:
    save(value)
finally:
    metrics.increment("records_processed")
```

**Failure Modes / Tradeoffs**

Catch specific, expected exception types. `except Exception:` is sometimes appropriate at a top-level service boundary for logging and cleanup, but a broad catch inside core logic can hide programming errors.

**Interview-Ready Explanation**

> I catch only exceptions I can handle meaningfully, use `else` for the success path, and use `finally` for unconditional cleanup. I preserve the original cause with `raise ... from exc` when adding domain context.

---

### [CARD: Classes, Instances, and Attribute Lookup]
<!-- id: d17-classes-instances-and-attributes -->

- **Priority:** must_know
- **Category:** python-oop
- **Tags:** classes, instances, attributes, self

**Core Concept**

A class defines behavior and shared defaults; an instance is a concrete object created from that class. Instance attributes hold per-object state, while class attributes are looked up as shared fallbacks when an instance has no attribute of that name.

**Why It Matters**

This distinction prevents shared-state bugs in model configuration, clients, caches, and counters.

**Example**

```python
class ModelRun:
    framework = "pytorch"  # class attribute

    def __init__(self, run_id):
        self.run_id = run_id  # instance attribute

first = ModelRun("a")
second = ModelRun("b")
```

`first.run_id` and `second.run_id` differ. Both can read `framework` through the class unless one instance shadows it.

**Failure Modes / Tradeoffs**

Never use a mutable class attribute for per-instance state, such as `items = []`; every instance would share that same list. Create it in `__init__` instead.

**Interview-Ready Explanation**

> A class is a blueprint; an instance has its own state. Attribute lookup checks the instance and then the class, so mutable per-instance state belongs in `__init__`, not as a class attribute.

---

### [CARD: Instance, Class, and Static Methods]
<!-- id: d17-method-types -->

- **Priority:** must_know
- **Category:** python-oop
- **Tags:** instance-method, classmethod, staticmethod, constructors

**Core Concept**

An instance method receives `self` and operates on one object's state. A class method receives `cls` and can operate on the class or provide alternative constructors. A static method receives neither automatically and is simply a related utility placed in the class namespace.

**Example**

```python
class Threshold:
    default = 0.5

    def accepts(self, score):          # instance method
        return score >= self.default

    @classmethod
    def strict(cls):                    # alternative constructor
        instance = cls()
        instance.default = 0.9
        return instance

    @staticmethod
    def is_valid(score):                # namespaced utility
        return 0 <= score <= 1
```

**Interview-Ready Explanation**

> Use an instance method when behavior needs one object's state, a class method when it needs class-level behavior or an alternative constructor, and a static method when no implicit object or class state is needed.

---

### [CARD: Composition Before Inheritance]
<!-- id: d17-composition-before-inheritance -->

- **Priority:** should_know
- **Category:** python-oop
- **Tags:** composition, inheritance, design

**Core Concept**

Inheritance models a genuine “is-a” relationship and lets a subclass reuse or override parent behavior. Composition models a “has-a” relationship by giving an object collaborators. In application code, composition is often more flexible and easier to test.

**Example**

```python
class Predictor:
    def __init__(self, model, feature_builder):
        self.model = model
        self.feature_builder = feature_builder

    def predict(self, record):
        return self.model.predict(self.feature_builder.build(record))
```

`Predictor` has a model and a feature builder; it does not need to inherit from either.

**Failure Modes / Tradeoffs**

Deep inheritance hierarchies make behavior hard to trace, especially with multiple inheritance and method-resolution order. Use inheritance for stable shared contracts; favor composition when you want to swap dependencies or behaviors.

**Interview-Ready Explanation**

> I prefer composition when an object uses another component, because dependencies are explicit and replaceable. I use inheritance only for a stable, meaningful is-a relationship or shared interface.

---

### [CARD: dataclass for Data-Carrying Objects]
<!-- id: d17-dataclass -->

- **Priority:** should_know
- **Category:** python-oop
- **Tags:** dataclass, type-hints, defaults

**Core Concept**

`@dataclass` generates common boilerplate for classes that primarily hold data, including an initializer and readable representation. It makes simple configuration and result objects concise while retaining ordinary Python class behavior.

**Example**

```python
from dataclasses import dataclass, field

@dataclass
class EvaluationResult:
    accuracy: float
    labels: list[str] = field(default_factory=list)
```

`default_factory` creates a fresh list per instance, avoiding the mutable-default problem.

**Interview-Ready Explanation**

> I use a dataclass for objects whose main job is to carry structured data. `default_factory` is important for mutable fields because it creates a separate value for every instance.

---

### [CARD: Generator Delegation with yield from]
<!-- id: d17-yield-from -->

- **Priority:** nice_to_know
- **Category:** python-iteration
- **Tags:** generators, yield-from, delegation

**Core Concept**

`yield from iterable` delegates iteration to another iterable or generator. It is a concise way for one generator to yield every value produced by another.

**Example**

```python
def all_records(groups):
    for group in groups:
        yield from group
```

**Interview-Ready Explanation**

> `yield from` delegates part of a generator's output to another iterable, making generator composition clearer than writing an inner loop by hand.

---

## Key Connections

- **Day 1:** Namespaces, closures, mutable defaults, and class attributes all rely on the object/reference and mutability model introduced there.
- **Day 17 internal chain:** iterable → iterator protocol → generator; LEGB/closures → decorators; exceptions → context-manager cleanup.
- **Day 18:** Context managers, exception propagation, lazy iteration, and shared mutable state are prerequisites for safe threads and `asyncio`.
- **MLE work:** Generators are useful for streamed data; context managers manage files, database sessions, and locks; decorators frequently appear in API and ML framework code.

---

## Common Misconceptions

- **Myth:** A generator function runs when called.  
  **Reality:** Calling it creates a generator; its body begins when it is iterated.

- **Myth:** An iterable and iterator are interchangeable.  
  **Reality:** An iterable can create an iterator; an iterator carries one traversal's state and may be exhausted.

- **Myth:** A mutable default is recreated on every call.  
  **Reality:** It is created once when the function is defined.

- **Myth:** A decorator changes the original function in place.  
  **Reality:** It normally returns a wrapper, and the function name is rebound to that wrapper.

- **Myth:** `with` only closes files.  
  **Reality:** It scopes and cleans up any resource represented by a context manager.

- **Myth:** Inheritance is automatically more reusable than composition.  
  **Reality:** Composition often produces clearer, easier-to-test designs.

---

## Out of Scope

- CPython bytecode, frame objects, and reference-counting internals
- Descriptor protocol, metaclasses, and advanced dunder-method design
- Async generators and asynchronous context managers (Day 18 context)
- Full multiple-inheritance and method-resolution-order rules
- Building custom iterator, decorator, or context-manager libraries from scratch

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d17-qa-001]

**Question:** What is a namespace in Python?

**Answer:** A mapping from names to objects in a particular context, such as a module or one function call.

**Tags:** namespaces, scope

**Linked Cards:** d17-namespaces-and-call-frames

#### [QA: d17-qa-002]

**Question:** What does LEGB stand for?

**Answer:** Local, Enclosing, Global, Built-in—the order Python uses to resolve an unqualified name inside a function.

**Tags:** legb, scope

**Linked Cards:** d17-legb-and-closures

#### [QA: d17-qa-003]

**Question:** Why is `def f(items=[]):` risky?

**Answer:** The list is created once at function definition time and is reused across calls that omit `items`.

**Tags:** defaults, mutability

**Linked Cards:** d17-function-arguments-and-mutable-defaults

#### [QA: d17-qa-004]

**Question:** What is the difference between an iterable and an iterator?

**Answer:** An iterable can provide an iterator. An iterator is stateful, produces values with `next()`, and eventually becomes exhausted.

**Tags:** iterables, iterators

**Linked Cards:** d17-iterables-vs-iterators

#### [QA: d17-qa-005]

**Question:** Which event signals that an iterator has no more values?

**Answer:** `next()` raises `StopIteration`; a `for` loop handles this automatically.

**Tags:** iterator-protocol, stopiteration

**Linked Cards:** d17-iterator-protocol

#### [QA: d17-qa-006]

**Question:** What does `yield` change about a function?

**Answer:** It makes the function produce a generator that yields values lazily and preserves state between yields.

**Tags:** generators, yield

**Linked Cards:** d17-generator-functions-and-yield

#### [QA: d17-qa-007]

**Question:** When would you choose a generator expression over a list comprehension?

**Answer:** For a one-pass or streaming workload where values can be computed on demand and materializing every result would waste memory or work.

**Tags:** laziness, generator-expression

**Linked Cards:** d17-generator-expressions-and-laziness

#### [QA: d17-qa-008]

**Question:** What does `@decorator` mean operationally?

**Answer:** It means the decorated name is rebound to the callable returned by `decorator(original_function)`.

**Tags:** decorators, wrappers

**Linked Cards:** d17-decorators-as-wrappers

#### [QA: d17-qa-009]

**Question:** Why use `functools.wraps` in a decorator?

**Answer:** It preserves useful metadata such as the original function's name and docstring on the wrapper.

**Tags:** decorators, metadata

**Linked Cards:** d17-decorator-metadata-and-parameters

#### [QA: d17-qa-010]

**Question:** What guarantee does a context manager provide?

**Answer:** It attempts cleanup when a `with` block exits, whether the block succeeds or raises an exception.

**Tags:** context-manager, cleanup

**Linked Cards:** d17-context-managers

#### [QA: d17-qa-011]

**Question:** When should you use `finally`?

**Answer:** For cleanup or actions that must run whether the protected code succeeds or fails.

**Tags:** exceptions, finally

**Linked Cards:** d17-exceptions-and-cleanup

#### [QA: d17-qa-012]

**Question:** Why should mutable per-instance state be created in `__init__`?

**Answer:** A mutable class attribute is shared by all instances; creating it in `__init__` gives every instance its own object.

**Tags:** classes, shared-state

**Linked Cards:** d17-classes-instances-and-attributes

#### [QA: d17-qa-013]

**Question:** When is a `@classmethod` appropriate?

**Answer:** When behavior needs the class itself, commonly for an alternative constructor or class-level configuration.

**Tags:** classmethod, constructors

**Linked Cards:** d17-method-types

#### [QA: d17-qa-014]

**Question:** Why is composition often preferred to inheritance?

**Answer:** It makes dependencies explicit and replaceable, avoiding deep inheritance hierarchies and making testing easier.

**Tags:** composition, inheritance

**Linked Cards:** d17-composition-before-inheritance

#### [QA: d17-qa-015]

**Question:** How do you safely give a dataclass a mutable default field?

**Answer:** Use `field(default_factory=...)`, such as `field(default_factory=list)`, so each instance receives a fresh object.

**Tags:** dataclass, defaults

**Linked Cards:** d17-dataclass

#### [QA: d17-qa-016]

**Question:** What does `yield from` do?

**Answer:** It delegates output from one generator to another iterable or generator.

**Tags:** generators, yield-from

**Linked Cards:** d17-yield-from

<!-- QA_END -->
