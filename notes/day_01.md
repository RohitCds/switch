---
day: 1
title: "Python Mental Model + Core ML Framing"
topics:
  - python
  - ml-foundations
  - supervised-learning
  - generalization
  - bias-variance
tags:
  - python
  - ml-foundations
priority_distribution:
  must_know: 17
  should_know: 6
  nice_to_know: 0
---

# DAY 1 — Python Mental Model + Core ML Framing

## Daily Objective
Understand Python's object/reference model, mutable vs immutable types, core data structures, functional tools, copying semantics, and foundational ML concepts including features/labels, supervised vs unsupervised learning, parameters vs hyperparameters, data splits, generalization, overfitting/underfitting, and bias vs variance.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Python objects/references, mutable vs immutable, assignment vs copying, shallow vs deep copy, lists, tuples, dictionaries, sets, `*args` / `**kwargs`, slicing, ML problem framing, features vs labels, parameters vs hyperparameters, train/validation/test, generalization, overfitting/underfitting, bias vs variance
- 🟡 **SHOULD KNOW:** Comprehensions, `enumerate()`, `zip()`, `map()`, `filter()`, `lambda`
- 🟢 **NICE TO KNOW:** Obscure Python implementation details, CPython internals, bytecode, advanced metaprogramming

---

## Knowledge Cards

---

### [CARD: Python Objects and References]
<!-- id: d01-python-objects-and-references -->

- **Priority:** must_know
- **Category:** python
- **Tags:** objects, references, identity
**Core Concept**

A Python variable is a name (reference) bound to an object, not a box containing a value. Every Python object has a type, a value, and an identity.
**Why It Matters**

Understanding this model prevents confusion around assignment, mutation, and shared state — bugs that are extremely common in data pipelines, ML preprocessing, and concurrent programs.
**Mental Model / Mechanics**
  ```
  x = 10

  x ───────► 10
             object (type=int, value=10, id=...)
  ```
  - `id(x)` inspects object identity
  - `a == b` checks **value equality** (do two objects have the same value?)
  - `a is b` checks **object identity** (are they the exact same object in memory?)
**Example**
  ```python
  x = 10
  y = 10
  print(x == y)   # True  — same value
  print(x is y)    # True  — CPython caches small integers (implementation detail)

  a = [1, 2, 3]
  b = [1, 2, 3]
  print(a == b)    # True  — same value
  print(a is b)    # False — different objects
  ```
**Failure Modes / Tradeoffs**
  - Do not confuse `==` with `is` — they are fundamentally different operations
  - Small integer caching (`-5` to `256` in CPython) can make `is` appear to work like `==` for ints, but this is an implementation detail, not a language guarantee
**Interview-Ready Explanation**
  > `==` checks value equality, while `is` checks object identity. A Python variable is a name bound to an object, not a container holding a value.

---

### [CARD: Assignment Does Not Mean Copying]
<!-- id: d01-assignment-does-not-mean-copying -->

- **Priority:** must_know
- **Category:** python
- **Tags:** assignment, references, shared-state
**Core Concept**

Assignment (`b = a`) creates another reference to the **same** object. It does not create a new independent copy.
**Why It Matters**

This is the root cause of a massive class of bugs involving shared mutable state — function arguments, nested data structures, PyTorch data, caches, and concurrent programs.
**Mental Model / Mechanics**
  ```
  a = [1, 2, 3]
  b = a

          ┌──► [1, 2, 3]
  a ──────┤
  b ──────┘
  ```
  Both names point to the **same list object**. Mutating through one name is visible through the other.
  - **Assignment:** name → existing object
  - **Copying:** new object → contents copied from existing object
**Example**
  ```python
  a = [1, 2, 3]
  b = a
  b.append(4)
  print(a)       # [1, 2, 3, 4]
  print(a is b)  # True
  ```
**Failure Modes / Tradeoffs**
  - This distinction is critical when working with: function arguments, nested data structures, ML preprocessing, PyTorch data, caches, shared state, concurrent programs
**Interview-Ready Explanation**
  > Assignment creates another reference to an existing object, while copying creates a new object based on the original. `b = a` does not copy the list — both names refer to the same object.

---

### [CARD: Mutable vs Immutable Objects]
<!-- id: d01-mutable-vs-immutable-objects -->

- **Priority:** must_know
- **Category:** python
- **Tags:** mutability, immutability, objects
**Core Concept**

A **mutable** object can be changed in place after creation. An **immutable** object cannot be changed after creation — any "modification" creates a new object.
**Why It Matters**

