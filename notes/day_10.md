---
day: 10
title: "CNNs/RNNs (COMPRESSED) + NLP FOUNDATIONS"
topics:
  - deep-learning
  - nlp
tags:
  - deep-learning
  - nlp
priority_distribution:
  must_know: 7
  should_know: 5
  nice_to_know: 0
---

# DAY 10 — CNNs/RNNs (COMPRESSED) + NLP FOUNDATIONS

## Daily Objective
CNNs and RNNs get compressed treatment today — they're not your target architectures, and the goal is recognition-level understanding plus knowing why Transformers superseded RNNs for NLP, which is the direct bridge into tomorrow. NLP foundations (tokenization, embeddings, positional information, encoder/decoder framing) get real depth, since everything from here through Day 16 builds on it directly.

---

## Syllabus & Priority Breakdown
- 🔴 **MUST KNOW:** Tokenization, subword tokenization/BPE concept, why embeddings beat one-hot, why positional information must be explicitly injected, sequence-to-sequence framing, encoder vs. decoder.
- 🟡 **SHOULD KNOW (compressed):** CNNs — convolution, kernels, stride, padding, pooling, receptive field. RNNs — hidden state, vanishing gradients across time, LSTM/GRU, why Transformers replaced them.
- 🟢 **NICE TO KNOW:** Exact BPE merge algorithm, LSTM/GRU gate equations, CNN backprop specifics, image-specific architectures (ResNet, etc.).

---

## Knowledge Cards

---

### [CARD: CNNs and Convolution]
<!-- id: d10-cnns-and-convolution -->

- **Priority:** should_know
- **Category:** deep-learning
- **Tags:** cnns, convolution, computer-vision

**Core Concept**
Images have spatial structure that plain fully-connected layers ignore entirely. Convolution uses a small filter/kernel (e.g., 3x3) that slides across the image, computing a dot product at each position to produce a feature map.

**Why It Matters**
Flattening an image into a vector destroys spatial relationships and results in a massive parameter count. Convolution allows the network to recognize that a feature (like an edge or an ear) is the same regardless of its position in the image.

**Mental Model / Mechanics**
- **Kernels/filters:** Learn to detect specific patterns (edges in early layers, abstract features later).
- **Weight sharing:** The same filter is reused at every position, dramatically reducing parameter count and providing translation invariance.
- **Stride:** How many pixels the filter moves per step. Larger stride → smaller output.
- **Padding:** Adding border pixels to control output size ("same" preserves, "valid" shrinks).
- **Pooling (max or average):** Downsamples feature maps, reducing spatial size.
- **Receptive field:** How much of the original input a neuron "sees"; grows as convolutional layers are stacked.

**Failure Modes / Tradeoffs**
- CNNs are excellent for grid-like topology (images) but less suited for sequence data or unstructured data compared to other architectures.

**Interview-Ready Explanation**
> CNNs solve the problem of spatial structure in images by using sliding filters (convolution). This introduces weight sharing and translation invariance, vastly reducing parameter counts while capturing localized patterns compared to fully-connected layers.

---

### [CARD: RNN Hidden State]
<!-- id: d10-rnn-hidden-state -->

- **Priority:** should_know
- **Category:** deep-learning
- **Tags:** rnns, hidden-state, sequences

**Core Concept**
An RNN processes sequential data by maintaining a hidden state vector that carries forward information from everything seen so far, updated at every time step.

**Why It Matters**
Plain feedforward networks have no built-in notion of "what came before." The hidden state is the memory mechanism that allows RNNs to process variable-length sequences where order matters.

**Mental Model / Mechanics**
```
h_t = f(W_h · h_{t-1} + W_x · x_t + b)
```
The same weights (`W_h`, `W_x`) are reused at every timestep. This is weight sharing across time, which is the sequential analogue of CNN's weight sharing across space.

**Failure Modes / Tradeoffs**
- The sequential nature means processing must happen one step at a time, preventing parallelization during training.

**Interview-Ready Explanation**
> An RNN processes sequences by updating a hidden state vector at each time step based on the current input and the previous hidden state. It reuses the same weights across time, giving it a built-in sense of order and memory.

---

### [CARD: RNN Vanishing Gradients Across Time]
<!-- id: d10-rnn-vanishing-gradients-across-time -->

- **Priority:** should_know
- **Category:** deep-learning
- **Tags:** rnns, vanishing-gradients, backprop-through-time

