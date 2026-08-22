---
day: 7
title: "Unsupervised Learning + ML Pipeline Fundamentals"
topics:
  - unsupervised-learning
  - k-means
  - dbscan
  - anomaly-detection
  - ml-pipelines
  - mlops
  - drift-monitoring
tags:
  - unsupervised-learning
  - mlops
priority_distribution:
  must_know: 12
  should_know: 3
  nice_to_know: 0
---

# DAY 7 — UNSUPERVISED LEARNING + ML PIPELINE FUNDAMENTALS

## Daily Objective
By the end of today you should be able to explain how k-means and DBSCAN work and when you'd reach for each, how unsupervised anomaly detection works when you don't have labeled anomalies, and the full lifecycle of getting a model from raw data into production: pipeline stages, training-serving skew, model versioning, batch vs online inference, and drift monitoring.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** k-means, DBSCAN, why/when you'd use unsupervised anomaly detection, the full pipeline stages, training-serving skew, model registry/versioning, batch vs online inference, the drift taxonomy (data/concept/prediction).
- 🟡 **SHOULD KNOW:** silhouette score, Isolation Forest intuition, experiment tracking, feature stores, CI/CD for ML basics.
- 🟢 **NICE TO KNOW:** one-class SVM, specific MLOps tool internals (MLflow/DVC/Kubernetes-level autoscaling mechanics).

---

## Knowledge Cards

---

### [CARD: K-Means Clustering]
<!-- id: d07-k-means -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** clustering, k-means, unsupervised-learning
**Core Concept**

