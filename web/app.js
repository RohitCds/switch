const state = {
  index: null,
  day: null,
  selectedDay: Number(localStorage.getItem("switch:selected-day")) || 1,
  selectedCard: 0,
  mode: "learn",
  filter: "all",
  query: "",
  drillIndex: 0,
  revealed: false,
  cardListOpen: false,
  textSize: localStorage.getItem("switch:text-size") || "m",
  focusMode: localStorage.getItem("switch:focus") === "on",
  showPrimers: localStorage.getItem("switch:primers") !== "off",
  roles: [],
  library: localStorage.getItem("switch:library") || "core",
  view: "day",
  selectedRole: localStorage.getItem("switch:selected-role") || null,
  completed: new Set(JSON.parse(localStorage.getItem("switch:completed") || "[]")),
  srs: JSON.parse(localStorage.getItem("switch:srs") || "{}"),
  reviewQueue: [],
  reviewRevealed: false,
  dayCache: {},
  roleDrill: null,
  bookmarked: new Set(JSON.parse(localStorage.getItem("switch:bookmarked") || "[]")),
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

function saveState() {
  localStorage.setItem("switch:selected-day", state.selectedDay);
  localStorage.setItem("switch:completed", JSON.stringify([...state.completed]));
  localStorage.setItem("switch:bookmarked", JSON.stringify([...state.bookmarked]));
  localStorage.setItem("switch:srs", JSON.stringify(state.srs));
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(markdown) {
  // Notes use both `> text` and indented `  > text` for callouts. Normalize the
  // latter first so the Interview-Ready Explanation always renders as a quote.
  const lines = markdown
    .replace(/\n---\s*$/m, "")
    .replace(/^\s{1,3}(?=>\s?)/gm, "")
    .split("\n");
  let html = "";
  let inCode = false;
  let code = [];
  let listType = null;
  let quote = [];
  let table = [];
  let lastHeading = "";
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  const flushQuote = () => {
    if (!quote.length) return;
    const isAnswer = /interview-ready/i.test(lastHeading);
    html += `<blockquote${isAnswer ? ' class="say-this"' : ""}>${quote.map((q) => inlineMarkdown(q)).join("<br>")}</blockquote>`;
    quote = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((row, index) => index !== 1 || !/^\|?\s*:?-+/.test(row.trim()));
    html += "<table>" + rows.map((row, index) => {
      const cells = row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      const tag = index === 0 ? "th" : "td";
      return `<tr>${cells.map((cell) => `<${tag}>${inlineMarkdown(cell)}</${tag}>`).join("")}</tr>`;
    }).join("") + "</table>";
    table = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith("```")) {
      closeList(); flushQuote(); flushTable();
      if (inCode) { html += `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`; code = []; }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(line); continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) { closeList(); flushQuote(); table.push(line); continue; }
    flushTable();
    if (!line.trim()) { closeList(); flushQuote(); continue; }
    const heading = line.match(/^\*\*(.+)\*\*$/);
    const quoted = line.match(/^\s*>\s?(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (heading) {
      closeList(); flushQuote();
      lastHeading = heading[1];
      html += `<h4>${inlineMarkdown(heading[1])}</h4>`;
    } else if (quoted) {
      closeList();
      quote.push(quoted[1]);
    } else if (bullet || numbered) {
      closeList(); flushQuote();
      const type = bullet ? "ul" : "ol";
      if (listType !== type) { closeList(); listType = type; html += `<${type}>`; }
      html += `<li>${inlineMarkdown((bullet || numbered)[1])}</li>`;
    } else {
      closeList(); flushQuote();
      html += `<p>${inlineMarkdown(line)}</p>`;
    }
  }
  closeList(); flushQuote(); flushTable();
  return html;
}

async function fetchDay(dayNumber) {
  if (state.dayCache[dayNumber]) return state.dayCache[dayNumber];
  const entry = state.index.days.find((day) => day.day === dayNumber) || state.index.days[0];
  const response = await fetch(`../generated/${entry.path}`);
  if (!response.ok) throw new Error(`Could not load Day ${entry.day}.`);
  const rawData = await response.json();
  let payload = rawData;
  if (rawData && rawData.encrypted === true) {
    const secret = getSessionSecret();
    if (!secret) throw new Error("Missing decryption key. Please sign in again.");
    payload = await decryptPayload(rawData, secret);
  }
  state.dayCache[dayNumber] = payload;
  return payload;
}

async function loadDayData(dayNumber) {
  state.day = await fetchDay(dayNumber);
  return state.day;
}

async function loadDay(dayNumber) {
  const entry = state.index.days.find((day) => day.day === dayNumber) || state.index.days[0];
  await loadDayData(entry.day);
  state.selectedDay = entry.day;
  state.selectedCard = 0;
  state.drillIndex = 0;
  state.revealed = false;
  saveState();
  render();
}

function filteredCards() {
  return state.day.cards.filter((card) => {
    const haystack = `${card.title} ${card.category} ${card.tags.join(" ")}`.toLowerCase();
    return (state.filter === "all" || card.priority === state.filter) && haystack.includes(state.query.toLowerCase());
  });
}

const TRACK_LABELS = {
  core: "Core curriculum",
  agents: "Agents & tool use",
  "data-traffic": "Data flow & traffic",
  evaluation: "LLM & agent evaluation",
  "cloud-platform": "Cloud & platform",
  "quant-risk": "Quant & risk ML",
  "post-training": "LLM post-training",
  "graph-ml": "Graph ML",
};
const trackLabel = (slug) => TRACK_LABELS[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Card IDs are `dNN-slug` by schema, so a card's day is derivable without a lookup.
const dayOfCard = (cardId) => Number(String(cardId).slice(1, 3));

function roleReadiness(role) {
  const total = role.card_ids.length;
  const done = role.card_ids.filter((id) => state.completed.has(id)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function dayButtonHtml(day) {
  const active = state.view === "day" && day.day === state.selectedDay;
  return `<button class="day-button ${active ? "active" : ""}" data-day="${day.day}">
      <span class="day-number">${String(day.day).padStart(2, "0")}</span>
      <span><span class="day-name">${escapeHtml(day.title)}</span><span class="day-meta">${day.card_count} cards · ${day.qa_count} drills</span></span>
    </button>`;
}

function renderSidebar() {
  const totalCards = state.index.days.reduce((sum, day) => sum + day.card_count, 0);
  const completed = state.completed.size;
  $("#course-summary").innerHTML = `<p class="summary-label">Course progress</p><p class="summary-number">${completed} <span>/ ${totalCards} cards</span></p><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, completed / totalCards * 100)}%"></div></div>`;

  document.querySelectorAll("[data-library]").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.library === state.library));
  });

  const list = $("#day-list");
  if (state.library === "core") {
    list.innerHTML = state.index.days.filter((day) => (day.track || "core") === "core").map(dayButtonHtml).join("");
  } else if (state.library === "tracks") {
    const tracks = state.index.days.filter((day) => (day.track || "core") !== "core");
    if (!tracks.length) {
      list.innerHTML = `<p class="empty">No tracks yet. Days beyond the core curriculum appear here.</p>`;
    } else {
      const grouped = {};
      tracks.forEach((day) => { (grouped[day.track] ||= []).push(day); });
      list.innerHTML = Object.entries(grouped).map(([slug, days]) => {
        const cards = days.reduce((sum, day) => sum + day.card_count, 0);
        return `<section class="track-group"><div class="track-head"><span class="track-name">${escapeHtml(trackLabel(slug))}</span><span class="track-count">${cards}</span></div>${days.map(dayButtonHtml).join("")}</section>`;
      }).join("");
    }
  } else {
    if (!state.roles.length) {
      list.innerHTML = `<p class="empty">No role profiles yet. Add a manifest in <code>roles/</code>.</p>`;
    } else {
      list.innerHTML = state.roles.map((role) => {
        const { pct, done, total } = roleReadiness(role);
        const active = state.view === "role" && role.slug === state.selectedRole;
        return `<button class="role-button ${active ? "active" : ""}" data-role="${escapeHtml(role.slug)}">
          <span class="role-company">${escapeHtml(role.company)}</span>
          <span class="role-title">${escapeHtml(role.role)}</span>
          <span class="role-meter"><i style="width:${pct}%"></i></span>
          <span class="role-pct">${done} / ${total} cards · ${pct}%</span>
        </button>`;
      }).join("");
    }
  }

  document.querySelectorAll("[data-day]").forEach((button) => button.addEventListener("click", () => {
    closeSidebar();
    state.view = "day";
    loadDay(Number(button.dataset.day));
  }));
  document.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
    closeSidebar();
    state.view = "role";
    state.selectedRole = button.dataset.role;
    localStorage.setItem("switch:selected-role", state.selectedRole);
    render();
    window.scrollTo({ top: 0 });
  }));
}