Determines whether shared references can cause unintended side effects. Immutability guarantees safety; mutability enables efficient in-place updates.
**Mental Model / Mechanics**
  | Mutable          | Immutable          |
  |------------------|--------------------|
  | `list`           | `int`              |
  | `dict`           | `float`            |
  | `set`            | `bool`             |
  |                  | `str`              |
  |                  | `tuple`            |
  |                  | `frozenset`        |

  Immutable integer rebinding:
  ```
  x = 10  →  x ─► 10
  x = x + 1 →  x ─► 11   (new object; 10 is untouched)
  ```
  Mutable list mutation:
  ```
  x = [1, 2]  →  x ─► [1, 2]
  x.append(3) →  x ─► [1, 2, 3]  (same object, modified)
  ```
**Example**
  ```python
  # Immutable — rebinding, not mutation
  x = 10
  x = x + 1  # x now points to a new int object 11

  # Mutable — in-place mutation
  x = [1, 2]
  x.append(3)  # The same list object is modified
  ```
**Failure Modes / Tradeoffs**
  - Immutability belongs to the **object**, not to the variable name. `x = 10; x = 20` is valid — the int is immutable, but the name `x` is simply rebound.
**Interview-Ready Explanation**
  > A mutable object can be modified in place after creation. An immutable object cannot — a new object must be created if the value changes. Immutability is a property of the object, not the variable name.

---

### [CARD: Lists vs Tuples]
<!-- id: d01-lists-vs-tuples -->

- **Priority:** must_know
- **Category:** python
- **Tags:** lists, tuples, mutability
**Core Concept**

Lists are mutable ordered sequences. Tuples are immutable ordered sequences.
**Why It Matters**

Lists are used for dynamic collections that change. Tuples represent fixed structures (coordinates, records) and communicate intent that the data should not change.
**Mental Model / Mechanics**
  | Property           | List       | Tuple      |
  |--------------------|------------|------------|
  | Syntax             | `[1,2,3]`  | `(1,2,3)`  |
  | Mutable            | ✅ Yes     | ❌ No      |
  | `append`/`remove`  | ✅ Yes     | ❌ No      |
  | Hashable           | ❌ No      | ✅ Yes*    |
  | Use case           | Dynamic    | Fixed      |

  *A tuple is hashable only if all its elements are hashable.
**Example**
  ```python
  # List — mutable
  numbers = [1, 2, 3]
  numbers.append(4)
  numbers[0] = 99

  # Tuple — immutable
  point = (10, 20)
  # point[0] = 5  → TypeError
  ```
**Failure Modes / Tradeoffs**
  - A tuple is immutable, but it **can contain mutable objects**:
    ```python
    x = ([1, 2], [3, 4])
    # x[0] = [5, 6]   → Error (can't replace tuple element)
    x[0].append(3)     # OK (the list inside is still mutable)
    ```
  - The tuple still points to the same list object; the list itself changed.
**Interview-Ready Explanation**
  > Use lists for dynamic collections that need to change. Use tuples for fixed collections where immutability communicates intent. A tuple itself is immutable, but it can contain mutable objects.

---

### [CARD: Dictionaries]
<!-- id: d01-dictionaries -->

- **Priority:** must_know
- **Category:** python
- **Tags:** dictionaries, hashing, lookup
**Core Concept**

A dictionary maps hashable keys to values, implemented using hashing for O(1) average-case lookup.
**Why It Matters**

Provides fast key-based retrieval. Essential for configuration, caching, counting, grouping, and almost every ML pipeline.
**Mental Model / Mechanics**
  ```
  Dictionary
      ↓
  hash(key)
      ↓
  locate corresponding entry
      ↓
  retrieve value
  ```
  Keys must be **hashable** (immutable types like `str`, `int`, `tuple`). Lists cannot be keys because they are mutable and therefore unhashable.
**Example**
  ```python
  user = {"name": "Rohit", "age": 24}
  print(user["name"])  # "Rohit" — O(1) average

  # Valid keys
  d = {"hello": 1, 42: 2, (1, 2): 3}

  # Invalid key — list is unhashable
  # d = {[1, 2]: 3}  → TypeError
  ```
**Failure Modes / Tradeoffs**
  - O(1) is average case; worst case (hash collisions) is O(n)
  - Keys must be hashable — mutable objects cannot be keys
**Interview-Ready Explanation**
  > Dictionaries map keys to values using hashing for O(1) average-case lookup. Keys must be hashable, which is why mutable types like lists cannot serve as dictionary keys.

---

### [CARD: Sets]
<!-- id: d01-sets -->