**Core Concept**
Training an RNN uses backpropagation through time (BPTT). Over long sequences, gradients from early timesteps shrink exponentially as they propagate back, making it hard to learn long-range dependencies.

**Why It Matters**
This is the same vanishing gradient problem seen in deep feedforward networks, but it plays out across timesteps rather than layers. It fundamentally limits the context window a plain RNN can effectively use.

**Mental Model / Mechanics**
As gradients are multiplied by the recurrent weight matrix at each step backwards in time, they diminish. If the relevant context for a prediction occurred 50 steps ago, the gradient signal will have decayed to nearly zero by the time it reaches that step.

**Interview-Ready Explanation**
> Plain RNNs suffer from vanishing gradients across time. Because they are trained using backpropagation through time, gradients shrink over many sequential steps, making it very difficult for the network to learn long-range dependencies.

---

### [CARD: LSTM / GRU]
<!-- id: d10-lstm-gru -->

- **Priority:** should_know
- **Category:** deep-learning
- **Tags:** rnns, lstm, gru, gating

**Core Concept**
Long Short-Term Memory (LSTM) and Gated Recurrent Units (GRU) are RNN variants that introduce explicit gating mechanisms to control the flow of information across timesteps.

**Why It Matters**
These architectures mitigate (but do not completely eliminate) the vanishing gradient problem, allowing RNNs to capture much longer dependencies than plain RNNs.

**Mental Model / Mechanics**
- **LSTM:** Uses a forget gate, input gate, and output gate to manage a cell state and hidden state.
- **GRU:** A simpler variant with a reset gate and update gate.
Both mechanisms allow information to flow across many timesteps more directly without being subjected to continuous matrix multiplications that cause gradients to vanish.

**Failure Modes / Tradeoffs**
- Even with gating, information connecting very distant tokens still has to flow through many sequential steps, and training is still strictly sequential (slow).

**Interview-Ready Explanation**
> LSTMs and GRUs are RNN architectures that use gating mechanisms (like forget and input gates) to manage information flow. This allows them to mitigate the vanishing gradient problem across time and learn longer-range dependencies.

---

### [CARD: Why Transformers Replaced RNNs]
<!-- id: d10-why-transformers-replaced-rnns -->

- **Priority:** should_know
- **Category:** nlp
- **Tags:** transformers, rnns, attention

**Core Concept**
Transformers replaced RNNs in NLP because they solve two fundamental flaws: the inability to parallelize computation and the difficulty of capturing long-range dependencies.

**Why It Matters**
This shift enabled the massive scaling of language models. Without parallelization across sequences, training modern LLMs on trillions of tokens would be computationally unfeasible.

**Mental Model / Mechanics**
1. **No parallelization:** RNNs process one timestep at a time, sequentially. Transformers process all tokens simultaneously.
2. **Long-range dependencies:** In RNNs, information must flow through many sequential steps. With Transformers, the Attention mechanism allows every position to directly access every other position in one step, regardless of distance.

**Interview-Ready Explanation**
> Transformers replaced RNNs primarily because they allow for parallelization during training, and their attention mechanism solves the long-range dependency problem by providing direct connections between all tokens in a sequence, bypassing the sequential bottleneck of RNNs.

---

### [CARD: Tokenization]
<!-- id: d10-tokenization -->

- **Priority:** must_know
- **Category:** nlp
- **Tags:** tokenization, text-processing

**Core Concept**
Tokenization is the process of breaking raw text into discrete units (tokens) that a model can process.

**Why It Matters**
Models cannot process raw strings; they need a sequence of discrete elements. The choice of tokenization fundamentally impacts vocabulary size, sequence length, and the model's ability to handle rare words.

**Mental Model / Mechanics**
- **Word-level:** Splits by spaces/punctuation. Simple, but produces huge vocabularies and suffers from the out-of-vocabulary (OOV) problem for unseen words.
- **Character-level:** Tiny vocabulary, no OOV problem, but loses per-token semantic meaning and produces extremely long sequences.
- **Subword:** The modern standard. Common words stay whole; rare/unseen words are broken into meaningful subword pieces (e.g. "unhappiness" → "un" + "happi" + "ness").

**Interview-Ready Explanation**
> Tokenization converts raw text into discrete units. Modern models use subword tokenization to balance sequence length and vocabulary size, ensuring common words remain whole while rare words are broken down to avoid out-of-vocabulary errors.

---