function roleHtml() {
  const role = state.roles.find((item) => item.slug === state.selectedRole) || state.roles[0];
  if (!role) return `<div class="empty">No role profiles are available.</div>`;
  const { done, total, pct } = roleReadiness(role);
  const remaining = total - done;
  const index = state.index.card_index || {};

  const groups = role.groups.map((group) => {
    const rows = group.card_ids.map((id) => {
      const meta = index[id];
      const isDone = state.completed.has(id);
      return `<button class="role-card-row ${isDone ? "done" : ""}" data-goto-card="${escapeHtml(id)}">
        <span class="check" aria-hidden="true">✓</span>
        <span class="priority-dot ${meta ? meta.priority : ""}"></span>
        <span class="name">${escapeHtml(meta ? meta.title : id)}</span>
        <span class="where">Day ${String(dayOfCard(id)).padStart(2, "0")}</span>
      </button>`;
    }).join("");
    return `<section class="role-group"><h3>${escapeHtml(group.heading)}</h3>${group.rationale ? `<p class="rationale">${escapeHtml(group.rationale)}</p>` : ""}${rows}</section>`;
  }).join("");

  return `<section class="role-hero">
      <p class="day-kicker">ROLE PROFILE${role.seniority ? ` · ${escapeHtml(role.seniority)}` : ""}</p>
      <h2>${escapeHtml(role.company)} — ${escapeHtml(role.role)}</h2>
      <p class="role-sub">${escapeHtml([role.source, role.captured].filter(Boolean).join(" · "))}</p>
      ${role.summary_markdown ? `<p class="role-summary">${escapeHtml(role.summary_markdown)}</p>` : ""}
    </section>
    <div class="readiness">
      <span class="readiness-figure">${pct}<small>%</small></span>
      <span class="readiness-bar"><i style="width:${pct}%"></i></span>
      <span class="readiness-note">${done} of ${total} referenced cards done${remaining ? ` · ${remaining} to go` : " · ready"}</span>
      <button class="button primary" data-drill-role="${escapeHtml(role.slug)}">Drill this role</button>
    </div>${groups}`;
}

function renderHeader() {
  $("#topbar-label").textContent = `DAY ${String(state.day.day).padStart(2, "0")} · MLE THEORY CURATOR`;
  $("#topbar-title").textContent = state.day.title;
}

