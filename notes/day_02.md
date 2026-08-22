---
day: 2
title: "Supervised Learning, Data Splits, Generalization & Regularization"
topics:
  - supervised-learning
  - regularization
  - cross-validation
  - data-leakage
  - bias-variance
  - l1
  - l2
  - ridge
  - lasso
tags:
  - supervised-learning
  - ml-theory
priority_distribution:
  must_know: 24
  should_know: 2
  nice_to_know: 0
---

# DAY 2 — Supervised Learning, Data Splits, Generalization & Regularization

## Daily Objective
Explain supervised ML problem formulation, the relationship between features/labels/models/parameters/predictions/loss, training/validation/test sets, generalization from first principles, underfitting/overfitting, bias–variance tradeoff, model complexity effects, regularization (L1, L2, Ridge, Lasso, Elastic Net), data leakage and its forms, cross-validation, and stratified cross-validation.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Supervised learning formulation, features vs labels, parameters vs hyperparameters, train/val/test sets, generalization, overfitting/underfitting, bias/variance, model complexity, regularization, L1 vs L2, data leakage (target, preprocessing, feature engineering, time-series), cross-validation, stratified cross-validation
- 🟡 **SHOULD KNOW:** Ridge vs Lasso vs Elastic Net, validation curves, nested cross-validation conceptually, why regularization can increase bias while reducing variance
- 🟢 **NICE TO KNOW:** Detailed statistical learning theory, VC dimension, formal proofs of generalization bounds, mathematical derivations of regularization penalties

---

## Knowledge Cards

---

### [CARD: The Supervised Learning Problem]
<!-- id: d02-the-supervised-learning-problem -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** the-supervised-learning-problem, ml-theory
**Core Concept**

Given input features X and target labels y, supervised learning finds a function `f(X) ≈ y` that maps inputs to useful predictions.
**Why It Matters**

Formalizes the predictive modeling task — from raw data to a learned mapping.
**Mental Model / Mechanics**
```
  X → input features (e.g., CPU util, packet loss, latency)
  y → target label (e.g., 0=normal, 1=outage)

  Learning process finds: f(X) → ŷ
  where ŷ is the model's prediction
  ```
**Interview-Ready Explanation**
> Supervised learning takes labeled examples (X, y) and learns a function that maps features to predictions. The quality of that mapping is measured by a loss function.

---

### [CARD: The Training Loop]
<!-- id: d02-the-training-loop -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** the-training-loop, ml-theory
**Core Concept**

The iterative process of feeding data through a model, computing loss, and updating parameters to reduce that loss.
**Why It Matters**

This is the fundamental mechanism by which all ML models learn.
**Mental Model / Mechanics**
```
  Training data → Features X → Model → Prediction ŷ
       ↓
  Compare ŷ with y → Loss → Optimization → Update parameters → Repeat
  ```
  Example flow:
  ```
  X = network telemetry
  Model predicts: ŷ = 0.83 (probability of failure)
  Actual: y = 1
  Calculate loss → Adjust parameters → Better predictions next iteration
  ```
**Interview-Ready Explanation**
> During training, data flows through the model to produce predictions, which are compared with actual labels via a loss function. The optimizer adjusts parameters to reduce this loss, and the process repeats until convergence.

---

### [CARD: Parameters vs Hyperparameters (Deep Dive)]
<!-- id: d02-parameters-vs-hyperparameters -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** parameters-vs-hyperparameters, ml-theory
**Core Concept**

**Parameters** are adjusted by the optimizer during training. **Hyperparameters** are set before training and control the learning process itself.
**Why It Matters**

Clarifies what the model learns vs. what the practitioner configures.
**Mental Model / Mechanics**
```
  Parameters (learned by optimizer):
    ŷ = w₁x₁ + w₂x₂ + b
    → w₁, w₂, b change during training

  Hyperparameters (set externally):
    learning_rate = 0.001
    → NOT changed by gradient descent
    → You choose it and evaluate whether it works
  ```