### [CARD: Byte-Pair Encoding (BPE)]
<!-- id: d10-byte-pair-encoding -->

- **Priority:** must_know
- **Category:** nlp
- **Tags:** bpe, tokenization, subword

**Core Concept**
Byte-Pair Encoding (BPE) is a standard subword tokenization algorithm that iteratively merges the most frequently co-occurring adjacent characters or subwords into single tokens.

**Why It Matters**
BPE allows a model to represent any text using a fixed-size vocabulary without ever encountering an "unknown token" error, as any unseen word can simply be constructed from smaller subword or character tokens.

**Mental Model / Mechanics**
1. Start with individual characters as the base vocabulary.
2. Iteratively find the most frequently co-occurring adjacent pair.
3. Merge it into a new single token and add it to the vocabulary.
4. Repeat until reaching the target vocabulary size (e.g., 50,000 tokens).

**Example**
Frequent substrings collapse into single tokens; rare words stay split into smaller pieces.

**Interview-Ready Explanation**
> Byte-Pair Encoding is a subword tokenization algorithm. It initializes with characters and iteratively merges the most frequent adjacent pairs into new tokens until a target vocabulary size is reached. This effectively handles rare words by breaking them into known subwords.

---

### [CARD: Vocabulary]
<!-- id: d10-vocabulary -->

- **Priority:** must_know
- **Category:** nlp
- **Tags:** vocabulary, tokenization

**Core Concept**
A vocabulary is the fixed, finite set of all tokens a model can produce or consume, built from the training corpus via the tokenization algorithm.

**Why It Matters**
It defines the exact inputs and outputs of the model. Every token maps to a specific integer ID, and this integer ID is what actually enters the neural network.

**Mental Model / Mechanics**
Text is tokenized into chunks, and each chunk is looked up in the vocabulary mapping to get its corresponding integer ID. The size of this vocabulary directly impacts the size of the embedding and output layers of the model.

**Interview-Ready Explanation**
> The vocabulary is the fixed set of all tokens generated by the tokenizer. Every token corresponds to a unique integer ID, which acts as the actual input to the neural network model.

---

### [CARD: Embeddings / Word Embeddings]
<!-- id: d10-embeddings -->

- **Priority:** must_know
- **Category:** nlp
- **Tags:** embeddings, representation, one-hot

**Core Concept**
An embedding layer maps each arbitrary token ID to a dense, learned, continuous vector (e.g., 768 dimensions) that encodes semantic meaning.

**Why It Matters**
Unlike raw IDs or one-hot vectors, embeddings capture relationships. The training process itself discovers that semantically related words should sit near each other in the vector space, serving as the direct foundation for vector search.

**Mental Model / Mechanics**
- **One-hot encoding:** Treats every word as equally different (orthogonal). It has no notion of similarity, and the vectors are sparse and vocabulary-sized (e.g., 50,000 dimensions).
- **Embeddings:** Dense, lower-dimensional, and learned. "King" and "Queen" will have similar embedding vectors because they appear in similar contexts.

**Interview-Ready Explanation**
> Embeddings map token IDs into dense, learned vectors that capture semantic meaning, placing related words near each other in vector space. They are a massive upgrade over one-hot encoding because they are dense and similarity-aware rather than sparse and orthogonal.

---

### [CARD: Positional Information]
<!-- id: d10-positional-information -->

- **Priority:** must_know
- **Category:** nlp
- **Tags:** transformers, position, embeddings

**Core Concept**
Because Transformers process sequences in parallel, they have no inherent sense of word order. Positional encodings must be explicitly injected to give the model sequence awareness.

**Why It Matters**
Without positional information, a Transformer treats the sequence as a "bag of words." The sentence "the cat sat on the mat" would look identical to "the mat sat on the cat."

**Mental Model / Mechanics**
Positional encodings (either learned or mathematically derived via sinusoids) are added directly to the token embeddings before they enter the transformer layers, explicitly tagging each vector with its position in the sequence.

**Interview-Ready Explanation**
> Unlike RNNs, Transformers process all tokens in parallel and have no built-in notion of order. Positional encodings are explicitly added to token embeddings so the model can distinguish between identical words in different positions.

---

### [CARD: Sequence-to-Sequence]
<!-- id: d10-sequence-to-sequence -->

- **Priority:** must_know
- **Category:** nlp
- **Tags:** seq2seq, architecture