function heroHtml() {
  const completedToday = state.day.cards.filter((card) => state.completed.has(card.id)).length;
  return `<section class="day-hero"><div><p class="day-kicker">DAY ${String(state.day.day).padStart(2, "0")} · ${state.day.topics.join(" / ")}</p><h2>${escapeHtml(state.day.title)}</h2><p class="day-objective">${escapeHtml(state.day.daily_objective_markdown.replace(/\n---\s*$/, ""))}</p></div><div class="day-stats"><div class="stat"><strong>${state.day.cards.length}</strong><span>cards</span></div><div class="stat"><strong>${state.day.qa_drill.length}</strong><span>drills</span></div><div class="stat"><strong>${completedToday}</strong><span>done</span></div></div></section>`;
}

function controlsHtml() {
  const { due } = srsSummary();
  return `<div class="mode-switch"><button class="${state.mode === "learn" ? "active" : ""}" data-mode="learn">Learn</button><button class="${state.mode === "drill" ? "active" : ""}" data-mode="drill">Drill</button><button class="${state.mode === "review" ? "active" : ""}" data-mode="review">Review${due ? ` <b>${due}</b>` : ""}</button><button class="${state.mode === "overview" ? "active" : ""}" data-mode="overview">Notes</button></div>`;
}

function learnHtml() {
  const cards = filteredCards();
  if (state.selectedCard >= cards.length) state.selectedCard = 0;
  const card = cards[state.selectedCard];
  const filters = [["all", "All"], ["must_know", "Must know"], ["should_know", "Should know"], ["nice_to_know", "Nice to know"]];
  const listHtml = cards.length ? cards.map((item, index) => `<button class="card-nav-button ${index === state.selectedCard ? "active" : ""} ${state.completed.has(item.id) ? "done" : ""}" data-card-index="${index}"><span class="priority-dot ${item.priority}"></span><span><span class="card-title">${escapeHtml(item.title)}</span><span class="card-category">${escapeHtml(item.category.replaceAll("-", " "))}</span></span></button>`).join("") : `<p class="empty">No cards match this filter.</p>`;
  const content = card ? `<article class="study-card"><header class="study-card-header"><div><p class="card-count">CARD ${String(state.selectedCard + 1).padStart(2, "0")} OF ${String(cards.length).padStart(2, "0")}</p><h3>${escapeHtml(card.title)}</h3></div><button class="bookmark-button ${state.bookmarked.has(card.id) ? "active" : ""}" data-bookmark="${card.id}" aria-label="Bookmark card">${state.bookmarked.has(card.id) ? "★" : "☆"}</button></header><div class="card-tags">${card.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>${card.primer ? `<aside class="card-primer"><span class="card-primer-label">Primer</span>${markdownToHtml(card.primer)}</aside>` : ""}<div class="markdown">${markdownToHtml(card.content_markdown)}</div><footer class="card-actions"><button class="button" data-previous ${state.selectedCard === 0 ? "disabled" : ""}>← Previous</button><button class="button primary" data-complete="${card.id}">${state.completed.has(card.id) ? "Completed ✓" : "Mark complete"}</button><button class="button" data-next ${state.selectedCard === cards.length - 1 ? "disabled" : ""}>Next →</button></footer></article>` : "";
  const listCollapsed = state.cardListOpen ? "" : "collapsed";
  return `${controlsHtml()}<div class="controls"><label class="search"><input id="card-search" value="${escapeHtml(state.query)}" placeholder="Search this day" aria-label="Search cards" /></label><div class="filter-row">${filters.map(([value, label]) => `<button class="filter-chip ${state.filter === value ? "active" : ""}" data-filter="${value}">${label}</button>`).join("")}</div></div><div class="study-grid"><section class="card-list ${listCollapsed}"><button type="button" class="card-list-header" data-toggle-list><span class="card-list-title">Jump to card <span>${cards.length} shown</span></span><span class="card-list-toggle" aria-hidden="true">▾</span></button><div class="card-list-items">${listHtml}</div></section>${content}</div>`;
}

function drillHtml() {
  const drill = state.day.qa_drill[state.drillIndex];
  if (!drill) return `<div class="empty">No drill questions are available for this day.</div>`;
  const index = state.index.card_index || {};
  const links = drill.linked_card_ids.map((id) => {
    const local = state.day.cards.find((item) => item.id === id);
    const meta = local || index[id];
    const elsewhere = !local && index[id];
    const label = meta ? (local ? local.title : index[id].title) : id;
    return `<button data-linked-card="${id}">${escapeHtml(label)}${elsewhere ? ` <span class="link-day">Day ${String(dayOfCard(id)).padStart(2, "0")}</span>` : ""}</button>`;
  }).join("");
  return `${controlsHtml()}<article class="drill-card"><div class="drill-meta"><span>ACTIVE RECALL</span><span>${String(state.drillIndex + 1).padStart(2, "0")} / ${String(state.day.qa_drill.length).padStart(2, "0")}</span></div><h3 class="drill-question" data-reveal role="button" tabindex="0">${escapeHtml(drill.question)}${state.revealed ? "" : `<span class="drill-hint">Tap to reveal answer</span>`}</h3><div class="drill-answer" ${state.revealed ? "" : "hidden"}><strong>Answer</strong><br>${inlineMarkdown(drill.answer)}</div><div class="drill-actions"><button class="button" data-drill-previous ${state.drillIndex === 0 ? "disabled" : ""}>← Previous</button><button class="button primary" data-reveal>${state.revealed ? "Hide answer" : "Reveal answer"}</button><button class="button" data-drill-next ${state.drillIndex === state.day.qa_drill.length - 1 ? "disabled" : ""}>Next →</button></div><div class="linked-cards">Linked learning cards: ${links}</div></article>`;
}

