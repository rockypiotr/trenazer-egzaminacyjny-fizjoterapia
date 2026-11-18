import { correctQuizText } from "./questions.js";
import { esc, formatTime } from "./ui.js";
import { DIFS, lectureTitle, pageRef, section } from "./view-helpers.js";

export function createSessionViews(
  { sets, setsById, questionsById },
  { bookmarked },
  study,
) {
  const { hasSelection } = study;
  function sourceInfo(q) {
    return `<div class="source"><span class="tag prime">${pageRef(q, setsById)}</span><span class="tag">${esc(q.topic)}</span><span class="tag">${DIFS[q.difficulty]}</span>${q.priority ? '<span class="tag warn">Priorytet egzaminacyjny</span>' : ""}</div>`;
  }
  function renderSession() {
    const s = study.current,
      q = study.currentQ();
    if (!q) return "";
    const pct = (100 * s.index) / s.items.length;
    const time = s.deadline
      ? `<span class="tag warn">⌛ <span id="remaining">${formatTime(s.deadline - Date.now())}</span></span>`
      : "";
    let h = `<div class="session-wrap"><div class="sessiontop"><div><div class="eyebrow">${s.isExam ? "SYMULACJA EGZAMINU" : "AKTYWNA NAUKA"}</div><h2>${s.isExam ? "Próbny egzamin" : s.mode === "flash" ? "Inteligentne fiszki" : s.mode === "daily" ? "Powtórka dzienna" : s.mode === "quiz" ? "Quiz" : s.mode === "recall" ? "Odpowiedzi z pamięci" : s.mode === "case" ? "Przypadki" : s.mode === "priority" ? "Sprint priorytetów" : s.mode === "saved" ? "Zapisane pytania" : "Powtórka błędów"}</h2></div><div class="btn-row">${time}<button class="btn secondary small" data-action="exitSession">Zakończ sesję</button></div></div><div class="qnum">Pytanie ${s.index + 1} z ${s.items.length}</div><div class="meter"><span style="width:${pct}%"></span></div><div class="panel sessionbig">${sourceInfo(q)}<div class="session-bookmark"><button class="btn secondary small" data-action="bookmark" data-id="${q.id}">${bookmarked(q) ? "★ Zapisane" : "☆ Zapisz pytanie"}</button></div>${q.kind === "case" ? `<div class="casebox"><strong>${esc(q.title)}</strong>${esc(q.scenario)}</div>` : ""}<div class="question">${esc(q.question)}</div>`;
    if (q.kind === "quiz") h += renderQuiz(q);
    else if (q.kind === "card") h += renderFlash(q);
    else h += renderWritten(q);
    h += `</div><p class="tiny muted session-shortcuts">${q.kind === "card" ? "Skróty: spacja – pokaż, po odsłonięciu 1–4 – oceń." : q.kind === "quiz" ? "Skróty: 1–4 – zaznacz odpowiedź, Enter – zatwierdź." : "Skrót: Ctrl+Enter – pokaż odpowiedź."} · Źródłem jest wskazany slajd, nie niezależna wytyczna kliniczna.</p></div>`;
    return h;
  }
  function renderFlash(q) {
    const session = study.current;
    let h = "";
    if (session.phase === "ask") {
      h = `<div class="answerbox flash-prompt"><p class="sm muted">Najpierw przypomnij sobie odpowiedź bez podpowiedzi.</p><button class="btn" data-action="reveal">Pokaż odpowiedź <span>⤵</span></button></div>`;
    } else {
      h = `<div class="answerbox"><strong>Odpowiedź</strong><p>${esc(q.answer)}</p><div class="flash-rating-label">Na ile dobrze udało Ci się odpowiedzieć?</div><div class="rate-grid">${[
        ["0", "Nie pamiętam", "Wróci pod koniec sesji", "again"],
        ["1", "Trudne", "Powtórz jutro", ""],
        ["2", "Pamiętam", "Dłuższy odstęp", ""],
        ["3", "Bardzo łatwe", "Najdłuższy odstęp", "easy"],
      ]
        .map(
          ([v, t, sub, c]) =>
            `<button class="ratebtn ${c}" data-action="rate" data-grade="${v}">${t}<small>${sub}</small></button>`,
        )
        .join("")}</div></div>`;
    }
    return h;
  }
  function renderQuiz(q) {
    const session = study.current;
    let h = '<div class="options">';
    if (q.qtype === "order") {
      h =
        `<div class="sm muted">Ustaw etapy we właściwej kolejności (przyciskami ↑ ↓).</div>` +
        session.order
          .map(
            (idx, pos) =>
              `<div class="orderrow"><span class="tag">${pos + 1}</span><span>${esc(q.options[idx])}</span><span class="orderbtns"><button data-action="move" data-pos="${pos}" data-delta="-1" aria-label="Przesuń etap w górę" ${pos === 0 || session.phase === "feedback" ? "disabled" : ""}>↑</button><button data-action="move" data-pos="${pos}" data-delta="1" aria-label="Przesuń etap w dół" ${pos === session.order.length - 1 || session.phase === "feedback" ? "disabled" : ""}>↓</button></span></div>`,
          )
          .join("");
    } else if (q.qtype === "tf") {
      h += ["true", "false"]
        .map(
          (v, i) =>
            `<button class="option ${session.chosen.includes(v) ? "selected" : ""}" data-action="choose" data-idx="${v}" aria-pressed="${session.chosen.includes(v)}" ${session.phase === "feedback" ? "disabled" : ""}><span class="letter">${i === 0 ? "P" : "F"}</span><span>${i === 0 ? "Prawda" : "Fałsz"}</span></button>`,
        )
        .join("");
    } else {
      h += q.options
        .map((v, i) => {
          const isSelected = session.chosen.includes(i);
          const good =
            q.qtype === "single" ? q.correct === i : q.correct.includes(i);
          return `<button class="option ${isSelected ? "selected" : ""} ${session.phase === "feedback" && good ? "correct" : ""} ${session.phase === "feedback" && isSelected && !good ? "incorrect" : ""}" data-action="choose" data-idx="${i}" aria-pressed="${isSelected}" ${session.phase === "feedback" ? "disabled" : ""}><span class="letter">${String.fromCharCode(65 + i)}</span><span>${esc(v)}</span>${q.qtype === "multi" ? `<span class="option-checkmark">${isSelected ? "☑" : "□"}</span>` : ""}</button>`;
        })
        .join("");
    }
    if (q.qtype !== "order") h += "</div>";
    else h += '<div class="order-answer-spacing"></div>';
    if (session.phase === "ask") {
      h += `<div class="btn-row"><button class="btn" data-action="checkQuiz" ${hasSelection(q) ? "" : "disabled"}>Zatwierdź odpowiedź</button>${q.qtype === "multi" ? '<span class="sm muted">Zaznacz wszystkie poprawne</span>' : ""}</div>`;
    } else {
      const last = session.results[session.results.length - 1];
      h += `<div class="feedback ${last.good ? "success" : "error"}"><b>${last.good ? "✓ Poprawnie" : "✕ Niepoprawnie"}</b><p><strong>Prawidłowa odpowiedź:</strong> ${esc(correctQuizText(q))}</p><p>${esc(q.why)}</p></div><button class="btn" data-action="next">${session.index === session.items.length - 1 ? "Zobacz wyniki →" : "Następne pytanie →"}</button>`;
    }
    return h;
  }
  function renderWritten(q) {
    const session = study.current;
    if (session.phase === "ask")
      return `<textarea class="textarea" id="written-answer" placeholder="Zapisz własną odpowiedź z pamięci…" aria-label="Twoja odpowiedź">${esc(session.draft)}</textarea><div class="btn-row written-answer-actions"><button class="btn" data-action="reveal">Porównaj z odpowiedzią wzorcową</button><span class="sm muted">Nie oceniam dosłownego brzmienia.</span></div>`;
    return `<div class="answerbox"><div class="tag">Twoja odpowiedź</div><p class="written-answer-preview">${esc(session.draft || "(Brak wpisanej odpowiedzi)")}</p><strong>Odpowiedź wzorcowa</strong><p>${esc(q.answer)}</p><strong>Elementy obowiązkowe</strong><ul class="checklist">${q.mandatory.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><div class="feedback"><b>Na co uważać?</b>${esc(q.pitfall)}</div><p class="sm muted">Czy Twoja odpowiedź zawierała wszystkie najważniejsze elementy?</p><div class="btn-row"><button class="btn secondary" data-action="gradeOpen" data-grade="0">Nie umiem</button><button class="btn secondary" data-action="gradeOpen" data-grade="1">Częściowo</button><button class="btn" data-action="gradeOpen" data-grade="2">Poprawnie</button></div></div>`;
  }
  function renderResults() {
    const finished = study.finished;
    const s = finished.summary,
      wrong = finished.results.filter((x) => !x.good),
      scored = s.autoTotal
        ? Math.round((100 * s.autoCorrect) / s.autoTotal)
        : null;
    let h = `<div class="eyebrow">KONIEC SESJI</div><h1>${finished.timeout ? "Czas upłynął" : "Podsumowanie nauki"}</h1><p class="lead">Przerobiono ${finished.results.length} odpowiedzi z ${s.items} przygotowanych pytań. Błędne tematy trafiły do zakładki powtórek.</p><div class="grid metrics"><div class="panel metric"><div class="meta">Wynik automatyczny</div><div class="big">${scored === null ? "–" : scored + "%"}</div><small>${s.autoCorrect}/${s.autoTotal} poprawnych testowych</small></div><div class="panel metric"><div class="meta">Samoocena odpowiedzi otwartych</div><div class="big">${s.selfTotal ? Math.round((100 * s.selfGood) / s.selfTotal) + "%" : "–"}</div><small>${s.selfGood}/${s.selfTotal} częściowo lub poprawnie</small></div><div class="panel metric"><div class="meta">Pytania wymagające powtórki</div><div class="big">${wrong.length}</div><small>W tym pominięte pytania</small></div><div class="panel metric"><div class="meta">Czas sesji</div><div class="big">${Math.round(finished.duration / 60000)} min</div><small>Sesja zapisana lokalnie</small></div></div>`;
    const byLecture = sets
      .map((set) => {
        const xs = finished.results.filter(
          (x) => x.lecture === set.id && x.kind === "quiz",
        );
        return `<div class="statrow"><span>${esc(lectureTitle(set))}</span><strong>${xs.length ? Math.round((100 * xs.filter((x) => x.good).length) / xs.length) + "% · " + xs.filter((x) => x.good).length + "/" + xs.length : "brak pytań testowych"}</strong></div>`;
      })
      .join("");
    h += `<div class="grid two"><div class="panel"><h2>Wynik według wykładu</h2>${byLecture}<p class="sm muted lecture-results-note">Procent dotyczy tylko automatycznie ocenianych pytań. Wykład może mieć też odpowiedzi samooceniane.</p></div><div class="panel"><h2>Co dalej?</h2><p>Powtarzanie błędów jest bardziej wartościowe niż ponowne przeglądanie całych notatek.</p><div class="btn-row"><button class="btn" data-action="nav" data-mode="hard">Powtórz błędy</button><button class="btn secondary" data-action="nav" data-mode="home">Panel główny</button></div></div></div>`;
    if (finished.summary.mode === "exam") {
      h += `<details class="panel result-review"><summary><strong>Przejrzyj odpowiedzi do wszystkich pytań egzaminu</strong></summary>${finished.results
        .map((x, i) => {
          const q = questionsById.get(x.id);
          return `<div class="result-entry"><div class="tag ${x.good ? "ok" : "fail"}">${i + 1}. ${x.good ? "Poprawnie" : x.unanswered ? "Pominięte" : "Błąd"}</div><h3>${esc(x.question)}</h3><div class="sm"><strong>Wzór:</strong> ${esc(x.correctText || "")}</div>${q ? `<div class="sm muted">${pageRef(q, setsById)}</div>` : ""}</div>`;
        })
        .join("")}</details>`;
    }
    if (wrong.length) {
      h += section("Pytania do powtórzenia");
      h += `<div class="panel">${wrong
        .slice(0, 35)
        .map(
          (x) =>
            `<div class="result-mistake"><div class="tag warn">${x.unanswered ? "Pominięte" : "Do powtórki"} · ${esc(x.lecture)}</div><h3 class="result-mistake-question">${esc(x.question)}</h3>${x.correctText ? `<div class="sm"><b>Wzór:</b> ${esc(x.correctText)}</div>` : ""}${x.why ? `<div class="sm muted result-mistake-explanation">${esc(x.why)}</div>` : ""}</div>`,
        )
        .join("")}</div>`;
    } else
      h += `<div class="feedback success result-success">Wszystkie udzielone odpowiedzi oceniono pozytywnie.</div>`;
    return h;
  }
  return { renderSession, renderResults };
}