**Interview-Ready Explanation**
> Parameters are learned from data during training (weights, biases). Hyperparameters control the training process and are selected externally (learning rate, batch size, regularization strength).

---

### [CARD: Training, Validation and Test Sets (Deep Dive)]
<!-- id: d02-training-validation-and-test-sets -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** training-validation-and-test-sets, ml-theory
**Core Concept**

A three-way data split that separates learning, model selection, and final evaluation into independent stages.
**Why It Matters**

Prevents overly optimistic evaluation and ensures the final performance estimate is unbiased.
**Mental Model / Mechanics**
```
              Dataset
                 │
     ┌───────────┼───────────┐
     ↓           ↓           ↓
  Training   Validation     Test
     │           │           │
     ↓           ↓           ↓
  Learn      Tune/model    Final
  parameters  selection    evaluation
  ```
  **Training set:** Learn model parameters (X_train, y_train)
  **Validation set:** Make development decisions — which hyperparameters, which model, when to stop
  **Test set:** Final estimate on genuinely unseen data. Should NOT influence model development.
**Failure Modes / Tradeoffs**
- Repeatedly inspecting test performance and changing the model turns the test set into a validation set
  - The test set must remain untouched until final evaluation
**Interview-Ready Explanation**
> Training data learns parameters. Validation data guides model/hyperparameter selection during development. The test set is reserved for a single final evaluation and must not influence development decisions.

---

### [CARD: Why We Need a Test Set]
<!-- id: d02-why-we-need-a-test-set -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** why-we-need-a-test-set, ml-theory
**Core Concept**

After evaluating many models against validation data, the best-performing one may appear strong partly due to repeated optimization against that data. A held-out test set provides an independent final check.
**Why It Matters**

The validation score becomes optimistically biased after repeated model selection. The test set corrects for this.
**Mental Model / Mechanics**
```
  Build 100 models → Evaluate all on validation → Pick best
  → Validation score is likely optimistic (selected for)
  → Test set gives unbiased final performance estimate
  ```
**Interview-Ready Explanation**
> After repeated optimization against validation data, the validation score becomes optimistic. A held-out test set provides a genuinely unbiased final performance estimate.

---

### [CARD: Generalization (Deep Dive)]
<!-- id: d02-generalization -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** generalization, ml-theory
**Core Concept**

The ability to perform well on unseen examples from the same underlying problem distribution, not just memorized training data.
**Why It Matters**

This is arguably the central objective of supervised machine learning.
**Mental Model / Mechanics**
```
  Model A: Train acc=99.8%, Val acc=72% → Poor generalization
  Model B: Train acc=94%,  Val acc=91% → Good generalization

  Model B is generally more desirable.
  ```
  The purpose of the model is not to perform well on examples it has already seen — it is to generalize.
**Interview-Ready Explanation**
> Generalization is the ability to perform well on unseen data. A model that memorizes training data is useless in production. We want the gap between training and validation/test performance to be reasonably small.

---

### [CARD: Overfitting (Deep Dive)]
<!-- id: d02-overfitting -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** overfitting, ml-theory
**Core Concept**

The model learns training-specific patterns including noise, random fluctuations, and accidental correlations — performing excellently on training data but poorly on unseen data.
**Why It Matters**

Understanding overfitting is essential for diagnosing and fixing model performance.
**Mental Model / Mechanics**
```
  Training error → very low
  Validation error → high

  Example: Model discovers "whenever this exact machine ID appeared
  in training, a failure occurred." Useless if IDs are arbitrary.
  ```
**Interview-Ready Explanation**
> Overfitting occurs when a model learns training-specific patterns including noise, producing strong training performance but poor generalization. Solutions include more data, regularization, simpler models, early stopping, and dropout.

---

### [CARD: Underfitting (Deep Dive)]
<!-- id: d02-underfitting -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** underfitting, ml-theory
**Core Concept**

The model is too limited to capture important patterns, resulting in poor performance even on training data.
**Why It Matters**

