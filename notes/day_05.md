---
day: 5
title: "Preprocessing & Feature Engineering"
topics:
  - preprocessing
  - scaling
  - encoding
  - missing-values
  - outliers
  - feature-selection
  - pca
  - dimensionality-reduction
tags:
  - preprocessing
  - feature-engineering
priority_distribution:
  must_know: 6
  should_know: 3
  nice_to_know: 0
---

# DAY 5 — Preprocessing & Feature Engineering

## Daily Objective
Explain why raw data almost never goes straight into a model, when scaling matters and when it doesn't, how to handle categorical variables and missing values without introducing bugs or leakage, how to think about outliers as either noise or signal depending on the problem, the difference between filter/wrapper/embedded feature selection, and PCA — what it does, why it works, and when to reach for it. Last "gets a model ready to train" topic before classical algorithms (Day 6) and unsupervised + pipeline (Day 7).

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Why preprocessing matters, normalization vs standardization (and which algorithms need it), one-hot encoding, missing value strategies, outlier handling basics, PCA concept and when to use it, the preprocessing-leakage discipline, choosing the right metric for encoding
- 🟡 **SHOULD KNOW:** Label/ordinal/target encoding, IQR and z-score outlier detection, filter vs wrapper vs embedded feature selection, explained variance in PCA
- 🟢 **NICE TO KNOW:** Missingness taxonomy (MCAR/MAR/MNAR), KNN imputation / MICE, t-SNE / UMAP as PCA alternatives

---

## Knowledge Cards

---

### [CARD: Why Preprocessing Matters]
<!-- id: d05-why-preprocessing-matters -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** preprocessing, feature-engineering, data-leakage
**Core Concept**

Models consume numbers in a specific shape, scale, and distribution — not raw data. Preprocessing transforms raw data into a form the model can consume correctly.
**Why It Matters**

Two recurring failure modes: (1) the model literally can't consume the data (string category into a linear model), and (2) the model consumes it but learns something distorted (a feature on 0–1,000,000 dominating one on 0–1 purely due to units, not importance).
**Mental Model / Mechanics**
  ```
  Raw data → Cleaning → Encoding → Scaling → Feature selection/reduction → Model
  ```
  Preprocessing is also where data leakage most commonly sneaks in. Every transform must be fit on training data only.
**Failure Modes / Tradeoffs**
  - Preprocessing decisions are invisible in your final metrics — until they're the reason your metrics are wrong
  - Interviewers probe this area specifically because it separates practitioners from textbook learners
**Interview-Ready Explanation**
  > Models don't consume raw data — they consume numbers in a specific shape, scale, and distribution. Preprocessing transforms data so the model can learn correctly, and it's where most silent bugs and leakage actually originate.

---

### [CARD: Normalization vs Standardization]
<!-- id: d05-normalization-vs-standardization -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** normalization, standardization, scaling
**Core Concept**

**Normalization (Min-Max):** rescales to [0,1] via `x' = (x - min) / (max - min)`. **Standardization (Z-score):** centers at mean 0, std 1 via `x' = (x - mean) / std`.
**Why It Matters**

Distance-based and gradient-based models need features on comparable scales to work correctly. The choice between the two depends on outlier sensitivity.
**Mental Model / Mechanics**
  ```
  Normalization (Min-Max):
    x' = (x - min) / (max - min)
    → Fixed range [0, 1]
    → Sensitive to outliers (one extreme stretches the whole range)

  Standardization (Z-score):
    x' = (x - mean) / std
    → Mean 0, std 1
    → No bounded range, but more robust to moderate outliers
  ```

  **Which algorithms need scaling?**

  | Needs scaling | Doesn't need scaling |
  |---|---|
  | k-NN (distance-based) | Decision trees |
  | SVM (distance/margin-based) | Random forest |
  | Linear/logistic regression (esp. with regularization) | Gradient boosting / XGBoost |
  | Neural networks (gradient descent convergence) | Naive Bayes (mostly) |
  | K-means, PCA | |

  **Why tree-based models don't care:** A tree splits on `feature > threshold`. That decision doesn't change whether `feature` is in meters or kilometers — the *ordering* of values is what matters, not their scale.

  **Why distance/gradient-based models do care:** k-NN computes Euclidean distance — a feature on 0–1,000,000 dominates regardless of actual predictive value. Gradient descent converges faster when features are on comparable scales (badly-scaled features distort the loss landscape into a narrow, elongated valley).
