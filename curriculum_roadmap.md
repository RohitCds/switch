# Curriculum Roadmap

Companion to `project_context.md`. Defines what Switch covers going forward, what it
deliberately does not, and how the app is structured to hold it.

Last updated: 2026-09-02, against `Interview/job_descriptions.md` (37 real postings
across Appendices A–C) and `Interview/target_companies.md`.

---

## 1. Guiding principles

### 1.1 Beginner-first, always

The author of this curriculum is building from a beginner base. Every card — including
cards on advanced topics — must be readable without assumed background.

Concretely, this adds one field to the card schema:

- **`primer`** — 2–3 sentences of prerequisite context, written before the Core Concept.
  It answers "what do I need to already understand for this card to make sense?" and
  links to the Core day that teaches it.

A card on multi-agent orchestration does not assume the reader knows what a tool schema
is. It says what a tool schema is, in one plain sentence, and then builds.

**Depth is not the same as jargon.** Cards should stay technically honest and go deep;
they must not be dense. The Day 1 bias/variance card and the Day 6 ensembles cards are
the quality bar.

### 1.2 Scope is driven by the JD file, not by completeness

`Interview/job_descriptions.md` is the source of truth for what gets built. It is
updated in batches. When a new batch lands, re-run the demand read (section 2) and
adjust track priority — do not add a track for a single posting.

### 1.3 Explicitly out of scope

These appear in the JD file but are **not** being learned. Recording them here so the
decision does not get relitigated every batch:

| Excluded | Where it appears | Why |
| :-- | :-- | :-- |
| CUDA / C++ kernel programming | NVIDIA DevTech, PVA, DRIVE; AMD; D. E. Shaw | Multi-year specialist skill; not the target job family |
| TensorRT / Triton internals, ONNX runtime authoring | NVIDIA, Walmart, AMD | Same. Conceptual serving knowledge (Day 22) is kept; kernel work is not |
| DSP / SIMD / VLIW / fixed-point / compiler (LLVM, MLIR) | NVIDIA PVA, NVIDIA DRIVE | Hardware architecture track |
| PhD-gated research roles | NVIDIA Multimedia (PhD + 10 yrs), Sony (A*/A publications) | Hard credential filter |
| Deep multimodal / diffusion / ASR | NVIDIA C8, Qualcomm, recruiter CR1/CR4 | Deferred. Revisit only if targeting those specific startup/specialist roles |
| KDB+/Q, tick data | Goldman Systematic Credit | Only if going hard at quant strats desks |

**Kept despite being adjacent to the above:** Day 22 (LLM inference & serving). It is
*reasoning about* throughput, memory bounds, batching and quantization — which comes up
constantly in applied system-design rounds — not low-level kernel work.

---

## 2. Demand read (2026-09-02)

37 real postings analysed. The target list splits into two job families:

**Family 1 — Applied GenAI / agentic product engineering.** Cisco, Salesforce, Apple,
NVIDIA (enterprise platform), Databricks, Flipkart, JPMorganChase (Applied AI),
ServiceNow, Deutsche Bank, Optum, Palo Alto Networks, Swiggy.
Wants: agents, RAG, LLM evaluation, cloud platform fluency, MLOps, production reasoning.
**This is the primary target.** Existing resume projects (RAG + ChromaDB, Flan-T5 LoRA +
PPO) already fit here.

**Family 2 — everything else.**
- **2a. Classical DS / quant / risk** — Goldman Sachs, JPMorganChase (Fraud), Visa,
  PhonePe. Secondary target; real volume in India.
- **2b. Systems / silicon** — out of scope (section 1.3).
- **2c. Research** — out of scope (section 1.3).

### Demand frequency

| Capability | Signal | Current coverage |
| :-- | :-- | :-- |
| Agents / agentic systems | **16 of 37 postings (43%)**, 69 mentions | **none** |
| Data flow, traffic, failure handling | implicit in nearly every applied JD; explicit at Cisco, Apple, NVIDIA, Myntra, Walmart, PhonePe, Palo Alto | scattered across Days 18/20/21/22, never as scenario reasoning |
| LLM / agent evaluation as an owned deliverable | ServiceNow, JPMC, Cisco, recruiter CR3 | RAG Triad only (Day 16) |
| RAG + vector search | 36 mentions | strong (Days 14–16) |
| Cloud platform by vendor name | 60+ mentions (Azure AI Foundry, SageMaker, Vertex/Gemini, Databricks, Snowflake) | none |
| Fine-tuning / post-training | 20 mentions; an IC job title at ServiceNow and JPMC | partial (Days 13, 24) |
| Quant / risk: fraud, imbalance, time-series, backtesting, SHAP | ~15 mentions, all new in Batch 3 | none |
| Graph ML | 14 mentions; JPMC Fraud names Graph Networks + GSQL | none |
| AI-assisted coding round | Cisco, Salesforce, Flipkart, Atlassian | none |