Recognizing underfitting directs you to increase model capacity, improve features, or reduce over-regularization.
**Mental Model / Mechanics**
```
  Training performance → poor
  Validation performance → poor

  Causes: model too simple, poor features, excessive regularization,
          insufficient training, incorrect assumptions about data
  ```
**Interview-Ready Explanation**
> Underfitting occurs when the model is too simple or constrained to capture the underlying patterns, so it performs poorly on both training and unseen data.

---

### [CARD: Model Complexity]
<!-- id: d02-model-complexity -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** model-complexity, ml-theory
**Core Concept**

Model complexity describes how flexible the model is in representing relationships in the data. Increasing complexity reduces bias but increases variance.
**Why It Matters**

Provides the lever for the bias–variance tradeoff.
**Mental Model / Mechanics**
```
  Simple model → limited patterns → high bias, low variance
  Complex model → many patterns → low bias, high variance

  Increasing complexity: Bias ↓, Variance ↑
  ```
**Interview-Ready Explanation**
> Model complexity determines how many patterns the model can represent. More complexity reduces bias but increases variance, creating the fundamental bias–variance tradeoff.

---

### [CARD: Bias (Deep Dive)]
<!-- id: d02-bias -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** bias, ml-theory
**Core Concept**

Systematic error from overly restrictive model assumptions — the model isn't flexible enough to capture the true relationship.
**Why It Matters**

Diagnosing high bias tells you the model needs more capacity or better features.
**Mental Model / Mechanics**
```
  True relationship:      Model fit:
        *                 ────────────
     *     *              (straight line)
   *         *

  The model is too simplistic → high bias → underfitting
  Training error → high, Validation error → high
  ```
**Interview-Ready Explanation**
> Bias is systematic error from overly restrictive model assumptions. "The model can't learn enough." High bias is associated with underfitting — both training and validation errors are high.

---

### [CARD: Variance (Deep Dive)]
<!-- id: d02-variance -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** variance, ml-theory
**Core Concept**

How sensitive the learned model is to the particular training data. A high-variance model changes dramatically with slight data changes.
**Why It Matters**

Diagnosing high variance tells you the model needs regularization, more data, or reduced complexity.
**Mental Model / Mechanics**
```
  "If I slightly changed the training dataset, my model would change dramatically."

  High variance → fits almost every fluctuation in training data
  Training error → very low, Validation error → high → overfitting
  ```
**Interview-Ready Explanation**
> Variance describes sensitivity to the training data. "The model learned too much about this particular training set." High variance is associated with overfitting.

---

### [CARD: Bias–Variance Tradeoff]
<!-- id: d02-bias-variance-tradeoff -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** bias-variance-tradeoff, ml-theory
**Core Concept**

As model complexity increases, bias decreases but variance increases. The optimal model balances both to minimize total generalization error.
**Why It Matters**

Provides the theoretical framework for why there's no free lunch — you must balance flexibility vs. stability.
**Mental Model / Mechanics**
```
  Error
    │
    │\                /
    │ \              /
    │  \____    ____/
    │       \__/
    │
    └────────────────────
          Complexity

  Very simple → High bias, Low variance
  Very complex → Low bias, High variance
  Sweet spot → Between them
  ```
  Increasing flexibility reduces underfitting but eventually increases overfitting.
**Interview-Ready Explanation**
> As model complexity increases, bias decreases and variance increases. The goal is not to minimize either independently but to find the balance that maximizes generalization.

---

### [CARD: Regularization]
<!-- id: d02-regularization -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** regularization, ml-theory
**Core Concept**

A family of techniques that penalize model complexity during training to improve generalization. The training objective becomes: minimize loss + complexity penalty.
**Why It Matters**

Prevents the model from becoming overly complex and overfitting by adding a cost for large/complex parameters.
**Mental Model / Mechanics**
```
  Original objective:     minimize(training loss)
  Regularized objective:  minimize(training loss + λ × complexity penalty)

  Two competing objectives:
    1. Fit the data
    2. Avoid unnecessarily complex parameters
  ```
