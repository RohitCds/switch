# Markdown to JSON Converter

The converter reads the strict Markdown schema in `notes/`, validates it, and writes app-ready JSON to `generated/`. It never changes the source note files.

## Usage

### 1. Compile All Days (Default)
Run from the repository root:

```bash
python3 scripts/md_to_json.py
```
This parses and validates all `notes/day_*.md` files, outputs `day_01.json` through `day_24.json`, and generates an `index.json` manifest for app navigation.

### 2. Validate All Days Without Writing
To check for schema compliance without modifying the `generated/` directory:

```bash
python3 scripts/md_to_json.py --check
```

### 3. Compile or Validate a Specific Day
You can target a single day using `--day <N>`:

```bash
# Validate only Day 14
python3 scripts/md_to_json.py --check --day 14

# Compile/update only Day 14 (updates day_14.json and syncs index.json)
python3 scripts/md_to_json.py --day 14
```

### 4. Custom Paths
You can override the input and output folders if needed:

```bash
python3 scripts/md_to_json.py --notes-dir notes --output-dir generated
```

---

## Validation Behavior

- **Strict Validation**: The script validates YAML frontmatter, priority counts, section order, card headers, unique card IDs, non-bulleted bold sections, and Q&A references.
- **Atomic Writes**: During a full compile, validation happens before any output is written. If any note file contains a schema error, compilation aborts with detailed diagnostics and existing generated files remain untouched.
- **Incremental Mode**: When using `--day <N>`, only the target day is validated and written to `generated/day_NN.json`, and `index.json` is updated incrementally.

---

---

# Zero-Knowledge AES-256-GCM Encryption

The `scripts/encrypt_data.py` script encrypts or decrypts all JSON files in `generated/` using **AES-256-GCM** authenticated encryption with PBKDF2 key derivation (100,000 iterations).

### Usage

```bash
# Encrypt all generated JSON files before pushing to GitHub
python3 scripts/encrypt_data.py

# Or pass password directly
python3 scripts/encrypt_data.py --password "your_secret_password"

# Decrypt files back to plaintext for local inspection
python3 scripts/encrypt_data.py --decrypt --password "your_secret_password"
```

When files in `generated/` are encrypted, the web app will prompt for the password on sign-in and decrypt the cards in-memory using the browser's Web Crypto API. On GitHub, the files remain unreadable encrypted ciphertext.