- **Priority:** must_know
- **Category:** python
- **Tags:** sets, hashing, membership
**Core Concept**

A set stores unique elements with O(1) average-case membership testing, implemented via hashing.
**Why It Matters**

Deduplication, fast membership testing, and set operations (union, intersection, difference).
**Mental Model / Mechanics**
  ```
  dict → key → value
  set  → key only
  ```
  Both rely heavily on hashing. A set is essentially a dictionary without values.
**Example**
  ```python
  s = {1, 2, 2, 3}
  print(s)  # {1, 2, 3} — duplicates removed

  valid_users = {"alice", "bob", "charlie"}
  if user_id in valid_users:  # O(1) average
      grant_access()
  ```
**Failure Modes / Tradeoffs**
  - Sets are unordered — no indexing
  - Elements must be hashable
**Interview-Ready Explanation**
  > Sets store unique elements with O(1) average membership testing using hashing. They are ideal for deduplication and fast lookups. Sets are essentially dictionaries without values.

---

### [CARD: Comprehensions]
<!-- id: d01-comprehensions -->

- **Priority:** should_know
- **Category:** python
- **Tags:** comprehensions, collections, iteration
**Core Concept**

Comprehensions are concise syntactic constructs for building lists, dicts, and sets from iterables.
**Why It Matters**

Replaces verbose loop-append patterns with readable one-liners. Does NOT improve asymptotic complexity.
**Mental Model / Mechanics**
  General form: `[expression for item in iterable if condition]`
**Example**
  ```python
  # List comprehension
  squares = [x * x for x in range(5)]

  # With condition
  even_squares = [x * x for x in range(10) if x % 2 == 0]

  # Dictionary comprehension
  sq_dict = {x: x * x for x in range(5)}

  # Set comprehension
  unique_lengths = {len(word) for word in words}
  ```
**Failure Modes / Tradeoffs**
  - Comprehensions are syntactic convenience — they do not magically improve algorithmic complexity
  - Deeply nested comprehensions harm readability
**Interview-Ready Explanation**
  > Comprehensions are concise syntax for constructing collections. They are equivalent to loop-append patterns and do not change asymptotic complexity.

---

### [CARD: Slicing]
<!-- id: d01-slicing -->

- **Priority:** must_know
- **Category:** python
- **Tags:** slicing, sequences, shallow-copy
**Core Concept**

Slicing extracts subsequences using `sequence[start:stop:step]` syntax, where `stop` is excluded.
**Why It Matters**

Provides a clean, expressive way to extract, reverse, and copy sequences.
**Mental Model / Mechanics**
  `a[start:stop:step]` — start is inclusive, stop is exclusive, step controls direction/stride.
**Example**
  ```python
  a = [0, 1, 2, 3, 4, 5]
  a[1:4]    # [1, 2, 3]
  a[:3]     # [0, 1, 2]       — first 3 elements
  a[3:]     # [3, 4, 5]       — from index 3 onward
  a[:]      # [0, 1, 2, 3, 4, 5]  — shallow copy
  a[::2]    # [0, 2, 4]       — every second element
  a[::-1]   # [5, 4, 3, 2, 1, 0]  — reversed
  ```
**Failure Modes / Tradeoffs**
  - `a[:]` creates a **shallow copy**, not a deep copy
  - Slicing creates a new list; it does not return a view (unlike NumPy)
**Interview-Ready Explanation**
  > Slicing uses `[start:stop:step]` to extract subsequences. The stop index is excluded. `a[:]` creates a shallow copy, `a[::-1]` reverses.

---

### [CARD: enumerate()]
<!-- id: d01-enumerate -->

- **Priority:** should_know
- **Category:** python
- **Tags:** enumerate, iteration, indexing
**Core Concept**

`enumerate()` yields `(index, value)` pairs from an iterable, replacing manual index management.
**Why It Matters**

Eliminates the anti-pattern of `for i in range(len(items))`.
**Example**
  ```python
  names = ["A", "B", "C"]
  for i, name in enumerate(names):
      print(i, name)
  # 0 A
  # 1 B
  # 2 C
  ```
**Failure Modes / Tradeoffs**
  - Accepts an optional `start` parameter: `enumerate(items, start=1)`
**Interview-Ready Explanation**
  > `enumerate()` produces `(index, value)` pairs, providing a clean alternative to manual index tracking.

---

### [CARD: zip()]
<!-- id: d01-zip -->

- **Priority:** should_know
- **Category:** python
- **Tags:** zip, iteration, iterables
**Core Concept**

`zip()` combines corresponding elements from multiple iterables into tuples.
**Why It Matters**

