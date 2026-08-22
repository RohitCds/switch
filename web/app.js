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
  completed: new Set(JSON.parse(localStorage.getItem("switch:completed") || "[]")),
  bookmarked: new Set(JSON.parse(localStorage.getItem("switch:bookmarked") || "[]")),
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

function saveState() {
  localStorage.setItem("switch:selected-day", state.selectedDay);
  localStorage.setItem("switch:completed", JSON.stringify([...state.completed]));
  localStorage.setItem("switch:bookmarked", JSON.stringify([...state.bookmarked]));
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
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  const flushQuote = () => {
    if (!quote.length) return;
    html += `<blockquote>${quote.map((q) => inlineMarkdown(q)).join("<br>")}</blockquote>`;
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

async function loadDay(dayNumber) {
  const entry = state.index.days.find((day) => day.day === dayNumber) || state.index.days[0];
  const response = await fetch(`../generated/${entry.path}`);
  if (!response.ok) throw new Error(`Could not load Day ${entry.day}.`);
  state.day = await response.json();
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

function renderSidebar() {
  const totalCards = state.index.days.reduce((sum, day) => sum + day.card_count, 0);
  const completed = state.completed.size;
  $("#course-summary").innerHTML = `<p class="summary-label">Course progress</p><p class="summary-number">${completed} <span>/ ${totalCards} cards</span></p><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, completed / totalCards * 100)}%"></div></div>`;
  $("#day-list").innerHTML = state.index.days.map((day) => `
    <button class="day-button ${day.day === state.selectedDay ? "active" : ""}" data-day="${day.day}">
      <span class="day-number">${String(day.day).padStart(2, "0")}</span>
      <span><span class="day-name">${escapeHtml(day.title)}</span><span class="day-meta">${day.card_count} cards · ${day.qa_count} drills</span></span>
    </button>`).join("");
  document.querySelectorAll("[data-day]").forEach((button) => button.addEventListener("click", () => { closeSidebar(); loadDay(Number(button.dataset.day)); }));
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
  return `<div class="mode-switch"><button class="${state.mode === "learn" ? "active" : ""}" data-mode="learn">Learn</button><button class="${state.mode === "drill" ? "active" : ""}" data-mode="drill">Drill</button><button class="${state.mode === "overview" ? "active" : ""}" data-mode="overview">Notes</button></div>`;
}

function learnHtml() {
  const cards = filteredCards();
  if (state.selectedCard >= cards.length) state.selectedCard = 0;
  const card = cards[state.selectedCard];
  const filters = [["all", "All"], ["must_know", "Must know"], ["should_know", "Should know"], ["nice_to_know", "Nice to know"]];
  const listHtml = cards.length ? cards.map((item, index) => `<button class="card-nav-button ${index === state.selectedCard ? "active" : ""} ${state.completed.has(item.id) ? "done" : ""}" data-card-index="${index}"><span class="priority-dot ${item.priority}"></span><span><span class="card-title">${escapeHtml(item.title)}</span><span class="card-category">${escapeHtml(item.category.replaceAll("-", " "))}</span></span></button>`).join("") : `<p class="empty">No cards match this filter.</p>`;
  const content = card ? `<article class="study-card"><header class="study-card-header"><div><p class="card-count">CARD ${String(state.selectedCard + 1).padStart(2, "0")} OF ${String(cards.length).padStart(2, "0")}</p><h3>${escapeHtml(card.title)}</h3></div><button class="bookmark-button ${state.bookmarked.has(card.id) ? "active" : ""}" data-bookmark="${card.id}" aria-label="Bookmark card">${state.bookmarked.has(card.id) ? "★" : "☆"}</button></header><div class="card-tags">${card.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div><div class="markdown">${markdownToHtml(card.content_markdown)}</div><footer class="card-actions"><button class="button" data-previous ${state.selectedCard === 0 ? "disabled" : ""}>← Previous</button><button class="button primary" data-complete="${card.id}">${state.completed.has(card.id) ? "Completed ✓" : "Mark complete"}</button><button class="button" data-next ${state.selectedCard === cards.length - 1 ? "disabled" : ""}>Next →</button></footer></article>` : "";
  return `${controlsHtml()}<div class="controls"><label class="search"><input id="card-search" value="${escapeHtml(state.query)}" placeholder="Search this day" aria-label="Search cards" /></label><div class="filter-row">${filters.map(([value, label]) => `<button class="filter-chip ${state.filter === value ? "active" : ""}" data-filter="${value}">${label}</button>`).join("")}</div></div><div class="study-grid"><section class="card-list"><div class="card-list-header">Cards <span>${cards.length} shown</span></div><div class="card-list-items">${listHtml}</div></section>${content}</div>`;
}

function drillHtml() {
  const drill = state.day.qa_drill[state.drillIndex];
  if (!drill) return `<div class="empty">No drill questions are available for this day.</div>`;
  const links = drill.linked_card_ids.map((id) => { const card = state.day.cards.find((item) => item.id === id); return `<button data-linked-card="${id}">${escapeHtml(card?.title || id)}</button>`; }).join("");
  return `${controlsHtml()}<article class="drill-card"><div class="drill-meta"><span>ACTIVE RECALL</span><span>${String(state.drillIndex + 1).padStart(2, "0")} / ${String(state.day.qa_drill.length).padStart(2, "0")}</span></div><h3 class="drill-question">${escapeHtml(drill.question)}</h3><div class="drill-answer" ${state.revealed ? "" : "hidden"}><strong>Answer</strong><br>${inlineMarkdown(drill.answer)}</div><div class="drill-actions"><button class="button" data-drill-previous ${state.drillIndex === 0 ? "disabled" : ""}>← Previous</button><button class="button primary" data-reveal>${state.revealed ? "Hide answer" : "Reveal answer"}</button><button class="button" data-drill-next ${state.drillIndex === state.day.qa_drill.length - 1 ? "disabled" : ""}>Next →</button></div><div class="linked-cards">Linked learning cards: ${links}</div></article>`;
}

function overviewHtml() {
  const sections = [["Syllabus", state.day.syllabus_markdown], ["Key connections", state.day.key_connections_markdown], ["Common misconceptions", state.day.common_misconceptions_markdown], ["Out of scope", state.day.out_of_scope_markdown]];
  return `${controlsHtml()}<div class="overview-grid">${sections.map(([title, content], index) => `<article class="overview-card ${index === 0 ? "wide" : ""}"><h3>${title}</h3><div class="markdown">${markdownToHtml(content)}</div></article>`).join("")}</div>`;
}

function bindWorkspaceEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { state.mode = button.dataset.mode; render(); }));
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { state.filter = button.dataset.filter; state.selectedCard = 0; render(); }));
  document.querySelectorAll("[data-card-index]").forEach((button) => button.addEventListener("click", () => { state.selectedCard = Number(button.dataset.cardIndex); render(); }));
  $("#card-search")?.addEventListener("input", (event) => { state.query = event.target.value; state.selectedCard = 0; render(); });
  document.querySelector("[data-previous]")?.addEventListener("click", () => { state.selectedCard -= 1; render(); });
  document.querySelector("[data-next]")?.addEventListener("click", () => { state.selectedCard += 1; render(); });
  document.querySelector("[data-complete]")?.addEventListener("click", (event) => { const id = event.currentTarget.dataset.complete; state.completed.has(id) ? state.completed.delete(id) : state.completed.add(id); saveState(); render(); });
  document.querySelector("[data-bookmark]")?.addEventListener("click", (event) => { const id = event.currentTarget.dataset.bookmark; state.bookmarked.has(id) ? state.bookmarked.delete(id) : state.bookmarked.add(id); saveState(); render(); });
  document.querySelector("[data-reveal]")?.addEventListener("click", () => { state.revealed = !state.revealed; render(); });
  document.querySelector("[data-drill-previous]")?.addEventListener("click", () => { state.drillIndex -= 1; state.revealed = false; render(); });
  document.querySelector("[data-drill-next]")?.addEventListener("click", () => { state.drillIndex += 1; state.revealed = false; render(); });
  document.querySelectorAll("[data-linked-card]").forEach((button) => button.addEventListener("click", () => { const index = state.day.cards.findIndex((card) => card.id === button.dataset.linkedCard); state.mode = "learn"; state.filter = "all"; state.query = ""; state.selectedCard = Math.max(0, index); render(); }));
}

