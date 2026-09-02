#!/usr/bin/env python3
"""Validate Flashcards Markdown notes and compile them into app-ready JSON.

Markdown in notes/ is the only authored source. This script only extracts and
validates it; it never changes note files.

Run from the repository root:
    python3 scripts/md_to_json.py
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 2
PRIORITIES = {"must_know", "should_know", "nice_to_know"}
SECTION_NAMES = (
    "Daily Objective",
    "Syllabus & Priority Breakdown",
    "Knowledge Cards",
    "Key Connections",
    "Common Misconceptions",
    "Out of Scope",
    "Q&A Drill",
)
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DAY_FILE_RE = re.compile(r"^day_(\d{2})\.md$")
CARD_HEADER_RE = re.compile(r"^### \[CARD: (.+)\]$")
CARD_ID_RE = re.compile(r"^<!-- id: (d\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*) -->$")
CARD_FIELD_RE = re.compile(r"^- \*\*(Priority|Category|Tags|Prereqs):\*\* ?(.*)$")
CARD_SECTION_RE = re.compile(r"^\*\*(.+?)\*\*$")
ROLE_FILE_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
ROLE_GROUP_RE = re.compile(r"^### (.+)$")
ROLE_CARD_RE = re.compile(r"^- ([a-z0-9]+(?:-[a-z0-9]+)*)$")
DEFAULT_TRACK = "core"
QA_HEADER_RE = re.compile(r"^#### \[QA: (d\d{2}-qa-\d{3})\]$")
QA_FIELD_RE = re.compile(r"^\*\*(Question|Answer|Tags|Linked Cards):\*\* ?(.*)$")


class ValidationError(Exception):
    """Raised when a source note does not conform to the project schema."""


@dataclass
class SourceFileError:
    path: Path
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


def error(path: Path, message: str) -> ValidationError:
    return ValidationError(f"{path}: {message}")


def clean_markdown(lines: list[str]) -> str:
    """Remove only surrounding blank lines; preserve all Markdown within."""
    start = 0
    end = len(lines)
    while start < end and not lines[start].strip():
        start += 1
    while end > start and not lines[end - 1].strip():
        end -= 1
    return "\n".join(lines[start:end])


def parse_scalar(value: str, path: Path, field: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    if not value or value.startswith(("[", "{", "|", ">")):
        raise error(path, f"frontmatter field '{field}' must be a simple scalar")
    return value


def parse_frontmatter(lines: list[str], path: Path) -> tuple[dict[str, Any], int]:
    if not lines or lines[0] != "---":
        raise error(path, "must start with YAML frontmatter delimiter '---'")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise error(path, "frontmatter closing delimiter '---' is missing") from exc

    raw = lines[1:end]
    data: dict[str, Any] = {}
    index = 0
    while index < len(raw):
        line = raw[index]
        if not line.strip():
            index += 1
            continue
        match = re.match(r"^([a-z_]+):(?:\s*(.*))?$", line)
        if not match:
            raise error(path, f"invalid frontmatter line: {line!r}")
        key, value = match.groups()
        if key in data:
            raise error(path, f"duplicate frontmatter field '{key}'")
        value = value or ""
        if value:
            data[key] = parse_scalar(value, path, key)
            index += 1
            continue

        nested: list[str] = []
        index += 1
        while index < len(raw) and raw[index].startswith("  "):
            nested.append(raw[index])
            index += 1
        if not nested:
            raise error(path, f"frontmatter field '{key}' needs a value")
        if all(item.startswith("  - ") for item in nested):
            items = [item[4:].strip() for item in nested]
            if any(not item for item in items):
                raise error(path, f"frontmatter list '{key}' contains an empty item")
            data[key] = items
            continue
        mapping: dict[str, str] = {}
        for item in nested:
            nested_match = re.match(r"^  ([a-z_]+):\s*(.+)$", item)
            if not nested_match:
                raise error(path, f"invalid nested frontmatter line: {item!r}")
            nested_key, nested_value = nested_match.groups()
            if nested_key in mapping:
                raise error(path, f"duplicate frontmatter field '{key}.{nested_key}'")
            mapping[nested_key] = parse_scalar(nested_value, path, f"{key}.{nested_key}")
        data[key] = mapping

    required = {"day", "title", "topics", "tags", "priority_distribution"}
    optional = {"track"}
    missing = required - data.keys()
    if missing:
        raise error(path, f"frontmatter missing required field(s): {', '.join(sorted(missing))}")
    unexpected = set(data) - required - optional
    if unexpected:
        raise error(path, f"unexpected frontmatter field(s): {', '.join(sorted(unexpected))}")
    track = data.get("track", DEFAULT_TRACK)
    if not isinstance(track, str) or not SLUG_RE.fullmatch(track):
        raise error(path, f"frontmatter track '{track}' must be a lowercase slug")
    data["track"] = track
    if not isinstance(data["topics"], list) or not isinstance(data["tags"], list):
        raise error(path, "frontmatter topics and tags must be YAML lists")
    try:
        data["day"] = int(data["day"])
    except ValueError as exc:
        raise error(path, "frontmatter day must be an integer") from exc
    if data["day"] < 1:
        raise error(path, "frontmatter day must be positive")
    return data, end + 1


def split_sections(lines: list[str], path: Path) -> dict[str, list[str]]:
    positions: list[tuple[str, int]] = []
    for index, line in enumerate(lines):
        if line.startswith("## ") and line[3:] in SECTION_NAMES:
            positions.append((line[3:], index))
    names = [name for name, _ in positions]
    if names != list(SECTION_NAMES):
        raise error(path, "sections must appear exactly once and in this order: " + ", ".join(SECTION_NAMES))

    sections: dict[str, list[str]] = {}
    for index, (name, start) in enumerate(positions):
        end = positions[index + 1][1] if index + 1 < len(positions) else len(lines)
        sections[name] = lines[start + 1 : end]
    return sections


def split_tags(value: str, path: Path, context: str) -> list[str]:
    tags = [tag.strip() for tag in value.split(",") if tag.strip()]
    if not tags:
        raise error(path, f"{context} must contain at least one tag")
    invalid = [tag for tag in tags if not SLUG_RE.fullmatch(tag)]
    if invalid:
        raise error(path, f"{context} has non-normalized tag(s): {', '.join(invalid)}")
    if len(set(tags)) != len(tags):
        raise error(path, f"{context} contains duplicate tag(s)")
    return tags


def split_primer(body: str) -> tuple[str, str]:
    """Split a leading **Primer** section off a card body.

    Returns (primer, remaining_body). Cards without a Primer return ("", body).
    The primer stays inside the card's `markdown` field so the source round-trips;
    it is lifted out here so the app can render it as its own collapsible block.
    """
    lines = body.split("\n")
    if not lines:
        return "", body
    first = CARD_SECTION_RE.fullmatch(lines[0].strip())
    if not first or first.group(1).strip().lower() != "primer":
        return "", body
    for index in range(1, len(lines)):
        heading = CARD_SECTION_RE.fullmatch(lines[index].strip())
        if heading:
            return clean_markdown(lines[1:index]), clean_markdown(lines[index:])
    return clean_markdown(lines[1:]), ""


def parse_cards(lines: list[str], path: Path, day: int) -> list[dict[str, Any]]:
    headers = [(index, CARD_HEADER_RE.fullmatch(line)) for index, line in enumerate(lines)]
    headers = [(index, match) for index, match in headers if match]
    if not headers:
        raise error(path, "Knowledge Cards section contains no [CARD: ...] headings")

    cards: list[dict[str, Any]] = []
    expected_prefix = f"d{day:02d}-"
    for card_number, (start, title_match) in enumerate(headers):
        end = headers[card_number + 1][0] if card_number + 1 < len(headers) else len(lines)
        block = lines[start:end]
        title = title_match.group(1).strip()
        if not title:
            raise error(path, f"card at line {start + 1} has an empty title")
        if len(block) < 5:
            raise error(path, f"card '{title}' is incomplete")
        id_match = CARD_ID_RE.fullmatch(block[1])
        if not id_match:
            raise error(path, f"card '{title}' must have exactly one ID directly below its heading")
        card_id = id_match.group(1)
        if not card_id.startswith(expected_prefix):
            raise error(path, f"card '{title}' ID '{card_id}' does not match day {day:02d}")

        fields: dict[str, str] = {}
        position = 2
        while position < len(block):
            if not block[position].strip():
                position += 1
                continue
            field_match = CARD_FIELD_RE.fullmatch(block[position])
            if not field_match:
                break
            key, value = field_match.groups()
            if key in fields or not value.strip():
                raise error(path, f"card '{card_id}' has an invalid {key} field")
            fields[key] = value.strip()
            position += 1
        if not {"Priority", "Category", "Tags"} <= set(fields):
            raise error(path, f"card '{card_id}' must contain Priority, Category, and Tags metadata")
        if fields["Priority"] not in PRIORITIES:
            raise error(path, f"card '{card_id}' has invalid priority '{fields['Priority']}'")
        if not SLUG_RE.fullmatch(fields["Category"]):
            raise error(path, f"card '{card_id}' has non-normalized category '{fields['Category']}'")
        body = clean_markdown(block[position:])
        if not body:
            raise error(path, f"card '{card_id}' has no Markdown body")
        primer, content = split_primer(body)
        if not content:
            raise error(path, f"card '{card_id}' has a Primer but no body after it")

        prereqs: list[str] = []
        if "Prereqs" in fields:
            prereqs = [item.strip() for item in fields["Prereqs"].split(",") if item.strip()]
            if not prereqs:
                raise error(path, f"card '{card_id}' has an empty Prereqs field")
            invalid = [item for item in prereqs if not SLUG_RE.fullmatch(item)]
            if invalid:
                raise error(path, f"card '{card_id}' has malformed prereq id(s): {', '.join(invalid)}")
            if card_id in prereqs:
                raise error(path, f"card '{card_id}' lists itself as a prereq")
            if len(set(prereqs)) != len(prereqs):
                raise error(path, f"card '{card_id}' has duplicate prereq id(s)")

        cards.append(
            {
                "id": card_id,
                "title": title,
                "priority": fields["Priority"],
                "category": fields["Category"],
                "tags": split_tags(fields["Tags"], path, f"card '{card_id}' Tags"),
                "prereqs": prereqs,
                "primer": primer,
                "content_markdown": content,
                "markdown": clean_markdown(block),
            }
        )
    return cards


def parse_qa(lines: list[str], path: Path, day: int, card_ids: set[str]) -> list[dict[str, Any]]:
    start_markers = [index for index, line in enumerate(lines) if line == "<!-- QA_START -->"]
    end_markers = [index for index, line in enumerate(lines) if line == "<!-- QA_END -->"]
    if len(start_markers) != 1 or len(end_markers) != 1 or start_markers[0] >= end_markers[0]:
        raise error(path, "Q&A Drill must contain one correctly ordered QA_START / QA_END marker pair")
    outside = lines[: start_markers[0]] + lines[end_markers[0] + 1 :]
    if any(line.strip() and line.strip() != "---" for line in outside):
        raise error(path, "Q&A Drill may not contain content outside its QA marker pair")

    body = lines[start_markers[0] + 1 : end_markers[0]]
    headers = [(index, QA_HEADER_RE.fullmatch(line)) for index, line in enumerate(body)]
    headers = [(index, match) for index, match in headers if match]
    if not headers:
        raise error(path, "Q&A Drill contains no [QA: ...] entries")

    entries: list[dict[str, Any]] = []
    expected_prefix = f"d{day:02d}-qa-"
    for item_number, (start, header_match) in enumerate(headers):
        end = headers[item_number + 1][0] if item_number + 1 < len(headers) else len(body)
        block = body[start:end]
        qa_id = header_match.group(1)
        if not qa_id.startswith(expected_prefix):
            raise error(path, f"Q&A ID '{qa_id}' does not match day {day:02d}")
        fields: dict[str, list[str]] = {}
        current: str | None = None
        for line in block[1:]:
            match = QA_FIELD_RE.fullmatch(line)
            if match:
                key, value = match.groups()
                if key in fields:
                    raise error(path, f"Q&A '{qa_id}' contains duplicate {key} field")
                fields[key] = [value]
                current = key
            elif current is not None:
                fields[current].append(line)
            elif line.strip():
                raise error(path, f"Q&A '{qa_id}' has content before its first field")
        required = {"Question", "Answer", "Tags", "Linked Cards"}
        if set(fields) != required:
            raise error(path, f"Q&A '{qa_id}' must contain exactly Question, Answer, Tags, and Linked Cards")
        parsed_fields = {key: clean_markdown(value) for key, value in fields.items()}
        if any(not value for value in parsed_fields.values()):
            raise error(path, f"Q&A '{qa_id}' has an empty required field")
        linked_cards = [item.strip() for item in parsed_fields["Linked Cards"].split(",") if item.strip()]
        if not linked_cards:
            raise error(path, f"Q&A '{qa_id}' must link to at least one card")
        # Cross-day links are legitimate on synthesis days, so unknown IDs are not
        # an error here — compile_notes() validates them against the full card set
        # once every file has been parsed.
        entries.append(
            {
                "id": qa_id,
                "question": parsed_fields["Question"],
                "answer": parsed_fields["Answer"],
                "tags": split_tags(parsed_fields["Tags"], path, f"Q&A '{qa_id}' Tags"),
                "linked_card_ids": linked_cards,
            }
        )
    return entries


def parse_day(path: Path) -> dict[str, Any]:
    filename_match = DAY_FILE_RE.fullmatch(path.name)
    if not filename_match:
        raise error(path, "filename must use the day_XX.md pattern")
    lines = path.read_text(encoding="utf-8").splitlines()
    frontmatter, content_start = parse_frontmatter(lines, path)
    file_day = int(filename_match.group(1))
    if frontmatter["day"] != file_day:
        raise error(path, f"frontmatter day {frontmatter['day']} does not match filename day {file_day:02d}")
    sections = split_sections(lines[content_start:], path)
    cards = parse_cards(sections["Knowledge Cards"], path, file_day)
    card_ids = {card["id"] for card in cards}
    if len(card_ids) != len(cards):
        raise error(path, "Knowledge Cards contains duplicate card IDs")
    qa_drill = parse_qa(sections["Q&A Drill"], path, file_day, card_ids)
    qa_ids = [item["id"] for item in qa_drill]
    if len(set(qa_ids)) != len(qa_ids):
        raise error(path, "Q&A Drill contains duplicate Q&A IDs")

    actual_distribution = Counter(card["priority"] for card in cards)
    expected_distribution = frontmatter["priority_distribution"]
    parsed_distribution: dict[str, int] = {}
    for priority in PRIORITIES:
        if priority not in expected_distribution:
            raise error(path, f"priority_distribution is missing '{priority}'")
        try:
            value = int(expected_distribution[priority])
        except ValueError as exc:
            raise error(path, f"priority_distribution.{priority} must be an integer") from exc
        if value < 0:
            raise error(path, f"priority_distribution.{priority} cannot be negative")
        parsed_distribution[priority] = value
    if set(expected_distribution) != PRIORITIES:
        raise error(path, "priority_distribution may contain only must_know, should_know, nice_to_know")
    if parsed_distribution != {priority: actual_distribution[priority] for priority in PRIORITIES}:
        raise error(path, "priority_distribution does not match the cards in this file")

    return {
        "schema_version": SCHEMA_VERSION,
        "day": frontmatter["day"],
        "track": frontmatter["track"],
        "title": frontmatter["title"],
        "topics": frontmatter["topics"],
        "tags": frontmatter["tags"],
        "priority_distribution": parsed_distribution,
        "daily_objective_markdown": clean_markdown(sections["Daily Objective"]),
        "syllabus_markdown": clean_markdown(sections["Syllabus & Priority Breakdown"]),
        "cards": cards,
        "key_connections_markdown": clean_markdown(sections["Key Connections"]),
        "common_misconceptions_markdown": clean_markdown(sections["Common Misconceptions"]),
        "out_of_scope_markdown": clean_markdown(sections["Out of Scope"]),
        "qa_drill": qa_drill,
    }


def parse_role(path: Path) -> dict[str, Any]:
    """Parse a role manifest: front-matter plus grouped card-ID references.

    A role owns no content. It references card IDs that already exist in the
    curriculum, so a role can never drift from the cards it points at.
    """
    if not ROLE_FILE_RE.fullmatch(path.name):
        raise error(path, "role filename must be a lowercase slug ending in .md")
    lines = path.read_text(encoding="utf-8").splitlines()
    frontmatter, content_start = parse_role_frontmatter(lines, path)

    body = lines[content_start:]
    groups: list[dict[str, Any]] = []
    summary_lines: list[str] = []
    current: dict[str, Any] | None = None
    rationale: list[str] = []

    for line in body:
        group_match = ROLE_GROUP_RE.fullmatch(line)
        if group_match:
            if current is not None:
                current["rationale"] = clean_markdown(rationale)
                groups.append(current)
            current = {"heading": group_match.group(1).strip(), "card_ids": []}
            rationale = []
            continue
        card_match = ROLE_CARD_RE.fullmatch(line.rstrip())
        if card_match:
            if current is None:
                raise error(path, f"card reference '{card_match.group(1)}' appears before any '### ' group heading")
            current["card_ids"].append(card_match.group(1))
            continue
        if current is None:
            summary_lines.append(line)
        else:
            rationale.append(line)

    if current is not None:
        current["rationale"] = clean_markdown(rationale)
        groups.append(current)

    if not groups:
        raise error(path, "role manifest contains no '### ' groups")
    for group in groups:
        if not group["card_ids"]:
            raise error(path, f"role group '{group['heading']}' references no cards")

    referenced = [card_id for group in groups for card_id in group["card_ids"]]
    duplicates = sorted({item for item in referenced if referenced.count(item) > 1})
    if duplicates:
        raise error(path, f"role references the same card more than once: {', '.join(duplicates)}")

    return {
        "slug": frontmatter["slug"],
        "company": frontmatter["company"],
        "role": frontmatter["role"],
        "seniority": frontmatter.get("seniority", ""),
        "source": frontmatter.get("source", ""),
        "captured": frontmatter.get("captured", ""),
        "priority": frontmatter.get("priority", "medium"),
        "summary_markdown": clean_markdown(summary_lines),
        "groups": groups,
        "card_ids": referenced,
    }


def parse_role_frontmatter(lines: list[str], path: Path) -> tuple[dict[str, str], int]:
    if not lines or lines[0] != "---":
        raise error(path, "role manifest must start with YAML frontmatter delimiter '---'")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise error(path, "role frontmatter closing delimiter '---' is missing") from exc
    data: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip():
            continue
        match = re.match(r"^([a-z_]+):\s*(.+)$", line)
        if not match:
            raise error(path, f"invalid role frontmatter line: {line!r}")
        key, value = match.groups()
        if key in data:
            raise error(path, f"duplicate role frontmatter field '{key}'")
        data[key] = parse_scalar(value, path, key)
    required = {"slug", "company", "role"}
    allowed = required | {"seniority", "source", "captured", "priority"}
    missing = required - data.keys()
    if missing:
        raise error(path, f"role frontmatter missing required field(s): {', '.join(sorted(missing))}")
    unexpected = set(data) - allowed
    if unexpected:
        raise error(path, f"unexpected role frontmatter field(s): {', '.join(sorted(unexpected))}")
    if not SLUG_RE.fullmatch(data["slug"]):
        raise error(path, f"role slug '{data['slug']}' must be a lowercase slug")
    if path.stem != data["slug"]:
        raise error(path, f"role slug '{data['slug']}' does not match filename '{path.stem}'")
    if data.get("priority") not in (None, "high", "medium", "low"):
        raise error(path, "role priority must be one of: high, medium, low")
    return data, end + 1


def compile_roles(roles_dir: Path, card_ids: set[str]) -> tuple[list[dict[str, Any]], list[SourceFileError]]:
    """Parse every role manifest and fail loudly on references to unknown cards."""
    roles: list[dict[str, Any]] = []
    errors: list[SourceFileError] = []
    if not roles_dir.is_dir():
        return roles, errors
    seen_slugs: set[str] = set()
    for path in sorted(roles_dir.glob("*.md")):
        try:
            role = parse_role(path)
            if role["slug"] in seen_slugs:
                raise error(path, f"duplicate role slug '{role['slug']}'")
            unknown = sorted(set(role["card_ids"]) - card_ids)
            if unknown:
                raise error(path, f"references unknown card ID(s): {', '.join(unknown)}")
            seen_slugs.add(role["slug"])
            roles.append(role)
        except ValidationError as exc:
            errors.append(SourceFileError(path, str(exc).split(": ", 1)[1]))
    # Surface the roles worth preparing for first.
    rank = {"high": 0, "medium": 1, "low": 2}
    roles.sort(key=lambda item: (rank.get(item["priority"], 1), item["company"]))
    return roles, errors


def compile_notes(notes_dir: Path, target_day: int | None = None) -> tuple[list[dict[str, Any]], list[SourceFileError]]:
    days: list[dict[str, Any]] = []
    errors: list[SourceFileError] = []
    seen_card_ids: set[str] = set()
    seen_qa_ids: set[str] = set()

    if target_day is not None:
        target_path = notes_dir / f"day_{target_day:02d}.md"
        if not target_path.exists():
            errors.append(SourceFileError(target_path, f"source file not found for day {target_day:02d}"))
            return days, errors
        paths = [target_path]
    else:
        paths = sorted(notes_dir.glob("day_*.md"))

    for path in paths:
        try:
            day = parse_day(path)
            duplicate_cards = seen_card_ids.intersection(card["id"] for card in day["cards"])
            duplicate_qa = seen_qa_ids.intersection(item["id"] for item in day["qa_drill"])
            if duplicate_cards:
                raise error(path, f"card ID(s) must be globally unique: {', '.join(sorted(duplicate_cards))}")
            if duplicate_qa:
                raise error(path, f"Q&A ID(s) must be globally unique: {', '.join(sorted(duplicate_qa))}")
            seen_card_ids.update(card["id"] for card in day["cards"])
            seen_qa_ids.update(item["id"] for item in day["qa_drill"])
            days.append(day)
        except ValidationError as exc:
            errors.append(SourceFileError(path, str(exc).split(": ", 1)[1]))
    if not days and not errors:
        errors.append(SourceFileError(notes_dir, "no files matching day_XX.md were found"))

    # Prereqs may point at cards in any day, so they can only be checked once
    # every file has been parsed. Skipped for single-day builds, where the full
    # card set is not in scope.
    if target_day is None and not errors:
        for day in days:
            source = notes_dir / f"day_{day['day']:02d}.md"
            unknown_prereqs = sorted(
                {prereq for card in day["cards"] for prereq in card["prereqs"]} - seen_card_ids
            )
            if unknown_prereqs:
                errors.append(SourceFileError(
                    source, f"prereq(s) reference unknown card ID(s): {', '.join(unknown_prereqs)}"))
            unknown_links = sorted(
                {link for item in day["qa_drill"] for link in item["linked_card_ids"]} - seen_card_ids
            )
            if unknown_links:
                errors.append(SourceFileError(
                    source, f"Q&A links to unknown card ID(s): {', '.join(unknown_links)}"))
    return days, errors


GENERATED_NAME_RE = re.compile(r"day_\d{2}\.json|index\.json|roles\.json")


def assert_safe_output_dir(output_dir: Path) -> None:
    """Refuse to delete anything that is not clearly a generated-output directory.

    write_outputs() removes output_dir before replacing it. An empty or unset
    --output-dir resolves to the current working directory, which would delete the
    whole project. Validate before anything destructive happens.
    """
    if str(output_dir).strip() in {"", "."}:
        raise ValueError(
            "--output-dir is empty or '.', which resolves to the current directory. "
            "Pass an explicit path such as generated/."
        )
    resolved = output_dir.resolve()
    if resolved == Path.cwd() or resolved == Path(resolved.anchor) or resolved == Path.home():
        raise ValueError(
            f"refusing to use {resolved} as --output-dir: it is the current, root, or home "
            "directory. Pass a dedicated output path such as generated/."
        )
    if resolved.exists():
        if not resolved.is_dir():
            raise ValueError(f"--output-dir {resolved} exists and is not a directory")
        stray = sorted(
            item.name for item in resolved.iterdir()
            if not GENERATED_NAME_RE.fullmatch(item.name)
        )
        if stray:
            preview = ", ".join(stray[:5]) + (" ..." if len(stray) > 5 else "")
            raise ValueError(
                f"refusing to overwrite {resolved}: it holds files this script did not "
                f"generate ({preview}). Point --output-dir at a dedicated generated/ directory."
            )


def write_outputs(days: list[dict[str, Any]], output_dir: Path, target_day: int | None = None, roles: list[dict[str, Any]] | None = None) -> None:
    assert_safe_output_dir(output_dir)
    if target_day is not None and output_dir.exists() and (output_dir / "index.json").exists():
        # Incremental single-day update
        for day in days:
            target = output_dir / f"day_{day['day']:02d}.json"
            target.write_text(json.dumps(day, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        
        index_path = output_dir / "index.json"
        try:
            index_data = json.loads(index_path.read_text(encoding="utf-8"))
            existing_days = {d["day"]: d for d in index_data.get("days", [])}
        except Exception:
            existing_days = {}

        for day in days:
            existing_days[day["day"]] = {
                "day": day["day"],
                "title": day["title"],
                "topics": day["topics"],
                "tags": day["tags"],
                "priority_distribution": day["priority_distribution"],
                "card_count": len(day["cards"]),
                "qa_count": len(day["qa_drill"]),
                "path": f"day_{day['day']:02d}.json",
            }

        sorted_days = [existing_days[k] for k in sorted(existing_days.keys())]
        index = {
            "schema_version": SCHEMA_VERSION,
            "days": sorted_days,
        }
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return

    output_parent = output_dir.parent
    temporary_dir = Path(tempfile.mkdtemp(prefix="flashcards-build-", dir=output_parent))
    try:
        for day in days:
            target = temporary_dir / f"day_{day['day']:02d}.json"
            target.write_text(json.dumps(day, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        index = {
            "schema_version": SCHEMA_VERSION,
            "days": [
                {
                    "day": day["day"],
                    "track": day["track"],
                    "title": day["title"],
                    "topics": day["topics"],
                    "tags": day["tags"],
                    "priority_distribution": day["priority_distribution"],
                    "card_count": len(day["cards"]),
                    "qa_count": len(day["qa_drill"]),
                    "path": f"day_{day['day']:02d}.json",
                }
                for day in days
            ],
            # Flat card lookup so views that reference cards across days (role
            # profiles, global search) can resolve titles without loading every day.
            "card_index": {
                card["id"]: {
                    "day": day["day"],
                    "track": day["track"],
                    "title": card["title"],
                    "priority": card["priority"],
                    "category": card["category"],
                    "tags": card["tags"],
                }
                for day in days
                for card in day["cards"]
            },
        }
        (temporary_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        roles_payload = {
            "schema_version": SCHEMA_VERSION,
            "roles": [
                {
                    key: role[key]
                    for key in (
                        "slug", "company", "role", "seniority", "source",
                        "captured", "priority", "summary_markdown", "groups", "card_ids",
                    )
                }
                for role in (roles or [])
            ],
        }
        (temporary_dir / "roles.json").write_text(json.dumps(roles_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if output_dir.exists():
            shutil.rmtree(output_dir)
        temporary_dir.replace(output_dir)
    except Exception:
        shutil.rmtree(temporary_dir, ignore_errors=True)
        raise


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--notes-dir", type=Path, default=root / "notes", help="Markdown source directory")
    parser.add_argument("--output-dir", type=Path, default=root / "generated", help="Generated JSON directory")
    parser.add_argument("--roles-dir", type=Path, default=root / "roles", help="Role manifest directory")
    parser.add_argument("--check", action="store_true", help="Validate only; do not write JSON")
    parser.add_argument("--day", type=int, default=None, help="Specific day number to validate or compile (e.g. --day 14)")
    args = parser.parse_args()

    days, errors = compile_notes(args.notes_dir, target_day=args.day)
    roles: list[dict[str, Any]] = []
    if not errors and args.day is None:
        all_card_ids = {card["id"] for day in days for card in day["cards"]}
        roles, role_errors = compile_roles(args.roles_dir, all_card_ids)
        errors.extend(role_errors)
    if errors:
        print(f"Validation failed: {len(errors)} file(s) need attention.", file=sys.stderr)
        for item in errors:
            print(f"- {item}", file=sys.stderr)
        return 1

    total_cards = sum(len(d["cards"]) for d in days)
    total_qa = sum(len(d["qa_drill"]) for d in days)

    if args.check:
        if args.day is not None:
            print(f"Validation passed: day_{args.day:02d}.md ({total_cards} cards, {total_qa} Q&A items).")
        else:
            print(f"Validation passed: {len(days)} day file(s) ({total_cards} cards, {total_qa} Q&A items), {len(roles)} role manifest(s).")
        return 0

    write_outputs(days, args.output_dir, target_day=args.day, roles=roles)
    if args.day is not None:
        print(f"Generated day_{args.day:02d}.json ({total_cards} cards, {total_qa} Q&A items) and updated index.json in {args.output_dir}.")
    else:
        print(f"Generated {len(days)} day JSON file(s) ({total_cards} cards, {total_qa} Q&A items) and index.json in {args.output_dir}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