function overviewHtml() {
  const sections = [["Syllabus", state.day.syllabus_markdown], ["Key connections", state.day.key_connections_markdown], ["Common misconceptions", state.day.common_misconceptions_markdown], ["Out of scope", state.day.out_of_scope_markdown]];
  return `${controlsHtml()}<div class="overview-grid">${sections.map(([title, content], index) => `<article class="overview-card ${index === 0 ? "wide" : ""}"><h3>${title}</h3><div class="markdown">${markdownToHtml(content)}</div></article>`).join("")}</div>`;
}

function bindWorkspaceEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", async () => {
    state.view = "day";
    state.mode = button.dataset.mode;
    if (state.mode === "review") await startReview();
    render();
  }));
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { state.filter = button.dataset.filter; state.selectedCard = 0; render(); }));
  document.querySelectorAll("[data-card-index]").forEach((button) => button.addEventListener("click", () => { state.selectedCard = Number(button.dataset.cardIndex); state.cardListOpen = false; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  document.querySelector("[data-toggle-list]")?.addEventListener("click", () => { state.cardListOpen = !state.cardListOpen; render(); });
  $("#card-search")?.addEventListener("input", (event) => { state.query = event.target.value; state.selectedCard = 0; render(); });
  document.querySelector("[data-previous]")?.addEventListener("click", () => { state.selectedCard -= 1; render(); });
  document.querySelector("[data-next]")?.addEventListener("click", () => { state.selectedCard += 1; render(); });
  document.querySelector("[data-complete]")?.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.complete;
    const marking = !state.completed.has(id);
    if (marking) { state.completed.add(id); enrolCard(id); }
    else state.completed.delete(id);
    saveState();
    render();
    if (marking) document.querySelector("[data-complete]")?.classList.add("is-done");
  });
  document.querySelector("[data-bookmark]")?.addEventListener("click", (event) => { const id = event.currentTarget.dataset.bookmark; state.bookmarked.has(id) ? state.bookmarked.delete(id) : state.bookmarked.add(id); saveState(); render(); });
  document.querySelectorAll("[data-reveal]").forEach((el) => el.addEventListener("click", () => { state.revealed = !state.revealed; render(); }));
  document.querySelector("[data-drill-previous]")?.addEventListener("click", () => { state.drillIndex -= 1; state.revealed = false; render(); });
  document.querySelector("[data-drill-next]")?.addEventListener("click", () => { state.drillIndex += 1; state.revealed = false; render(); });
  document.querySelector("[data-drill-role]")?.addEventListener("click", async (event) => {
    const role = state.roles.find((item) => item.slug === event.currentTarget.dataset.drillRole);
    if (!role) return;
    event.currentTarget.textContent = "Loading…";
    await buildRoleDrill(role);
    state.view = "role-drill";
    render();
    window.scrollTo({ top: 0 });
  });
  document.querySelectorAll("[data-role-reveal]").forEach((el) => el.addEventListener("click", () => {
    state.roleDrill.revealed = !state.roleDrill.revealed; render();
  }));
  document.querySelector("[data-role-drill-prev]")?.addEventListener("click", () => {
    state.roleDrill.index -= 1; state.roleDrill.revealed = false; render(); window.scrollTo({ top: 0 });
  });
  document.querySelector("[data-role-drill-next]")?.addEventListener("click", () => {
    state.roleDrill.index += 1; state.roleDrill.revealed = false; render(); window.scrollTo({ top: 0 });
  });
  document.querySelector("[data-exit-role-drill]")?.addEventListener("click", () => {
    state.view = "role"; render(); window.scrollTo({ top: 0 });
  });
  document.querySelector("[data-review-reveal]")?.addEventListener("click", () => { state.reviewRevealed = true; render(); });
  document.querySelector("[data-review-skip]")?.addEventListener("click", async () => {
    state.reviewQueue.push(state.reviewQueue.shift());
    state.reviewRevealed = false;
    await ensureReviewCardLoaded();
    render();
  });
  document.querySelectorAll("[data-grade]").forEach((button) => button.addEventListener("click", async () => {
    const cardId = state.reviewQueue.shift();
    scheduleNext(cardId, button.dataset.grade);
    if (button.dataset.grade === "again") state.reviewQueue.push(cardId);
    state.reviewRevealed = false;
    await ensureReviewCardLoaded();
    render();
  }));
  document.querySelectorAll("[data-goto-card]").forEach((button) => button.addEventListener("click", async () => {
    const id = button.dataset.gotoCard;
    const day = dayOfCard(id);
    state.view = "day";
    state.mode = "learn";
    state.filter = "all";
    state.query = "";
    if (!state.day || state.day.day !== day) await loadDay(day);
    const index = state.day.cards.findIndex((card) => card.id === id);
    state.selectedCard = Math.max(0, index);
    render();
    window.scrollTo({ top: 0 });
  }));
  document.querySelectorAll("[data-linked-card]").forEach((button) => button.addEventListener("click", async () => {
    const id = button.dataset.linkedCard;
    const day = dayOfCard(id);
    state.view = "day";
    state.mode = "learn";
    state.filter = "all";
    state.query = "";
    if (!state.day || state.day.day !== day) await loadDay(day);
    const position = state.day.cards.findIndex((card) => card.id === id);
    state.selectedCard = Math.max(0, position);
    render();
    window.scrollTo({ top: 0 });
  }));
}