K-Means is an unsupervised clustering algorithm that partitions data into K distinct clusters by minimizing within-cluster variance (inertia, the sum of squared distances from each point to its assigned cluster's centroid).

**Why It Matters**

It is a simple, fast, and foundational algorithm for segmenting data when true labels are unknown.

**Mental Model / Mechanics**

Lloyd's algorithm:
1. Choose K, randomly initialize K centroids.
2. Assign each point to its nearest centroid.
3. Recompute each centroid as the mean of the points assigned to it.
4. Repeat steps 2 and 3 until centroids stop moving.

k-means++ initialization spreads the initial centroids apart deliberately to reduce sensitivity to random initialization.

**Failure Modes / Tradeoffs**

- Assumes roughly spherical and similarly-sized clusters.
- Sensitive to outliers because centroids are means.
- Requires choosing K upfront.
- Requires feature scaling because it relies on distance computations.

**Interview-Ready Explanation**

> K-Means groups data into K clusters by repeatedly assigning points to the nearest centroid and recomputing centroids as the mean of assigned points, aiming to minimize within-cluster variance. It requires K upfront and assumes spherical clusters.

---

### [CARD: Choosing K in K-Means]
<!-- id: d07-k-means-choosing-k -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** clustering, k-means, hyperparameters
**Core Concept**

Selecting the optimal number of clusters (K) requires heuristics since K-Means needs it upfront. Common methods are the Elbow Method and Silhouette Score.

**Why It Matters**

An incorrect K leads to under-segmentation (mixing distinct groups) or over-segmentation (artificially splitting unified groups).

**Mental Model / Mechanics**

- **Elbow method**: Plot inertia (within-cluster sum of squares) vs. K. Look for the "elbow" where adding more clusters stops giving significant improvement.
- **Silhouette score**: For each point, compares its average distance to points in its own cluster (cohesion) against its average distance to points in the nearest other cluster (separation). The score ranges from -1 to 1; higher means better-defined clusters.

**Failure Modes / Tradeoffs**

- The elbow method can be subjective when there is no clear "elbow".
- Mechanically, inertia always decreases as K increases, so you cannot simply minimize it.

**Interview-Ready Explanation**

> You typically choose K using the Elbow method—looking for the point of diminishing returns on an inertia vs K plot—or by maximizing the Silhouette score, which measures cohesion vs separation.

---

### [CARD: DBSCAN]
<!-- id: d07-dbscan -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** clustering, dbscan, unsupervised-learning
**Core Concept**

Density-Based Spatial Clustering of Applications with Noise (DBSCAN) groups densely packed points together and explicitly labels points in sparse regions as noise/outliers.

**Why It Matters**

Unlike K-Means, it doesn't require K upfront, can find arbitrarily shaped clusters, and naturally identifies outliers.

**Mental Model / Mechanics**

Defined by two key parameters:
- `eps`: radius defining the "neighborhood" of a point.
- `min_samples`: minimum number of points within `eps` required to form a dense region.

Point classifications:
- **Core point**: Has at least `min_samples` points within its `eps` radius.
- **Border point**: Within `eps` of a core point but does not meet `min_samples` itself.
- **Noise point**: Neither a core nor a border point; left unassigned to any cluster.

**Failure Modes / Tradeoffs**

- Highly sensitive to the choice of `eps` and `min_samples`.
- Struggles when different clusters have significantly different densities.
- Does not scale well to very high dimensions due to the curse of dimensionality.

**Interview-Ready Explanation**

> DBSCAN defines clusters as continuous regions of high density. It works by expanding clusters from core points (dense regions) and labels isolated points as noise. It can find arbitrarily shaped clusters without needing K upfront.

---

### [CARD: K-Means vs DBSCAN]
<!-- id: d07-k-means-vs-dbscan -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** clustering, k-means, dbscan
**Core Concept**

K-Means and DBSCAN are fundamentally different clustering approaches: K-Means partitions based on distance to centroids, while DBSCAN groups based on continuous density.

**Why It Matters**

Knowing the trade-offs is crucial for choosing the right algorithm for a given dataset's shape and characteristics.

**Mental Model / Mechanics**

- **Needs K upfront**: K-Means yes; DBSCAN no.
- **Cluster shape**: K-Means assumes roughly spherical; DBSCAN can handle arbitrary shapes.
- **Handles outliers**: K-Means does not (outliers skew centroids); DBSCAN natively labels them as noise.
- **Sensitivity**: K-Means is sensitive to initialization and the choice of K. DBSCAN is sensitive to `eps`, `min_samples`, and density variations.

**Interview-Ready Explanation**

> K-Means is distance-based, needs K upfront, and works well for spherical clusters. DBSCAN is density-based, handles arbitrary shapes and outliers, but struggles with varying densities across clusters.

---

### [CARD: Unsupervised Anomaly Detection]
<!-- id: d07-unsupervised-anomaly-detection -->

- **Priority:** must_know
- **Category:** algorithms
- **Tags:** anomaly-detection, unsupervised-learning
**Core Concept**

Unsupervised anomaly detection identifies rare items, events, or observations that raise suspicions by differing significantly from the majority of the data, without needing labeled examples.

**Why It Matters**

Labels for anomalies (e.g., fraud, hardware failure) are often non-existent or too rare to train a robust supervised classifier.

**Mental Model / Mechanics**

- **Density-based**: DBSCAN identifies anomalies natively as "noise points".
- **Statistical methods**: Using z-score or IQR to flag points far from the mean/median. (Assumes simple normal distributions and fails in high dimensions).
- **Isolation-based**: Isolation Forest isolates anomalies using random splits.

**Interview-Ready Explanation**

> When labeled anomalies are too rare or non-existent, unsupervised anomaly detection methods like DBSCAN's noise labeling or Isolation Forests identify points that deviate significantly from the normal data distribution.

---

### [CARD: Isolation Forest]
<!-- id: d07-isolation-forest -->

- **Priority:** should_know
- **Category:** algorithms
- **Tags:** anomaly-detection, isolation-forest
**Core Concept**

Isolation Forest is an anomaly detection algorithm that isolates anomalies based on the premise that they are "few and different".

**Why It Matters**

It is highly scalable, requires no distance computation, and works well in high-dimensional datasets.

**Mental Model / Mechanics**

It builds many random trees by repeatedly splitting on random features at random thresholds.
Because anomalies are different from normal points, they get isolated into their own leaf node in far fewer splits than normal points.
The **anomaly score** is based on the average path length across all trees: a short path length indicates an anomaly.

**Failure Modes / Tradeoffs**

- Random splits can be less effective on very complex underlying distributions if not given enough trees.

**Interview-Ready Explanation**

> Isolation Forest flags anomalies based on how easily they can be separated from the rest of the data. By randomly splitting features, anomalies get isolated in fewer steps than normal points.

---

### [CARD: Clustering Evaluation]
<!-- id: d07-clustering-evaluation -->

- **Priority:** should_know
- **Category:** algorithms
- **Tags:** clustering, evaluation, metrics
**Core Concept**

Evaluating clusters is challenging because there is usually no ground truth. Evaluation relies on intrinsic properties like cohesion (tightness) and separation.

**Why It Matters**

You need metrics to compare different clusterings and tune hyperparameters like K or eps.

**Mental Model / Mechanics**

- **Without ground truth**:
  - **Inertia** (within-cluster sum of squares): Lower is better (tighter clusters), but mechanically decreases as K increases, so you can't just minimize it.
  - **Silhouette score**: Combines cohesion and separation into a score from -1 to 1. Higher is better.
- **With ground truth**:
  - Adjusted Rand Index (ARI), Normalized Mutual Information (NMI).

**Interview-Ready Explanation**

> Without ground truth labels, clustering is evaluated using metrics like the Silhouette score, which measures how similar an object is to its own cluster compared to other clusters, or by looking for the elbow in an inertia plot.

---

### [CARD: ML Pipeline Stages]
<!-- id: d07-ml-pipeline-stages -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** ml-pipeline, lifecycle
**Core Concept**

The ML lifecycle is the end-to-end process of bringing a model from raw data into production and maintaining it.

**Why It Matters**

Training the model is only a small fraction of real-world ML. Engineering robust pipelines is where the actual value is delivered.

**Mental Model / Mechanics**

Pipeline stages:
1. Data collection
2. Data cleaning
3. Feature engineering
4. Train / val / test split
5. Training
6. Evaluation
7. Hyperparameter tuning
8. Deployment
9. Inference (Batch or Online)
10. Monitoring
11. Feedback loop / retraining

**Interview-Ready Explanation**

> The ML pipeline spans from data collection and feature engineering to training, evaluation, and deployment, ending with monitoring and a feedback loop for retraining as real-world data distributions change.

---

### [CARD: Training-Serving Skew]
<!-- id: d07-training-serving-skew -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** data-leakage, training-serving-skew
**Core Concept**

Training-serving skew occurs when the features a model sees in production differ from what it saw during training, leading to degraded performance.

**Why It Matters**

It is essentially data leakage discovered in production instead of during evaluation. It is one of the most common causes of silent model failure.

**Mental Model / Mechanics**

Common causes:
- Feature logic implemented differently in the offline training pipeline vs. the online serving pipeline (e.g., Python vs. Java).
- Library version mismatches.
- A training-time feature uses information that is not actually available at serving time.

**Failure Modes / Tradeoffs**

- Hard to detect without robust monitoring of input distributions in production.

**Interview-Ready Explanation**

> Training-serving skew happens when production inputs don't match training inputs, often due to mismatched offline and online feature engineering logic. It's essentially data leakage that surfaces as a live bug in production.

---

### [CARD: Reproducibility & Experiment Tracking]
<!-- id: d07-reproducibility-and-experiment-tracking -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** reproducibility, experiment-tracking, mlops
**Core Concept**

Reproducibility is the ability to exactly recreate a model training run. Experiment tracking is logging the exact configuration of every run.

**Why It Matters**

Without reproducibility, debugging models, auditing decisions, or rolling back to a previous known state is impossible.

**Mental Model / Mechanics**

To be reproducible, you need:
- The exact same data snapshot (Data Versioning)
- The exact same code version (Git commit)
- The exact same hyperparameters
- The exact same random seeds

Tools like MLflow and Weights & Biases (W&B) automate the tracking of these inputs alongside the output metrics and artifacts.

**Interview-Ready Explanation**

> Reproducibility means you can exactly recreate a training run. This requires experiment tracking to log the dataset version, code version, hyperparameters, and random seeds used for every run.

---

### [CARD: Model Registry and Versioning]
<!-- id: d07-model-registry-and-versioning -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** model-registry, versioning, mlops
**Core Concept**

A model registry is a centralized store that treats trained models as versioned, tracked artifacts, managing their lifecycle states.

**Why It Matters**

It bridges the gap between data science experimentation and software engineering deployment, enabling safe rollouts and rollbacks.

**Mental Model / Mechanics**

Tracks which model version is in Staging vs. Production. If a deployed model degrades, the registry allows the engineering system to instantly roll back to the previously stable version.

**Interview-Ready Explanation**

> A model registry treats trained models as versioned artifacts. It tracks metadata about how a model was trained and manages its lifecycle state, making deployments and rollbacks reliable.

---

### [CARD: Feature Stores]
<!-- id: d07-feature-stores -->

- **Priority:** should_know
- **Category:** mlops
- **Tags:** feature-store, infrastructure
**Core Concept**

A feature store is a centralized system for computing, storing, and serving features consistently across both training and inference.

**Why It Matters**

It is the direct engineering fix for training-serving skew.

**Mental Model / Mechanics**

Instead of writing data extraction scripts for training and separate API logic for online serving, both systems pull from one shared source of truth. The feature store handles point-in-time correctness for offline training and low-latency access for online serving.

**Interview-Ready Explanation**

> A feature store centralizes feature engineering so that offline training pipelines and online serving systems use the exact same feature definitions and data, eliminating training-serving skew.

---

### [CARD: Batch vs Online Inference]
<!-- id: d07-batch-vs-online-inference -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** inference, deployment, architecture
**Core Concept**

Batch inference computes predictions periodically on large datasets and stores them. Online inference computes predictions on-demand as live requests arrive.

**Why It Matters**

Dictates the architecture, cost, and complexity of the deployment.

**Mental Model / Mechanics**

- **Batch**: High throughput, latency doesn't matter. Predictions are precomputed and served from a fast database. Cheaper and simpler, but predictions can be stale.
- **Online**: Real-time traffic. Must be low-latency. Requires more complex, expensive infrastructure (e.g., auto-scaling APIs, real-time feature computation).

**Interview-Ready Explanation**

> Batch inference periodically pre-computes predictions in bulk, which is cheap and simple but allows staleness. Online inference computes predictions on-demand for live traffic, requiring low-latency and more complex infrastructure.

---

### [CARD: Drift Taxonomy]
<!-- id: d07-drift-taxonomy -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** monitoring, drift, data-drift, concept-drift
**Core Concept**

Models degrade over time as the real world changes. Drift describes the different ways distributions can shift.

**Why It Matters**

Understanding the type of drift tells you how to fix it (e.g., retraining vs changing features).

**Mental Model / Mechanics**

- **Data drift (or Feature drift)**: The distribution of the input features (X) shifts over time.
- **Concept drift**: The actual relationship between the features and the target (X → y) changes. This is more dangerous—model performance drops even if the input distribution looks statistically normal.
- **Prediction drift**: The distribution of the model's output predictions (y-hat) shifts. Often used as an early proxy signal for data or concept drift before true labels are available.

**Failure Modes / Tradeoffs**

- Concept drift is much harder to detect without true ground-truth labels.

**Interview-Ready Explanation**

> Data drift is when the distribution of input features changes. Concept drift is when the relationship between inputs and the target variable changes, which is more dangerous. Prediction drift is a shift in model outputs, often used as an early warning proxy.

---

### [CARD: Model Monitoring]
<!-- id: d07-model-monitoring -->

- **Priority:** must_know
- **Category:** mlops
- **Tags:** monitoring, mlops, lifecycle
**Core Concept**

Model monitoring involves observing a deployed model to detect drift, performance degradation, and system-level issues.

**Why It Matters**

A model that passes offline evaluation is not safe indefinitely; the real world constantly changes.

**Mental Model / Mechanics**

Monitoring covers multiple layers:
1. **System Health**: Latency, error rates, CPU/memory usage.
2. **Data/Prediction Drift**: Monitoring input and output distributions relative to a training-time baseline.
3. **Model Performance Monitoring**: Once true labels arrive (which may take time), you re-evaluate the model on live data using standard evaluation metrics. This forms the real feedback loop for retraining.

**Failure Modes / Tradeoffs**

- You must establish a baseline distribution during training to have something to monitor against in production.

**Interview-Ready Explanation**

> Model monitoring tracks system health, detects data and prediction drift, and eventually re-evaluates actual performance once ground-truth labels become available, triggering retraining when the model degrades.

---

## Key Connections
- **Day 2 (data leakage):** Training-serving skew IS data leakage, discovered in production.
- **Day 4 (evaluation metrics):** Model performance monitoring = re-applying Day 4's metrics over time on live data.
- **Day 5 (scaling, dimensionality):** K-Means and DBSCAN need scaling and degrade in high dimensions — PCA is often used as preprocessing.
- **Day 6 (ensembles):** A model that looks better on offline metrics can have hidden skew issues that only surface through monitoring.

---

## Common Misconceptions
1. **"K-means finds the 'true' clusters."** — It finds a locally optimal partition under its spherical-cluster assumption; the underlying structure might not be spherical.
2. **"Monitoring starts once the model deploys."** — You need a baseline from training-time distributions before deployment.
3. **"Data drift and concept drift are the same thing."** — Data drift is input shift; concept drift is input-to-target relationship shift, which is the more dangerous of the two.
4. **"A model that passes offline evaluation is safe indefinitely."** — Offline eval is a point-in-time snapshot; the real world keeps changing.
5. **"Batch inference is just a worse version of online inference."** — It's a legitimate architecture choice when staleness is acceptable, and it's far cheaper and simpler.

---

## Out of Scope
- Exact silhouette-score or Isolation Forest path-length formula derivations.
- Specific tool APIs (MLflow, DVC, Kubernetes autoscaling internals).
- Formal Adjusted Rand Index / Normalized Mutual Information computation.

---

## Q&A Drill

<!-- QA_START -->

#### [QA: d07-qa-001]
**Question:**
How does K-Means group data, and what does it attempt to minimize?

**Answer:**
K-Means groups data by assigning points to the nearest centroid and recomputing centroids as the mean of the assigned points. It attempts to minimize inertia (within-cluster variance / sum of squared distances).

**Tags:** clustering, k-means
**Linked Cards:** d07-k-means

#### [QA: d07-qa-002]
**Question:**
What are two common ways to determine the optimal number of clusters (K) for K-Means?

**Answer:**
The Elbow method (plotting inertia vs K and looking for the point of diminishing returns) and the Silhouette score (measuring cohesion vs separation).

**Tags:** clustering, k-means, hyperparameters
**Linked Cards:** d07-k-means-choosing-k

#### [QA: d07-qa-003]
**Question:**
How does DBSCAN define clusters, and what are its two key parameters?

**Answer:**
DBSCAN defines clusters as continuous regions of high density. Its two key parameters are `eps` (radius) and `min_samples` (minimum points in the radius to be considered dense).

**Tags:** clustering, dbscan
**Linked Cards:** d07-dbscan

#### [QA: d07-qa-004]
**Question:**
Name three key differences between K-Means and DBSCAN.

**Answer:**
1. K-Means requires K upfront; DBSCAN does not. 2. K-Means assumes spherical clusters; DBSCAN handles arbitrary shapes. 3. K-Means forces all points into clusters (sensitive to outliers); DBSCAN explicitly labels sparse points as noise/outliers.

**Tags:** clustering, k-means, dbscan
**Linked Cards:** d07-k-means-vs-dbscan

#### [QA: d07-qa-005]
**Question:**
When should you reach for unsupervised anomaly detection instead of a supervised classifier?

**Answer:**
When labeled anomalies do not exist, or are too rare to effectively train a robust supervised classifier.

**Tags:** anomaly-detection, unsupervised-learning
**Linked Cards:** d07-unsupervised-anomaly-detection

#### [QA: d07-qa-006]
**Question:**
What is the core intuition behind how an Isolation Forest flags an anomaly?

**Answer:**
Anomalies are "few and different," so if you randomly split features, anomalies get isolated into their own leaf nodes in far fewer splits than normal points. A shorter average path length across random trees indicates an anomaly.

**Tags:** anomaly-detection, isolation-forest
**Linked Cards:** d07-isolation-forest

#### [QA: d07-qa-007]
**Question:**
What is training-serving skew, and what is its most common cause?

**Answer:**
It is when the features a model sees in production differ from what it saw during training. It is often caused by feature engineering logic being implemented differently in offline training pipelines vs online serving APIs.

**Tags:** mlops, data-leakage, training-serving-skew
**Linked Cards:** d07-training-serving-skew

#### [QA: d07-qa-008]
**Question:**
What infrastructure component is designed specifically to eliminate training-serving skew?

**Answer:**
A Feature Store. It centralizes feature computation so both offline training and online serving pull the exact same feature definitions.

**Tags:** mlops, feature-store
**Linked Cards:** d07-feature-stores

#### [QA: d07-qa-009]
**Question:**
What is the difference between batch and online inference?

**Answer:**
Batch inference computes predictions periodically on large datasets and serves them from storage. Online inference computes predictions on-demand in real-time as live requests arrive.

**Tags:** mlops, inference, deployment
**Linked Cards:** d07-batch-vs-online-inference

#### [QA: d07-qa-010]
**Question:**
What is the difference between data drift and concept drift?

**Answer:**
Data drift is a shift in the distribution of the input features. Concept drift is a shift in the underlying relationship between the input features and the target variable (a change in the mapping itself).

**Tags:** mlops, monitoring, drift
**Linked Cards:** d07-drift-taxonomy

<!-- QA_END -->