**Core Concept**
Sequence-to-sequence (seq2seq) is a general task framing: mapping an input sequence to an output sequence, potentially of a different length.

**Why It Matters**
Many core NLP tasks follow this shape natively, including translation, summarization, and transcription. Both older RNN-based architectures and modern Transformers are built to solve tasks shaped like this.

**Mental Model / Mechanics**
An input sequence of length $N$ is encoded into a representation, which is then used to generate an output sequence of length $M$.

**Interview-Ready Explanation**
> Sequence-to-sequence is a framing for tasks that map an input sequence to an output sequence of potentially different length, like translation or summarization.

---

### [CARD: Encoder vs. Decoder]
<!-- id: d10-encoder-vs-decoder -->

- **Priority:** must_know
- **Category:** deep-learning
- **Tags:** architecture, encoder, decoder, transformers

**Core Concept**
The two main components of sequence models:
- **Encoder:** Reads the entire input sequence and builds a contextual representation.
- **Decoder:** Generates the output sequence, one token at a time, using the encoder's representation and/or previously generated tokens.

**Why It Matters**
Understanding the difference clarifies why different Transformer architectures are chosen for different tasks.

**Mental Model / Mechanics**
Three architectural patterns:
| Pattern | Example | Good for |
|---|---|---|
| **Encoder-only** | BERT-style | Understanding tasks — classification, embeddings |
| **Decoder-only** | GPT-style, most modern LLMs | Generation — predict the next token |
| **Encoder-decoder** | T5, original Transformer, Flan-T5 | Sequence-transformation tasks — translation, summarization |

**Common Misconceptions**
- *Encoder-decoder is the only LLM architecture.* False: Most modern generative LLMs are decoder-only.

**Interview-Ready Explanation**
> An encoder reads an entire input sequence to build a representation, while a decoder generates an output sequence token-by-token. Encoder-only models excel at understanding, decoder-only models dominate generation tasks, and encoder-decoder models handle sequence transformation.

---

## Key Connections
- **Day 9 (vanishing gradients):** reappears identically for RNNs, across TIME instead of LAYERS.
- **Day 5 (one-hot encoding):** embeddings are the "upgrade" — dense, learned, similarity-aware.
- **Day 8 (softmax):** reappears for the output layer of language models predicting next-token probability distribution.
- **Forward:** Day 11 (attention solves RNN's problems), Day 12 (positional encoding mechanics + full Transformer), Day 14 (embeddings as foundation of vector search/RAG retrieval).

---

## Common Misconceptions
1. **"RNNs are used in most modern LLMs."** — No — decoder-only Transformers dominate.
2. **"LSTM fully solves vanishing gradients."** — It mitigates, doesn't eliminate.
3. **"Tokenization just means splitting on spaces."** — Modern tokenization uses subword algorithms like BPE.
4. **"Embeddings and one-hot encoding are basically the same idea."** — They're not — one-hot is sparse, fixed, similarity-blind; embeddings are dense, learned, similarity-aware.
5. **"Encoder-decoder is the default/only LLM architecture."** — Most modern LLMs are decoder-only.

---

## Out of Scope
- CNN backpropagation mechanics or specific architectures (ResNet, VGG).
- Exact LSTM/GRU gate equations.
- Precise BPE merge-selection implementation.
- Sinusoidal vs. learned positional encoding formulas — Day 12.

---

## Q&A Drill
<!-- QA_START -->

#### [QA: d10-qa-001]
**Question:** How does convolution help solve the parameter count problem compared to fully connected layers for images?
**Answer:** Convolution uses weight sharing by sliding the same small filter across the entire image. This means a single filter only has a few parameters (e.g., 9 for a 3x3 kernel) but can be applied everywhere, vastly reducing the parameter count compared to flattening the image and connecting every pixel to every neuron.
**Tags:** cnns, deep-learning
**Linked Cards:** d10-cnns-and-convolution

#### [QA: d10-qa-002]
**Question:** What is the hidden state in an RNN and why is it necessary?
**Answer:** The hidden state is a vector updated at every time step that carries forward information from previous inputs. It is necessary because plain feedforward networks have no memory, so the hidden state gives the RNN a way to maintain context and process sequential data where order matters.
**Tags:** rnns, deep-learning
**Linked Cards:** d10-rnn-hidden-state

#### [QA: d10-qa-003]
**Question:** Explain the vanishing gradient problem in the context of RNNs.
**Answer:** RNNs are trained using backpropagation through time. During this process, gradients are repeatedly multiplied by the recurrent weight matrix. For long sequences, these gradients can shrink exponentially, making it nearly impossible for the network to learn long-range dependencies from many steps ago.
**Tags:** rnns, gradients
**Linked Cards:** d10-rnn-vanishing-gradients-across-time

#### [QA: d10-qa-004]
**Question:** Do LSTMs and GRUs completely solve the vanishing gradient problem?
**Answer:** No, they mitigate it but do not completely eliminate it. Their gating mechanisms allow information to bypass continuous matrix multiplications, but information still has to flow sequentially through many steps for distant tokens, which is inherently lossy and limits long-range context.
**Tags:** rnns, lstm
**Linked Cards:** d10-lstm-gru

#### [QA: d10-qa-005]
**Question:** What are the two primary reasons Transformers replaced RNNs in natural language processing?
**Answer:** 1) Transformers can process entire sequences in parallel, whereas RNNs are fundamentally sequential, making Transformers vastly faster to train. 2) Transformers use attention mechanisms to connect any two tokens directly in one step, solving the long-range dependency problem that RNNs struggled with.
**Tags:** nlp, transformers, rnns
**Linked Cards:** d10-why-transformers-replaced-rnns