function applyReaderPrefs() {
  const root = document.documentElement;
  root.dataset.text = state.textSize;
  root.dataset.focus = state.focusMode ? "on" : "off";
  root.dataset.primers = state.showPrimers ? "on" : "off";
  document.querySelectorAll("[data-library]").forEach((tab) => tab.addEventListener("click", () => {
    state.library = tab.dataset.library;
    localStorage.setItem("switch:library", state.library);
    renderSidebar();
  }));

  document.querySelectorAll("[data-text-size]").forEach((button) => {
    button.classList.toggle("active", button.dataset.textSize === state.textSize);
  });
  $("#toggle-focus")?.setAttribute("aria-pressed", String(state.focusMode));
  $("#toggle-primers")?.setAttribute("aria-pressed", String(state.showPrimers));
  localStorage.setItem("switch:text-size", state.textSize);
  localStorage.setItem("switch:focus", state.focusMode ? "on" : "off");
  localStorage.setItem("switch:primers", state.showPrimers ? "on" : "off");
}

/* ============================================================
   Spaced repetition — SM-2 with four grades.

   A card enters the schedule when it is first marked complete. Each review
   multiplies the interval by an ease factor that itself moves with how hard the
   recall was, so cards you find easy drift out of the queue and cards you keep
   forgetting come back quickly.
   ============================================================ */

const DAY_MS = 86400000;
const EASE_MIN = 1.3;
const EASE_MAX = 2.8;
const EASE_START = 2.5;

const GRADES = [
  { key: "again", label: "Again", hint: "< 10 min", ease: -0.2 },
  { key: "hard", label: "Hard", hint: "", ease: -0.15 },
  { key: "good", label: "Good", hint: "", ease: 0 },
  { key: "easy", label: "Easy", hint: "", ease: 0.15 },
];

function enrolCard(cardId) {
  if (state.srs[cardId]) return;
  state.srs[cardId] = { due: Date.now() + DAY_MS, interval: 1, ease: EASE_START, reps: 0, lapses: 0 };
}

function scheduleNext(cardId, gradeKey) {
  const now = Date.now();
  const entry = state.srs[cardId] || { due: now, interval: 1, ease: EASE_START, reps: 0, lapses: 0 };
  const grade = GRADES.find((item) => item.key === gradeKey) || GRADES[2];

  entry.ease = Math.min(EASE_MAX, Math.max(EASE_MIN, entry.ease + grade.ease));

  if (gradeKey === "again") {
    entry.lapses += 1;
    entry.interval = 0;
    entry.due = now + 10 * 60 * 1000; // back in ten minutes
  } else {
    if (entry.reps === 0) {
      entry.interval = gradeKey === "easy" ? 3 : 1;
    } else if (gradeKey === "hard") {
      entry.interval = Math.max(1, Math.round(entry.interval * 1.2));
    } else if (gradeKey === "easy") {
      entry.interval = Math.max(1, Math.round(entry.interval * entry.ease * 1.3));
    } else {
      entry.interval = Math.max(1, Math.round(entry.interval * entry.ease));
    }
    entry.due = now + entry.interval * DAY_MS;
  }
  entry.reps += 1;
  state.srs[cardId] = entry;
  saveState();
}

function previewInterval(cardId, gradeKey) {
  const entry = state.srs[cardId];
  if (gradeKey === "again") return "10m";
  if (!entry || entry.reps === 0) return gradeKey === "easy" ? "3d" : "1d";
  const ease = Math.min(EASE_MAX, Math.max(EASE_MIN, entry.ease + GRADES.find((g) => g.key === gradeKey).ease));
  const factor = gradeKey === "hard" ? 1.2 : gradeKey === "easy" ? ease * 1.3 : ease;
  const days = Math.max(1, Math.round(entry.interval * factor));
  return days >= 30 ? `${Math.round(days / 30)}mo` : `${days}d`;
}

function dueCardIds() {
  const now = Date.now();
  const index = state.index.card_index || {};
  return Object.keys(state.srs)
    .filter((id) => index[id] && state.srs[id].due <= now)
    .sort((a, b) => state.srs[a].due - state.srs[b].due);
}

function srsSummary() {
  const index = state.index.card_index || {};
  const tracked = Object.keys(state.srs).filter((id) => index[id]);
  return { due: dueCardIds().length, tracked: tracked.length };
}

function renderTabbar() {
  // A role profile is not a study mode, so no tab is active while one is open.
  document.querySelectorAll("#tabbar .tab").forEach((tab) => {
    tab.classList.toggle("active", state.view === "day" && tab.dataset.mode === state.mode);
  });
  const badge = $("#review-badge");
  if (badge && state.index) {
    const { due } = srsSummary();
    badge.textContent = due > 99 ? "99+" : String(due);
    badge.hidden = due === 0;
  }
}

function render() {
  renderSidebar(); renderTabbar();
  if (state.view === "role-drill") {
    $("#topbar-label").textContent = "ROLE DRILL";
    $("#topbar-title").textContent = state.roleDrill ? `${state.roleDrill.company} — ${state.roleDrill.role}` : "Role drill";
    $("#workspace").innerHTML = roleDrillHtml();
    bindWorkspaceEvents();
    return;
  }
  if (state.view === "role") {
    $("#topbar-label").textContent = "ROLE PROFILE";
    const role = state.roles.find((item) => item.slug === state.selectedRole);
    $("#topbar-title").textContent = role ? `${role.company} — ${role.role}` : "Role profile";
    $("#workspace").innerHTML = roleHtml();
    bindWorkspaceEvents();
    return;
  }
  if (state.mode === "review") {
    $("#topbar-label").textContent = "SPACED REPETITION";
    const { due } = srsSummary();
    $("#topbar-title").textContent = due ? `${due} card${due === 1 ? "" : "s"} due` : "Review";
    $("#workspace").innerHTML = reviewHtml();
    bindWorkspaceEvents();
    return;
  }
  renderHeader();
  const body = state.mode === "learn" ? learnHtml() : state.mode === "drill" ? drillHtml() : overviewHtml();
  $("#workspace").innerHTML = `${heroHtml()}${body}`;
  bindWorkspaceEvents();
}

