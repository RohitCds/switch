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

## Output Schema

Each `generated/day_XX.json` contains:
- Frontmatter metadata (`day`, `title`, `topics`, `tags`, `priority_distribution`)
- Top-level Markdown sections (`daily_objective_markdown`, `syllabus_markdown`, `key_connections_markdown`, etc.)
- `cards`: List of cards with metadata (`id`, `title`, `priority`, `category`, `tags`) + `content_markdown` and complete `markdown`
- `qa_drill`: List of Q&A drill entries with `id`, `question`, `answer`, `tags`, and `linked_card_ids`

`generated/index.json` provides an aggregate manifest of all compiled days, their card counts, Q&A counts, priority distributions, and relative paths.