**Interview-Ready Explanation**
> Regularization modifies the training objective to penalize model complexity. This discourages excessively large or complex parameters and improves generalization.

---

### [CARD: L2 Regularization]
<!-- id: d02-l2-regularization -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** l2-regularization, ml-theory
**Core Concept**

Penalizes the squared magnitude of parameters: `Loss = training_loss + λ Σ w²`. Shrinks weights toward zero without forcing them to exactly zero.
**Why It Matters**

Discourages any single parameter from becoming disproportionately large, producing smoother models.
**Mental Model / Mechanics**
```
  λ small → weak penalty → more model freedom
  λ large → strong penalty → more constrained model

  Example: w₃ = 15.8 → heavily penalized → shrunk toward smaller value
  L2 does NOT usually force weights exactly to zero
  ```
**Interview-Ready Explanation**
> L2 regularization penalizes squared parameter values, shrinking large weights. It produces smoother models but does not force weights exactly to zero. The strength is controlled by λ.

---

### [CARD: Ridge Regression]
<!-- id: d02-ridge-regression -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** ridge-regression, ml-theory
**Core Concept**

Linear regression + L2 regularization. Useful when features are correlated and you want to shrink coefficients without eliminating any.
**Why It Matters**

Standard linear regression can overfit or become unstable with correlated features. Ridge stabilizes the solution.
**Mental Model / Mechanics**
```
  Ridge = Linear Regression + L2 Regularization
  ```
  Useful when: features are correlated, you want regularization without eliminating features.
**Interview-Ready Explanation**
> Ridge regression is linear regression with L2 regularization. It shrinks coefficients toward zero to reduce overfitting, especially useful with correlated features.

---

### [CARD: L1 Regularization]
<!-- id: d02-l1-regularization -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** l1-regularization, ml-theory
**Core Concept**

Penalizes the absolute value of parameters: `Loss = training_loss + λ Σ |w|`. Can push some parameters **exactly to zero**, creating sparse models.
**Why It Matters**

Performs implicit feature selection by zeroing out unimportant feature weights.
**Mental Model / Mechanics**
```
  Before L1: w₁=2.1, w₂=0.7, w₃=0.05, w₄=1.8
  After L1:  w₁=1.8, w₂=0.3, w₃=0,    w₄=1.5

  L1 can create sparse parameter vectors (some weights = 0)
  ```
**Interview-Ready Explanation**
> L1 regularization penalizes the absolute values of parameters and can push some exactly to zero, effectively performing feature selection and creating sparse models.

---

### [CARD: Lasso Regression]
<!-- id: d02-lasso-regression -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** lasso-regression, ml-theory
**Core Concept**

Linear regression + L1 regularization. Can drive coefficients to exactly zero, performing feature selection.
**Why It Matters**

Useful when you have many features and believe only a subset are meaningful.
**Mental Model / Mechanics**
```
  Lasso = Linear Regression + L1 Regularization
  Key consequence: can eliminate features by zeroing their coefficients
  ```
**Interview-Ready Explanation**
> Lasso regression is linear regression with L1 regularization. It can drive some coefficients to exactly zero, effectively performing automatic feature selection.

---

### [CARD: L1 vs L2 Comparison]
<!-- id: d02-l1-vs-l2-comparison -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** l1-vs-l2-comparison, ml-theory
**Core Concept**

L1 penalizes |w| (can zero out weights, sparsity). L2 penalizes w² (shrinks weights, no exact zeros).
**Why It Matters**

Choosing between them depends on whether you want feature selection (L1) or smooth weight shrinkage (L2).
**Mental Model / Mechanics**
| Property              | L1 (Lasso)     | L2 (Ridge)      |
  |-----------------------|----------------|-----------------|
  | Penalty               | Σ\|w\|         | Σw²             |
  | Exact zero weights?   | Yes            | Usually no       |
  | Sparsity              | Encourages     | Less so          |
  | Mental model          | "Remove features" | "Shrink weights" |