#### [QA: d10-qa-006]
**Question:** Why is subword tokenization preferred over word-level or character-level tokenization in modern models?
**Answer:** Word-level tokenization results in massive vocabularies and out-of-vocabulary errors for rare words. Character-level tokenization solves OOV but creates extremely long sequences without inherent semantic meaning. Subword tokenization balances this by keeping common words intact while breaking rare words into manageable, meaningful subword chunks.
**Tags:** nlp, tokenization
**Linked Cards:** d10-tokenization

#### [QA: d10-qa-007]
**Question:** Briefly explain the Byte-Pair Encoding (BPE) algorithm.
**Answer:** BPE starts with individual characters as its vocabulary. It iteratively finds the most frequent adjacent pair of tokens and merges them into a single new token. This process repeats until a pre-defined target vocabulary size is reached, causing common words to become single tokens while rare words remain constructed of smaller subwords.
**Tags:** nlp, tokenization, bpe
**Linked Cards:** d10-byte-pair-encoding

#### [QA: d10-qa-008]
**Question:** What does a model's vocabulary represent in the context of NLP?
**Answer:** The vocabulary is the fixed set of all tokens the tokenizer can produce, built from the training data. Every unique token in the vocabulary is assigned a specific integer ID, which is the actual numerical input fed into the model.
**Tags:** nlp, vocabulary
**Linked Cards:** d10-vocabulary

#### [QA: d10-qa-009]
**Question:** Why are learned embeddings fundamentally better than one-hot encodings for representing words?
**Answer:** One-hot encodings are extremely high-dimensional, sparse, and treat every word as completely orthogonal with no measure of similarity. Embeddings map tokens to dense, lower-dimensional vectors where the training process naturally places semantically related words near each other in vector space.
**Tags:** nlp, embeddings
**Linked Cards:** d10-embeddings

#### [QA: d10-qa-010]
**Question:** Why must positional information be explicitly injected into a Transformer model?
**Answer:** Unlike RNNs which process sequences one step at a time in order, Transformers process all tokens simultaneously in parallel. Without explicit positional encodings added to the input embeddings, the model would treat the sequence as an unordered "bag of words" and couldn't distinguish word order.
**Tags:** nlp, transformers, position
**Linked Cards:** d10-positional-information

#### [QA: d10-qa-011]
**Question:** Describe the general framing of a sequence-to-sequence task.
**Answer:** A sequence-to-sequence task involves taking an input sequence of variable length and mapping it to an output sequence of a potentially different length. Classic examples include machine translation and text summarization.
**Tags:** nlp, seq2seq
**Linked Cards:** d10-sequence-to-sequence

#### [QA: d10-qa-012]
**Question:** Contrast the primary use cases for encoder-only, decoder-only, and encoder-decoder architectures.
**Answer:** Encoder-only models (like BERT) are best for understanding tasks like classification or generating embeddings. Decoder-only models (like GPT) are best for generative tasks predicting the next token. Encoder-decoder models (like T5) are best suited for sequence-to-sequence transformation tasks like translation or summarization.
**Tags:** nlp, architecture
**Linked Cards:** d10-encoder-vs-decoder

<!-- QA_END -->
