import { ALL_LECTURES, loadStudyData } from "./study-data.js";
import { ALL_DIFFICULTIES, ALL_TOPICS } from "./questions.js";
import { createProgress, readBackup } from "./progress.js";
import { createStudySession } from "./study-session.js";
import { createViews } from "./views.js";
import { $, formatTime, toast } from "./ui.js";

const CATALOG_PAGE_SIZE = 24;
const modeByKind = {
  card: "flash",
  quiz: "quiz",
  open: "recall",
  case: "case",
};

function startApp(data) {
  const progress = createProgress();
  const filters = {
    lecture: ALL_LECTURES,
    topic: ALL_TOPICS,
    difficulty: ALL_DIFFICULTIES,
    priority: false,
  };
  const catalogFilters = {
    search: "",
    lecture: ALL_LECTURES,
    kind: "all",
    priority: false,
    limit: CATALOG_PAGE_SIZE,
  };
  let route = "home";
  let mobileMenu = false;

  const study = createStudySession(
    data,
    progress,
    filters,
    updateSessionView,
    toast,
  );
  const views = createViews(data, progress, study, filters, catalogFilters);

  function render() {
    views.render(route, mobileMenu);
  }

  function updateSessionView(nextRoute) {
    if (nextRoute) route = nextRoute;
    render();
    if (nextRoute) window.scrollTo(0, 0);
  }

  function navigate(to) {
    if (
      route === "session" &&
      study.current?.isExam &&
      !confirm(
        "Przerwać bieżący egzamin? Wynik tej próby nie zostanie zapisany.",
      )
    )
      return;
    study.leave();
    mobileMenu = false;
    updateSessionView(to);
  }

  function setTheme() {
    const dark = progress.state.theme === "dark";
    document.documentElement.dataset.theme = progress.state.theme;
    $("theme-toggle").textContent = dark ? "☀" : "☾";
    $("theme-toggle").title = dark ? "Jasny motyw" : "Ciemny motyw";
  }

  function startSingle(id) {
    const question = data.questionsById.get(id);
    if (question) study.startMode(modeByKind[question.kind], [question]);
  }

  function startExam() {
    study.startExam({
      lecture: $("exam-lecture").value,
      which: $("exam-type").value,
      size: Number($("exam-size").value),
      limit: Number($("exam-time").value),
    });
  }

  function chooseQuizOption(button) {
    const question = study.currentQ();
    if (question?.kind !== "quiz" || study.current.phase !== "ask") return;
    const index = button.dataset.idx;
    const restoreFocus = document.activeElement === button;
    study.selectQuizOption(question.qtype === "tf" ? index : Number(index));
    render();
    if (restoreFocus)
      document
        .querySelector(
          `[data-action="choose"][data-idx="${CSS.escape(index)}"]`,
        )
        ?.focus();
  }

  function toggleBookmark(id) {
    if (!data.questionsById.has(id)) return;
    const saved = progress.toggleBookmark(id);
    render();
    toast(saved ? "Pytanie zapisane." : "Usunięto z zapisanych.");
  }

  function enableLecture(id) {
    filters.lecture = id;
    filters.topic = ALL_TOPICS;
    navigate("flash");
  }

  function exitSession() {
    if (!study.current?.isExam) study.finishSession();
    else if (
      confirm(
        "Zakończyć egzamin teraz? Pozostałe pytania będą oznaczone jako pominięte.",
      )
    ) {
      study.finishSession(true);
    }
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(progress.exportData(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Postepy_Trenazer_Fizjoterapia.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 800);
    toast("Wyeksportowano plik JSON z postępami.");
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = await readBackup(file);
      if (!confirm("Zaimportować postępy? Bieżące postępy zostaną zastąpione."))
        return;
      progress.replace(backup);
      setTheme();
      render();
      toast("Zaimportowano postępy.");
    } catch (error) {
      toast("Nie udało się zaimportować: " + error.message);
    }
  }

  function resetProgress() {
    if (!confirm("Czy na pewno wyczyścić WSZYSTKIE postępy i historię?"))
      return;
    progress.reset();
    render();
    toast("Wyzerowano postępy.");
  }

  const actions = new Map(
    Object.entries({
      nav: ({ dataset }) => navigate(dataset.mode),
      mobileMore: () => {
        mobileMenu = !mobileMenu;
        views.nav(route, mobileMenu);
      },
      start: ({ dataset }) => study.startMode(dataset.mode),
      bookmark: ({ dataset }) => toggleBookmark(dataset.id),
      single: ({ dataset }) => startSingle(dataset.id),
      moreCatalog: () => {
        catalogFilters.limit += CATALOG_PAGE_SIZE;
        views.refreshCatalog();
      },
      setlecture: ({ dataset }) => enableLecture(dataset.lecture),
      beginExam: startExam,
      reveal: study.revealAnswer,
      rate: ({ dataset }) => study.scoreCard(Number(dataset.grade)),
      choose: chooseQuizOption,
      move: ({ dataset }) =>
        study.moveOption(Number(dataset.pos), Number(dataset.delta)),
      checkQuiz: study.checkQuiz,
      next: study.nextQuestion,
      gradeOpen: ({ dataset }) => study.gradeOpen(Number(dataset.grade)),
      exitSession,
      export: downloadBackup,
      import: () => $("import-file").click(),
      reset: resetProgress,
    }),
  );

  const studyInputs = new Map([
    ["filter-lecture", "lecture"],
    ["filter-topic", "topic"],
    ["filter-difficulty", "difficulty"],
    ["filter-priority", "priority"],
  ]);
  const catalogInputs = new Map([
    ["catalog-lecture", "lecture"],
    ["catalog-kind", "kind"],
    ["catalog-priority", "priority"],
  ]);

  function updateCatalog(key, value) {
    catalogFilters[key] = value;
    catalogFilters.limit = CATALOG_PAGE_SIZE;
    views.refreshCatalog();
  }

  function changeFilter({ target }) {
    const value = target.type === "checkbox" ? target.checked : target.value;
    if (studyInputs.has(target.id)) {
      filters[studyInputs.get(target.id)] = value;
      render();
    } else if (catalogInputs.has(target.id)) {
      updateCatalog(catalogInputs.get(target.id), value);
    }
  }

  function runShortcut(event) {
    if (route !== "session" || !study.current || event.altKey || event.metaKey)
      return;
    const tag = event.target.tagName.toLowerCase();
    if (tag === "button" && (event.key === "Enter" || event.code === "Space"))
      return;
    if (["textarea", "input", "select"].includes(tag)) {
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        study.revealAnswer();
      }
      return;
    }
    const question = study.currentQ();
    if (question?.kind === "card") flashShortcut(event);
    if (question?.kind === "quiz" && study.current.phase === "ask")
      quizShortcut(event, question);
  }

  function flashShortcut(event) {
    if (event.code === "Space") {
      event.preventDefault();
      study.revealAnswer();
    } else if (
      study.current.phase === "revealed" &&
      /^[1-4]$/.test(event.key)
    ) {
      event.preventDefault();
      study.scoreCard(Number(event.key) - 1);
    }
  }

  function quizShortcut(event, question) {
    if (event.key === "Enter") {
      event.preventDefault();
      study.checkQuiz();
      return;
    }
    if (!/^[1-4]$/.test(event.key) || question.qtype === "order") return;
    const index = Number(event.key) - 1;
    const option =
      question.qtype === "tf"
        ? ["true", "false"][index]
        : question.options[index] !== undefined
          ? index
          : undefined;
    if (option === undefined) return;
    event.preventDefault();
    study.selectQuizOption(option);
    render();
  }

  function updateTimer() {
    if (!study.current?.deadline) return;
    const left = study.current.deadline - Date.now();
    const remaining = $("remaining");
    if (remaining) remaining.textContent = formatTime(left);
    if (left <= 0) study.finishSession(true);
  }

  document.addEventListener("click", ({ target }) => {
    const button = target.closest("[data-action]");
    if (button) actions.get(button.dataset.action)?.(button);
  });
  document.addEventListener("input", ({ target }) => {
    if (target.id === "written-answer" && study.current)
      study.current.draft = target.value;
    if (target.id === "catalog-search") updateCatalog("search", target.value);
  });
  document.addEventListener("change", changeFilter);
  document.addEventListener("keydown", runShortcut);
  $("import-file").addEventListener("change", importBackup);
  $("theme-toggle").addEventListener("click", () => {
    progress.state.theme = progress.state.theme === "light" ? "dark" : "light";
    setTheme();
    progress.save();
    views.sideStats();
  });
  window.setInterval(updateTimer, 1000);
  setTheme();
  render();
}

loadStudyData()
  .then(startApp)
  .catch((error) => {
    $("root").textContent =
      "Nie udało się wczytać zestawów. Odśwież stronę, aby spróbować ponownie.";
    $("side-stats").textContent = "Zestawy niedostępne.";
    console.error(error);
  });
