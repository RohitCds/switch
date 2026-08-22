---
day: 6
title: "Classical Algorithms: Trees, Ensembles, k-NN, Naive Bayes, SVM"
topics:
  - machine-learning
  - classical-algorithms
  - ensembles
  - trees
  - svm
tags:
  - decision-trees
  - random-forest
  - gradient-boosting
  - knn
  - naive-bayes
  - svm
priority_distribution:
  must_know: 12
  should_know: 1
  nice_to_know: 0
---

# DAY 6 — Classical Algorithms: Trees, Ensembles, k-NN, Naive Bayes, SVM

## Daily Objective
By the end of today you should be able to explain, from intuition rather than memorized formulas: how a decision tree chooses splits, why Random Forest reduces variance and Gradient Boosting reduces bias (and why that distinction matters), what makes XGBoost/LightGBM the production default over vanilla boosting, how k-NN and Naive Bayes actually make predictions, and how SVM's margin-maximization and kernel trick work conceptually.

---

## Syllabus & Priority Breakdown
- **MUST KNOW:** what each algorithm does and why, bagging vs boosting distinction, the bias/variance mechanism each ensemble exploits, k-NN and Naive Bayes core logic, SVM's margin/support-vector/kernel intuition.
- **SHOULD KNOW:** XGBoost/LightGBM's specific engineering improvements over vanilla GBM, pruning strategies.
- **NICE TO KNOW:** exact Gini/entropy/info-gain formulas' derivations, cost-complexity pruning math, second-order (Newton) boosting math, SMO algorithm for training SVMs, kernel trick's formal Hilbert-space justification.

---

## Knowledge Cards

---

### [CARD: Decision Trees]
<!-- id: d06-decision-trees -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** decision-trees, classification, regression
**Core Concept**

A tree recursively splits data on `feature > threshold` questions, with leaves holding the final prediction.

**Why It Matters**

They are interpretable, require no feature scaling, handle both numeric and categorical features naturally, and can capture non-linear relationships.

**Mental Model / Mechanics**
At each step, the model picks a feature and a threshold that best separates the data into distinct classes (for classification) or reduces variance (for regression). This process repeats recursively until a stopping criterion is met.

**Failure Modes / Tradeoffs**
- High variance and inherently unstable (small changes in data can lead to completely different trees).
- Can only make axis-aligned splits.
- Biased toward features with more possible split points.

**Interview-Ready Explanation**
> A decision tree recursively splits data based on feature thresholds, ending in leaves that provide the final prediction. It is interpretable and requires no feature scaling, but is prone to high variance and overfitting if not constrained.

---

### [CARD: Decision Tree Split Selection]
<!-- id: d06-decision-tree-split-selection -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** decision-trees, gini, entropy
**Core Concept**

At each node, candidate splits are evaluated by how much they increase the "purity" of the resulting child nodes.

**Mental Model / Mechanics**
- **Gini impurity**: `Gini = 1 - Σp_i²`, where `p_i` is the proportion of class `i` in the node. `Gini = 0` means perfectly pure.
- **Entropy**: `Entropy = -Σp_i·log₂(p_i)` measures disorder. Lower entropy equals a purer node.
- **Information gain**: The difference between the parent's entropy and the weighted average entropy of the children.

**Failure Modes / Tradeoffs**
In practice, Gini and entropy produce very similar trees, but Gini is cheaper to compute (no logarithm), which is why algorithms like CART use it by default.

**Interview-Ready Explanation**
> Decision trees choose splits by evaluating which feature and threshold maximize the purity of the resulting child nodes. Purity is typically measured using Gini impurity or Information Gain (based on entropy), with Gini being the standard due to computational efficiency.

---

### [CARD: Decision Tree Overfitting and Pruning]
<!-- id: d06-decision-tree-overfitting-and-pruning -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** decision-trees, overfitting, pruning
**Core Concept**

An unconstrained tree keeps splitting until every leaf is pure, essentially memorizing the training set and exhibiting extreme variance. Pruning is required to prevent this.

