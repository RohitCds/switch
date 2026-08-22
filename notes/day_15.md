---
day: 15
title: "RAG Architecture: Chunking, Retrieval, Reranking"
topics:
  - rag
  - retrieval
  - chunking
  - reranking
  - vector-search
tags:
  - rag
  - nlp
  - information-retrieval
priority_distribution:
  must_know: 6
  should_know: 3
  nice_to_know: 0
---

# DAY 15 — RAG ARCHITECTURE

## Daily Objective

By the end of today you should be able to walk through a complete RAG pipeline end to end — chunking strategy tradeoffs, retrieval built on Day 14's ANN foundation, why reranking exists as a second stage, hybrid search, metadata filtering, query rewriting, and prompt assembly — and map every stage directly onto your own project's stack (SentenceTransformers → ChromaDB → quantized DeepSeek-R1 via llama.cpp).

---

## Syllabus & Priority Breakdown

- 🔴 **MUST KNOW:** the full pipeline end to end, why RAG exists (and what it doesn't fully solve), chunking tradeoffs, why query and document embeddings must come from the same model, bi-encoder vs. cross-encoder, why reranking is a second stage rather than a replacement for retrieval, prompt/context assembly.
- 🟡 **SHOULD KNOW:** hybrid search (BM25 + semantic), metadata filtering, query rewriting.
- 🟢 **NICE TO KNOW:** exact BM25/reciprocal-rank-fusion formulas, specific reranker model architectures, semantic-chunking NLP implementation details.

---

## Knowledge Cards

---

### [CARD: The Full RAG Pipeline — End to End]
<!-- id: d15-rag-pipeline-end-to-end -->

- **Priority:** must_know
- **Category:** rag
- **Tags:** architecture, pipeline, ingestion, query
**Core Concept**

The RAG pipeline has two phases: Ingestion (documents → chunking → embedding → vector DB) and Query (query → embed → retrieve via ANN → [rerank] → assemble context → LLM → answer).
**Why It Matters**

This is the concrete architecture of modern RAG systems (like your resume project) and understanding the end-to-end flow is essential for building and debugging them.
**Mental Model / Mechanics**

  INGESTION TIME:
  Documents → Chunking → Embedding (SentenceTransformers)
     → Store in vector DB (ChromaDB) with ANN index (HNSW, Day 14)

  QUERY TIME:
  User query → Embed query (SAME model as documents)
     → ANN retrieval (top-K candidates)
     → [optional] Reranking (cross-encoder, smaller precise re-score)
     → Context assembly (format retrieved chunks into a prompt)
     → Augmented prompt → LLM (quantized DeepSeek-R1 via llama.cpp)
     → Generated answer
**Example**

  In your project: raw documents get chunked, embedded via `all-mpnet-base-v2`, and stored in ChromaDB with an HNSW index. A query is embedded similarly, ANN pulls top chunks, they are inserted into a prompt, and a quantized DeepSeek-R1 13B (llama.cpp) generates the answer.
**Failure Modes / Tradeoffs**

  - Errors in any stage (poor chunking, mismatched embedding models, bad prompt formatting) will degrade the final LLM generation quality.
**Interview-Ready Explanation**

  > A RAG pipeline consists of ingestion and query phases. During ingestion, documents are chunked, embedded, and stored in a vector DB. At query time, the query is embedded, similar chunks are retrieved, optionally reranked, and formatted into a prompt for an LLM to generate an answer.

---

### [CARD: Why RAG At All — Recap and Reinforce]
<!-- id: d15-why-rag -->

- **Priority:** must_know
- **Category:** rag
- **Tags:** hallucination, context-window, knowledge-cutoff
**Core Concept**

RAG grounds generation in actually retrieved documents at inference time, allowing the model to "look things up" rather than purely relying on its parametric (trained-in) knowledge.
**Why It Matters**

It solves major LLM limitations: hallucinations (no built-in truth checking), fixed knowledge cutoffs, and limited context windows (can't just include everything).
**Mental Model / Mechanics**

  Instead of: Prompt → LLM → Output (relies purely on internal weights)
  RAG: Prompt → Retrieve Docs → Augmented Prompt → LLM → Output (grounds output in retrieved data)
**Failure Modes / Tradeoffs**

  - RAG does NOT entirely eliminate hallucination risk; the model can still misinterpret, misquote, or misrepresent retrieved content, or incorrectly blend it with parametric knowledge.
**Interview-Ready Explanation**

  > RAG reduces hallucination risk by grounding generation in retrieved real documents rather than relying purely on the model's trained-in knowledge — but it doesn't eliminate the risk entirely, since the model can still misinterpret or misrepresent what was retrieved. It also solves a separate problem beyond hallucination: giving the model access to private or up-to-date information it was never trained on.

---

### [CARD: Chunking Strategies]
<!-- id: d15-chunking-strategies -->

- **Priority:** must_know
- **Category:** rag
- **Tags:** chunking, preprocessing, context
**Core Concept**

Documents must be split into fine-grained chunks before embedding because embedding a full document blurs topics into a single vague vector, hurting retrieval precision, and models have maximum input lengths.
**Why It Matters**

Chunking dictates retrieval precision. Finding a specific relevant passage is better than finding "somewhere in this large document."
**Mental Model / Mechanics**

  - **Fixed-size chunking**: Split into N tokens/chars. Simple, but can cut ideas in half.
  - **Chunk overlap**: Consecutive chunks share text to prevent losing meaning at boundaries, at the cost of redundancy.
  - **Semantic/structure-aware chunking**: Split along natural boundaries (paragraphs, sentences, headers). Produces coherent chunks, but chunk sizes vary and parsing is complex.
**Failure Modes / Tradeoffs**

  - **Chunks too LARGE**: Less precise retrieval, wastes context-window budget.
  - **Chunks too SMALL**: Loses context/coherence, requires retrieving MORE chunks.
**Interview-Ready Explanation**

  > We chunk documents because single embeddings of long documents blur concepts, hurting precision. Fixed-size chunking is simple but can break ideas; semantic chunking is more coherent but complex. The core tradeoff is that large chunks hurt precision and waste context, while small chunks lose broader context and require retrieving more items.

---

### [CARD: Retrieval — Top-K and Embeddings]
<!-- id: d15-retrieval-top-k -->

- **Priority:** must_know
- **Category:** retrieval
- **Tags:** embeddings, ann, top-k
**Core Concept**

Queries must be embedded using the EXACT same model as the documents to ensure they exist in the same vector space, enabling ANN search to find the top-K most similar chunks.
**Why It Matters**

If query and documents are in different vector spaces, similarity comparisons are meaningless. Selecting the right K balances recall and context-window efficiency.
**Mental Model / Mechanics**

  Query → `all-mpnet-base-v2` → Vector space
  Documents → `all-mpnet-base-v2` → Same Vector space
  ANN Search (e.g., HNSW) compares them to find Top-K matches.
**Failure Modes / Tradeoffs**

  - **K too small**: Missing genuinely relevant information.
  - **K too large**: Dilutes context with irrelevant chunks, wastes budget, and can hurt generation quality (irrelevant context distracts the model).
**Interview-Ready Explanation**

  > The query must be embedded with the exact same model used for the documents so their vector spaces align. We then use ANN search to retrieve the top-K chunks. K must be balanced: too small misses information, while too large dilutes the context window with irrelevant data, distracting the model and degrading generation.

---

### [CARD: Reranking and Cross-Encoders]
<!-- id: d15-reranking-cross-encoders -->

- **Priority:** must_know
- **Category:** retrieval
- **Tags:** reranking, cross-encoder, bi-encoder
**Core Concept**

Reranking is a second stage that uses a slower, more accurate cross-encoder to re-score a small set of candidates initially retrieved by a fast bi-encoder (ANN search).
**Why It Matters**

It provides the best of both worlds: the speed of ANN search at scale, combined with the rich, interactive relevance scoring of a cross-encoder on a refined subset.
**Mental Model / Mechanics**

  - **Bi-encoder (Retrieval):** Encodes query & document independently. Fast, coarser relevance, scales to corpus.
  - **Cross-encoder (Reranking):** Encodes query & document jointly. Slow, highly accurate, cannot precompute.
  Pipeline: ANN retrieves Top-50 → Cross-encoder re-scores them → Final Top-5 sent to LLM.
**Failure Modes / Tradeoffs**

  - Cross-encoders are too computationally expensive to run on the entire corpus directly.
**Interview-Ready Explanation**

  > Fast embedding retrieval uses bi-encoders, which are optimized for speed but offer coarse relevance. Reranking introduces a second stage using a cross-encoder, which processes the query and document together for highly accurate relevance scoring. We use the bi-encoder to quickly retrieve a small candidate set (like 50 documents) and the cross-encoder to rerank just those candidates, balancing speed and accuracy.

---

### [CARD: Hybrid Search]
<!-- id: d15-hybrid-search -->

- **Priority:** should_know
- **Category:** retrieval
- **Tags:** hybrid-search, keyword-search, bm25
**Core Concept**

Hybrid search combines semantic (vector) search with traditional keyword/lexical search (like BM25) to capture both semantic meaning and exact term matches.
**Why It Matters**

Pure semantic search can miss results depending on exact keywords, specific product codes, acronyms, or rare terms absent from the embedding model's training data.
**Mental Model / Mechanics**

  Run semantic search → Result Set A
  Run keyword search (BM25) → Result Set B
  Merge sets (e.g., via reciprocal rank fusion) → Final Result Set
**Failure Modes / Tradeoffs**

  - Increases system complexity by requiring two types of search indexes and a score fusion mechanism.
**Interview-Ready Explanation**

  > Pure semantic search can fail on exact keyword matches, rare terms, or product codes. Hybrid search combines semantic vector search with traditional lexical search like BM25, merging the results to get both semantic understanding and exact-match precision.

---

### [CARD: Metadata Filtering]
<!-- id: d15-metadata-filtering -->

- **Priority:** should_know
- **Category:** retrieval
- **Tags:** metadata, filtering, vector-db
**Core Concept**

Attaching structured metadata (e.g., date, author, category) to vector chunks allows filtering the search space before or alongside similarity search.
**Why It Matters**

Meaningfully improves relevance and speeds up retrieval by narrowing down the candidates based on deterministic filters.
**Mental Model / Mechanics**

  User query: "Show me Q3 reports about revenue"
  Filter: `quarter = Q3` AND `topic = finance`
  Vector Search: "revenue" over the filtered subset.
**Interview-Ready Explanation**

  > Vector databases allow attaching metadata to chunks. By applying metadata filters before or during similarity search, we narrow the search space, improving both retrieval speed and accuracy for structured data.

---

### [CARD: Query Rewriting]
<!-- id: d15-query-rewriting -->

- **Priority:** should_know
- **Category:** retrieval
- **Tags:** query-rewriting, prompts, llm
**Core Concept**

Using an LLM to reformulate a user's raw query into a more effective search query before running retrieval.
**Why It Matters**

Raw user queries are often ambiguous, conversational, or miss context from previous chat turns, which perform poorly in similarity search against dense documents.
**Mental Model / Mechanics**

  Raw query: "what did he say about the new feature?"
  + Context (previous turns): user was asking about the CEO's town hall.
  LLM Rewrite: "CEO town hall new feature announcement details"
  → Feed rewritten query to embedding model.
**Interview-Ready Explanation**

  > User queries are often ambiguous or conversational. Query rewriting uses an LLM to reformulate the raw query into an optimal search query, recovering context and matching the vocabulary of the source documents before retrieval.

---

### [CARD: Context Assembly & Prompt Augmentation]
<!-- id: d15-context-assembly -->

- **Priority:** must_know
- **Category:** rag
- **Tags:** prompts, context, llm
**Core Concept**

Formatting retrieved chunks alongside the user's original question into a structured prompt, with clear instructions on how the LLM should use the context.
**Why It Matters**

Prompt engineering at this stage dictates whether the model grounds itself in the context or hallucinates. Explicit instructions (e.g., "admit uncertainty") heavily influence output quality.
**Mental Model / Mechanics**

  Template:
  ```
  Answer the user's question using ONLY the following context. If you don't know, say so.
  
  <Context>
  [Chunk 1]
  [Chunk 2]
  </Context>

  Question: {user_query}
  ```
**Failure Modes / Tradeoffs**

  - Poor formatting or ambiguous instructions can lead the model to ignore the context and rely on its parametric knowledge instead.
**Interview-Ready Explanation**

  > After retrieval and reranking, the chosen chunks are inserted into a prompt template alongside the user's question. The exact prompt design—how chunks are delimited and how the model is instructed to use them (like admitting when it doesn't know)—is critical for ensuring the model actually grounds its generation rather than hallucinating.

---

## Key Connections

- Day 14 (embeddings, ANN/HNSW) └─→ everything today's retrieval step relies on directly
- Day 11 (Q/K/V attention) └─→ the retrieval step IS the query-key-value pattern again, now at corpus scale
- Day 12 (context windows, hallucination) └─→ context window limits are exactly why chunking/top-K tradeoffs exist at all
- Day 7 (k-means) └─→ resurfaces indirectly if your vector DB's ANN index uses IVF-style clustering

---

## Common Misconceptions

1. "RAG eliminates hallucination entirely." It substantially reduces the risk by grounding generation in real content, but the model can still misinterpret or misrepresent what was retrieved.
2. "More retrieved chunks is always better." No — it dilutes relevance, wastes context-window budget, and can actively hurt generation quality.
3. "You can use different (but both good) embedding models for queries and documents." No — they must be the same model, or the vector spaces won't be comparable.
4. "Reranking replaces the need for initial ANN retrieval." No — it's a second stage refining ANN's candidate set; cross-encoders can't scale to the whole corpus on their own.
5. "Semantic search alone is always sufficient; keyword search is obsolete." No — hybrid search exists precisely because certain query types (exact codes, rare terms) are better served by lexical matching.

---

## Out of Scope

- BM25's exact formula.
- Reciprocal rank fusion's exact formula.
- Specific cross-encoder/reranker model architectures or names.
- Semantic chunking's exact NLP implementation details.

---

## Q&A Drill

<!-- QA_START -->
#### [QA: d15-qa-001]
**Question:** Walk through the full RAG pipeline, ingestion time through query time, from memory.
**Answer:** Ingestion: Documents are chunked, embedded via an embedding model (e.g., SentenceTransformers), and stored in a vector DB with an ANN index. Query: The user query is embedded with the *same* model, ANN search pulls the top-K chunks, which are optionally reranked by a cross-encoder. These chunks are inserted into a prompt template with the user's question, and fed to an LLM (e.g., DeepSeek-R1) to generate an answer.
**Tags:** pipeline, rag, end-to-end
**Linked Cards:** d15-rag-pipeline-end-to-end

#### [QA: d15-qa-002]
**Question:** Why does RAG reduce hallucination risk without eliminating it?
**Answer:** It grounds generation in retrieved real documents rather than relying on parametric knowledge, reducing hallucination. However, the LLM can still misinterpret, misquote, or incorrectly blend the retrieved context with its own knowledge, so the risk isn't entirely eliminated.
**Tags:** hallucination, rag
**Linked Cards:** d15-why-rag

#### [QA: d15-qa-003]
**Question:** What's the core chunking tradeoff, and what goes wrong at each extreme?
**Answer:** Chunks that are too large hurt retrieval precision and waste context-window space. Chunks that are too small lose necessary coherence/context and require retrieving more items to answer complex questions.
**Tags:** chunking, context
**Linked Cards:** d15-chunking-strategies

#### [QA: d15-qa-004]
**Question:** Why must query and document embeddings come from the same model?
**Answer:** Because different embedding models create entirely different vector spaces with different geometries. If the query and documents aren't mapped by the same model, their embeddings can't be meaningfully compared for similarity.
**Tags:** embeddings, retrieval
**Linked Cards:** d15-retrieval-top-k

#### [QA: d15-qa-005]
**Question:** Why does increasing top-K not straightforwardly improve generation quality?
**Answer:** While retrieving more chunks increases the chance of finding relevant info (recall), it dilutes the prompt with irrelevant content. This wastes context-window budget and can actively distract or confuse the LLM, reducing generation quality.
**Tags:** top-k, context
**Linked Cards:** d15-retrieval-top-k

#### [QA: d15-qa-006]
**Question:** Explain the difference between a bi-encoder and a cross-encoder.
**Answer:** A bi-encoder embeds queries and documents independently and is fast, making it scalable for searching a full corpus. A cross-encoder processes the query and document jointly, allowing for rich interaction and high accuracy, but it is too computationally expensive to run on a large scale.
**Tags:** reranking, cross-encoder, bi-encoder
**Linked Cards:** d15-reranking-cross-encoders

#### [QA: d15-qa-007]
**Question:** Why is reranking a second stage rather than a full replacement for ANN retrieval?
**Answer:** Cross-encoders (used for reranking) are too slow and expensive to evaluate against every document in a corpus. We must use fast bi-encoders (ANN) to narrow down to a small candidate set, then apply the cross-encoder just to that subset for precise scoring.
**Tags:** reranking, ann, retrieval
**Linked Cards:** d15-reranking-cross-encoders

#### [QA: d15-qa-008]
**Question:** What problem does hybrid search solve that pure semantic search can't?
**Answer:** Pure semantic search captures meaning but can fail on exact keyword matches, specific product codes, acronyms, or rare terms. Hybrid search blends semantic similarity with lexical matching (like BM25) to ensure exact matches aren't missed.
**Tags:** hybrid-search, semantic, keyword
**Linked Cards:** d15-hybrid-search

#### [QA: d15-qa-009]
**Question:** What does metadata filtering add on top of similarity search?
**Answer:** It allows the system to deterministically narrow the search space before or during vector search (e.g., only searching documents from "Q3"), which improves both retrieval speed and relevance.
**Tags:** metadata, filtering
**Linked Cards:** d15-metadata-filtering

#### [QA: d15-qa-010]
**Question:** What is query rewriting solving for, and give an example.
**Answer:** It solves for raw queries that are conversational, ambiguous, or missing context. For example, rewriting "what did he say?" to "CEO town hall announcement details" helps the embedding model match the source document's terminology better.
**Tags:** query-rewriting, llm
**Linked Cards:** d15-query-rewriting

#### [QA: d15-qa-011]
**Question:** Why does how you format the prompt around retrieved chunks actually matter for output quality?
**Answer:** The prompt structure (e.g., delimiters, instructions like "admit uncertainty") dictates how heavily the LLM relies on the context. Bad formatting can lead the model to ignore the context and hallucinate using its parametric knowledge.
**Tags:** prompts, context-assembly
**Linked Cards:** d15-context-assembly
<!-- QA_END -->