**Interview-Ready Explanation**
> L1 penalizes absolute values and can produce exact zero weights (sparsity/feature selection). L2 penalizes squared values and shrinks weights without forcing them to zero. L1 = Lasso, L2 = Ridge.

---

### [CARD: Elastic Net]
<!-- id: d02-elastic-net -->

- **Priority:** should_know
- **Category:** ml-theory
- **Tags:** elastic-net, ml-theory
**Core Concept**

Combines L1 and L2 regularization penalties. Gets sparsity from L1 and stability from L2.
**Why It Matters**

Lasso can behave unpredictably with highly correlated features (which to keep?). Elastic Net combines sparsity with stabilization.
**Mental Model / Mechanics**
```
  Elastic Net = L1 penalty + L2 penalty
  L1 → sparsity
  L2 → shrinkage/stability
  Elastic Net → both
  ```
**Interview-Ready Explanation**
> Elastic Net combines L1's sparsity with L2's stability. Useful when features are correlated and Lasso alone behaves unpredictably.

---

### [CARD: Regularization Strength]
<!-- id: d02-regularization-strength -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** regularization-strength, ml-theory
**Core Concept**

The coefficient λ controls how strongly complexity is penalized. Regularization itself has a bias–variance tradeoff.
**Why It Matters**

Too little regularization → overfitting. Too much → underfitting. λ must be tuned.
**Mental Model / Mechanics**
```
  λ small → weak penalty → more freedom → potential overfitting
  λ large → strong penalty → constrained → potential underfitting
  ```
**Interview-Ready Explanation**
> The regularization coefficient λ controls the bias–variance tradeoff of regularization itself. Too weak allows overfitting; too strong causes underfitting. It must be tuned via validation.

---

### [CARD: Cross-Validation]
<!-- id: d02-cross-validation -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** cross-validation, ml-theory
**Core Concept**

K-fold cross-validation splits training data into K folds, trains K times (each fold serves as validation once), and averages the scores for a robust performance estimate.
**Why It Matters**

A single validation split can be noisy, especially with small datasets. Cross-validation reduces dependence on any particular split.
**Mental Model / Mechanics**
```
  K = 5:
  ┌────┬────┬────┬────┬────┐
  │ F1 │ F2 │ F3 │ F4 │ F5 │
  └────┴────┴────┴────┴────┘

  Run 1: Val=F1, Train=F2-F5
  Run 2: Val=F2, Train=F1,F3-F5
  Run 3: Val=F3, Train=F1-F2,F4-F5
  Run 4: Val=F4, Train=F1-F3,F5
  Run 5: Val=F5, Train=F1-F4

  Final score = average of 5 validation scores
  ```
**Failure Modes / Tradeoffs**
- Cross-validation does NOT eliminate the need for a test set
  - Cross-validation helps estimate performance; it does NOT prevent overfitting
  - Computationally K× more expensive than a single split
**Interview-Ready Explanation**
> K-fold cross-validation trains K models, each using a different fold as validation and the rest as training. Averaging the K scores provides a more robust performance estimate than a single split, especially with limited data.

---

### [CARD: Cross-Validation and the Test Set]
<!-- id: d02-cross-validation-and-the-test-set -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** cross-validation-and-the-test-set, ml-theory
**Core Concept**

Cross-validation is used during development. The test set remains separate for final evaluation.
**Why It Matters**

Common misconception: "cross-validation replaces the test set." It doesn't.
**Mental Model / Mechanics**
```
  Full dataset → Hold out test set → Remaining data
       ↓
  K-fold cross-validation on remaining data
       ↓
  Select hyperparameters/model → Train final model → Evaluate ONCE on test
  ```
**Interview-Ready Explanation**
> Cross-validation is used during development for model selection. The test set remains held out for a single final evaluation. Cross-validation does not replace the test set.

---

### [CARD: Stratified Cross-Validation]
<!-- id: d02-stratified-cross-validation -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** stratified-cross-validation, ml-theory
**Core Concept**