Pairs up related data from parallel sequences without manual indexing.
**Example**
  ```python
  names = ["A", "B", "C"]
  scores = [90, 80, 70]
  for name, score in zip(names, scores):
      print(name, score)
  # A 90
  # B 80
  # C 70
  ```
**Failure Modes / Tradeoffs**
  - Stops at the shortest iterable by default
  - Use `itertools.zip_longest` to handle unequal lengths
**Interview-Ready Explanation**
  > `zip()` combines corresponding elements from multiple iterables. It stops at the shortest iterable.

---

### [CARD: map()]
<!-- id: d01-map -->

- **Priority:** should_know
- **Category:** python
- **Tags:** map, functional-programming, iterators
**Core Concept**

`map(func, iterable)` applies a function to every element, returning an iterator (Python 3).
**Why It Matters**

Functional-style element-wise transformation without explicit loops.
**Example**
  ```python
  numbers = [1, 2, 3]
  result = list(map(lambda x: x * 2, numbers))
  # [2, 4, 6]
  ```
**Failure Modes / Tradeoffs**
  - Returns an **iterator** in Python 3, not a list — wrap in `list()` to materialize
  - List comprehensions are often preferred for readability
**Interview-Ready Explanation**
  > `map()` applies a function to every element of an iterable and returns an iterator in Python 3.

---

### [CARD: filter()]
<!-- id: d01-filter -->

- **Priority:** should_know
- **Category:** python
- **Tags:** filter, functional-programming, iterators
**Core Concept**

`filter(func, iterable)` keeps elements for which the function returns `True`, returning an iterator.
**Why It Matters**

Functional-style selective filtering without explicit loops.
**Example**
  ```python
  numbers = [1, 2, 3, 4, 5]
  evens = list(filter(lambda x: x % 2 == 0, numbers))
  # [2, 4]
  ```
**Failure Modes / Tradeoffs**
  - Returns an iterator in Python 3
  - List comprehensions with `if` are often more readable
**Interview-Ready Explanation**
  > `filter()` keeps elements for which a function evaluates to True and returns an iterator in Python 3.

---

### [CARD: Lambda Functions]
<!-- id: d01-lambda-functions -->

- **Priority:** should_know
- **Category:** python
- **Tags:** lambda, functions, functional-programming
**Core Concept**

A `lambda` is an anonymous, single-expression function.
**Why It Matters**

Provides inline function definitions for short operations, commonly used with `sorted()`, `map()`, `filter()`.
**Example**
  ```python
  square = lambda x: x * x  # Equivalent to def square(x): return x * x

  # Common use: custom sort key
  people = [("A", 30), ("B", 20), ("C", 25)]
  people.sort(key=lambda x: x[1])  # Sort by second element
  ```
**Failure Modes / Tradeoffs**
  - Limited to a single expression — no statements, no multi-line logic
  - Overuse reduces readability; prefer `def` for anything non-trivial
**Interview-Ready Explanation**
  > A lambda is an anonymous single-expression function, commonly used as a key function in `sorted()` or with `map()`/`filter()`.

---

### [CARD: *args and **kwargs]
<!-- id: d01-args-and-kwargs -->

- **Priority:** must_know
- **Category:** python
- **Tags:** args, kwargs, functions
**Core Concept**

`*args` collects extra positional arguments into a **tuple**. `**kwargs` collects extra keyword arguments into a **dictionary**.
**Why It Matters**

Enables flexible function signatures. Appears extensively in ML frameworks (PyTorch, TensorFlow, HuggingFace) for configuration forwarding, decorator patterns, and API wrappers.
**Mental Model / Mechanics**
  ```
  *args    → extra positional arguments → tuple
  **kwargs → extra keyword arguments    → dictionary
  ```
**Example**
  ```python
  def add(*args):
      return sum(args)

  add(1, 2, 3, 4)  # args = (1, 2, 3, 4) → returns 10

  def configure(**kwargs):
      print(kwargs)

  configure(model="bert", batch_size=32)
  # kwargs = {"model": "bert", "batch_size": 32}
  ```
**Failure Modes / Tradeoffs**
  - `args` is always a tuple, `kwargs` is always a dict
  - Order in signature: `def f(regular, *args, **kwargs)`
  - Can be used for argument forwarding: `def wrapper(*args, **kwargs): return inner(*args, **kwargs)`
**Interview-Ready Explanation**
  > `*args` collects extra positional arguments into a tuple. `**kwargs` collects extra keyword arguments into a dictionary. They enable flexible function signatures used extensively in ML frameworks.

---