**Example**
  ```python
  from sklearn.preprocessing import StandardScaler, MinMaxScaler

  # FIT ON TRAIN ONLY — apply to val/test with same parameters
  scaler = StandardScaler()
  X_train_scaled = scaler.fit_transform(X_train)
  X_val_scaled = scaler.transform(X_val)      # uses train's mean/std
  X_test_scaled = scaler.transform(X_test)     # uses train's mean/std
  ```
**Failure Modes / Tradeoffs**
  - **Leakage rule:** Fit scaler on TRAIN ONLY → apply those same train-derived stats to val and test
  - Min-max is sensitive to outliers; z-score is more robust but unbounded
  - Tree-based models are scale-invariant — scaling them is unnecessary (and can hurt interpretability)
**Interview-Ready Explanation**
  > Scaling matters for distance-based and gradient-based models — k-NN, SVM, linear models, neural networks — because feature magnitude directly affects distance calculations or gradient step sizes. Tree-based models split on thresholds, so scale doesn't change the split decision, and they're scale-invariant.

---

### [CARD: One-Hot Encoding]
<!-- id: d05-one-hot-encoding -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** encoding, one-hot, categorical
**Core Concept**

Each category becomes its own binary column. Used when categories have **no inherent order** (region, device type, processor ID).
**Why It Matters**

Most models expect numeric input. One-hot encoding converts unordered categories into a numerically safe representation without implying any false ordering.
**Mental Model / Mechanics**
  ```
  region        →  region_north  region_south  region_east
  "north"            1              0             0
  "south"            0              1             0
  "east"             0              0             1
  ```
**Failure Modes / Tradeoffs**
  - High-cardinality categories (thousands of unique IDs) explode into thousands of sparse columns — the "curse of dimensionality" in miniature
  - Safe for correctness, but not always practical at scale
**Interview-Ready Explanation**
  > One-hot encoding is safe for unordered categories — no false ordering implied — but it explodes dimensionality at high cardinality. For high-cardinality features, consider target encoding or embeddings instead.

---

### [CARD: Label / Ordinal Encoding]
<!-- id: d05-label-ordinal-encoding -->

- **Priority:** should_know
- **Category:** ml-theory
- **Tags:** encoding, label-encoding, ordinal-encoding, categorical
**Core Concept**

Assign each category an integer. **Only appropriate when categories have a genuine order** (low/medium/high, never/sometimes/always).
**Why It Matters**

Compact numeric representation for ordinal categories. Avoids the dimensionality explosion of one-hot.
**Mental Model / Mechanics**
  ```
  priority: low=0, medium=1, high=2     ← genuine order → VALID

  region: north=0, south=1, east=2      ← no order → INVALID
  (silently tells the model "east > north", which is meaningless)
  ```
**Failure Modes / Tradeoffs**
  - Using label encoding on unordered categories implies a false numeric relationship that can actively mislead linear/distance-based models
  - Tree-based models are somewhat more tolerant (they can split on any threshold), but it's still conceptually wrong
**Interview-Ready Explanation**
  > Label encoding is only valid for genuinely ordinal categories. Using it on nominal categories implies a false ordering that can mislead the model.

---

### [CARD: Target / Mean Encoding]
<!-- id: d05-target-mean-encoding -->

- **Priority:** should_know
- **Category:** ml-theory
- **Tags:** encoding, target-encoding, mean-encoding, categorical, data-leakage
**Core Concept**

Replace a category with the average target value for that category (e.g., replace `processor_id` with its historical failure rate). Powerful for high-cardinality features, but a well-known **leakage trap**.
**Why It Matters**

Handles high-cardinality categories without dimensionality explosion. Captures the relationship between a category and the target directly.
**Mental Model / Mechanics**
  ```
  processor_id → average failure rate for that processor

  Leakage risk: if computed on the entire dataset (including the row
  being encoded), it leaks the label directly into the feature.

  Safe: compute strictly within cross-validation folds —
        each row's encoding uses only OTHER rows' target values.
  ```
  This connects directly to data leakage discussions.