Preserves class proportions across folds during cross-validation. Critical for imbalanced classification problems.
**Why It Matters**

Random splits can accidentally create folds with very different class distributions, making evaluation unreliable.
**Mental Model / Mechanics**
```
  Original: 95% normal, 5% fraud
  Each fold: ≈95% normal, ≈5% fraud  (proportions preserved)

  Without stratification, one fold might have 0% fraud → useless evaluation
  ```
**Interview-Ready Explanation**
> Stratified cross-validation preserves class proportions across folds, ensuring each fold is representative. Critical for imbalanced classification where random splits can create unrepresentative folds.

---

### [CARD: Data Leakage]
<!-- id: d02-data-leakage -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** data-leakage, ml-theory
**Core Concept**

When information that would not legitimately be available at prediction time influences training or evaluation, producing artificially strong results that don't reflect real-world performance.
**Why It Matters**

One of the most important practical ML concepts. Leakage can make a terrible model appear excellent.
**Mental Model / Mechanics**
The model effectively "peeks at the answer." Four major forms:

  **1. Target leakage:** Using a feature that is a consequence of the target.
  ```
  Predicting customer default
  Feature: "collection_agency_contacted" → only happens AFTER default
  → Would not exist at prediction time → leakage
  ```

  **2. Train/test contamination (preprocessing leakage):**
  ```
  WRONG: Full dataset → normalize(mean, std) → split
  RIGHT: Split first → fit scaler on train only → transform val/test with train stats
  ```

  **3. Feature engineering leakage (future information):**
  ```
  Predicting fraud at transaction time
  Feature: "avg transactions in next 24 hours"
  → Uses future information → leakage
  Key question: "Would this info be available at prediction time?"
  ```

  **4. Time-series leakage:**
  ```
  WRONG: Random train/test split across time
  RIGHT: Chronological split (train: Jan-Apr, val: May, test: Jun)
  ```
**Failure Modes / Tradeoffs**
- Leakage produces the appearance of success during development
  - A model with 99% accuracy from leakage is far worse than a legitimate 85% model
  - Regularization cannot fix a fundamentally leaked dataset
**Interview-Ready Explanation**
> Data leakage occurs when information unavailable at prediction time influences training or evaluation. It produces artificially strong results that don't transfer to real-world deployment. Forms include target leakage, preprocessing contamination, future-information features, and temporal leakage.

---

### [CARD: Regularization vs Data Leakage]
<!-- id: d02-regularization-vs-data-leakage -->

- **Priority:** should_know
- **Category:** ml-theory
- **Tags:** regularization-vs-data-leakage, ml-theory
**Core Concept**

These solve completely different problems. Regularization constrains model complexity. Data leakage is an invalid data problem.
**Why It Matters**

Prevents confusing two fundamentally different failure modes.
**Mental Model / Mechanics**
```
  Regularization:
    Problem: Model too flexible → overfitting
    Fix: Penalize complexity / constrain learning

  Data Leakage:
    Problem: Model has access to invalid information
    Fix: Fix data collection, splitting, preprocessing, or feature engineering

  Regularization CANNOT rescue a fundamentally leaked dataset.
  ```
**Interview-Ready Explanation**
> Regularization addresses overfitting by constraining model complexity. Data leakage is a data validity problem — the model has access to information it shouldn't. Regularization cannot fix leakage.

---

### [CARD: Model Selection vs Final Evaluation]
<!-- id: d02-model-selection-vs-final-evaluation -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** model-selection-vs-final-evaluation, ml-theory
**Core Concept**

Model selection happens during development using validation/cross-validation. Final evaluation happens once on the held-out test set.
**Why It Matters**

Separating these stages ensures trustworthy ML evaluation.
**Mental Model / Mechanics**
```
               DATA
                 │
           ┌─────┴─────┐
           ↓           ↓
     Development      Test
           │
           ↓
    Cross-validation
           │
           ↓
    Model/hyperparameter selection
           │
           ↓
     Final training
           │
           ↓
   Evaluate on test (ONCE)
  ```