### [CARD: Shallow vs Deep Copy]
<!-- id: d01-shallow-vs-deep-copy -->

- **Priority:** must_know
- **Category:** python
- **Tags:** copying, shallow-copy, deep-copy
**Core Concept**

A **shallow copy** creates a new outer container but preserves references to nested objects. A **deep copy** recursively creates independent copies of all nested objects.
**Why It Matters**

Critical for safely duplicating nested ML data structures, avoiding unintended shared state.
**Mental Model / Mechanics**
  ```
  Shallow copy:
  a ──► outer list A ──► [1, 2]  ← SHARED
  b ──► outer list B ──► [1, 2]  ← SAME OBJECT

  Deep copy:
  a ──► outer A ──► inner objects A  (independent)
  b ──► outer B ──► inner objects B  (independent)
  ```
**Example**
  ```python
  import copy

  a = [[1, 2], [3, 4]]

  # Shallow copy — new outer list, shared inner lists
  b = a.copy()
  b[0].append(99)
  print(a)  # [[1, 2, 99], [3, 4]] — a is affected!

  # Deep copy — fully independent
  a = [[1, 2], [3, 4]]
  b = copy.deepcopy(a)
  b[0].append(99)
  print(a)  # [[1, 2], [3, 4]] — a is unaffected
  ```
**Failure Modes / Tradeoffs**
  - `list.copy()`, `list(original)`, and `original[:]` all produce shallow copies
  - Deep copy is more expensive and can be slow for large/complex structures
  - Deep copy handles circular references; shallow copy does not need to
**Interview-Ready Explanation**
  > A shallow copy creates a new outer container but preserves references to nested objects. A deep copy recursively creates independent copies of nested objects. This matters critically with nested ML data structures.

---

**Machine Learning Foundations**

---

### [CARD: What Is Machine Learning]
<!-- id: d01-what-is-machine-learning -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** machine-learning, problem-framing
**Core Concept**

Machine learning is a paradigm where models learn patterns from data rather than being explicitly programmed with rules.
**Why It Matters**

Many problems (image recognition, language understanding, fraud detection) are too complex to encode as explicit rules. ML learns the mapping from data.
**Mental Model / Mechanics**
  ```
  Traditional programming:
  Rules + Data → Output

  Machine learning:
  Data + Desired Outputs → Learning → Model
  ```
  The model learns a mapping: `features → prediction`
**Failure Modes / Tradeoffs**
  - ML is not magic — it requires quality data, proper evaluation, and domain understanding
  - A model can only learn patterns that exist in the training data
**Interview-Ready Explanation**
  > Traditional programming encodes rules explicitly. Machine learning learns patterns from data to produce a model that maps inputs to outputs.

---

### [CARD: Features vs Labels]
<!-- id: d01-features-vs-labels -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** features, labels, supervised-learning
**Core Concept**

**Features** (X) are input variables the model uses. **Labels** (y) are the target values the model tries to predict.
**Why It Matters**

Formalizes the input-output relationship in supervised learning.
**Mental Model / Mechanics**
  ```
  X = features / inputs
  y = label / target

  Dataset: (X, y) pairs
  Model learns: X → y
  ```
**Example**
  ```
  Features (X):          Label (y):
  CPU util = 82%         failure = 1
  Latency = 120ms
  Packet loss = 3%
  ```
**Interview-Ready Explanation**
  > Features are input variables used by the model. Labels are target values the model predicts. In supervised learning, the model learns a mapping from features X to labels y.

---

### [CARD: Supervised vs Unsupervised Learning]
<!-- id: d01-supervised-vs-unsupervised-learning -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** supervised-learning, unsupervised-learning, problem-framing
**Core Concept**

**Supervised learning** uses labeled examples (X → y) to learn a mapping. **Unsupervised learning** discovers structure in data without explicit labels.
**Why It Matters**

Different problems have different data availability. Labeled data enables direct prediction; unlabeled data still contains useful structure.
**Mental Model / Mechanics**
  **Supervised** → two major forms:
  - **Classification:** predict a category (spam/not spam, fraud/legitimate)
  - **Regression:** predict a continuous value (price, temperature, demand)

  **Unsupervised** → discover structure:
  - Clustering (K-means, DBSCAN)
  - Dimensionality reduction (PCA)
  - Anomaly detection
**Failure Modes / Tradeoffs**
  - Supervised requires labeled data, which can be expensive to obtain
  - Unsupervised has no direct ground truth for evaluation
**Interview-Ready Explanation**
  > Supervised learning uses labeled data to learn a mapping from inputs to known targets. Unsupervised learning discovers hidden structure without explicit labels. Classification predicts categories; regression predicts continuous values.