**Failure Modes / Tradeoffs**
  - Classic leakage trap — requires careful cross-validation-based computation
  - Can overfit to categories with few samples (regularization/smoothing helps)
**Interview-Ready Explanation**
  > Target encoding handles high cardinality well but is a classic leakage trap if not computed strictly within cross-validation folds. The encoding must never include the current row's target value.

---

### [CARD: Missing Values]
<!-- id: d05-missing-values -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** missing-values, imputation, data-cleaning
**Core Concept**

Strategies for handling absent data: deletion, imputation (mean/median/mode/model-based), and missingness indicators. The choice depends on **why** the data is missing.
**Why It Matters**

Real-world data almost always has gaps. Naive handling destroys signal or introduces bias.
**Mental Model / Mechanics**
  **Deletion:**
  - Drop rows with missing values — simple but loses data; biases if missingness isn't random
  - Drop columns with excessive missingness — reasonable when a feature is mostly empty

  **Imputation:**
  - Mean/median for numeric (median more robust to outliers)
  - Mode for categorical
  - Forward-fill / backward-fill for time-series
  - Model-based imputation (predict missing from other features)

  **Missingness indicator:**
  ```
  raw:     latency = [42, NaN, 55]
  imputed: latency = [42, 48.5, 55]      (median-filled)
  flag:    latency_missing = [0, 1, 0]    (preserves the signal)
  ```
  Useful when missingness itself is predictive (MNAR case) — the model can learn from the fact of absence, not just the filled-in value.

  **Missingness taxonomy:**
  - MCAR: missingness unrelated to anything
  - MAR: missingness related to other observed features
  - MNAR: missingness related to the missing value itself (e.g., high-income people declining to report) — the dangerous case where naive imputation destroys signal
**Failure Modes / Tradeoffs**
  - Don't reflexively mean-impute — consider *why* the data is missing
  - MNAR cases carry real signal in the fact of absence
  - Imputation parameters (mean, median) must be computed on training data only (leakage rule)
**Interview-Ready Explanation**
  > Missing values should be handled based on why they're missing, not just filled reflexively. If missingness itself might be predictive, add an indicator flag rather than only imputing — otherwise you can silently destroy signal.

---

### [CARD: Outliers]
<!-- id: d05-outliers -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** outliers, data-cleaning, anomaly-detection
**Core Concept**

Extreme values that may represent either data-quality errors (noise) or genuine rare events (signal). The handling strategy depends entirely on this distinction.
**Why It Matters**

Outliers can dominate distance calculations, inflate mean-based statistics, and distort model training — or they can be exactly the signal you need.
**Mental Model / Mechanics**
  **Detection:**
  ```
  IQR method: flag outside [Q1 - 1.5×IQR, Q3 + 1.5×IQR]
    → Robust (based on quartiles, not mean/std)

  Z-score method: flag |z| > 3
    → Less robust (the outlier itself inflates mean/std)
  ```

  **Handling:**
  - **Removal** — only when confident it's a data-quality error (sensor glitch, entry mistake)
  - **Capping / winsorizing** — clip at a percentile (e.g., 99th) rather than deleting
  - **Transformation** — log-transform heavily right-skewed features (income, transaction amounts) to compress extreme values

  **The critical judgment call:**
  - House prices? A ₹500Cr mansion in a ₹50L–₹2Cr dataset is a legitimate rare point
  - Fraud / outage detection? **The outliers ARE the positive class.** Removing them deletes the exact examples the model needs to learn from.
**Failure Modes / Tradeoffs**
  - Always decide whether the outlier is noise or signal BEFORE choosing a handling strategy
  - In anomaly-detection problems, aggressively "cleaning" outliers removes the thing you're modeling
**Interview-Ready Explanation**
  > Before handling an outlier, decide whether it represents noise (a data-quality issue) or signal (a genuine rare event). In fraud or anomaly-detection problems, the outliers often ARE the label you're trying to predict — removing them removes the thing you're modeling.

---

### [CARD: Feature Selection — Filter, Wrapper, Embedded]
<!-- id: d05-feature-selection -->

