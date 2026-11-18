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
      state: { cards, records, sessions, theme, bookmarks, version },
    },
  );
  await openTrainer(page);
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
    page.getByRole("heading", { name: "Schematy z prezentacji" }),
  ).toBeVisible();
  const images = page.locator(".gallery img");
  await expect(images).toHaveCount(6);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
  }
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