**Mental Model / Mechanics**
- **Pre-pruning**: Setting stopping criteria upfront during training (e.g., `max_depth`, `min_samples_leaf`).
- **Post-pruning**: Growing the full tree first, then cutting back branches that do not improve validation performance (cost-complexity pruning).

**Why It Matters**
Without constraints, a decision tree will almost always overfit. Controlling its depth or complexity is essential for generalization.

**Interview-Ready Explanation**
> Unconstrained decision trees will perfectly memorize the training data, leading to severe overfitting. To fix this, we use pre-pruning techniques like setting a maximum depth, or post-pruning techniques to remove branches that don't help validation performance.

---

### [CARD: Bagging]
<!-- id: d06-bagging -->

- **Priority:** must_know
- **Category:** ensembles
- **Tags:** bagging, variance-reduction, ensembles
**Core Concept**

Bagging (Bootstrap Aggregating) involves training many independent models on different bootstrap samples (random samples with replacement) and aggregating their predictions.

**Why It Matters**

It is a powerful ensemble technique specifically designed to reduce variance and prevent overfitting.

**Mental Model / Mechanics**
By training high-variance/low-bias models (like unpruned decision trees) on slightly different resampled data, their errors become less correlated. Averaging their predictions cancels out the noise while preserving the low bias.
- **Aggregation**: Average for regression, majority vote for classification.

**Interview-Ready Explanation**
> Bagging trains many independent models on different bootstrap samples of the data, then averages their predictions. It works by combining models that have high variance and low bias, which cancels out uncorrelated noise and drastically reduces the overall variance.

---

### [CARD: Random Forest]
<!-- id: d06-random-forest -->

- **Priority:** must_know
- **Category:** ensembles
- **Tags:** random-forest, bagging, trees
**Core Concept**

Random Forest is bagging applied to decision trees, with one extra trick: at each split, only a random subset of features is considered.

**Why It Matters**

Without feature subsampling, a strong dominant feature would cause most trees to make the same initial splits, resulting in highly correlated trees. Subsampling decorrelates them, maximizing the variance-reduction benefit of bagging.

**Mental Model / Mechanics**
- **Out-of-bag (OOB) error**: Each bootstrap sample leaves out ~37% of the data. These left-out points serve as a built-in validation set for each tree, allowing for free evaluation during training.

**Failure Modes / Tradeoffs**
- **Strengths**: Robust to overfitting, handles high-dimensional data, provides feature importance, excellent out-of-the-box performance.
- **Weaknesses**: Less interpretable than a single tree, slower prediction time, can still overfit on highly noisy labels.

**Interview-Ready Explanation**
> Random Forest is an ensemble of decision trees trained via bagging, where each split only considers a random subset of features. This feature subsampling decorrelates the trees, making the ensemble much more robust to overfitting than a single tree.

---

### [CARD: Bagging vs Boosting]
<!-- id: d06-bagging-vs-boosting -->

- **Priority:** must_know
- **Category:** ensembles
- **Tags:** bagging, boosting, bias-variance
**Core Concept**

Bagging trains independent models in parallel to reduce variance. Boosting trains models sequentially, where each depends on the last, to reduce bias.

**Mental Model / Mechanics**
- **Bagging**: Parallel, independent, strong base models (e.g., deep trees). Focuses on reducing variance.
- **Boosting**: Sequential, dependent, weak base models (e.g., shallow trees). Focuses on correcting the errors of previous models to reduce bias.

**Interview-Ready Explanation**
> Bagging builds independent models in parallel to average out their errors and reduce variance. Boosting builds models sequentially, where each new model deliberately corrects the mistakes of the previous ensemble, primarily to reduce bias.

---

### [CARD: Gradient Boosting]
<!-- id: d06-gradient-boosting -->

- **Priority:** must_know
- **Category:** ensembles
- **Tags:** gradient-boosting, boosting, optimization
**Core Concept**

Gradient Boosting builds an ensemble additively, where each new tree is trained to predict the residual error (negative gradient of the loss function) of the current ensemble.

**Mental Model / Mechanics**
1. Start with a simple prediction (e.g., the mean).
2. Compute residuals (actual - prediction).
3. Train a small tree to predict those residuals.
4. Scale the tree's output by a **learning rate** and add it to the running prediction.
5. Repeat, recalculating residuals against the updated prediction.