function render() {
  renderSidebar(); renderHeader();
  const body = state.mode === "learn" ? learnHtml() : state.mode === "drill" ? drillHtml() : overviewHtml();
  $("#workspace").innerHTML = `${heroHtml()}${body}`;
  bindWorkspaceEvents();
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
    } else {
      sessionStorage.setItem("switch:auth", "true");
    }
    hideAuthModal();
    if (!state.index) {
      await loadCourseData();
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
  localStorage.removeItem("switch:auth");
  showAuthModal();
}

async function loadCourseData() {
  try {
    const response = await fetch("../generated/index.json");
    if (!response.ok) throw new Error("Could not load generated/index.json.");
    state.index = await response.json();
    await loadDay(state.selectedDay);
  } catch (error) {
    $("#workspace").innerHTML = `<div class="empty"><h2>Couldn’t load your study data.</h2><p>${escapeHtml(error.message)} Run the site through a local server from the project root, not by opening this file directly.</p></div>`;
  }
}

async function init() {
  $("#open-sidebar").addEventListener("click", openSidebar);
  $("#close-sidebar").addEventListener("click", closeSidebar);
  $("#sidebar-backdrop").addEventListener("click", closeSidebar);
  $("#auth-form").addEventListener("submit", handleLogin);
  $("#auth-lock").addEventListener("click", handleLock);

  $("#theme-toggle").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "";
    localStorage.setItem("switch:theme", dark ? "dark" : "light");
  });
  if (localStorage.getItem("switch:theme") === "dark") document.documentElement.dataset.theme = "dark";

  document.addEventListener("keydown", (event) => {
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
