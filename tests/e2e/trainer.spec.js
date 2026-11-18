import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const storageKey = "fizjo_trenazer_exam_v1";
const legacyBackup = new URL(
  "./fixtures/legacy-progress.json",
  import.meta.url,
);
const legacyProgress = JSON.parse(readFileSync(legacyBackup, "utf8"));
const extraSet = JSON.parse(
  readFileSync(new URL("./fixtures/extra-set.json", import.meta.url), "utf8"),
);
const extraSetId = "E2E-VII";

async function navigate(page, mode) {
  const desktopButton = page.locator(`#desktop-nav [data-mode="${mode}"]`);
  const mobileButton = page.locator(`#mobile-nav [data-mode="${mode}"]`);
  await expect(desktopButton).toBeAttached();
  if (await desktopButton.isVisible()) {
    await desktopButton.click();
  } else if (await mobileButton.count()) {
    await mobileButton.tap();
  } else {
    await page.getByRole("button", { name: "Więcej", exact: true }).tap();
    await page.locator(`#mobile-menu [data-mode="${mode}"]`).tap();
  }
  const path = mode === "home" ? "" : mode;
  await expect(page).toHaveURL(new RegExp(`#/${path}$`));
}

async function openTrainer(page) {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /Ucz się aktywnie/ }),
  ).toBeVisible();
}

async function importProgress(page, path) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Importuj JSON/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await (await chooser).setFiles(path);
  await expect(page.getByRole("status")).toHaveText("Zaimportowano postępy.");
}

async function assertLegacyProgress(page) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await navigate(page, "hard");
  await expect(
    page.getByRole("heading", { name: "Zapisane pytania: 1" }),
  ).toBeVisible();
  await navigate(page, "settings");
  const history = page.getByRole("region", { name: "Ostatnie sesje" });
  await expect(history.getByRole("row")).toHaveCount(2);
  await expect(history.getByText("flash", { exact: true })).toBeVisible();
}

async function addSetForTest(page, baseURL) {
  const entry = {
    id: extraSetId,
    label: "Wykład testowy",
    title: "Terminologia testowa",
    file: "sets/e2e-vii.json",
  };
  await page.route(new URL("data/sets.json", baseURL).href, async (route) => {
    const response = await route.fetch();
    const registry = await response.json();
    await route.fulfill({ response, json: [...registry, entry] });
  });
  await page.route(new URL("data/" + entry.file, baseURL).href, (route) =>
    route.fulfill({ json: extraSet }),
  );
}

test("wyszukuje w banku, ćwiczy fiszkę i zachowuje zakładkę po odświeżeniu", async ({
  page,
}) => {
  await openTrainer(page);
  await navigate(page, "catalog");
  await page.getByLabel("Wykład", { exact: true }).selectOption("V");
  await page
    .getByLabel("Szukaj w pytaniach i odpowiedziach")
    .fill("postawę ciała");
  const item = page.locator(".catalog-item").first();
  await expect(item).toContainText("Wykład V");
  await item.getByText("Sprawdź odpowiedź").click();
  await expect(item.locator("details")).toHaveAttribute("open", "");
  await item.getByRole("button", { name: "Zapisz pytanie" }).click();
  await item.getByRole("button", { name: "Przećwicz pytanie" }).click();
  await page.getByRole("button", { name: /Pokaż odpowiedź/ }).click();
  await page.getByRole("button", { name: /Bardzo łatwe/ }).click();
  await expect(
    page.getByRole("heading", { name: "Podsumowanie nauki" }),
  ).toBeVisible();
  await page.reload();
  await navigate(page, "hard");
  await expect(
    page.getByRole("heading", { name: "Zapisane pytania: 1" }),
  ).toBeVisible();
});