---

### [CARD: Parameters vs Hyperparameters]
<!-- id: d01-parameters-vs-hyperparameters -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** parameters, hyperparameters, optimization
**Core Concept**

**Parameters** are learned from training data by the optimization algorithm. **Hyperparameters** control the model or training process and are set externally.
**Why It Matters**

Separates what the model learns automatically from what a practitioner must configure.
**Mental Model / Mechanics**
  ```
  Parameters (learned):          Hyperparameters (set externally):
  weights w₁, w₂, ...           learning rate
  bias b                         batch size
                                  number of trees
                                  max depth
                                  regularization strength
                                  number of epochs
  ```
**Example**
  ```
  Linear regression: ŷ = w₁x₁ + w₂x₂ + b
  Parameters: w₁, w₂, b (learned via training)
  Hyperparameters: learning_rate=0.001 (set by you)
  ```
**Interview-Ready Explanation**
  > Parameters are learned from training data (e.g., weights in a neural network). Hyperparameters control the model or learning process and are selected externally (e.g., learning rate, batch size).

---

### [CARD: Training, Validation and Test Sets]
<!-- id: d01-training-validation-and-test-sets -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** data-splits, validation, test-set
**Core Concept**

Data is split into three sets: **training** (learn parameters), **validation** (tune hyperparameters/select models), **test** (final unbiased evaluation).
**Why It Matters**

Prevents overly optimistic evaluation. The test set must remain untouched during development to provide a genuinely unbiased estimate.
**Mental Model / Mechanics**
  ```
  Training Set    → Learn model parameters
  Validation Set  → Choose models / hyperparameters
  Test Set        → Final evaluation (genuinely unseen)
  ```
  The test set should **not** influence model development. If you repeatedly tune based on test performance, it becomes another validation set.
**Failure Modes / Tradeoffs**
  - Repeatedly evaluating on the test set and adjusting the model leaks test information into development
  - Small datasets may require cross-validation instead of a fixed validation split
**Interview-Ready Explanation**
  > Training data is used to learn parameters. Validation data guides model selection and hyperparameter tuning. The test set is reserved for final evaluation and should not influence development decisions.

---

### [CARD: Generalization]
<!-- id: d01-generalization -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** generalization, unseen-data, evaluation
**Core Concept**

Generalization is the ability of a model to perform well on **unseen data** from the same underlying distribution, not just the training set.
**Why It Matters**

A model that memorizes training data is useless in production. The central goal of ML is to generalize.
**Mental Model / Mechanics**
  ```
  Training accuracy: 99.9%  |  Test accuracy: 72%  → Poor generalization
  Training accuracy: 94%    |  Test accuracy: 91%  → Good generalization
  ```
**Interview-Ready Explanation**
  > Generalization is the ability to perform well on unseen data. The goal of ML is not to fit training data perfectly but to learn patterns that transfer to new examples.

---

### [CARD: Overfitting vs Underfitting]
<!-- id: d01-overfitting-vs-underfitting -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** overfitting, underfitting, generalization
**Core Concept**

**Overfitting:** the model learns training-specific patterns (including noise), performing well on training data but poorly on unseen data. **Underfitting:** the model is too simple to capture important patterns, performing poorly on both.
**Why It Matters**

Diagnosing whether a model is too complex or too simple is fundamental to improving it.
**Mental Model / Mechanics**
  ```
  Underfitting:                    Overfitting:
  Train perf → poor                Train perf → excellent
  Val perf   → poor                Val perf   → poor
  ```
  **Underfitting fixes:** more expressive model, better features, reduce regularization, train longer
  **Overfitting fixes:** more data, regularization, simpler model, early stopping, data augmentation, dropout
**Failure Modes / Tradeoffs**
  - High training accuracy does NOT mean the model is good — you must check validation/test
**Interview-Ready Explanation**
  > Overfitting: model learns noise/training-specific patterns → great training, poor generalization. Underfitting: model too simple → poor everywhere. The fix depends on diagnosing which problem you have.

---

### [CARD: Bias vs Variance]
<!-- id: d01-bias-vs-variance -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** bias, variance, generalization
**Core Concept**

