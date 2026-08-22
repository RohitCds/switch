---
day: 4
title: "Classification Evaluation Metrics"
topics:
  - confusion-matrix
  - precision
  - recall
  - f1-score
  - roc-auc
  - pr-auc
  - threshold-selection
  - calibration
  - class-imbalance
tags:
  - evaluation
  - metrics
  - classification
priority_distribution:
  must_know: 12
  should_know: 1
  nice_to_know: 0
---

# DAY 4 — Classification Evaluation Metrics

## Daily Objective
Build a confusion matrix from scratch, explain precision/recall/F1/specificity, know when accuracy actively lies, explain ROC-AUC vs PR-AUC and when each is the right call, understand threshold selection, and know what "calibration" means and why a model can be discriminative but badly calibrated. One of the highest-yield interview days — evaluation metrics come up in nearly every ML interview.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Confusion matrix, precision, recall, specificity, F1, why accuracy fails under imbalance, ROC/AUC, PR-AUC, threshold selection, loss vs metric distinction, choosing the right metric
- 🟡 **SHOULD KNOW:** Calibration, Brier score concept, macro vs micro averaging for multi-class
- 🟢 **NICE TO KNOW:** Exact AUC trapezoidal computation, statistical significance testing between two models' metrics

---

## Knowledge Cards

---

### [CARD: Loss vs Metric]
<!-- id: d04-loss-vs-metric -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** loss-functions, metrics, evaluation
**Core Concept**