Gradient boosting is effectively gradient descent in function space.

**Failure Modes / Tradeoffs**
- **Learning rate (shrinkage)**: A smaller learning rate requires more trees but generally generalizes better (speed-vs-stability tradeoff).
- **Strengths**: Often best-in-class for tabular data; flexible with any differentiable loss function.
- **Weaknesses**: Sequential training is slow, requires tuning many hyperparameters, and is more prone to overfitting than Random Forest if the learning rate or number of trees is too high.

**Interview-Ready Explanation**
> Gradient boosting trains models sequentially, where each new model is fitted to the residual errors of the previous ensemble. It is literally performing gradient descent in function space to minimize the loss, often yielding best-in-class performance on tabular data.

---

### [CARD: XGBoost and LightGBM]
<!-- id: d06-xgboost-lightgbm -->

- **Priority:** should_know
- **Category:** algorithms
- **Tags:** xgboost, lightgbm, gradient-boosting
**Core Concept**

XGBoost and LightGBM are heavily optimized engineering implementations of gradient boosting that serve as production defaults for tabular data.

**Mental Model / Mechanics**
Key improvements over vanilla Gradient Boosting:
- Built-in L1/L2 regularization on leaf weights.
- Uses second-order gradient information (Hessian) for more precise updates (Newton boosting).
- Native handling of missing values (learns the best default direction during splits).
- Highly efficient parallelized split-finding.
- **LightGBM specifically**: Uses histogram-based split finding and leaf-wise (best-first) growth, making it exceptionally fast.

**Interview-Ready Explanation**
> XGBoost and LightGBM are highly optimized gradient boosting frameworks. They improve upon vanilla GBM by incorporating L1/L2 regularization, second-order gradients, native missing value handling, and efficient histogram-based split finding.

---

### [CARD: k-Nearest Neighbors (k-NN)]
<!-- id: d06-k-nearest-neighbors -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** knn, distance-metrics, classification
**Core Concept**

k-NN makes predictions by finding the `k` closest training points (usually via Euclidean distance) and aggregating their labels: majority vote for classification, average for regression.

**Why It Matters**

It is a non-parametric, "lazy" learner. There is no real training phase; all computation happens at prediction time.

**Mental Model / Mechanics**
- **Choosing K**: Small K gives low bias/high variance (sensitive to noise). Large K gives high bias/low variance (smoother decision boundary).
- **Feature Scaling**: CRITICAL. Since it relies on distance, unscaled features with larger ranges will completely dominate the prediction.

**Failure Modes / Tradeoffs**
- **Curse of Dimensionality**: In high dimensions, points become roughly equidistant, breaking the core assumption that "closest neighbors are meaningfully similar."
- Slow at prediction time and memory-heavy, as it must store and compare against the entire training set.

**Interview-Ready Explanation**
> k-NN predicts the label of a new point by looking at the labels of its k closest neighbors in the training data. It requires no training time but is slow at inference, heavily reliant on feature scaling, and degrades rapidly in high-dimensional spaces.

---

### [CARD: Naive Bayes]
<!-- id: d06-naive-bayes -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** naive-bayes, probabilistic, classification
**Core Concept**

A probabilistic classifier based on Bayes' theorem: `P(class | features) ∝ P(features | class) × P(class)`. It naively assumes that all features are conditionally independent given the class.

**Mental Model / Mechanics**
Even though features are rarely strictly independent, the algorithm works surprisingly well because classification only requires the correct ranking of class probabilities, not perfectly calibrated absolute values.

**Failure Modes / Tradeoffs**
- **Strengths**: Extremely fast, requires little training data, and works remarkably well on sparse, high-dimensional data (like text classification).
- **Weaknesses**: The independence assumption can lead to poorly calibrated probability outputs. Cannot capture feature interactions.

**Interview-Ready Explanation**
> Naive Bayes uses Bayes' theorem to predict class probabilities, making the 'naive' assumption that all features are independent given the class. While this assumption is almost always false, it still achieves accurate classification rankings, making it very effective for high-dimensional sparse data like text.