**Interview-Ready Explanation**
> Model selection uses validation data or cross-validation during development. The test set is reserved for a single final evaluation after all decisions are made. This separation is fundamental to trustworthy ML.

---

## Key Connections

```
DATA → Features + Labels → Train/Val/Test → Model Choice → Training
  → Parameters → Predictions → Loss → Optimization → Generalization
     → Underfitting (High Bias) ←→ Overfitting (High Variance)
        → Regularization → Better Generalization

THREAT: Data Leakage → Artificially good results → Poor real-world performance
TOOL:   Cross-Validation → More robust development evaluation
FINAL:  Untouched Test Set → Final performance estimate
```

Good ML isn't merely "choose a good algorithm." It is: **design a valid learning and evaluation process.**

---

## Common Misconceptions

- **Myth:** Overfitting means the model has too many parameters.
  **Reality:** Model complexity is one factor, but dataset size, noise, regularization, feature quality, and training procedure also matter.

- **Myth:** Regularization always improves performance.
  **Reality:** Too little allows overfitting. Too much causes underfitting. It must be tuned.

- **Myth:** L1 is always better because it does feature selection.
  **Reality:** L2 is preferable when many features contribute meaningfully or when features are correlated.

- **Myth:** The validation set is completely unseen.
  **Reality:** Repeated optimization against validation data indirectly overfits to it.

- **Myth:** The test set is just another validation set.
  **Reality:** The test set should be used only after all development decisions are finalized.

- **Myth:** Cross-validation eliminates overfitting.
  **Reality:** It provides a more robust performance estimate. It does not prevent overfitting.

- **Myth:** Leakage just means accidentally including the label.
  **Reality:** Leakage includes future information, preprocessing contamination, feature engineering errors, duplicates, and incorrect splitting.

---

## Out of Scope

- Formal bias–variance decomposition equations
- VC dimension / PAC learning
- Statistical learning theory proofs
- Convex optimization proofs
- Exact geometric derivations of L1/L2 penalty shapes
- Mathematical proofs of why Lasso produces sparsity
- Advanced cross-validation variants (nested CV details)

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d02-qa-001]
**Question:** What is the basic objective of supervised learning?
**Answer:** Learn a function f(X) ≈ y that maps input features to target predictions, such that it generalizes to unseen data.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-002]
**Question:** What are X, y, and ŷ?
**Answer:** X = input features, y = actual target/label, ŷ = model's prediction.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-003]
**Question:** What is the difference between parameters and hyperparameters?
**Answer:** Parameters are learned by the optimizer during training (weights, biases). Hyperparameters control the learning process and are set externally (learning rate, batch size, regularization strength).
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-004]
**Question:** What happens to model parameters during training?
**Answer:** They are iteratively adjusted by the optimizer to reduce the loss function on training data.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-005]
**Question:** What does generalization mean?
**Answer:** The ability of a model to perform well on unseen data from the same distribution, not just memorized training examples.
**Tags:** ml-theory, drill
**Linked Cards:** d02-generalization

#### [QA: d02-qa-006]
**Question:** What does an overfitted model look like on training vs validation data?
**Answer:** Training performance is excellent, validation performance is poor. The model learned noise/training-specific patterns.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-007]
**Question:** What does an underfitted model look like?
**Answer:** Both training and validation performance are poor. The model is too simple to capture the underlying patterns.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-008]
**Question:** Why does increasing model complexity tend to reduce bias?
**Answer:** A more flexible model can represent more patterns, making fewer restrictive assumptions about the data.
**Tags:** ml-theory, drill
**Linked Cards:** d02-model-complexity

#### [QA: d02-qa-009]
**Question:** Why can increasing model complexity increase variance?
**Answer:** More flexibility means more opportunity to fit noise and random fluctuations specific to the training set.
**Tags:** ml-theory, drill
**Linked Cards:** d02-model-complexity

