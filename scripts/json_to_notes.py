#!/usr/bin/env python3
"""Rebuild the canonical Markdown notes from generated JSON.

This is a recovery tool, not part of the normal pipeline. The normal direction is
notes/ -> generated/ via md_to_json.py. This reverses it, which is only possible
because every card in the JSON carries a `markdown` field holding its verbatim
source block.

Run from the repository root:
    python3 scripts/json_to_notes.py --generated-dir generated --notes-dir notes

Then verify the round trip:
    python3 scripts/md_to_json.py --check
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

SECTION_ORDER = (
    ("Daily Objective", "daily_objective_markdown"),
    ("Syllabus & Priority Breakdown", "syllabus_markdown"),
    ("Knowledge Cards", None),
    ("Key Connections", "key_connections_markdown"),
    ("Common Misconceptions", "common_misconceptions_markdown"),
    ("Out of Scope", "out_of_scope_markdown"),
    ("Q&A Drill", None),
)
PRIORITY_ORDER = ("must_know", "should_know", "nice_to_know")
DAY_JSON_RE = re.compile(r"^day_(\d{2})\.json$")


def render_frontmatter(day: dict[str, Any]) -> str:
    title = day["title"]
    if '"' in title:
        raise ValueError(f"day {day['day']}: title contains a double quote, cannot emit safely")
    lines = ["---", f"day: {int(day['day'])}"]
    track = day.get("track", "core")
    if track != "core":
        lines.append(f"track: {track}")
    lines += [f'title: "{title}"', "topics:"]
    lines += [f"  - {item}" for item in day["topics"]]
    lines.append("tags:")
    lines += [f"  - {item}" for item in day["tags"]]
    lines.append("priority_distribution:")
    distribution = day["priority_distribution"]
    for priority in PRIORITY_ORDER:
        lines.append(f"  {priority}: {int(distribution.get(priority, 0))}")
    lines.append("---")
    return "\n".join(lines)


def render_cards(cards: list[dict[str, Any]]) -> str:
    blocks = []
    for card in cards:
        block = card.get("markdown")
        if not block:
            raise ValueError(
                f"card '{card.get('id')}' has no `markdown` field; source cannot be "
                "reconstructed for this card"
            )
        blocks.append(block.rstrip())
    return "\n\n".join(blocks)


def render_qa(qa_drill: list[dict[str, Any]]) -> str:
    parts = ["<!-- QA_START -->"]
    for item in qa_drill:
        parts.append(
            "\n".join(
                [
                    "",
                    f"#### [QA: {item['id']}]",
                    "",
                    f"**Question:** {item['question']}",
                    "",
                    f"**Answer:** {item['answer']}",
                    "",
                    f"**Tags:** {', '.join(item['tags'])}",
                    "",
                    f"**Linked Cards:** {', '.join(item['linked_card_ids'])}",
                ]
            )
        )
    parts.append("\n<!-- QA_END -->")
    return "\n".join(parts)


def render_day(day: dict[str, Any]) -> str:
    chunks = [render_frontmatter(day), ""]
    for heading, key in SECTION_ORDER:
        chunks.append(f"## {heading}")
        chunks.append("")
        if heading == "Knowledge Cards":
            body = render_cards(day["cards"])
        elif heading == "Q&A Drill":
            body = render_qa(day["qa_drill"])
        else:
            body = str(day[key]).rstrip()
        chunks.append(body)
        chunks.append("")
    return "\n".join(chunks).rstrip() + "\n"


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generated-dir", type=Path, default=root / "generated")
    parser.add_argument("--notes-dir", type=Path, default=root / "notes")
    parser.add_argument("--force", action="store_true", help="overwrite existing note files")
    args = parser.parse_args()

    generated_dir: Path = args.generated_dir
    notes_dir: Path = args.notes_dir

    if not generated_dir.is_dir():
        print(f"error: {generated_dir} is not a directory", file=sys.stderr)
        return 1

    sources = sorted(p for p in generated_dir.iterdir() if DAY_JSON_RE.fullmatch(p.name))
    if not sources:
        print(f"error: no day_XX.json files found in {generated_dir}", file=sys.stderr)
        return 1

    notes_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for source in sources:
        payload = json.loads(source.read_text(encoding="utf-8"))
        if payload.get("encrypted") is True:
            print(f"error: {source.name} is encrypted; decrypt generated/ first", file=sys.stderr)
            return 1
        target = notes_dir / f"day_{int(payload['day']):02d}.md"
        if target.exists() and not args.force:
            print(f"error: {target} already exists (use --force to overwrite)", file=sys.stderr)
            return 1
        try:
            target.write_text(render_day(payload), encoding="utf-8")
        except (KeyError, ValueError) as exc:
            print(f"error: {source.name}: {exc}", file=sys.stderr)
            return 1
        written += 1

    print(f"Reconstructed {written} note file(s) in {notes_dir}.")
    print("Verify with: python3 scripts/md_to_json.py --check")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