---

### [CARD: SVM Margin and Support Vectors]
<!-- id: d06-svm-margin-and-support-vectors -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** svm, classification, margins
**Core Concept**

Support Vector Machines (SVM) find the hyperplane that separates classes with the maximum margin (the largest possible distance to the nearest points of each class).

**Mental Model / Mechanics**
- **Support Vectors**: These are the data points closest to the decision boundary. They are the *only* points that dictate where the boundary sits. The rest of the training data does not affect the boundary.
- **Why maximize?**: A wider margin acts as a built-in regularization, leading to better generalization on unseen data.

**Failure Modes / Tradeoffs**
- Needs feature scaling because it is a margin/distance-based method.
- Memory efficient since only support vectors are retained.

**Interview-Ready Explanation**
> An SVM finds the decision boundary that maximizes the margin between classes. The boundary is entirely determined by the support vectors—the data points closest to the margin. Maximizing this distance provides built-in regularization for better generalization.

---

### [CARD: SVM C Parameter]
<!-- id: d06-svm-c-parameter -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** svm, regularization, hyperparameters
**Core Concept**

The `C` parameter in SVM controls the penalty for misclassified points (the "soft margin").

**Mental Model / Mechanics**
- **Large C**: Heavy penalty for misclassification. The model will choose a narrower margin to get more points classified correctly (lower bias, higher variance).
- **Small C**: Tolerates misclassification. The model prefers a wider, smoother margin even if some points are on the wrong side (higher bias, lower variance).
- `C` is conceptually the inverse of regularization strength `λ`.

**Interview-Ready Explanation**
> The C parameter in an SVM controls the tradeoff between a wide margin and correct classification. A small C allows more misclassifications for a wider, more robust margin, while a large C strictly penalizes errors, leading to a narrower margin that might overfit.

---

### [CARD: SVM Kernel Trick]
<!-- id: d06-svm-kernel-trick -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** svm, kernels, non-linear
**Core Concept**

The kernel trick allows SVMs to find non-linear decision boundaries by implicitly operating as if the data had been mapped into a higher-dimensional space where it is linearly separable.

**Mental Model / Mechanics**
The math of the SVM only requires the dot product between data points. A kernel function computes this dot product directly in the higher-dimensional space without ever explicitly transforming the data.
- Common kernels: Linear, Polynomial, and RBF/Gaussian (the default for non-linear).

**Failure Modes / Tradeoffs**
- Doesn't scale well to very large datasets (training time grows quadratically/cubically).
- Highly sensitive to the choice of kernel and its hyperparameters.

**Interview-Ready Explanation**
> The kernel trick allows SVMs to solve non-linear problems without explicitly transforming data. It uses a kernel function to compute the dot products of points in an implicitly higher-dimensional space where the classes become linearly separable.

---

## Key Connections
- **Day 2 (bias-variance, regularization)**: Bagging/RF = variance reduction; Boosting = bias reduction; SVM's C is conceptually the inverse of λ; XGBoost uses L1/L2 leaf penalties.
- **Day 3 (gradient descent)**: Gradient boosting IS gradient descent, operating in function space.
- **Day 4 (calibration)**: Naive Bayes and SVM can both have highly distorted probability outputs.
- **Day 5 (preprocessing)**: k-NN and SVM require strict feature scaling; tree-based models don't. The curse of dimensionality implies you might run PCA before k-NN. XGBoost natively handles missing values.
- **Forward**: k-NN's computational bottleneck reappears in production vector search (RAG) on Day 14, requiring approximate nearest-neighbor indexes (KD-tree/HNSW).

---

## Common Misconceptions
1. **"Random Forest can't overfit."** — It is much more resistant than a single tree, but it absolutely still can overfit, especially with very noisy labels.
2. **"Boosting is always better than Random Forest."** — Boosting aggressively tries to correct every error, including noise, making it more prone to overfitting. Random Forest is often easier to tune for solid out-of-the-box performance.
3. **"k-NN needs no training so it's simple in production."** — Because prediction requires comparing against the whole dataset, it is extremely expensive and memory-heavy in production, requiring specialized indexes.
4. **"Naive Bayes is a bad model because the independence assumption is false."** — The assumption being empirically false doesn't ruin the model; classification only needs relative ranking to be correct.
5. **"SVM's decision boundary depends on all training points."** — It strictly depends *only* on the support vectors.
6. **"Gini and entropy give meaningfully different trees."** — They almost always produce very similar trees in practice; Gini is just computationally cheaper.