for (const [kind, label] of [
  ["open", "odpowiedź otwarta"],
  ["case", "przypadek praktyczny"],
]) {
  test(`sprawdza tryb ${label}`, async ({ page }) => {
    await openTrainer(page);
    await navigate(page, "catalog");
    await page.getByLabel("Typ", { exact: true }).selectOption(kind);
    await page
      .getByRole("button", { name: "Przećwicz pytanie" })
      .first()
      .click();
    await page.getByLabel("Twoja odpowiedź").fill("Moja odpowiedź");
    await page
      .getByRole("button", { name: "Porównaj z odpowiedzią wzorcową" })
      .click();
    await expect(
      page.getByText("Odpowiedź wzorcowa", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Moja odpowiedź", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Poprawnie", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Podsumowanie nauki" }),
    ).toBeVisible();
  });
}

test("wczytuje stary format z localStorage", async ({ page }) => {
  const { cards, records, sessions, theme, bookmarks, version } =
    legacyProgress;
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    {
      key: storageKey,
      state: {
        cards: { ...cards, "F-V-99999": cards["F-V-001"] },
        records: { ...records, "Q-V-99999": records["F-V-001"] },
        sessions, theme, bookmarks, version,
      },
    },
  );
  await openTrainer(page);
  await expect(page.locator(".metric").filter({ hasText: "Fiszki opanowane" }).locator(".big")).toHaveText(/^1\s*\//);
  await expect(page.locator(".metric").filter({ hasText: "Odpowiedzi testowe" }).locator(".big")).toHaveText("0");
  await assertLegacyProgress(page);
});

test("importuje stary plik JSON i zachowuje dane po odświeżeniu", async ({
  page,
}) => {
  await openTrainer(page);
  await navigate(page, "settings");
  await importProgress(page, fileURLToPath(legacyBackup));
  await page.reload();
  await assertLegacyProgress(page);
});

test("pokazuje ilustracje w galerii i ładuje pliki obrazów", async ({
  page,
}) => {
  await openTrainer(page);
  await navigate(page, "gallery");
  await expect(
    page.getByRole("heading", { name: "Ilustracje i schematy" }),
  ).toBeVisible();
  const gallery = page.locator(".gallery");
  for (const lecture of ["III", "IV", "V", "VI", "VII"]) {
    await expect(gallery.getByText(`Wykład ${lecture} ·`).first()).toBeVisible();
  }
  for (const image of await gallery.getByRole("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
  }
});

test("pokazuje nowe wykłady w banku pytań, zakresie i próbnym egzaminie", async ({
  page,
}) => {
  await openTrainer(page);
  await navigate(page, "coverage");
  for (const lecture of ["III", "IV", "VII"]) {
    await expect(
      page.getByRole("heading", { name: new RegExp(`^Wykład ${lecture} –`) }),
    ).toBeVisible();
  }

  await navigate(page, "catalog");
  const catalogFilter = page.getByLabel("Wykład", { exact: true });
  const kindFilter = page.getByLabel("Typ", { exact: true });
  for (const lecture of ["III", "IV", "VII"]) {
    await catalogFilter.selectOption(lecture);
    for (const kind of ["card", "quiz", "open", "case"]) {
      await kindFilter.selectOption(kind);
      await expect(page.locator(".catalog-item").first()).toContainText(
        `Wykład ${lecture} ·`,
      );
    }
  }

  await navigate(page, "exam");
  const examFilter = page.getByLabel("Wybierz materiał");
  await expect(examFilter.locator('option[value="both"]')).toHaveText(
    "Wszystkie wykłady",
  );
  await expect(examFilter.locator("option")).toHaveCount(6);
  await examFilter.selectOption("VII");
  await page.getByRole("button", { name: /Rozpocznij egzamin/ }).click();
  await expect(page.locator(".source")).toContainText("Wykład VII");
});

test("obsługuje dodatkowy zestaw w quizie i egzaminie oraz przywraca zapisane pytanie", async ({
  page,
  baseURL,
}) => {
  await addSetForTest(page, baseURL);
  await openTrainer(page);
  await navigate(page, "catalog");
  await page.getByLabel("Wykład", { exact: true }).selectOption(extraSetId);
  await expect(page.locator(".catalog-item")).toHaveCount(2);
  await page
    .locator(".catalog-item")
    .filter({ hasText: extraSet.cards[0].question })
    .getByRole("button", { name: "Zapisz pytanie" })
    .click();

  await navigate(page, "quiz");
  await page.getByLabel("Wykład", { exact: true }).selectOption(extraSetId);
  await page.getByRole("button", { name: "Rozpocznij sesję" }).click();
  await answerExtraQuiz(page);
  await expect(page.getByText("✓ Poprawnie", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Zobacz wyniki/ }).click();

  await navigate(page, "exam");
  await page.getByLabel("Wybierz materiał").selectOption(extraSetId);
  await page.getByRole("button", { name: /Rozpocznij egzamin/ }).click();
  await expect(page.getByText("Pytanie 1 z 1", { exact: true })).toBeVisible();
  await answerExtraQuiz(page);
  await expect(
    page.getByRole("heading", { name: "Podsumowanie nauki" }),
  ).toBeVisible();
  await expect(page.getByText("1/1 poprawnych testowych")).toBeVisible();

  await navigate(page, "settings");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Eksportuj JSON/ }).click();
  const backupPath = await (await downloadEvent).path();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Wyczyść dane nauki" }).click();
  await importProgress(page, backupPath);
  await page.reload();

  await navigate(page, "hard");
  await page.getByLabel("Wykład", { exact: true }).selectOption(extraSetId);
  await expect(
    page.getByRole("heading", { name: "Zapisane pytania: 1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Ćwicz zapisane/ }).click();
  await expect(page.locator(".question")).toHaveText(
    extraSet.cards[0].question,
  );
});

async function answerExtraQuiz(page) {
  await expect(page.locator(".question")).toHaveText(
    extraSet.quizzes[0].question,
  );
  await page.getByRole("button", { name: /Zakres ruchu/ }).click();
  await page.getByRole("button", { name: "Zatwierdź odpowiedź" }).click();
}

test("ładuje tylko rejestr na starcie i używa tego samego zestawu w kolejnych widokach", async ({ page }) => {
  const json = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith(".json")) json.push(path.split("/data/").at(-1));
  });

  await openTrainer(page);
  expect(json).toEqual(["sets.json"]);
  await page.locator(".card-lect").filter({ hasText: "Wady postawy" })
    .getByRole("button", { name: "Ucz się z tego wykładu" }).click();
  await page.getByRole("button", { name: "Rozpocznij sesję" }).click();
  await expect(page.locator(".source")).toContainText("Wykład V");
  await page.getByRole("button", { name: /Pokaż odpowiedź/ }).click();
  await page.getByRole("button", { name: /Bardzo łatwe/ }).click();
  await navigate(page, "quiz");
  await expect(page.getByText(/dostępnych pytań/)).toBeVisible();
  expect(json).toEqual(["sets.json", "sets/wyklad-v.json"]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sprawdź się w quizie" })).toBeVisible();
  expect(await page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key)).cards).length, storageKey)).toBe(1);
});