**Bias** is systematic error from overly restrictive model assumptions (can't learn enough). **Variance** is sensitivity to the particular training dataset (learned too much about this specific data).
**Why It Matters**

Provides a framework for understanding *why* a model underfits or overfits, and what lever to pull.
**Mental Model / Mechanics**
  ```
  High Bias → underfitting → train error high, val error high
  "The model can't learn enough."

  High Variance → overfitting → train error low, val error high
  "The model learned too much about this particular training set."

  Model complexity →  Bias ↓  Variance ↑
  Regularization   →  Bias ↑  Variance ↓

  The goal is not to minimize either independently.
  The goal is good generalization.
  ```
**Failure Modes / Tradeoffs**
  - "More complex is always better" is false — it reduces bias but increases variance
  - The sweet spot depends on data size, noise, and problem complexity
**Interview-Ready Explanation**
  > Bias is error from restrictive assumptions (underfitting). Variance is sensitivity to the training set (overfitting). Increasing model complexity reduces bias but increases variance. The goal is to find the balance that maximizes generalization.

---

## Key Connections

**Python chain:**
```
Objects → References → Assignment → Mutation → Copying → Shallow vs Deep Copy
```
Foundation for: Iterators, Generators, Asyncio, Concurrency, PyTorch tensors, Data pipelines, Shared state

**ML chain:**
```
Data → Features + Labels → Model → Prediction → Loss / Evaluation → Optimization → Generalization
```
Later adds: Regularization, Cross-validation, Hyperparameter tuning, Deployment, Monitoring

---

## Common Misconceptions

- **Myth:** `b = a` copies the list.
  **Reality:** It creates another reference to the same object.

- **Myth:** Immutable means the variable cannot change.
  **Reality:** The object is immutable; the name can be rebound. `x = 10; x = 20` is valid.

- **Myth:** `==` and `is` are interchangeable.
  **Reality:** `==` checks value equality; `is` checks object identity.

- **Myth:** More complex models are always better.
  **Reality:** Greater complexity can reduce bias but increase variance and overfitting.

- **Myth:** High training accuracy means the model is good.
  **Reality:** The important question is whether the model generalizes to unseen data.

- **Myth:** Validation and test sets are the same.
  **Reality:** Validation guides development decisions; the test set is for final, untouched evaluation.

---

## Out of Scope
- Python bytecode internals
- CPython's C implementation
- Descriptor protocol / metaclasses
- Advanced metaprogramming / obscure dunder methods
- Exact dictionary implementation details
- Rare edge cases of copying
- Mathematical derivations of bias/variance

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d01-qa-001]

**Question:** What exactly happens when I execute `b = a` where `a` is a list?

**Answer:** `b` becomes another reference to the same list object. No new list is created. Mutating through either name affects the same object.

**Tags:** assignment, references

**Linked Cards:** d01-assignment-does-not-mean-copying

#### [QA: d01-qa-002]

**Question:** What is the difference between `==` and `is`?

**Answer:** `==` checks value equality (do two objects have the same value). `is` checks object identity (are they the exact same object in memory).

**Tags:** equality, identity

**Linked Cards:** d01-python-objects-and-references

#### [QA: d01-qa-003]

**Question:** Why can modifying `b` modify `a` after `b = a`?

**Answer:** Because assignment creates a shared reference, not a copy. Both names point to the same mutable object.

**Tags:** assignment, shared-state

**Linked Cards:** d01-assignment-does-not-mean-copying

#### [QA: d01-qa-004]

**Question:** What makes an object mutable?

**Answer:** A mutable object can be changed in place after creation (e.g., lists, dicts, sets). An immutable object cannot (e.g., int, str, tuple).

**Tags:** mutability, immutability

**Linked Cards:** d01-mutable-vs-immutable-objects

#### [QA: d01-qa-005]

**Question:** Why can a tuple contain a mutable object even though the tuple itself is immutable?

**Answer:** The tuple's immutability means you cannot replace its elements. But the elements themselves are independent objects — if one is a mutable list, the list can still be modified in place.

**Tags:** tuples, mutability

**Linked Cards:** d01-lists-vs-tuples

#### [QA: d01-qa-006]

**Question:** What is the difference between a list and a tuple?

**Answer:** Lists are mutable ordered sequences (support append/remove/modify). Tuples are immutable ordered sequences (fixed structure, hashable if contents are hashable).

**Tags:** lists, tuples

**Linked Cards:** d01-lists-vs-tuples

#### [QA: d01-qa-007]

**Question:** Why do dictionary keys need to be hashable?

**Answer:** Dictionaries use hashing for O(1) average-case lookup. The hash of a key must remain stable — mutable objects can't guarantee this.

**Tags:** dictionaries, hashing

**Linked Cards:** d01-dictionaries

#### [QA: d01-qa-008]

**Question:** Why is set membership generally fast?

**Answer:** Sets use hashing internally, providing O(1) average-case membership testing.