---

## Out of Scope
- Deriving Gini/entropy/information-gain from information theory.
- Cost-complexity pruning's exact mathematical formulation.
- XGBoost's full regularized objective or second-order boosting math.
- Kernel trick's formal Hilbert-space justification (Mercer's theorem).
- KD-tree / ball-tree exact algorithmic complexity.
- SMO algorithm mechanics.

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d06-qa-001]
**Question:** How does a decision tree determine the best feature and threshold to split on at a given node?
**Answer:** It evaluates all candidate splits and chooses the one that maximizes the "purity" of the resulting child nodes, typically measured by minimizing Gini impurity or maximizing Information Gain (entropy).
**Tags:** decision-trees, purity
**Linked Cards:** d06-decision-tree-split-selection

#### [QA: d06-qa-002]
**Question:** Why does a Random Forest generalize better than a single unpruned decision tree?
**Answer:** An unpruned tree has high variance and memorizes the data. Random Forest uses bagging to average many such trees trained on bootstrap samples, which cancels out uncorrelated noise and significantly reduces variance.
**Tags:** random-forest, variance-reduction
**Linked Cards:** d06-random-forest, d06-bagging

#### [QA: d06-qa-003]
**Question:** What is the fundamental difference in the goals of Bagging versus Boosting?
**Answer:** Bagging trains independent, high-variance models in parallel to reduce variance. Boosting trains weak models sequentially, where each model corrects the errors of the previous one, primarily to reduce bias.
**Tags:** ensembles, bias-variance
**Linked Cards:** d06-bagging-vs-boosting

#### [QA: d06-qa-004]
**Question:** Why is feature scaling strictly required for k-NN but not for Decision Trees?
**Answer:** k-NN relies entirely on distance metrics (like Euclidean) to find neighbors, meaning unscaled features with large ranges will dominate the calculation. Trees split on single-feature thresholds independently, so the scale of the feature doesn't affect the split point.
**Tags:** knn, scaling, decision-trees
**Linked Cards:** d06-k-nearest-neighbors, d06-decision-trees

#### [QA: d06-qa-005]
**Question:** If the feature independence assumption of Naive Bayes is almost never true in the real world, why does the model still perform well for classification?
**Answer:** Classification only requires the relative ranking of class probabilities to be correct to make the right prediction, not the absolute perfectly calibrated probability values.
**Tags:** naive-bayes, assumptions
**Linked Cards:** d06-naive-bayes

#### [QA: d06-qa-006]
**Question:** How does decreasing the `C` parameter in an SVM affect the margin and the model's bias-variance tradeoff?
**Answer:** Decreasing `C` makes the model more tolerant of misclassifications, resulting in a wider, smoother margin. This increases the model's bias but lowers its variance, preventing overfitting.
**Tags:** svm, hyperparameters, bias-variance
**Linked Cards:** d06-svm-c-parameter

#### [QA: d06-qa-007]
**Question:** What is the "Kernel Trick" in SVMs, and why is it useful?
**Answer:** It allows the SVM to find non-linear decision boundaries by computing dot products in a higher-dimensional space without ever explicitly transforming the data into that space, saving massive computational cost.
**Tags:** svm, kernels
**Linked Cards:** d06-svm-kernel-trick

#### [QA: d06-qa-008]
**Question:** What specific mechanisms make XGBoost/LightGBM superior to standard Gradient Boosting in production?
**Answer:** They include L1/L2 regularization on leaf weights, use second-order gradients (Hessians) for better updates, natively handle missing values, and use highly efficient, parallelized histogram-based split finding.
**Tags:** xgboost, lightgbm
**Linked Cards:** d06-xgboost-lightgbm

<!-- QA_END -->