#### [QA: d02-qa-010]
**Question:** What problem is regularization trying to solve?
**Answer:** Overfitting — it penalizes model complexity to discourage learning noise and improve generalization.
**Tags:** ml-theory, drill
**Linked Cards:** d02-regularization

#### [QA: d02-qa-011]
**Question:** What does L1 regularization penalize?
**Answer:** The absolute values of parameters: Σ|w|. Can drive some weights to exactly zero (sparsity).
**Tags:** ml-theory, drill
**Linked Cards:** d02-regularization

#### [QA: d02-qa-012]
**Question:** What does L2 regularization penalize?
**Answer:** The squared values of parameters: Σw². Shrinks weights toward zero without forcing exact zeros.
**Tags:** ml-theory, drill
**Linked Cards:** d02-regularization

#### [QA: d02-qa-013]
**Question:** Why can L1 produce sparse models?
**Answer:** The L1 penalty geometry causes the optimization path to hit exact zero values, effectively eliminating features.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-014]
**Question:** What's the difference between Ridge and Lasso?
**Answer:** Ridge = Linear Regression + L2 (shrinks weights). Lasso = Linear Regression + L1 (can zero out weights, feature selection).
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-015]
**Question:** Why might Elastic Net be useful?
**Answer:** Combines L1 sparsity with L2 stability. Useful when features are correlated and Lasso alone is unstable.
**Tags:** ml-theory, drill
**Linked Cards:** d02-elastic-net

#### [QA: d02-qa-016]
**Question:** Why can't we simply train on all our data and evaluate on the same data?
**Answer:** Training performance is an optimistically biased estimate. The model has already seen these examples and may have memorized them. It doesn't measure generalization.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-017]
**Question:** What is the purpose of the validation set?
**Answer:** Guide model selection and hyperparameter tuning during development without contaminating the final test evaluation.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-018]
**Question:** What is the purpose of the test set?
**Answer:** Provide a single final, unbiased estimate of how the chosen model performs on genuinely unseen data.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-019]
**Question:** Explain K-fold cross-validation.
**Answer:** Split training data into K folds. Train K times, each time using a different fold as validation and the rest as training. Average the K scores for a more robust performance estimate.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-020]
**Question:** Why is stratification useful for imbalanced classification?
**Answer:** It preserves class proportions across folds, preventing folds with unrepresentative class distributions that would make evaluation unreliable.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-021]
**Question:** What is data leakage?
**Answer:** When information unavailable at prediction time influences training or evaluation, producing artificially strong results that don't reflect real-world performance.
**Tags:** ml-theory, drill
**Linked Cards:** d02-data-leakage

#### [QA: d02-qa-022]
**Question:** Give an example of target leakage.
**Answer:** Predicting loan default using "collection_agency_contacted" as a feature — this event only occurs after default, so it wouldn't be available at prediction time.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-023]
**Question:** Give an example of future-information leakage.
**Answer:** Using "average transactions in next 24 hours" to predict fraud at transaction time. The future hasn't happened yet when the prediction must be made.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-024]
**Question:** Why must preprocessing generally be fitted only on training data?
**Answer:** Fitting on the full dataset (including test/val) leaks test information into the preprocessing statistics, contaminating the evaluation.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

#### [QA: d02-qa-025]
**Question:** Why is leakage potentially worse than ordinary overfitting?
**Answer:** Overfitting produces a gap between train and val performance (detectable). Leakage can produce high val performance that looks like success but completely fails in production.
**Tags:** ml-theory, drill
**Linked Cards:** d02-overfitting

#### [QA: d02-qa-026]
**Question:** Walk through building a binary classifier from raw data to final test evaluation.
**Answer:** Understand problem → Define target → Identify valid features → Check for leakage → Split data → Preprocess using training stats → Choose baseline → Train → Validate/cross-validate → Tune hyperparameters → Select final model → Retrain on development data → Evaluate ONCE on test → Analyze errors.
**Tags:** ml-theory, drill
**Linked Cards:** d02-the-supervised-learning-problem

<!-- QA_END -->