- **Priority:** should_know
- **Category:** ml-theory
- **Tags:** feature-selection, dimensionality-reduction, regularization
**Core Concept**

Three families of methods for choosing which features to keep. **Filter:** score features independently. **Wrapper:** retrain on subsets. **Embedded:** selection happens during training itself (e.g., L1/Lasso, tree importances).
**Why It Matters**

Irrelevant/redundant features add variance (overfitting risk), slow training, hurt interpretability, and dilute distance-based models. "The model can just ignore them" is theoretically true but practically wrong.
**Mental Model / Mechanics**
  ```
  Filter   → score features independently, pick top-K
             (fast, model-agnostic, ignores interactions)
             Methods: correlation, chi-square, mutual information

  Wrapper  → retrain repeatedly on different subsets, keep best
             (slow, captures interactions)
             Methods: Recursive Feature Elimination (RFE)

  Embedded → selection happens AS PART of training
             (efficient, model-specific)
             Methods: L1/Lasso (drives coefficients to zero = feature selection),
                      tree-based feature importances
  ```
  Lasso/L1 regularization is essentially an embedded feature selection method.
**Failure Modes / Tradeoffs**
  - Filter methods are fast but miss feature interactions
  - Wrapper methods capture interactions but are computationally expensive
  - Embedded methods are efficient but tied to a specific model type
  - "More features is always better" is false — extra features add variance and overfitting risk
**Interview-Ready Explanation**
  > Filter methods score features independently (fast, ignores interactions). Wrapper methods retrain on subsets (slow, captures interactions). Embedded methods select during training itself — Lasso driving coefficients to zero is feature selection integrated into model training.

---

### [CARD: PCA — Principal Component Analysis]
<!-- id: d05-pca -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** pca, dimensionality-reduction, feature-engineering
**Core Concept**

PCA finds new orthogonal axes (principal components) that are linear combinations of original features, ordered by how much variance each explains. Used for dimensionality reduction, multicollinearity removal, and visualization.
**Why It Matters**

The **curse of dimensionality** — data becomes sparse in high-dimensional space, distance-based methods degrade, correlated features make models unstable, and visualization beyond 3D is impossible.
**Mental Model / Mechanics**
  ```
  Original features: x1, x2, x3, ..., x50
          ↓ PCA
  Principal components: PC1, PC2, PC3, ...
          (ordered by variance explained)

  Core idea:
  1. PC1 captures MAXIMUM variance in the data
  2. Each subsequent PC captures maximum REMAINING variance
  3. All PCs are ORTHOGONAL (uncorrelated) to each other

  Why maximize variance?
  → Directions with high variance carry more information
  → Directions where data looks identical tell you nothing about
     what distinguishes one example from another
  ```

  **Explained variance:**
  ```
  PC1 = 62%, PC2 = 21%, PC3 = 9%, ...
  Keep enough components for target cumulative variance (e.g., 95%)
  → Reduce 50 features to ~8 components while retaining most information
  ```
**Failure Modes / Tradeoffs**
  - **Gains:** fewer dimensions → faster training, less overfitting, removes multicollinearity, enables visualization
  - **Interpretability loss:** PC1 = `0.4×latency + 0.3×packet_loss - 0.2×uptime + ...` — "what does PC1 mean?" is hard to explain to a stakeholder
  - **Scale-sensitive:** PCA is variance-based, so you MUST standardize first — otherwise a feature with larger units dominates due to scale, not information
  - **Linear only:** PCA finds linear combinations; won't capture nonlinear structure (t-SNE/UMAP are nonlinear alternatives, mainly for visualization)
**Interview-Ready Explanation**
  > PCA finds orthogonal directions that maximize captured variance, letting you compress many correlated features into fewer components while retaining most of the information. The tradeoff is interpretability — principal components are linear blends of the original features, not features you can explain individually — and PCA requires standardized inputs since it's inherently scale-sensitive.

---

## Key Connections

```
Day 2 (regularization/leakage):
  ├─→ L1/Lasso reappears as "embedded" feature selection
  └─→ "fit only on train" rule applies to scalers AND target encoding

Day 3/4 (loss/metrics):
  └─→ Bad preprocessing → distorted feature distributions →
      harder optimization landscape → worse loss convergence →
      misleading metrics that look like a "model problem"
      but are actually a data problem

Day 6 (classical algorithms — next):
  └─→ "Does this algorithm need scaling?" table is the exact question
      you'll re-apply to every algorithm covered next
```

