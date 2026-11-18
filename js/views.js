import { ALL_LECTURES } from "./study-data.js";
import { correctQuizText, matches, matchesLecture } from "./questions.js";
import { $, esc } from "./ui.js";
import { createSessionViews } from "./session-views.js";
import { DIFS, TYPE_LABELS, lectureTitle, section } from "./view-helpers.js";

const NAV = [
  ["home", "Panel główny", "⌂"],
  ["flash", "Fiszki", "▤"],
  ["quiz", "Quiz ABCD", "☑"],
  ["recall", "Odpowiedzi z pamięci", "✎"],
  ["case", "Przypadki praktyczne", "♧"],
  ["exam", "Próbny egzamin", "◷"],
  ["hard", "Trudne i zapisane", "↻"],
  ["catalog", "Bank pytań", "⌕"],
  ["coverage", "Zakres egzaminu", "≡"],
  ["gallery", "Schematy ze slajdów", "▧"],
  ["settings", "Postępy i ustawienia", "⚙"],
];
const ROUTE_NAMES = Object.fromEntries(NAV.map(([a, b]) => [a, b]));
const percent = (value, total) => (total ? (value / total) * 100 : 0);

export function createViews(data, progress, study, filters, catalogFilters) {
  const {
    sets,
    setsById,
    all: ALL,
    cards: CARDS,
    quizzes: QUIZZES,
    opens: OPENS,
    cases: CASES,
  } = data;
  const { state, getRecord: getRec, bookmarked, isHard } = progress;
  const { dueCards, mastered } = study;
  const { renderSession, renderResults } = createSessionViews(
    data,
    progress,
    study,
  );
  const available = (items) =>
    items.filter((question) => matches(question, filters));
  function lectureOptions(
    current,
    pairLabel,
    allLabel = "Wszystkie wykłady",
    getLabel = (set) => set.label,
  ) {
    return (
      opt(ALL_LECTURES, sets.length === 2 ? pairLabel : allLabel, current) +
      sets.map((set) => opt(set.id, getLabel(set), current)).join("")
    );
  }
  const topics = [...new Set(ALL.map((q) => q.topic))].sort((a, b) =>
    a.localeCompare(b, "pl"),
  );
  function opt(value, label, current) {
    return `<option value="${esc(value)}"${current === value ? " selected" : ""}>${esc(label)}</option>`;
  }
  function filterPanel() {
    return `<div class="formbar" role="group" aria-label="Filtry nauki"><div class="field"><label for="filter-lecture">Wykład</label><select id="filter-lecture">${lectureOptions(filters.lecture, "Oba wykłady")}</select></div><div class="field wide"><label for="filter-topic">Temat</label><select id="filter-topic">${opt("all", "Wszystkie tematy", filters.topic)}${topics.map((x) => opt(x, x, filters.topic)).join("")}</select></div><div class="field"><label for="filter-difficulty">Trudność</label><select id="filter-difficulty">${opt("all", "Każda", filters.difficulty)}${Object.entries(
      DIFS,
    )
      .map(([k, v]) => opt(k, v, filters.difficulty))
      .join(
        "",
      )}</select></div><label class="filter-check"><input id="filter-priority" type="checkbox" ${filters.priority ? "checked" : ""}> Priorytety egzaminacyjne</label></div>`;
  }
  function sideStats() {
    const n = CARDS.filter(mastered).length;
    const d = dueCards().length;
    $("side-stats").textContent =
      `${n}/${CARDS.length} fiszek opanowanych · ${d} do powtórki`;
    $("side-progress").style.width = `${percent(n, CARDS.length)}%`;
    $("storage-indicator").textContent = progress.persistent
      ? "● Dane na urządzeniu"
      : "⚠ Zapis niedostępny";
  }
  function nav(route, mobileMenu) {
    const html = NAV.map(
      ([id, label, icon]) =>
        `<button type="button" class="navitem ${route === id ? "active" : ""}" data-action="nav" data-mode="${id}"><span class="navico">${icon}</span><span>${label}</span></button>`,
    ).join("");
    $("desktop-nav").innerHTML = html;
    const mobile = [
      ["home", "Start", "⌂"],
      ["flash", "Fiszki", "▤"],
      ["quiz", "Quiz", "☑"],
      ["exam", "Egzamin", "◷"],
      ["more", "Więcej", "☰"],
    ];
    $("mobile-nav").innerHTML = mobile
      .map(
        ([id, l, i]) =>
          `<button data-action="${id === "more" ? "mobileMore" : "nav"}" data-mode="${id}" class="${route === id ? "active" : ""}" aria-label="${l}"><span class="mi">${i}</span>${l}</button>`,
      )
      .join("");
    $("mobile-menu").innerHTML = NAV.slice(3)
      .map(
        ([id, l, i]) =>
          `<button data-action="nav" data-mode="${id}">${i}&nbsp; ${esc(l)}</button>`,
      )
      .join("");
    $("mobile-menu").classList.toggle("hidden", !mobileMenu);
  }
  function renderHome() {
    const covered = CARDS.filter(mastered).length,
      due = dueCards().length,
      attempts = QUIZZES.reduce(
        (n, q) => n + getRec(q).right + getRec(q).wrong,
        0,
      );
    let html = `<div class="eyebrow">TWOJE CENTRUM NAUKI</div><h1>Ucz się aktywnie.<br>Zapamiętaj na egzamin.</h1><p class="lead">${CARDS.length} fiszek, ${QUIZZES.length} pytań testowych, ${OPENS.length} pytań otwartych i ${CASES.length} scenariuszy — opracowanych z prezentacji, ze źródłami na slajdach.</p><div class="grid metrics"><div class="panel metric"><div class="meta">Fiszki opanowane</div><div class="big">${covered}<span class="muted metric-total"> / ${CARDS.length}</span></div><small>Co najmniej 2 poprawne powtórzenia</small></div><div class="panel metric"><div class="meta">Dziś do powtórki</div><div class="big">${due}</div><small>Fiszki wymagające powtórzenia</small></div><div class="panel metric"><div class="meta">Odpowiedzi testowe</div><div class="big">${attempts}</div><small>Zapisane próby testowe</small></div><div class="panel metric"><div class="meta">Ukończone sesje</div><div class="big">${state.sessions.length}</div><small>Historia zapisana lokalnie</small></div></div>`;
    html += `<div class="btn-row quick-actions"><button class="btn" data-action="start" data-mode="daily">▶ Powtórka dzienna (20 fiszek)</button><button class="btn secondary" data-action="nav" data-mode="exam">Próbny egzamin</button><button class="btn secondary" data-action="start" data-mode="priority">Sprint priorytetów (24 pytania)</button></div>${filterPanel()}`;
    html += section(
      "Wybierz sposób nauki",
      `<span class="tag prime">11 tematów egzaminacyjnych</span>`,
    );
    const qcards = [
      [
        "flash",
        "▤",
        "Inteligentne fiszki",
        "Przypomnij z pamięci i oceń odpowiedź. System planuje kolejną powtórkę.",
      ],
      [
        "quiz",
        "☑",
        "Quizy i sekwencje",
        "ABCD, wielokrotny wybór, prawda/fałsz, kolejność etapów.",
      ],
      [
        "recall",
        "✎",
        "Odpowiedź własnymi słowami",
        "Zapisz odpowiedź, poznaj wzór i oceń się samodzielnie.",
      ],
      [
        "case",
        "♧",
        "Przypadki praktyczne",
        "Ćwicz rozpoznawanie sytuacji i właściwe decyzje na podstawie slajdów.",
      ],
    ];
    html += `<div class="grid two">${qcards.map(([id, ic, t, d]) => `<button class="panel quick-card" data-action="start" data-mode="${id}"><span class="qicon">${ic}</span><h3>${t}</h3><p>${d}</p><span class="go">Rozpocznij →</span></button>`).join("")}</div>`;
    html += section("Postęp w wykładach");
    html += `<div class="grid two">${sets
      .map(({ id, label, title, cards }, index) => {
        const alt = index % 2 === 1;
        const m = cards.filter(mastered).length;
        return `<div class="panel card-lect ${alt ? "alt" : ""}"><div class="tag">${esc(label)}</div><h3 class="lecture-title">${esc(title)}</h3><div class="sm muted">${m}/${cards.length} fiszek opanowanych</div><div class="progressline"><i style="width:${percent(m, cards.length)}%"></i></div><div class="lecture-actions"><button class="btn small secondary" data-action="setlecture" data-lecture="${esc(id)}">Ucz się z tego wykładu</button></div></div>`;
      })
      .join("")}</div>`;
    html += `<div class="notice source-notice"><strong>Zakres źródeł</strong>W prezentacjach nie wyjaśniono terminu „RAJS” ani etapów przy stwardnieniu. Pozostałe niepełne zagadnienia oznaczyłem w zakładce „Zakres egzaminu”. Przykłady kliniczne służą wyłącznie do nauki materiału wykładowego.</div>`;
    return html;
  }
  function renderModeLanding(mode) {
    const cfg = {
      flash: [
        "Fiszki z powtórkami",
        "Najpierw przywołaj odpowiedź z pamięci, następnie oceń jej znajomość. Trudniejsze wracają częściej.",
        CARDS.length,
      ],
      quiz: [
        "Sprawdź się w quizie",
        "Pytania ABCD, wielokrotnego wyboru, prawda/fałsz oraz układanie etapów w kolejności.",
        QUIZZES.length,
      ],
      recall: [
        "Odpowiedz własnymi słowami",
        "Zapisz odpowiedź bez podglądania materiału. Po odsłonięciu porównaj najważniejsze punkty i ocenę.",
        OPENS.length,
      ],
      case: [
        "Rozwiąż sytuacje praktyczne",
        "Opis sytuacji jest ćwiczeniem dydaktycznym; wnioski wynikają z treści wykładów.",
        CASES.length,
      ],
    }[mode];
    const pool = available(
      { flash: CARDS, quiz: QUIZZES, recall: OPENS, case: CASES }[mode],
    );
    let h = `<div class="eyebrow">TRYB NAUKI</div><h1>${cfg[0]}</h1><p class="lead">${cfg[1]}</p>${filterPanel()}<div class="grid two"><div class="panel"><div class="tag prime">${pool.length} dostępnych pytań</div><h2 class="mode-session-title">Sesja nauki</h2><p class="sm">Pytania są dobierane z aktywnych filtrów. Nie są powielane w jednej sesji, z wyjątkiem fiszek ocenionych jako „Nie pamiętam”.</p><div class="btn-row"><button class="btn" data-action="start" data-mode="${mode}">Rozpocznij sesję</button>${mode === "flash" ? '<button class="btn secondary" data-action="start" data-mode="daily">Dzisiejsze powtórki</button>' : ""}</div></div><div class="panel"><h3>Jak się uczyć?</h3>${mode === "flash" ? "<p>Odsłoń odpowiedź dopiero po samodzielnej próbie. „Nie pamiętam” odkłada fiszkę na krótką powtórkę, „Bardzo łatwe” wydłuża odstęp.</p>" : mode === "quiz" ? "<p>W pytaniach wielokrotnego wyboru zaznacz wszystkie poprawne odpowiedzi. Przy układaniu kroków korzystaj ze strzałek ↑ ↓.</p>" : mode === "recall" ? "<p>Porównuj nie brzmienie słów, lecz obecność kluczowych elementów. Pytania otwarte oceniasz samodzielnie.</p>" : "<p>Najpierw zapisz decyzję, dopiero później wyświetl schemat odpowiedzi. Nie uzupełniaj go wiedzą spoza źródeł jako wiedzą z wykładu.</p>"}<div class="tag">Źródło pod każdym pytaniem</div></div></div>`;
    return h;
  }
  function renderExamStart() {
    const questionCount = QUIZZES.length + OPENS.length + CASES.length;
    return `<div class="eyebrow">SYMULTANICZNY EGZAMIN</div><h1>Sprawdź gotowość</h1><p class="lead">Zestaw bez powtórzeń, z opcjonalnym limitem czasu. Pytania testowe ocenia aplikacja, a odpowiedzi otwarte i przypadki oceniasz po porównaniu z wzorem.</p><div class="panel exam-setup"><div class="grid two"><div class="field"><label for="exam-lecture">Wybierz materiał</label><select id="exam-lecture">${lectureOptions(ALL_LECTURES, "Oba wykłady", "Wszystkie wykłady", (set) => `Tylko ${set.label[0].toLocaleLowerCase("pl")}${set.label.slice(1)}`)}</select></div><div class="field"><label for="exam-type">Rodzaj pytań</label><select id="exam-type">${opt("mixed", "Mieszane", "mixed")}${opt("open", "Wyłącznie otwarte i scenariusze", "mixed")}${opt("test", "Tylko automatycznie oceniane", "mixed")}</select></div><div class="field"><label for="exam-size">Liczba pytań</label><select id="exam-size">${opt("10", "10", "20")}${opt("20", "20", "20")}${opt("40", "40", "20")}</select></div><div class="field"><label for="exam-time">Limit czasu</label><select id="exam-time">${opt("0", "Bez limitu", "0")}${opt("10", "10 minut", "0")}${opt("20", "20 minut", "0")}${opt("40", "40 minut", "0")}</select></div></div><p class="sm exam-pool-summary">Baza: ${questionCount} pytań. Gdy filtr zapewnia mniej pytań niż wybrana liczba, sesja obejmie wszystkie dostępne bez powtarzania.</p><button class="btn" data-action="beginExam">Rozpocznij egzamin →</button></div><div class="notice exam-notice"><strong>Ocena wyników</strong>Wynik procentowy liczymy wyłącznie z pytań automatycznych. Odpowiedzi otwarte i sytuacje praktyczne mają osobny wynik samooceny. Prawidłowe odpowiedzi testowe w egzaminie są pokazywane na końcu.</div>`;
  }
  function renderHard() {
    const hard = ALL.filter(isHard);
    const d = available(hard),
      saved = available(ALL.filter((q) => state.bookmarks.includes(q.id)));
    return `<div class="eyebrow">SYSTEM POWTÓREK</div><h1>Trudne i zapisane</h1><p class="lead">Powracaj do pytań, które sprawiły trudność, oraz do wybranych przez siebie zadań.</p>${filterPanel()}
<div class="grid two"><div class="panel"><h2>Do ponownej nauki: ${d.length}</h2><p class="sm">Lista uwzględnia dotychczasowe błędy i fiszki o obniżonym współczynniku łatwości.</p><button class="btn" data-action="start" data-mode="review" ${!d.length ? "disabled" : ""}>Powtórz błędy (${d.length})</button>${d
      .slice(0, 9)
      .map(
        (q) =>
          `<div class="statrow"><span>${esc(q.question.slice(0, 105))}</span><span class="tag warn">${getRec(q).wrong} bł.</span></div>`,
      )
      .join("")}</div>
<div class="panel"><h2>Zapisane pytania: ${saved.length}</h2><p class="sm">Zapisz dowolne pytanie przyciskiem ☆ w trakcie nauki lub w banku pytań.</p><button class="btn secondary" data-action="start" data-mode="saved" ${!saved.length ? "disabled" : ""}>Ćwicz zapisane (${saved.length})</button>${saved
      .slice(0, 9)
      .map(
        (q) =>
          `<div class="statrow"><span>${esc(q.question.slice(0, 100))}</span><button class="btn secondary small" data-action="bookmark" data-id="${q.id}" title="Usuń zapis">★</button></div>`,
      )
      .join("")}</div></div>`;
  }
  function catalogSubset() {
    const q = catalogFilters.search.trim().toLocaleLowerCase("pl-PL");
    return ALL.filter(
      (x) =>
        matchesLecture(x, catalogFilters.lecture) &&
        (catalogFilters.kind === "all" || x.kind === catalogFilters.kind) &&
        (!catalogFilters.priority || x.priority) &&
        (!q ||
          `${x.question} ${x.topic} ${x.answer || ""} ${x.scenario || ""} ${x.slide}`
            .toLocaleLowerCase("pl-PL")
            .includes(q)),
    );
  }
  function catalogRows() {
    const result = catalogSubset(),
      items = result.slice(0, catalogFilters.limit);
    let html = `<div class="sm muted catalog-count">Znaleziono ${result.length} pytań. Pokazano ${items.length}.</div>`;
    html += items
      .map((q) => {
        const ans = q.kind === "quiz" ? correctQuizText(q) : q.answer;
        return `<article class="catalog-item"><div class="catalog-head"><span class="tag prime">${esc(lectureTitle(setsById.get(q.lecture)))}</span><span class="tag">${TYPE_LABELS[q.kind]}</span><span class="tag">slajd ${esc(q.slide)}</span>${q.priority ? '<span class="tag warn">Priorytet</span>' : ""}</div>${q.kind === "case" ? `<p class="tiny muted">${esc(q.scenario)}</p>` : ""}<h3>${esc(q.question)}</h3><div class="sm muted">${esc(q.topic)} · ${DIFS[q.difficulty]}</div><details class="catalog-answer"><summary>Sprawdź odpowiedź</summary><p>${esc(ans)}</p>${q.why ? `<p class="sm muted">${esc(q.why)}</p>` : ""}</details><div class="btn-row"><button class="btn small" data-action="single" data-id="${q.id}">Przećwicz pytanie</button><button class="btn secondary small" data-action="bookmark" data-id="${q.id}" aria-label="${bookmarked(q) ? "Usuń z zapisanych" : "Zapisz pytanie"}">${bookmarked(q) ? "★ Zapisane" : "☆ Zapisz"}</button></div></article>`;
      })
      .join("");
    if (result.length > items.length)
      html += `<div class="btn-row catalog-pagination"><button class="btn secondary" data-action="moreCatalog">Pokaż kolejne pytania</button></div>`;
    return html;
  }
  function renderCatalog() {
    return `<div class="eyebrow">CAŁY MATERIAŁ</div><h1>Przeglądaj bank pytań</h1><p class="lead">Znajdź temat, obejrzyj wzorcową odpowiedź lub rozpocznij pojedyncze pytanie. Możesz zapisać trudne zadania do osobnej sesji.</p><div class="catalog-controls"><div class="field wide"><label for="catalog-search">Szukaj w pytaniach i odpowiedziach</label><input id="catalog-search" type="search" placeholder="np. pionizacja, skolioza, kaszel…" value="${esc(catalogFilters.search)}"></div><div class="field"><label for="catalog-lecture">Wykład</label><select id="catalog-lecture">${lectureOptions(catalogFilters.lecture, "Oba", "Wszystkie")}</select></div><div class="field"><label for="catalog-kind">Typ</label><select id="catalog-kind">${opt("all", "Wszystkie", catalogFilters.kind)}${Object.entries(
      TYPE_LABELS,
    )
      .map(([k, v]) => opt(k, v, catalogFilters.kind))
      .join(
        "",
      )}</select></div><label class="filter-check"><input type="checkbox" id="catalog-priority" ${catalogFilters.priority ? "checked" : ""}> Tylko priorytety</label></div><div id="catalog-list" class="catalog-list">${catalogRows()}</div>`;
  }
  function refreshCatalog() {
    const host = $("catalog-list");
    if (host) host.innerHTML = catalogRows();
  }
  function renderCoverage() {
    let html = `<div class="eyebrow">AUDYT WIEDZY</div><h1>11 zagadnień egzaminacyjnych</h1><p class="lead">Statusy opisują wyłącznie to, co da się ustalić z załączonych slajdów. Brak oznacza brak podstaw do opracowania odpowiedzi z tych dwóch wykładów.</p><div class="notice"><strong>Brak w obu wykładach</strong>„Etapy przy stwardnieniu” oraz „Postępowanie RAJS”. Nie zamieniam ich na stadia POChP ani inne, domniemane procedury.</div>`;
    html += `<div class="grid two coverage-grid">${sets
      .filter((set) => set.coverage.length)
      .map(
        (set) =>
          `<div><h2>${esc(set.coverageTitle ?? lectureTitle(set))}</h2>${set.coverage.map((r, i) => `<div class="coverage-entry"><h3><span>${i + 1}. ${esc(r.name)}</span><span class="tag ${r.status === "OMÓWIONE" ? "ok" : r.status === "BRAK" ? "fail" : "warn"}">${esc(r.status)}</span></h3><p>${r.slide ? `Slajdy: ${esc(r.slide)}. ` : ""}${esc(r.note)}</p></div>`).join("")}</div>`,
      )
      .join("")}</div>`;
    return html;
  }
  function renderGallery() {
    return `<div class="eyebrow">MATERIAŁY GRAFICZNE</div><h1>Schematy z prezentacji</h1><p class="lead">Wybrane ilustracje przeniesione z oryginalnych slajdów do tej aplikacji. Są częścią źródła wykładowego.</p><div class="gallery">${sets
      .flatMap((set) => set.images)
      .map(
        (v) =>
          `<div class="visual-card"><img src="${esc(v.src)}" alt="${esc(v.alt)}" loading="lazy"><div class="desc"><h3>${esc(v.title)}</h3><p>${esc(v.lecture)} · slajd ${esc(v.slide)}. ${esc(v.caption)}</p></div></div>`,
      )
      .join("")}</div>`;
  }
  function topicProgress() {
    let grouped = new Map();
    for (const q of ALL) {
      let st = grouped.get(q.topic) || {
        right: 0,
        wrong: 0,
        items: 0,
        seen: 0,
      };
      let r = getRec(q);
      st.right += r.right;
      st.wrong += r.wrong;
      st.items++;
      if (r.right + r.wrong > 0) st.seen++;
      grouped.set(q.topic, st);
    }
    return [...grouped.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], "pl"),
    );
  }
  function renderSettings() {
    return `<div class="eyebrow">WYNIKI I USTAWIENIA</div><h1>Twój postęp</h1><p class="lead">Wyniki są zapisywane na tym urządzeniu w pamięci przeglądarki. Bez logowania i bez wysyłania danych do sieci.</p><div class="grid two"><div class="panel"><h2>Kopia postępów</h2><p class="sm">Zapisz plik JSON i przenieś go na inne urządzenie lub przywróć po wyczyszczeniu przeglądarki.</p><div class="btn-row"><button class="btn" data-action="export">↓ Eksportuj JSON</button><button class="btn secondary" data-action="import">↑ Importuj JSON</button></div></div><div class="panel"><h2>Reset wyników</h2><p class="sm">Usuwa postęp fiszek, błędy, oceny i historię. Baza wiedzy zostaje bez zmian.</p><button class="btn warn" data-action="reset">Wyczyść dane nauki</button></div></div>${section("Skuteczność według tematów")}<div class="panel scrollable-table" tabindex="0" role="region" aria-label="Skuteczność według tematów"><table class="data-table"><thead><tr><th>Temat</th><th>Próby</th><th>Poprawne</th><th>Odwiedzone pytania</th></tr></thead><tbody>${topicProgress()
      .map(
        ([topic, s]) =>
          `<tr><td>${esc(topic)}</td><td>${s.right + s.wrong}</td><td>${s.right + s.wrong ? Math.round((100 * s.right) / (s.right + s.wrong)) + "%" : "–"}</td><td>${s.seen} / ${s.items}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div>${section("Ostatnie sesje")}<div class="panel">${
      state.sessions.length
        ? `<div class="scrollable-table" tabindex="0" role="region" aria-label="Ostatnie sesje"><table class="data-table"><thead><tr><th>Data</th><th>Tryb</th><th>Pytania</th><th>Wynik autom.</th><th>Samoocena</th></tr></thead><tbody>${[
            ...state.sessions,
          ]
            .reverse()
            .slice(0, 15)
            .map(
              (s) =>
                `<tr><td>${new Date(s.time).toLocaleString("pl-PL")}</td><td>${esc(s.mode)}</td><td>${s.items}</td><td>${s.autoTotal ? Math.round((100 * s.autoCorrect) / s.autoTotal) + "%" : "–"}</td><td>${s.selfTotal ? s.selfGood + "/" + s.selfTotal : "–"}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : "<p>Brak ukończonych sesji. Historia pojawi się po pierwszej nauce.</p>"
    }</div><div class="notice exam-pool-summary"><strong>Ważne</strong>Jeśli otwierasz stronę w innej przeglądarce lub na innym urządzeniu, przenieś postępy przez eksport i import JSON.</div>`;
  }
  function renderSourceSummary() {
    const labels = new Intl.ListFormat("pl").format(
      sets.map((set) => set.label.replace(/^Wykład /, "")),
    );
    $("source-summary").textContent = `Wiedza z wykładów ${labels}.`;
  }

  function render(route, mobileMenu) {
    nav(route, mobileMenu);
    sideStats();
    $("crumb").textContent = ROUTE_NAMES[route] || "Sesja";
    const pages = {
      home: renderHome,
      flash: () => renderModeLanding("flash"),
      quiz: () => renderModeLanding("quiz"),
      recall: () => renderModeLanding("recall"),
      case: () => renderModeLanding("case"),
      exam: renderExamStart,
      hard: renderHard,
      catalog: renderCatalog,
      coverage: renderCoverage,
      gallery: renderGallery,
      settings: renderSettings,
      session: renderSession,
      results: renderResults,
    };
    $("root").innerHTML = (pages[route] ?? renderHome)();
  }
  renderSourceSummary();
  return { render, nav, sideStats, refreshCatalog };
}
