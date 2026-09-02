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

---

# Recovering `notes/` from `generated/`  (`json_to_notes.py`)

Recovery tool, not part of the normal pipeline. The normal direction is
`notes/` → `generated/`. This reverses it, which works only because every card in
the JSON carries a `markdown` field holding its verbatim source block.

```bash
python3 scripts/json_to_notes.py --generated-dir generated --notes-dir notes
python3 scripts/md_to_json.py --check          # verify the result parses
```

Refuses to overwrite existing note files unless `--force` is passed, and refuses
to run against encrypted JSON.

To prove a rebuild is lossless, compile the recovered notes to a scratch directory
and compare semantically (key order and `ensure_ascii` escaping may differ, content
must not):

```bash
python3 scripts/md_to_json.py --notes-dir notes --output-dir /tmp/roundtrip
python3 -c "import json,pathlib;RT=pathlib.Path('/tmp/roundtrip');print(all(json.dumps(json.load(open(f)),sort_keys=True)==json.dumps(json.load(open(RT/f.name)),sort_keys=True) for f in pathlib.Path('generated').glob('*.json')))"
```

---

# Safety: `--output-dir` is validated before anything is deleted

`write_outputs()` removes the output directory before replacing it. An empty or
unset `--output-dir` resolves to `Path(".")` — the current working directory — and
on 2026-08-27 that deleted the entire project.

`assert_safe_output_dir()` now runs first and refuses:

- an empty string or `.`
- anything resolving to the current working directory, `/`, or `$HOME`
- any existing directory containing files other than `day_XX.json` / `index.json`

Always pass an explicit path. Never pass a shell variable you have not just set.

---

# Schema v2 — tracks, primers, prereqs, roles

**`track:`** (frontmatter, optional, defaults to `core`)
Groups days into curriculum tracks. `notes/` stays flat and the day number remains the
globally unique unit ID — Core is days 1–24, tracks start at 25 — so card IDs never
collide across tracks.

**`**Primer**`** (first section of a card body, optional)
Beginner context written before Core Concept: what you need to already understand for
the card to make sense. It stays inside the card's `markdown` field so the source
round-trips, and is lifted into its own `primer` JSON field so the app can render it as
a collapsible block.

**`- **Prereqs:** id, id`** (card metadata, optional)
Card IDs this card assumes. Validated across the whole curriculum after every file is
parsed, so a prereq may point at any day. Skipped for `--day N` builds, where the full
card set is not in scope.

## Role manifests (`roles/*.md`)

A role owns **no content** — it references card IDs that already exist, so it cannot
drift from the cards it points at. A reference to an unknown ID fails the build.

```markdown
---
slug: servicenow-ai-agent-engineer     # must match the filename
company: "ServiceNow"
role: "AI Agent Engineer (Moveworks)"
seniority: "5+ years"                  # optional
source: "job_descriptions.md#C12"      # optional
captured: 2026-09-02                   # optional
priority: high                         # optional: high | medium | low
---

Prose summary of what this interview actually weights.

### Agent fundamentals
One or two lines on why this group matters for this role.

- d25-what-an-agent-is
- d25-tool-calling
```

Compiles to `generated/roles.json`. Build with:

```bash
python3 scripts/md_to_json.py --notes-dir notes --output-dir generated --roles-dir roles
```

`roles/` is gitignored alongside `notes/` — the GitHub repo is public, and a role
manifest names target companies. `roles.json` lands inside `generated/`, which
`encrypt_data.py` encrypts before any push.