**One-sentence version:** Preprocessing decisions are invisible in your final metrics until they're the reason your metrics are wrong — which is exactly why interviewers probe this area so often.

---

## Common Misconceptions

- **Myth:** "Scaling always helps, so just do it by default."
  **Reality:** Unnecessary (and sometimes counterproductive for interpretability) on tree-based models. Know *why* it doesn't matter there rather than cargo-culting it.

- **Myth:** "One-hot encoding is always the safe default for categoricals."
  **Reality:** Safe for correctness, but high-cardinality features can blow up dimensionality — that's when target/embedding-based encodings become relevant.

- **Myth:** "Missing values should just be dropped or mean-imputed."
  **Reality:** Only reasonable once you've considered *why* they're missing. MNAR cases can carry real signal that naive imputation destroys.

- **Myth:** "Outliers should generally be removed."
  **Reality:** Depends entirely on the problem. In anomaly-detection contexts, removing outliers removes the exact examples you're trying to learn to detect.

- **Myth:** "PCA is just for visualization."
  **Reality:** Visualization is one use case, but PCA is a general-purpose dimensionality-reduction and multicollinearity-mitigation technique.

- **Myth:** "More features is always better since the model can just ignore irrelevant ones."
  **Reality:** Extra features add variance and overfitting risk — the same bias-variance logic applied to feature count, not just model complexity.

---

## Out of Scope
- Formal MCAR/MAR/MNAR statistical tests
- KNN imputation / MICE algorithm internals
- t-SNE / UMAP mechanics (know they exist as nonlinear PCA alternatives)
- Eigenvalue/eigenvector derivation of PCA (know the variance-maximization intuition, not the linear algebra proof)
- Exact chi-square / mutual-information formulas for filter-method feature selection

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d05-qa-001]
**Question:** Why do tree-based models not need feature scaling, while k-NN does?
**Answer:** Tree-based models split on `feature > threshold` — the ordering of values is what matters, not their scale. k-NN computes Euclidean distance, so a feature on a 0–1,000,000 scale dominates the distance calculation regardless of actual predictive value.
**Tags:** scaling, trees, k-nn
**Linked Cards:** d05-normalization-vs-standardization

#### [QA: d05-qa-002]
**Question:** What's the formula difference between normalization and standardization, and which is more outlier-robust?
**Answer:** Normalization (min-max): `x' = (x - min) / (max - min)` — rescales to [0,1], sensitive to outliers. Standardization (z-score): `x' = (x - mean) / std` — centers at mean 0, std 1, more robust to moderate outliers because one extreme value doesn't compress the entire range.
**Tags:** normalization, standardization, scaling
**Linked Cards:** d05-normalization-vs-standardization

#### [QA: d05-qa-003]
**Question:** Why is fitting a scaler on the full dataset (before splitting) a leakage bug?
**Answer:** It lets test-set statistics (mean, std, min, max) influence the training distribution. The scaler must be fit on training data only, then those exact parameters are reused to transform validation and test sets.
**Tags:** scaling, data-leakage
**Linked Cards:** d05-normalization-vs-standardization

#### [QA: d05-qa-004]
**Question:** When is label encoding actively wrong to use?
**Answer:** When categories have no inherent order. Assigning `north=0, south=1, east=2` implies "east > north," which is meaningless and can mislead models that treat the numeric value as continuous.
**Tags:** encoding, label-encoding, categorical
**Linked Cards:** d05-label-ordinal-encoding

#### [QA: d05-qa-005]
**Question:** What's the risk with naive target encoding, and how does it connect to data leakage?
**Answer:** If computed on the entire dataset (including the row being encoded), it leaks the target label directly into the feature — a form of data leakage. Must be computed strictly within cross-validation folds where each row's encoding uses only other rows' target values.
**Tags:** encoding, target-encoding, data-leakage
**Linked Cards:** d05-target-mean-encoding