**Tags:** sets, hashing

**Linked Cards:** d01-sets

#### [QA: d01-qa-009]

**Question:** What does `enumerate()` produce?

**Answer:** `(index, value)` pairs from an iterable, replacing manual index management.

**Tags:** enumerate, iteration

**Linked Cards:** d01-enumerate

#### [QA: d01-qa-010]

**Question:** What does `zip()` do?

**Answer:** Combines corresponding elements from multiple iterables into tuples, stopping at the shortest iterable.

**Tags:** zip, iterables

**Linked Cards:** d01-zip

#### [QA: d01-qa-011]

**Question:** What does `*args` contain?

**Answer:** A tuple of extra positional arguments passed to a function.

**Tags:** args, functions

**Linked Cards:** d01-args-and-kwargs

#### [QA: d01-qa-012]

**Question:** What does `**kwargs` contain?

**Answer:** A dictionary of extra keyword arguments passed to a function.

**Tags:** kwargs, functions

**Linked Cards:** d01-args-and-kwargs

#### [QA: d01-qa-013]

**Question:** Explain shallow vs deep copy using a nested list.

**Answer:** Given `a = [[1,2],[3,4]]`: a shallow copy (`a.copy()`) creates a new outer list but the inner lists are still shared — mutating an inner list affects both. A deep copy (`copy.deepcopy(a)`) recursively copies everything, making fully independent structures.

**Tags:** copying, nested-data

**Linked Cards:** d01-shallow-vs-deep-copy

#### [QA: d01-qa-014]

**Question:** What is the difference between a feature and a label?

**Answer:** Features (X) are input variables the model uses for prediction. Labels (y) are the target values the model tries to predict.

**Tags:** features, labels

**Linked Cards:** d01-features-vs-labels

#### [QA: d01-qa-015]

**Question:** What is the difference between classification and regression?

**Answer:** Classification predicts discrete categories (spam/not spam). Regression predicts continuous values (price, temperature).

**Tags:** classification, regression

**Linked Cards:** d01-supervised-vs-unsupervised-learning

#### [QA: d01-qa-016]

**Question:** What is the difference between supervised and unsupervised learning?

**Answer:** Supervised learning uses labeled data to learn input-output mappings. Unsupervised learning discovers structure in unlabeled data.

**Tags:** supervised-learning, unsupervised-learning

**Linked Cards:** d01-supervised-vs-unsupervised-learning

#### [QA: d01-qa-017]

**Question:** What is the difference between a parameter and a hyperparameter?

**Answer:** Parameters are learned from data during training (weights, biases). Hyperparameters control the training process and are set externally (learning rate, batch size).

**Tags:** parameters, hyperparameters

**Linked Cards:** d01-parameters-vs-hyperparameters

#### [QA: d01-qa-018]

**Question:** Why do we need training, validation and test sets?

**Answer:** Training: learn parameters. Validation: tune hyperparameters and select models. Test: final unbiased evaluation on genuinely unseen data.

**Tags:** data-splits, validation, test-set

**Linked Cards:** d01-training-validation-and-test-sets

#### [QA: d01-qa-019]

**Question:** What is generalization?

**Answer:** The ability of a model to perform well on unseen data from the same distribution, not just the training set.

**Tags:** generalization, evaluation

**Linked Cards:** d01-generalization

#### [QA: d01-qa-020]

**Question:** What is overfitting?

**Answer:** When a model learns training-specific patterns including noise, achieving excellent training performance but poor generalization.

**Tags:** overfitting, generalization

**Linked Cards:** d01-overfitting-vs-underfitting

#### [QA: d01-qa-021]

**Question:** What is underfitting?

**Answer:** When a model is too simple to capture important patterns, resulting in poor performance on both training and unseen data.

**Tags:** underfitting, generalization

**Linked Cards:** d01-overfitting-vs-underfitting

#### [QA: d01-qa-022]

**Question:** Explain bias vs variance in plain English.

**Answer:** Bias = model is too rigid, makes systematic errors (underfitting). Variance = model is too sensitive to the specific training data (overfitting). More complexity reduces bias but increases variance.

**Tags:** bias, variance

**Linked Cards:** d01-bias-vs-variance

#### [QA: d01-qa-023]

**Question:** Why can a model have 99% training accuracy and still be a bad model?

**Answer:** Because it may have memorized training data (overfitting) and fail to generalize. What matters is performance on unseen data.

**Tags:** overfitting, generalization

**Linked Cards:** d01-overfitting-vs-underfitting, d01-generalization
<!-- QA_END -->