---

## 3. Tracks

New material is organised as **tracks**, not as more sequential days. A track is a small
set of days on one capability, with declared prerequisites into Core.

### Tier 1 — build first

**T1. Agents & Tool Use** (~3 days)
The single biggest gap. Build from the mechanics upward:
- What a tool/function call actually is — schema, the model emitting structured args,
  the runtime executing and returning a result. Start here; assume nothing.
- The agent loop: observe → think → act → observe. ReAct.
- Planning: single-shot vs decomposition vs plan-and-execute; when planning helps and
  when it just adds latency and failure surface.
- Memory: scratchpad / short-term, conversation, episodic, semantic. What actually gets
  put back into the context window and why context is the scarce resource.
- Multi-agent patterns: supervisor/worker, hierarchical, debate. Honest treatment of
  when a single agent with good tools beats a multi-agent system.
- Frameworks and protocols: LangGraph (graph/state model), CrewAI, AutoGen, and MCP —
  what problem each one solves, not tutorials.
- Failure modes: loops, tool thrash, cost blowup, silent wrong answers, injection via
  tool output.

**T2. Data Flow, Traffic & Failure Scenarios** (~3 days)
The "how will you handle incoming data — parallel or series? what if X happens?" round.
This is a reasoning skill, so it is drill-heavy by design.