test("odrzuca spóźnioną odpowiedź i ponawia nieudane pobranie wykładu", async ({ page }) => {
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  await page.route("**/data/sets/wyklad-iii.json", async (route) => {
    const response = await route.fetch();
    await delayed;
    await route.fulfill({ response });
  });
  await page.route("**/data/sets/wyklad-vii.json", (route) => route.fulfill({ status: 503 }), { times: 1 });

  await openTrainer(page);
  await page.locator(".card-lect").filter({ hasText: "Wady postawy" })
    .getByRole("button", { name: "Ucz się z tego wykładu" }).click();
  try {
    const lecture = page.getByLabel("Wykład", { exact: true });
    const request = page.waitForRequest("**/data/sets/wyklad-iii.json");
    await lecture.selectOption("III");
    await request;
    await expect(page.getByText("Wczytywanie zestawów…", { exact: true }).last()).toBeVisible();
    await lecture.selectOption("VI");
    await expect(page.getByText(/dostępnych pytań/)).toBeVisible();
    release();
    await page.getByRole("button", { name: "Rozpocznij sesję" }).click();
    await expect(page.locator(".source")).toContainText("Wykład VI");
    await navigate(page, "flash");
    await lecture.selectOption("VII");
    await expect(page.getByRole("button", { name: "Rozpocznij sesję" })).toBeDisabled();
    await page.getByRole("button", { name: "Spróbuj ponownie" }).click();
    await page.getByRole("button", { name: "Rozpocznij sesję" }).click();
    await expect(page.locator(".source")).toContainText("Wykład VII");
  } finally {
    release();
  }
});

test("klawiatura zatwierdza opcję quizu wybraną skrótem", async ({ page, baseURL }) => {
  await addSetForTest(page, baseURL);
  await openTrainer(page);
  await navigate(page, "quiz");
  await page.getByLabel("Wykład", { exact: true }).selectOption(extraSetId);
  await page.getByRole("button", { name: "Rozpocznij sesję" }).click();
  await page.getByRole("button", { name: /Częstość oddechów/ }).focus();
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");
  await expect(page.getByText("✓ Poprawnie", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Zobacz wyniki/ }).click();
  await navigate(page, "settings");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Wyczyść dane nauki" }).click();
  await expect(page.getByRole("status")).toHaveText("Wyzerowano postępy.");
  await page.goBack();
  await expect(page.getByRole("heading", { name: /Ucz się aktywnie/ })).toBeVisible();
});

test("po anulowaniu wyjścia z egzaminu zachowuje miejsce w historii", async ({ page }) => {
  const sets = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.includes("/data/sets/")) sets.push(path.split("/").at(-1));
  });
  await openTrainer(page);
  await navigate(page, "exam");
  const lecture = page.getByLabel("Wybierz materiał");
  await expect(lecture).toBeVisible();
  expect(sets).toEqual([]);
  await lecture.selectOption("V");
  await page.getByRole("button", { name: /Rozpocznij egzamin/ }).click();
  await expect(page.locator(".source")).toContainText("Wykład V");
  expect(sets).toEqual(["wyklad-v.json"]);
  const leavePrompt = page.waitForEvent("dialog");
  await page.evaluate(() => history.back());
  await (await leavePrompt).dismiss();
  await expect(page).toHaveURL(/#\/session$/);

  page.once("dialog", (dialog) => dialog.accept());
  await page.evaluate(() => history.back());
  await expect(page.getByRole("heading", { name: "Sprawdź gotowość" })).toBeVisible();
  await expect(page).toHaveURL(/#\/exam$/);
});