A loss function is what the optimizer minimizes during training (must be differentiable). A metric is what you (or the business) use to judge whether the model is actually good (doesn't need to be differentiable).
**Why It Matters**

Prevents the classic interview conflation. You can train with cross-entropy and evaluate with F1 — they don't have to match, and usually don't. A model can have great loss but still be unacceptable on the metric the business cares about.
**Mental Model / Mechanics**
  ```
  Loss function:
    - What the optimizer sees
    - Must be differentiable (e.g., cross-entropy, MSE)
    - Drives parameter updates

  Metric:
    - What humans/business judge
    - Doesn't need to be differentiable (e.g., F1, accuracy, AUC)
    - Can diverge from loss — model can improve on loss while a metric stays flat or worsens
  ```
**Failure Modes / Tradeoffs**
  - A model improving on training loss does NOT guarantee improvement on the metric you care about
  - Always monitor both loss and business-relevant metrics during development
**Interview-Ready Explanation**
  > Loss is what the optimizer minimizes during training and must be differentiable. Metrics are how we judge the model's real-world usefulness and don't need to be differentiable — they can diverge, so a model can improve on loss while a metric you care about stays flat or worsens.

---

### [CARD: The Confusion Matrix]
<!-- id: d04-confusion-matrix -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** confusion-matrix, evaluation, true-positive, false-positive
**Core Concept**

A 2×2 table for binary classification that records all four possible prediction outcomes: TP, TN, FP, FN. Every classification metric is just a different arithmetic combination of these four numbers.
**Why It Matters**

The foundation for every evaluation metric in classification. If you can reconstruct it from a scenario, you can derive any metric from first principles — even if you blank on the formula.
**Mental Model / Mechanics**
  ```
                        Actual Positive     Actual Negative
  Predicted Positive         TP                   FP
  Predicted Negative         FN                   TN

  TP (True Positive):  predicted positive, actually positive → correctly caught
  TN (True Negative):  predicted negative, actually negative → correctly cleared
  FP (False Positive): predicted positive, actually negative → false alarm
  FN (False Negative): predicted negative, actually positive → miss
  ```
**Example**
  **Telecom outage example:**
  - FP = system flags an outage that never happens → wasted investigation, alert fatigue
  - FN = system misses a real outage → the actual bad outcome you're trying to prevent
**Failure Modes / Tradeoffs**
  - "Positive" is the class you care about detecting (fraud, outage, disease) — not necessarily the majority class
  - Every metric below is derived from these four numbers
**Interview-Ready Explanation**
  > A confusion matrix is a 2×2 table of TP/TN/FP/FN that every classification metric is derived from. TP and TN are correct predictions; FP is a false alarm; FN is a miss.

---

### [CARD: Accuracy — And Why It Lies Under Imbalance]
<!-- id: d04-accuracy-and-imbalance -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** accuracy, class-imbalance, evaluation
**Core Concept**

`Accuracy = (TP + TN) / (TP + TN + FP + FN)` — fraction of all predictions that were correct. Actively misleading under class imbalance.
**Why It Matters**

Simple, intuitive metric — but its simplicity is exactly its danger. Understanding when accuracy fails is a core interview signal.
**Mental Model / Mechanics**
  ```
  The imbalance trap:
    Dataset: 1% fraud, 99% legitimate
    Model: always predicts "not fraud"
    Accuracy: 99% — while catching ZERO fraud

  Accuracy counts all correct predictions equally.
  Under imbalance, the majority class dominates.
  ```
  This is exactly why stratified cross-validation is used — imbalanced classes make naive metrics misleading.
**Failure Modes / Tradeoffs**
  - Useful only when classes are roughly balanced AND there's no strong asymmetry in FP/FN costs
  - Under imbalance, a trivial majority-class predictor gets high accuracy
**Interview-Ready Explanation**
  > Accuracy can be misleading under class imbalance — a model that always predicts the majority class can score very high accuracy while being completely useless at detecting the minority class.

---

### [CARD: Precision]
<!-- id: d04-precision -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** precision, false-positive, evaluation
**Core Concept**

`Precision = TP / (TP + FP)` — of everything I predicted positive, how much was actually positive?
**Why It Matters**

Measures the trustworthiness of positive predictions. Critical when false positives are costly.
**Mental Model / Mechanics**
  ```
  High precision = few false alarms

  When FP is costly:
    - Flagging legitimate transaction as fraud → blocks customer's card
    - RCA engine firing false root-cause alert → engineer on wild goose chase
    - Spam filter marking a real email as spam → user loses important mail
  ```
**Failure Modes / Tradeoffs**
  - You can trivially get near-100% precision by only predicting positive when extremely confident — but recall collapses (you miss borderline true positives)
  - Precision alone never tells you how many positives you missed
**Interview-Ready Explanation**
  > Precision answers 'of what I flagged, how much was correct?' — TP/(TP+FP). High precision means few false alarms. It matters most when false positives are costly.

---

### [CARD: Recall (Sensitivity)]
<!-- id: d04-recall -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** recall, sensitivity, false-negative
**Core Concept**

`Recall = TP / (TP + FN)` — of everything that was actually positive, how much did I catch?
**Why It Matters**

Measures completeness of detection. Critical when false negatives are costly (missing a real event is the bad outcome).
**Mental Model / Mechanics**
  ```
  High recall = few misses

  When FN is costly:
    - Missing actual fraud → financial loss
    - Missing a real network outage → service disruption
    - Missing a disease diagnosis → patient harm
  ```
**Failure Modes / Tradeoffs**
  - You can trivially get 100% recall by predicting positive for everything — but precision collapses
  - The core tension: precision and recall usually trade off against each other
**Interview-Ready Explanation**
  > Recall answers 'of what was actually true, how much did I catch?' — TP/(TP+FN). High recall means few misses. It matters most when false negatives are costly.

---

### [CARD: Precision-Recall Tradeoff]
<!-- id: d04-precision-recall-tradeoff -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** precision, recall, tradeoff, evaluation
**Core Concept**

Precision and recall typically trade off — improving one degrades the other. The balance depends on the relative cost of FP vs FN for the specific business problem.
**Why It Matters**

Understanding this tradeoff is essential for threshold selection and metric choice. Interviewers test whether candidates understand that you can't maximize both freely.
**Mental Model / Mechanics**
  ```
  Predict positive for everything → Recall = 100%, Precision collapses
  Predict positive only when extremely confident → Precision ≈ 100%, Recall collapses

  Which matters more? Depends on the business:
    Fraud detection (missing fraud is expensive)   → prioritize recall
    Spam filtering (losing real email is expensive) → prioritize precision
  ```
  Genuinely improving BOTH usually requires a better model, not just a threshold shift.
**Interview-Ready Explanation**
  > Precision and recall typically trade off via the threshold. Which one matters more depends on whether false positives or false negatives are more costly for the business.

---

### [CARD: Specificity]
<!-- id: d04-specificity -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** specificity, false-positive-rate, evaluation
**Core Concept**

`Specificity = TN / (TN + FP)` — of everything actually negative, how much did I correctly identify as negative? Recall for the negative class.
**Why It Matters**

Complements recall (sensitivity). Important in medical/anomaly-detection contexts. Used as the x-axis complement in ROC curves (FPR = 1 − Specificity).
**Mental Model / Mechanics**
  ```
  Recall (Sensitivity): how well we detect positives    → TP / (TP + FN)
  Specificity:          how well we detect negatives    → TN / (TN + FP)
  False Positive Rate:  1 - Specificity                 → FP / (FP + TN)
  ```
**Interview-Ready Explanation**
  > Specificity is recall for the negative class — TN/(TN+FP). It measures how well the model correctly identifies negatives. FPR = 1 − Specificity.

---

### [CARD: F1 Score]
<!-- id: d04-f1-score -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** f1-score, harmonic-mean, metrics
**Core Concept**

`F1 = 2 × (Precision × Recall) / (Precision + Recall)` — the harmonic mean of precision and recall. Only looks good when both are reasonably good.
**Why It Matters**

Provides a single number balancing precision and recall. The harmonic mean (not simple average) ensures that if either is terrible, F1 is terrible — it can't be gamed by maximizing just one.
**Mental Model / Mechanics**
  ```
  Simple average:  (0.9 + 0.1) / 2 = 0.50 — looks deceptively okay
  Harmonic mean:   2×(0.9×0.1)/(0.9+0.1) = 0.18 — correctly punishes the imbalance

  Harmonic mean is dominated by the smaller value.
  F1 only looks good when BOTH precision AND recall are reasonably good.
  ```
  **F-beta generalization (nice-to-know):**
  - β > 1 → weights recall more (e.g., F2 for fraud detection)
  - β < 1 → weights precision more (e.g., F0.5 for spam filtering)
**Failure Modes / Tradeoffs**
  - F1 assumes precision and recall matter equally — if the business cares much more about one, use F-beta or report them separately
  - F1 doesn't account for true negatives at all
**Interview-Ready Explanation**
  > F1 is the harmonic mean of precision and recall — it punishes the case where one is much worse than the other, unlike a simple average. It only looks good when both precision and recall are reasonably good.

---

### [CARD: Threshold Selection]
<!-- id: d04-threshold-selection -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** threshold, probability, evaluation
**Core Concept**

The model outputs a probability; the threshold converts it to a hard prediction. The threshold is a business decision, not a fixed model property. Default 0.5 is not always correct.
**Why It Matters**

Many candidates think 0.5 is "the" threshold. In practice, you tune it based on the cost of FP vs FN — this is a genuinely high-value interview point.
**Mental Model / Mechanics**
  ```
  probability ≥ threshold → predict positive
  probability <  threshold → predict negative

  Lower threshold  → more predicted positive → ↑ recall, ↓ precision
  Higher threshold → fewer predicted positive → ↑ precision, ↓ recall

  Threshold moves you along the precision-recall tradeoff
  WITHOUT retraining the model.
  ```
**Example**
  Fraud detection where missing fraud is expensive → deliberately lower threshold to trade some precision for higher recall.
**Failure Modes / Tradeoffs**
  - Threshold tuning changes the operating point, not the model itself
  - Should be tuned on validation data, not test data
  - Different deployment contexts may warrant different thresholds for the same model
**Interview-Ready Explanation**
  > The classification threshold is a business decision, not a fixed model property. Lowering it trades precision for recall and vice versa — you pick it based on the relative cost of false positives versus false negatives, not by default at 0.5.

---

### [CARD: ROC Curve and AUC]
<!-- id: d04-roc-auc -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** roc-curve, auc, ranking
**Core Concept**

ROC plots True Positive Rate (recall) vs False Positive Rate (1−specificity) as the threshold sweeps from 1→0. AUC summarizes the entire curve as a single number measuring ranking quality across all thresholds.
**Why It Matters**

Provides a threshold-independent measure of model quality. Answers: "does the model generally rank positives above negatives?"
**Mental Model / Mechanics**
  ```
  ROC Curve:
    X-axis: FPR = FP / (FP + TN)  [= 1 - Specificity]
    Y-axis: TPR = TP / (TP + FN)  [= Recall]

  TPR
   1 │                    ●───●
     │              ●
     │         ●
     │    ●
     │●
   0 └──────────────────────── FPR
     0                        1

  Diagonal line = random classifier (FPR = TPR everywhere)
  Top-left corner = perfect classifier (TPR=1, FPR=0)

  AUC values:
    AUC = 1.0  → perfect ranking
    AUC = 0.5  → no better than random
    AUC < 0.5  → worse than random (predictions inverted)
  ```
  **The key intuition:** AUC = the probability that the model ranks a randomly-chosen positive example higher than a randomly-chosen negative example.
**Failure Modes / Tradeoffs**
  - High AUC means good ranking — it says nothing about calibration
  - It says nothing about performance at any specific operating threshold
  - Can be misleading under severe class imbalance (see PR-AUC)
**Interview-Ready Explanation**
  > AUC is the probability that a randomly-chosen positive example is ranked above a randomly-chosen negative example — a threshold-independent measure of ranking quality. AUC=1 is perfect, AUC=0.5 is random.

---

### [CARD: PR-AUC — Why It's Better Under Imbalance]
<!-- id: d04-pr-auc -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** pr-auc, class-imbalance, precision-recall
**Core Concept**

Area under the Precision-Recall curve. Unlike ROC-AUC, PR-AUC doesn't use TN — so it stays honest when negatives massively outnumber positives.
**Why It Matters**

ROC-AUC's FPR denominator includes TN. Under heavy imbalance, TN is huge, so FPR stays artificially low even with many false positives relative to the small positive class. PR-AUC exposes this.
**Mental Model / Mechanics**
  ```
  ROC-AUC uses: FPR = FP / (FP + TN)
    → Under imbalance, TN is huge → FPR stays low → ROC-AUC inflated

  PR-AUC uses: Precision = TP / (TP + FP)
    → No TN in the formula → directly sensitive to FP relative to TP
    → Honest about how the model handles the rare positive class

  Rule of thumb:
    Balanced classes                         → ROC-AUC is fine
    Heavy imbalance (fraud, outage, etc.)    → prefer PR-AUC
  ```
**Failure Modes / Tradeoffs**
  - PR-AUC and ROC-AUC can diverge meaningfully under imbalance
  - PR-AUC baseline depends on class prevalence (not 0.5 like ROC-AUC)
**Interview-Ready Explanation**
  > ROC-AUC can look artificially good under severe class imbalance because FPR is diluted by abundant true negatives. PR-AUC is more informative because precision is directly sensitive to how well the model handles the rare positive class.

---

### [CARD: Calibration]
<!-- id: d04-calibration -->

- **Priority:** should_know
- **Category:** ml-theory
- **Tags:** calibration, probability, discrimination
**Core Concept**

Whether the model's stated probabilities match real-world frequencies. A model can have great discrimination (AUC) but terrible calibration.
**Why It Matters**

Matters whenever the raw probability is used downstream — combining with dollar costs, presenting confidence scores to users, or thresholding at non-default values.
**Mental Model / Mechanics**
  ```
  Discrimination: Can the model separate positive from negative?
    → What AUC measures

  Calibration: When the model says "0.8 probability," does ~80% of such
    predictions actually turn out positive?

  Example: A model outputs either 0.51 or 0.99 (nothing between).
    If ranking is correct → perfect AUC
    But 0.51 doesn't genuinely mean "51% chance" → badly calibrated

  Reliability diagram: bucket predictions by predicted probability,
    compare to actual observed frequency per bucket
  ```
**Failure Modes / Tradeoffs**
  - Calibration matters for: cost-sensitive decisions, confidence scores shown to users, combining predictions with business logic
  - Good AUC ≠ good calibration — they measure different things
  - Post-hoc calibration methods exist (Platt scaling, isotonic regression)
**Interview-Ready Explanation**
  > Discrimination is whether the model ranks positives above negatives correctly (AUC). Calibration is whether its stated probabilities match real-world frequencies. A model can have great AUC and still be badly calibrated.

---

### [CARD: Choosing the Right Metric]
<!-- id: d04-choosing-the-right-metric -->

- **Priority:** must_know
- **Category:** ml-theory
- **Tags:** metrics, business-context, evaluation
**Core Concept**

There is no universal "best" metric — the choice depends on class balance and the relative cost of FP vs FN. The interview differentiator is justifying the metric by naming what FP and FN cost in that business context.
**Why It Matters**

Separates candidates who memorize metric formulas from those who understand which metric to deploy and why.
**Mental Model / Mechanics**
  | Scenario | Primary Metric | Why |
  |---|---|---|
  | Balanced, no strong FP/FN asymmetry | Accuracy or F1 | Simple, representative |
  | Fraud detection (rare positive, missing fraud costly) | Recall + precision floor / PR-AUC | Minimize FN even at some precision cost |
  | Spam filtering (FP = lost real email) | Precision + recall floor | Minimize FP — missed spam tolerated more than lost mail |
  | Outage/anomaly prediction, imbalanced | PR-AUC, recall-focused | Rare positive class, misses expensive |
  | Ranking quality regardless of threshold | ROC-AUC or PR-AUC | Threshold-independent view |
  | Raw probability needed downstream | Calibration (Brier score) | Ranking alone isn't enough |

  **The interview move:** Don't just name a metric — justify it by naming what a false positive costs vs what a false negative costs in that specific business context.
**Interview-Ready Explanation**
  > The right metric depends on class balance and the relative cost of FP vs FN. For fraud detection, prioritize recall because missing fraud is expensive. For spam filtering, prioritize precision because losing real email is worse than missing spam. Always justify the metric by naming the business cost of each error type.

---

## Key Connections
```
Day 3: Loss (BCE) trains model to output probabilities
              ↓
Day 4: Threshold converts probability → hard prediction
              ↓
       Confusion Matrix (TP / TN / FP / FN)
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
Precision   Recall   Specificity
    └─────────┬─────────┘
              ↓
             F1
              ↓
   (sweep threshold) → ROC-AUC / PR-AUC
              ↓
   Choice of metric depends on:
   - Class imbalance
   - Cost of FP vs FN (business context)
              ↓
   Calibration: is the raw probability trustworthy?
```

Also ties back to data leakage: artificially high metrics (from leakage) show up as suspiciously excellent precision/recall/AUC on validation that collapses in production — evaluation metrics are only trustworthy if the evaluation process is clean.

---

## Common Misconceptions

- **Myth:** "Accuracy is a fine default metric."
  **Reality:** Only under roughly balanced classes with no strong FP/FN cost asymmetry — it actively misleads under imbalance.

- **Myth:** "0.5 is the threshold."
  **Reality:** It's a default, not a rule. The right threshold depends on the cost of FP vs FN for the specific business problem.

- **Myth:** "High AUC means the model is good."
  **Reality:** High AUC means good ranking. It says nothing about calibration, and nothing about performance at any specific operating threshold.

- **Myth:** "ROC-AUC and PR-AUC will roughly agree."
  **Reality:** Under class imbalance they can diverge meaningfully — PR-AUC is usually the more honest signal there.

- **Myth:** "F1 is always the right metric to optimize."
  **Reality:** F1 assumes precision and recall matter equally. If the business cares much more about one, use F-beta or report them separately with a stated floor on the other.

- **Myth:** "Precision and recall are independent — I can improve both freely."
  **Reality:** They typically trade off via the threshold. Genuinely improving both usually requires a better model, not just a threshold shift.

---

## Out of Scope
- Exact trapezoidal-rule computation of AUC by hand
- Formal statistical significance tests (DeLong's test, bootstrap CIs) for comparing two models' AUCs
- Multi-class ROC/AUC extension nuances (one-vs-rest vs one-vs-one macro/micro averaging) — know they exist, don't derive them
- Brier score formula derivation — know it exists as a calibration metric, that's enough

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d04-qa-001]
**Question:**
Draw a confusion matrix and label all four cells.

**Answer:**
Rows = Predicted (Positive/Negative), Columns = Actual (Positive/Negative). Cells: TP (predicted positive, actually positive), FP (predicted positive, actually negative), FN (predicted negative, actually positive), TN (predicted negative, actually negative).

**Tags:** confusion-matrix, evaluation
**Linked Cards:** d04-confusion-matrix

#### [QA: d04-qa-002]
**Question:**
Why can a model have 99% accuracy and still be useless?

**Answer:**
Under class imbalance (e.g., 1% fraud), a model predicting the majority class for everything achieves 99% accuracy while catching zero positive cases. Accuracy is dominated by the majority class.

**Tags:** accuracy, class-imbalance
**Linked Cards:** d04-accuracy-and-imbalance

#### [QA: d04-qa-003]
**Question:**
Write the precision formula and explain it in one sentence.

**Answer:**
Precision = TP / (TP + FP). Of everything I predicted positive, how much was actually positive — measures the trustworthiness of positive predictions.

**Tags:** precision, false-positive
**Linked Cards:** d04-precision

#### [QA: d04-qa-004]
**Question:**
Write the recall formula and explain it in one sentence.

**Answer:**
Recall = TP / (TP + FN). Of everything that was actually positive, how much did I catch — measures completeness of detection.

**Tags:** recall, false-negative
**Linked Cards:** d04-recall

#### [QA: d04-qa-005]
**Question:**
Why is F1 the harmonic mean rather than a simple average of precision and recall?

**Answer:**
The harmonic mean is dominated by the smaller value. Simple average of 0.9 and 0.1 gives 0.5 (deceptively okay); harmonic mean gives 0.18 (correctly punishes the imbalance). F1 can't be gamed by maximizing just one.

**Tags:** f1-score, metrics
**Linked Cards:** d04-f1-score

#### [QA: d04-qa-006]
**Question:**
What happens to precision and recall if you lower the classification threshold?

**Answer:**
Lower threshold → more things predicted positive → recall increases (catch more), precision decreases (more false alarms).

**Tags:** precision, recall, threshold
**Linked Cards:** d04-threshold-selection, d04-precision-recall-tradeoff

#### [QA: d04-qa-007]
**Question:**
What happens if you raise the threshold?

**Answer:**
Higher threshold → fewer things predicted positive → precision increases (fewer false alarms), recall decreases (miss more).

**Tags:** precision, recall, threshold
**Linked Cards:** d04-threshold-selection, d04-precision-recall-tradeoff

#### [QA: d04-qa-008]
**Question:**
Is 0.5 always the right threshold? Why or why not?

**Answer:**
No — 0.5 is a default, not a rule. The right threshold is a business decision based on the relative cost of FP vs FN. For fraud detection where missing fraud is expensive, you might lower it to trade precision for recall.

**Tags:** threshold, business-context
**Linked Cards:** d04-threshold-selection

#### [QA: d04-qa-009]
**Question:**
What does an AUC of 0.5 mean? What does 1.0 mean?

**Answer:**
AUC = 0.5 means the model is no better than random guessing. AUC = 1.0 means perfect ranking — every positive is ranked above every negative.

**Tags:** auc, ranking
**Linked Cards:** d04-roc-auc

#### [QA: d04-qa-010]
**Question:**
Give the "probability of correct ranking" definition of AUC from memory.

**Answer:**
AUC is the probability that the model ranks a randomly-chosen positive example higher than a randomly-chosen negative example.

**Tags:** auc, probability
**Linked Cards:** d04-roc-auc

#### [QA: d04-qa-011]
**Question:**
Why can ROC-AUC look artificially good under severe class imbalance?

**Answer:**
Because FPR = FP/(FP+TN), and under imbalance TN is huge. Even with many false positives, FPR stays low because it's diluted by the large TN denominator. This inflates ROC-AUC.

**Tags:** roc-auc, class-imbalance
**Linked Cards:** d04-roc-auc

#### [QA: d04-qa-012]
**Question:**
When would you reach for PR-AUC instead of ROC-AUC?

**Answer:**
Under heavy class imbalance (fraud, outage detection, rare disease). PR-AUC doesn't use TN at all — precision is TP/(TP+FP) — so it stays sensitive to how the model handles the rare positive class.

**Tags:** pr-auc, class-imbalance
**Linked Cards:** d04-pr-auc

#### [QA: d04-qa-013]
**Question:**
What's the difference between discrimination and calibration?

**Answer:**
Discrimination is whether the model can separate positives from negatives (what AUC measures). Calibration is whether the model's stated probabilities match real-world frequencies (when it says 0.8, are ~80% actually positive?).

**Tags:** calibration, discrimination
**Linked Cards:** d04-calibration

#### [QA: d04-qa-014]
**Question:**
Give an example where a model has great AUC but poor calibration.

**Answer:**
A model that only outputs 0.51 or 0.99 (never anything between) can have perfect AUC if the ranking is correct — all positives get 0.99, all negatives get 0.51. But "0.51" doesn't genuinely mean 51% probability; the probabilities are meaningless even though discrimination is perfect.

**Tags:** calibration, auc
**Linked Cards:** d04-calibration

#### [QA: d04-qa-015]
**Question:**
For a fraud-detection problem, would you prioritize precision or recall — and why?

**Answer:**
Recall — because missing actual fraud (FN) is typically more costly than investigating a false alarm (FP). You'd set a precision floor to avoid excessive false alarms, but the primary objective is catching fraud.

**Tags:** precision, recall, business-context
**Linked Cards:** d04-choosing-the-right-metric

#### [QA: d04-qa-016]
**Question:**
Explain, in your own words, why loss and metric don't have to be the same thing.

**Answer:**
Loss must be differentiable for gradient-based optimization (e.g., cross-entropy). Metrics measure real-world usefulness (e.g., F1, AUC) and need not be differentiable. You train with loss but evaluate with metrics — they can diverge, so a model can improve on loss while a business metric stays flat or worsens.

**Tags:** loss, metrics
**Linked Cards:** d04-loss-vs-metric

#### [QA: d04-qa-017]
**Question:**
What is specificity and how does it relate to recall?

**Answer:**
Specificity = TN/(TN+FP) — recall for the negative class. Recall measures how well we detect positives; specificity measures how well we detect negatives. FPR = 1 − Specificity.

**Tags:** specificity, recall
**Linked Cards:** d04-specificity

#### [QA: d04-qa-018]
**Question:**
What is the relationship between threshold selection and the precision-recall tradeoff?

**Answer:**
Moving the threshold moves you along the precision-recall tradeoff without retraining. Lower threshold increases recall (catch more) but decreases precision (more false alarms). The threshold is a business decision, not a model property.

**Tags:** threshold, precision-recall-tradeoff
**Linked Cards:** d04-threshold-selection, d04-precision-recall-tradeoff
<!-- QA_END -->