*Day A — mental models:*
- Serial vs parallel vs pipelined, and how to pick.
- Sync vs async, blocking vs non-blocking (grounded in Day 18's concurrency material).
- Batch vs stream vs micro-batch — the real decision criteria (freshness requirement,
  cost, correctness needs), not the marketing version.
- Throughput vs latency vs concurrency; Little's Law in plain language.
- Back-of-envelope capacity math: QPS × service time → concurrency → instances.

*Day B — mechanisms:*
- Queues and backpressure: what actually happens when producers outpace consumers.
- Worker pools, connection pooling, load balancing.
- Rate limiting and quotas (immediately relevant: LLM API 429s).
- Timeouts, retries, exponential backoff with jitter — and why naive retries make
  outages worse.
- Idempotency; at-least-once vs exactly-once; deduplication.
- Circuit breakers, bulkheads, graceful degradation, dead-letter queues.
- Caching layers and invalidation.
- Horizontal vs vertical scaling, autoscaling triggers, cold starts.
- Partitioning and hot-key skew; head-of-line blocking (connects directly to chunked
  prefill on Day 22).

*Day C — scenario drills.* Each is a Q&A card with a structured answer:
- Traffic spikes 10× in five minutes.
- The LLM provider starts returning 429s.
- One user submits a 100K-token prompt and everyone else's latency spikes.
- A GPU node dies mid-batch.
- Kafka consumer lag is growing and not recovering.
- A poison message crashes the consumer on every retry.
- Duplicate events arrive after a network partition.
- The feature store times out at p99.
- Model latency doubles right after a deploy.
- The vector index needs a rebuild during peak traffic.
- An upstream schema changes without warning.
- Costs triple overnight with no traffic change.

**T3. LLM & Agent Evaluation** (~2 days)
Now written into JDs as an owned responsibility, not a footnote.
- Why LLM systems break traditional testing; non-determinism.
- Building a golden/eval set; synthetic generation and its limits.
- LLM-as-judge: how it works, how it is calibrated, its bias failure modes.
- Regression suites and CI for prompts and models; prompt versioning.
- Agent-specific evaluation: trajectory correctness, tool-call accuracy, step/cost
  budgets, task completion.
- Offline vs online; guardrail metrics; shadow evaluation.
- Extends the RAG Triad already on Day 16 rather than repeating it.

### Tier 2 — build next

**T4. Cloud & Platform Literacy** (~2 days)
Named by vendor in 60+ places. Goal is credible fluency and vocabulary, not certification.
- Azure AI Foundry / Azure OpenAI; AWS SageMaker + Bedrock; GCP Vertex AI + Gemini.
- Databricks (workspace, jobs, MLflow, Unity Catalog) and Snowflake — what they are and
  when each is used.
- Containers and orchestration at a working level: Docker, Kubernetes/AKS/EKS concepts.
- The managed-vs-self-hosted decision and how to argue it in an interview.

**T5. Quant & Risk ML** (~2–3 days)
Opens Goldman, JPMorganChase, Visa, PhonePe. Also generally useful DS knowledge.
- Fraud/risk framing; extreme class imbalance and what actually works.
- Cost-sensitive thresholds; precision/recall at operating points that matter.
- Time-series properly: why random splits leak, walk-forward validation, stationarity.
- Backtesting and what a "signal" means; look-ahead bias; survivorship bias.
- Explainability: SHAP, and why regulated industries require it.
- Model governance, documentation, and regulatory expectations.

**T6. AI-Assisted Coding Round** (~1 day, folds into Day 23)
- How the round is scored: verification and judgement, not typing speed.
- Navigating an unfamiliar multi-file repo quickly.
- Writing tests that trap a hallucinated API.
- Verbalising architecture while the assistant generates; treating it as a junior dev.

### Tier 3 — smaller, opportunistic

**T7. LLM Post-Training depth** (~2 days) — deepen Days 13/24: continued pretraining,
SFT data curation, preference optimisation beyond a definition, RLAIF, distillation
(named explicitly in Flipkart's JD), reasoning-model training.

**T8. Graph ML** (~1 day) — JPMorganChase Fraud names Graph Networks and GSQL; Cisco
names graph analytics. Node embeddings, GNN intuition, fraud-ring detection.

### Core quality fixes

Done 2026-09-02:
- ~~Days 11–12 brought up to standard.~~ Day 11 gained GQA/MQA and FlashAttention cards
  and the full variance argument for √d_k (10 cards / 14 drills). Day 12 gained a RoPE
  mechanics card and an Interview-Ready explanation on **all 14** cards that lacked one
  (15 cards / 15 drills).
- ~~Day 24 expanded from 4 cards~~ to 8: knowledge distillation, the
  distil-vs-quantize-vs-prune decision, RLAIF / Constitutional AI, reasoning models and
  test-time compute.
- ~~Day 23 rebuilt~~ around what practice sites don't teach: the AI-assisted coding
  round, reviewing generated code, numerical stability, from-scratch metrics and
  K-means, testing non-deterministic code. DSA practice explicitly moved out of the app.
- ~~Known errors fixed.~~ `d23` standardisation now divides by std not variance;
  `d22-gpu-memory-footprints` now computes on KV heads and leads with the GQA figure
  (~11GB, not ~85GB) while keeping the MHA contrast; `d13-lora-mechanism` now covers
  α/r scaling and A-random/B-zero initialisation.

Still outstanding:
- **Primers on the remaining core days.** Done for Days 8–13 (the neural-net →
  transformer → fine-tuning arc, 77 cards at 100% coverage) on 2026-09-02. Days 1–7 and
  14–22 still carry no beginner context. Overall coverage is 107/373 cards.
- **Re-grade core priorities.** Still ~336 cards at 265/64/2 — the priority filter
  carries no signal on core days. Tracks already use a real spread.
- **Day 22 is under-drilled** — 13 cards, 5 drills.
- Add GraphRAG, HyDE, RRF to Days 15–16.
- Add statistics depth (hypothesis testing, CLT, MLE, PCA/SVD, A/B power).
- Depth spot-check on Days 17–20, which were scored on structure rather than a full read.
- The duplicate `markdown` field is **kept** deliberately — it is what makes `notes/`
  recoverable via `json_to_notes.py`.

---

## 4. App structure

Three layers. Content lives in exactly one place; roles are views over it.

### Layer 1 — Core
Existing Days 1–24. Sequential, beginner-first, the foundation everything else
references as a prerequisite.

### Layer 2 — Tracks
The modules in section 3. Same card schema, same Learn/Drill/Notes views. Non-sequential:
a track can be started without finishing Core, and each track day declares its Core
prerequisites so the app can warn or link.

### Layer 3 — Role Profiles
**A role profile is a manifest, not content.** It contains no cards of its own — it
references card IDs that already exist in Core and Tracks.

This is the load-bearing decision. Authoring cards per company would duplicate the same
LoRA or RAG card across eight company sections and let them drift. A manifest cannot
drift; it either resolves to a real card ID or the build fails.

A role profile provides:
- **Readiness meter** — "JPMorganChase Applied AI ML Sr Associate: 61% of referenced
  cards completed."
- **Gap list** — exactly which referenced cards have not been studied.
- **Role-targeted drill** — quiz only on Q&A items linked to that role's cards, gathered
  across every day the role touches. Built 2026-09-02.
- A short "why this matters here" note per card group, tying the theory to that JD.

Source layout (as built, 2026-09-02):

```
notes/
  day_01.md … day_24.md             # Layer 1 — track: core
  day_25.md …                       # Layer 2 — track: agents, data-traffic, …
roles/
  servicenow-ai-agent-engineer.md   # Layer 3 (manifests)
  jpmorganchase-applied-ai-ml.md
  …
```

**`notes/` stays flat, and the day number is the global unit ID.** Nesting tracks in
subdirectories was the original sketch, but two `day_01.md` files under different tracks
would both mint `d01-*` card IDs and collide. Keeping one flat sequence makes IDs
globally unique for free: Core is days 1–24, Agents starts at 25, and each subsequent
track takes the next block. The `track:` field does the grouping the app navigates by,
so day numbers carry identity and tracks carry meaning.

### Schema changes

Card front-matter gains:
- **`track`** — `core` or a track slug. Drives library navigation.
- **`primer`** — optional beginner context block (section 1.1).
- **`prereqs`** — list of card IDs this card assumes.

New file type, `roles/<slug>.md`:
- Front-matter: company, role title, seniority, source (which appendix/ID in
  `job_descriptions.md`), date captured.
- Body: grouped lists of card IDs with a one-line rationale per group.

Converter (`scripts/md_to_json.py`) gains a role-manifest validator that fails loudly
if a manifest references a card ID that does not exist — the same fail-loud discipline
already applied to card schema violations.

### Navigation

The current day sidebar becomes a three-tab library:

- **Core** — the 24-day sequence, as today.
- **Tracks** — grouped by capability, each showing progress and prerequisites.
- **Roles** — target roles with readiness meters, sorted by readiness or priority.

Learn / Drill / Notes views are unchanged in structure; they simply operate over
whichever selection is active.

---

## 5. Build sequence

1. ~~**Schema + converter.**~~ **Done 2026-09-02.** `track`, `primer`, `prereqs` and the
   `roles/` manifest type are live in `md_to_json.py` (schema v2), with cross-day prereq
   validation and fail-loud role validation. `index.json` also gained a flat `card_index`
   so views can resolve card titles across days. Scripts were recovered intact, and the
   `--output-dir` delete bug that caused the 2026-08-27 loss is now guarded. The duplicate
   `markdown` field was **kept** — it is what made `notes/` recoverable via
   `json_to_notes.py`, and that outweighs the payload cost.
2. ~~**App structure.**~~ **Done 2026-09-02.** Three-tab library (Core / Tracks / Roles),
   track grouping, role profile view with readiness meter and per-group gap list, and
   cross-day card jump. Role-targeted drill is still outstanding.
3. ~~**UI/UX pass.**~~ **Done 2026-09-02.** Modular type scale, 68ch measure, the "Say this"
   panel for Interview-Ready explanations, obsidian dark mode with jade accent,
   `prefers-color-scheme` support, priority ramp, reader controls (text size, focus mode,
   primer toggle), mobile bottom sheet and Learn-mode swipe. All contrast above WCAG AA.
4. ~~**Author T1 — Agents.**~~ **Done 2026-09-02.** Days 25–27 written and validated
   (18 cards, 24 drills): tools and the agent loop; memory, context engineering and
   planning; multi-agent, orchestration frameworks and MCP. Depth confirmed against
   Day 25 before the rest were written. Priorities use a real spread (roughly 4/2/1
   per day) rather than the near-universal `must_know` of the core days.
5. ~~**Author T2 — Data Flow, Traffic & Failure Scenarios.**~~ **Done 2026-09-02.**
   Days 28–30 (19 cards, 37 drills): latency/throughput/concurrency and Little's Law,
   capacity math, tail latency and fan-out amplification; queues and backpressure,
   retries with jitter, idempotency, circuit breakers, rate limiting; then a
   scenario-answering method plus 15 "what happens if" drills. Builds on Days 18 and 20
   rather than repeating them. Q&A `Linked Cards` now validate globally so synthesis
   days can reference cards from any day.
6. ~~**Author T3 — LLM & Agent Evaluation.**~~ **Done 2026-09-02.** Days 31–32
   (14 cards, 23 drills): why LLM systems break normal testing, golden sets, synthetic
   eval data and its limits, LLM-as-judge with the four judge biases and calibration,
   rubric design; then regression suites in CI, prompt versioning, agent trajectory and
   tool-call accuracy, cost/latency as eval metrics, the offline–online gap, and
   shadow/canary/A-B as measurement instruments. Wired into the ServiceNow and Databricks
   role manifests, which both name evaluation as an owned deliverable.
7. **Core quality fixes** (section 3, "Also outstanding").
8. **T4 Cloud, T5 Quant & Risk, T6 AI-assisted coding**, then Tier 3.

Core content (`notes/core/*.md`) must be rebuilt at some point in parallel — the
generated JSON currently has no markdown source behind it.

---

## 6. Maintaining this document

When a new JD batch is appended to `Interview/job_descriptions.md`:

1. Re-run the demand read — count postings per capability, not mentions.
2. Update the table in section 2.
3. Adjust track priority only if a capability moves by more than a tier.
4. Add role manifests for any posting worth targeting specifically.
5. Add to section 1.3 anything newly and deliberately excluded.