/* ============================================================
   Global search — over the flat card_index, so it needs no day loads
   ============================================================ */

function searchCards(query) {
  const index = state.index.card_index || {};
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits = [];
  for (const [id, meta] of Object.entries(index)) {
    const haystack = `${meta.title} ${meta.category || ""} ${(meta.tags || []).join(" ")}`.toLowerCase();
    if (!terms.every((term) => haystack.includes(term))) continue;
    // Title matches rank above tag-only matches, earlier matches above later ones.
    const title = meta.title.toLowerCase();
    const pos = title.indexOf(terms[0]);
    hits.push({ id, meta, score: pos === -1 ? 500 : pos });
  }
  return hits.sort((a, b) => a.score - b.score || a.meta.day - b.meta.day).slice(0, 60);
}

function highlight(text, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let out = escapeHtml(text);
  terms.forEach((term) => {
    out = out.replace(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>");
  });
  return out;
}

function renderSearchResults() {
  const query = $("#global-search").value.trim();
  const box = $("#search-results");
  if (!query) {
    box.innerHTML = `<p class="search-hint">Search ${Object.keys(state.index.card_index || {}).length} cards by title, category or tag.</p>`;
    return;
  }
  const hits = searchCards(query);
  if (!hits.length) {
    box.innerHTML = `<p class="search-none">No cards match “${escapeHtml(query)}”.</p>`;
    return;
  }
  box.innerHTML = `<p class="search-count">${hits.length} match${hits.length === 1 ? "" : "es"}</p>` + hits.map((hit, i) => `
    <button class="search-hit ${i === 0 ? "sel" : ""}" data-search-hit="${escapeHtml(hit.id)}">
      <span class="priority-dot ${hit.meta.priority}"></span>
      <span>
        <span class="hit-title">${highlight(hit.meta.title, query)}</span>
        <span class="hit-sub">${escapeHtml((hit.meta.tags || []).slice(0, 4).join(" · "))}</span>
      </span>
      <span class="hit-where">Day ${String(hit.meta.day).padStart(2, "0")}</span>
    </button>`).join("");
  box.querySelectorAll("[data-search-hit]").forEach((button) =>
    button.addEventListener("click", () => openCard(button.dataset.searchHit)));
}

async function openCard(cardId) {
  closeSearch();
  const day = dayOfCard(cardId);
  state.view = "day";
  state.mode = "learn";
  state.filter = "all";
  state.query = "";
  if (!state.day || state.day.day !== day) await loadDay(day);
  const position = state.day.cards.findIndex((card) => card.id === cardId);
  state.selectedCard = Math.max(0, position);
  render();
  window.scrollTo({ top: 0 });
}

function openSearch() {
  $("#search-overlay").removeAttribute("hidden");
  $("#global-search").value = "";
  renderSearchResults();
  setTimeout(() => $("#global-search").focus(), 30);
}
function closeSearch() { $("#search-overlay").setAttribute("hidden", ""); }

/* ============================================================
   Role-targeted drill — Q&A items whose linked cards this role references,
   gathered across every day the role touches.
   ============================================================ */

async function buildRoleDrill(role) {
  const wanted = new Set(role.card_ids);
  const days = [...new Set(role.card_ids.map(dayOfCard))].sort((a, b) => a - b);
  const items = [];
  for (const day of days) {
    const data = await fetchDay(day);
    data.qa_drill.forEach((qa) => {
      if (qa.linked_card_ids.some((id) => wanted.has(id))) items.push({ qa, day });
    });
  }
  state.roleDrill = { slug: role.slug, company: role.company, role: role.role, items, index: 0, revealed: false };
}

function roleDrillHtml() {
  const drill = state.roleDrill;
  if (!drill) return `<div class="empty"><p>Loading role drill…</p></div>`;
  if (!drill.items.length) {
    return `<div class="empty"><h3>No drills for this role yet</h3><p>None of the cards this role references have Q&amp;A items linked to them.</p><p><button class="button" data-exit-role-drill>Back to profile</button></p></div>`;
  }
  const current = drill.items[drill.index];
  return `<section class="role-hero">
      <p class="day-kicker">ROLE DRILL · ${escapeHtml(drill.company)}</p>
      <h2>${escapeHtml(drill.role)}</h2>
    </section>
    <article class="drill-card">
      <div class="drill-meta">
        <span>${String(drill.index + 1).padStart(2, "0")} / ${String(drill.items.length).padStart(2, "0")}</span>
        <span>Day ${String(current.day).padStart(2, "0")}</span>
      </div>
      <h3 class="drill-question" data-role-reveal role="button" tabindex="0">${escapeHtml(current.qa.question)}${drill.revealed ? "" : `<span class="drill-hint">Tap to reveal answer</span>`}</h3>
      <div class="drill-answer" ${drill.revealed ? "" : "hidden"}><strong>Answer</strong><br>${inlineMarkdown(current.qa.answer)}</div>
      <div class="drill-actions">
        <button class="button" data-role-drill-prev ${drill.index === 0 ? "disabled" : ""}>← Previous</button>
        <button class="button primary" data-role-reveal>${drill.revealed ? "Hide answer" : "Reveal answer"}</button>
        <button class="button" data-role-drill-next ${drill.index === drill.items.length - 1 ? "disabled" : ""}>Next →</button>
      </div>
      <div class="linked-cards"><button data-exit-role-drill>← Back to ${escapeHtml(drill.company)} profile</button></div>
    </article>`;
}

function reviewHtml() {
  const index = state.index.card_index || {};
  const { tracked } = srsSummary();

  if (!tracked) {
    return `<div class="empty"><h3>Nothing scheduled yet</h3><p>Cards join your review schedule when you mark them complete in Learn. Come back once you've studied a few.</p></div>`;
  }
  if (!state.reviewQueue.length) {
    const upcoming = Object.entries(state.srs)
      .filter(([id]) => index[id])
      .sort((a, b) => a[1].due - b[1].due)[0];
    const when = upcoming ? Math.max(0, Math.round((upcoming[1].due - Date.now()) / DAY_MS)) : 0;
    return `<div class="empty"><h3>All caught up</h3><p>${tracked} card${tracked === 1 ? "" : "s"} in your schedule. Next review ${when <= 0 ? "shortly" : `in ${when} day${when === 1 ? "" : "s"}`}.</p></div>`;
  }

  const cardId = state.reviewQueue[0];
  const meta = index[cardId];
  const card = state.day && state.day.day === dayOfCard(cardId)
    ? state.day.cards.find((item) => item.id === cardId)
    : null;
  const entry = state.srs[cardId] || {};

  const back = card
    ? `<div class="markdown">${markdownToHtml(card.content_markdown)}</div>`
    : `<p class="review-loading">Loading card…</p>`;

  const grades = GRADES.map((grade) => `<button class="grade grade-${grade.key}" data-grade="${grade.key}"><span>${grade.label}</span><span class="grade-when">${previewInterval(cardId, grade.key)}</span></button>`).join("");

  return `<article class="review-card">
      <div class="review-meta">
        <span>REVIEW · ${state.reviewQueue.length} DUE</span>
        <span>Day ${String(dayOfCard(cardId)).padStart(2, "0")}${entry.reps ? ` · seen ${entry.reps}×` : " · new"}</span>
      </div>
      <h3 class="review-prompt">${escapeHtml(meta ? meta.title : cardId)}</h3>
      ${state.reviewRevealed ? "" : `<p class="review-hint">Recall it, then reveal</p>`}
      <div class="review-body" ${state.reviewRevealed ? "" : "hidden"}>${back}</div>
      ${state.reviewRevealed
        ? `<div class="grade-row">${grades}</div>`
        : `<div class="review-actions"><button class="button primary" data-review-reveal>Reveal answer</button><button class="button" data-review-skip>Skip</button></div>`}
    </article>`;
}

async function startReview() {
  state.reviewQueue = dueCardIds();
  state.reviewRevealed = false;
  await ensureReviewCardLoaded();
}

async function ensureReviewCardLoaded() {
  const cardId = state.reviewQueue[0];
  if (!cardId) return;
  const day = dayOfCard(cardId);
  if (!state.day || state.day.day !== day) await loadDayData(day);
}

function swipeNavigate(direction) {
  // -1 = swiped right (previous), 1 = swiped left (next).
  if (!state.day) return;
  if (state.mode === "drill") {
    const next = state.drillIndex + direction;
    if (next >= 0 && next < state.day.qa_drill.length) { state.drillIndex = next; state.revealed = false; render(); }
  } else if (state.mode === "learn") {
    const next = state.selectedCard + direction;
    if (next >= 0 && next < filteredCards().length) { state.selectedCard = next; render(); window.scrollTo({ top: 0 }); }
  }
}

function bindGestures() {
  const surface = $("#workspace");
  let startX = 0, startY = 0, startT = 0, tracking = false;
  surface.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1 || (state.mode !== "drill" && state.mode !== "learn")) { tracking = false; return; }
    // Never hijack a horizontal drag that belongs to scrollable content.
    if (event.target.closest("pre, table, .card-list-items, .filter-row, input, textarea")) { tracking = false; return; }
    tracking = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    startT = Date.now();
  }, { passive: true });
  surface.addEventListener("touchend", (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Date.now() - startT < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      swipeNavigate(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
}

function openSidebar() { $("#sidebar").classList.add("open"); $("#sidebar-backdrop").classList.add("open"); }
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#sidebar-backdrop").classList.remove("open"); }

// Auth credentials config: SHA-256 of "username:password"
// Default credentials: username = "rohit", password = "switch2026"
// To change, generate a new hash: python3 -c "import hashlib; print(hashlib.sha256('your_username:your_password'.encode()).hexdigest())"
const AUTH_CONFIG = {
  username: "Rohit",
  hash: "cf7788adb0ebbad8f664be49effd683504e7364ba60682a5c65627ab055a015e",
};

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isAuthenticated() {
  return sessionStorage.getItem("switch:auth") === "true" || localStorage.getItem("switch:auth") === "true";
}

function showAuthModal() {
  const overlay = $("#auth-overlay");
  overlay.removeAttribute("hidden");
  $("#auth-error").setAttribute("hidden", "");
  $("#auth-username").value = "";
  $("#auth-password").value = "";
  setTimeout(() => $("#auth-username")?.focus(), 50);
}

function hideAuthModal() {
  $("#auth-overlay").setAttribute("hidden", "");
}

function getSessionSecret() {
  return sessionStorage.getItem("switch:secret") || localStorage.getItem("switch:secret") || "";
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt", "encrypt"]
  );
}

async function decryptPayload(envelope, password) {
  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const data = base64ToBytes(envelope.data);
    const key = await deriveAesKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    throw new Error("Decryption failed. Please check your credentials.");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = $("#auth-username").value.trim();
  const password = $("#auth-password").value;
  const remember = $("#auth-remember").checked;
  const errorEl = $("#auth-error");

  const computedHash = await sha256(`${username}:${password}`);
  if (username.toLowerCase() === AUTH_CONFIG.username.toLowerCase() && computedHash === AUTH_CONFIG.hash) {
    errorEl.setAttribute("hidden", "");
    if (remember) {
      localStorage.setItem("switch:auth", "true");
      localStorage.setItem("switch:secret", password);
    } else {
      sessionStorage.setItem("switch:auth", "true");
      sessionStorage.setItem("switch:secret", password);
    }
    hideAuthModal();
    try {
      await loadCourseData();
    } catch (err) {
      errorEl.removeAttribute("hidden");
      errorEl.textContent = err.message || "Failed to decrypt study data.";
      showAuthModal();
    }
  } else {
    errorEl.removeAttribute("hidden");
    errorEl.textContent = "Invalid username or password";
    $("#auth-password").value = "";
    $("#auth-password").focus();
  }
}

function handleLock() {
  sessionStorage.removeItem("switch:auth");
  sessionStorage.removeItem("switch:secret");
  localStorage.removeItem("switch:auth");
  localStorage.removeItem("switch:secret");
  showAuthModal();
}

async function loadRoles() {
  // Optional: a build without role manifests simply has no roles.json.
  try {
    const response = await fetch("../generated/roles.json");
    if (!response.ok) return [];
    const raw = await response.json();
    const payload = raw && raw.encrypted === true ? await decryptPayload(raw, getSessionSecret()) : raw;
    return payload.roles || [];
  } catch (error) {
    return [];
  }
}

async function loadCourseData() {
  try {
    const response = await fetch("../generated/index.json");
    if (!response.ok) throw new Error("Could not load generated/index.json.");
    const rawIndex = await response.json();
    if (rawIndex && rawIndex.encrypted === true) {
      const secret = getSessionSecret();
      if (!secret) throw new Error("Missing decryption key. Please sign in.");
      state.index = await decryptPayload(rawIndex, secret);
    } else {
      state.index = rawIndex;
    }
    state.roles = await loadRoles();
    if (state.view === "role" && !state.roles.some((item) => item.slug === state.selectedRole)) {
      state.view = "day";
    }
    await loadDay(state.selectedDay);
    if (state.view === "role") render();
  } catch (error) {
    $("#workspace").innerHTML = `<div class="empty"><h2>Couldn’t load your study data.</h2><p>${escapeHtml(error.message)}</p></div>`;
    throw error;
  }
}

async function init() {
  $("#open-sidebar").addEventListener("click", openSidebar);
  $("#close-sidebar").addEventListener("click", closeSidebar);
  $("#sidebar-backdrop").addEventListener("click", closeSidebar);
  $("#open-search").addEventListener("click", openSearch);
  $("#close-search").addEventListener("click", closeSearch);
  $("#search-overlay").addEventListener("click", (event) => { if (event.target.id === "search-overlay") closeSearch(); });
  $("#global-search").addEventListener("input", renderSearchResults);
  $("#global-search").addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSearch();
    if (event.key === "Enter") {
      const first = document.querySelector("[data-search-hit]");
      if (first) openCard(first.dataset.searchHit);
    }
  });
  $("#auth-form").addEventListener("submit", handleLogin);
  $("#auth-lock").addEventListener("click", handleLock);

  document.querySelectorAll("[data-text-size]").forEach((button) => button.addEventListener("click", () => {
    state.textSize = button.dataset.textSize;
    applyReaderPrefs();
  }));
  $("#toggle-focus").addEventListener("click", () => { state.focusMode = !state.focusMode; applyReaderPrefs(); });
  $("#toggle-primers").addEventListener("click", () => { state.showPrimers = !state.showPrimers; applyReaderPrefs(); });
  applyReaderPrefs();

  document.querySelectorAll("#tabbar .tab").forEach((tab) => tab.addEventListener("click", async () => {
    const leavingRole = state.view === "role" || state.view === "role-drill";
    if (!leavingRole && state.mode === tab.dataset.mode) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    state.view = "day";
    state.mode = tab.dataset.mode;
    if (state.mode === "review") await startReview();
    render();
    window.scrollTo({ top: 0 });
  }));
  bindGestures();

  // Three states: an explicit choice stamps data-theme and wins over the OS;
  // with no stored choice we leave the attribute off so prefers-color-scheme decides.
  const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  const stored = localStorage.getItem("switch:theme");
  if (stored === "dark" || stored === "light") document.documentElement.dataset.theme = stored;

  $("#theme-toggle").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || (systemDark() ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("switch:theme", next);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !event.target.matches("input, textarea")) {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.target.matches("input")) return;
    if (state.mode === "learn" && event.key === "ArrowRight" && state.selectedCard < filteredCards().length - 1) {
      state.selectedCard += 1;
      render();
    }
    if (state.mode === "learn" && event.key === "ArrowLeft" && state.selectedCard > 0) {
      state.selectedCard -= 1;
      render();
    }
    if (state.mode === "drill" && event.key === " ") {
      event.preventDefault();
      state.revealed = !state.revealed;
      render();
    }
  });

  if (isAuthenticated()) {
    hideAuthModal();
    await loadCourseData();
  } else {
    showAuthModal();
  }
}

init();