#### [QA: d05-qa-006]
**Question:** Name two strategies for handling missing values and when each applies.
**Answer:** (1) Median imputation — when data is missing randomly and you need a simple robust fill. (2) Missingness indicator flag — when the fact of absence itself might be predictive (MNAR), preserving the signal that data was missing rather than just filling it.
**Tags:** missing-values, imputation, data-cleaning
**Linked Cards:** d05-missing-values

#### [QA: d05-qa-007]
**Question:** Why would you add a "missingness indicator" flag instead of only imputing?
**Answer:** When missingness itself is informative (MNAR case). For example, if high-income people decline to report income, the fact of absence carries signal about the value. The indicator lets the model learn from the pattern of missingness, not just the imputed value.
**Tags:** missing-values, imputation
**Linked Cards:** d05-missing-values

#### [QA: d05-qa-008]
**Question:** Give an example where removing an outlier would be a mistake.
**Answer:** In fraud detection or network-outage prediction, the outliers (extreme transaction amounts, unusual telemetry spikes) often ARE the positive class you're trying to predict. Removing them deletes the exact examples the model needs to learn from.
**Tags:** outliers, anomaly-detection
**Linked Cards:** d05-outliers

#### [QA: d05-qa-009]
**Question:** What's the difference between filter, wrapper, and embedded feature selection?
**Answer:** Filter: score features independently of any model (fast, ignores interactions). Wrapper: retrain repeatedly on different subsets, keep the best (slow, captures interactions). Embedded: selection happens during training itself — e.g., Lasso driving coefficients to zero, tree-based importances.
**Tags:** feature-selection
**Linked Cards:** d05-feature-selection

#### [QA: d05-qa-010]
**Question:** Which feature selection method is L1/Lasso regularization?
**Answer:** L1/Lasso regularization is an embedded method. Lasso drives some coefficients to exactly zero, which is feature selection integrated directly into model training.
**Tags:** feature-selection, regularization, lasso
**Linked Cards:** d05-feature-selection

#### [QA: d05-qa-011]
**Question:** In one sentence, what is PCA actually optimizing for?
**Answer:** PCA finds orthogonal linear combinations of the original features that capture the maximum possible variance in the data, ordered from most to least variance explained.
**Tags:** pca, dimensionality-reduction
**Linked Cards:** d05-pca

#### [QA: d05-qa-012]
**Question:** Why does PCA require standardized input?
**Answer:** PCA is variance-based — it maximizes captured variance. Without standardization, a feature with naturally larger units (e.g., income in dollars vs. age in years) will dominate purely due to scale, not because it carries more information.
**Tags:** pca, scaling, standardization
**Linked Cards:** d05-pca

#### [QA: d05-qa-013]
**Question:** What's the main cost of using PCA, beyond compute?
**Answer:** Interpretability loss. A principal component is a weighted blend of original features (e.g., `PC1 = 0.4×latency + 0.3×packet_loss - 0.2×uptime`), so explaining "what matters" to a stakeholder becomes much harder than pointing to individual features.
**Tags:** pca, interpretability
**Linked Cards:** d05-pca

#### [QA: d05-qa-014]
**Question:** What is the explained variance ratio in PCA, and how is it used?
**Answer:** Each principal component has an explained variance ratio (e.g., PC1=62%, PC2=21%). You keep enough components to reach a target cumulative variance (e.g., 95%), reducing 50 features to perhaps 8 components while retaining most information.
**Tags:** pca, variance
**Linked Cards:** d05-pca

#### [QA: d05-qa-015]
**Question:** Why is "more features is always better" wrong?
**Answer:** Extra features add variance and overfitting risk (bias-variance tradeoff applied to feature count). Irrelevant features give the model more opportunity to fit noise, slow training, and can dilute distance-based models.
**Tags:** feature-selection, bias-variance
**Linked Cards:** d05-feature-selection

#### [QA: d05-qa-016]
**Question:** Name the algorithms that need scaling and those that don't.
**Answer:** Need scaling: k-NN, SVM, linear/logistic regression (esp. with regularization), neural networks, K-means, PCA. Don't need scaling: decision trees, random forest, gradient boosting/XGBoost, Naive Bayes.
**Tags:** scaling, algorithms
**Linked Cards:** d05-normalization-vs-standardization
<!-- QA_END -->
