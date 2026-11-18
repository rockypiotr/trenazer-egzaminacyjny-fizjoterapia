const registryUrl = new URL("../data/sets.json", import.meta.url);
const questionGroups = {
  cards: ["card", "F"],
  quizzes: ["quiz", "Q"],
  opens: ["open", "O"],
  cases: ["case", "C"],
};

export const ALL_LECTURES = "both";

const questionIdPattern = /^[FQOC]-[A-Za-z0-9][A-Za-z0-9_-]*-\d+$/;
const setIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export function isQuestionId(id, prefix) {
  return (
    typeof id === "string" &&
    questionIdPattern.test(id) &&
    (!prefix || id.startsWith(prefix + "-"))
  );
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `Nie udało się wczytać ${url.pathname} (${response.status}).`,
    );
  return response.json();
}

async function loadSet(entry) {
  const url = new URL(entry.file, registryUrl);
  const data = await readJson(url);
  const questions = Object.fromEntries(
    Object.entries(questionGroups).map(([group, [kind, prefix]]) => [
      group,
      (data[group] ?? []).map((question) => {
        if (
          !isQuestionId(question.id, prefix) ||
          question.kind !== kind ||
          question.lecture !== entry.id
        ) {
          throw new Error(
            `Sprawdź ID, typ i zestaw pytania ${question.id} w ${entry.file}.`,
          );
        }
        return question;
      }),
    ]),
  );
  const images = (data.images ?? []).map((image) => ({
    ...image,
    src: new URL(image.src, url).href,
  }));
  return { ...entry, ...questions, images, coverage: data.coverage ?? [] };
}

export async function loadStudyData() {
  const registry = await readJson(registryUrl);
  const ids = new Set(registry.map((entry) => entry.id));
  if (
    ids.size !== registry.length ||
    ids.has(ALL_LECTURES) ||
    [...ids].some((id) => typeof id !== "string" || !setIdPattern.test(id))
  ) {
    throw new Error(
      "Każdy zestaw musi mieć własne, poprawne ID. ID „both” jest zarezerwowane.",
    );
  }

  const sets = await Promise.all(registry.map(loadSet));
  const setsById = new Map(sets.map((set) => [set.id, set]));
  const cards = sets.flatMap((set) => set.cards);
  const quizzes = sets.flatMap((set) => set.quizzes);
  const opens = sets.flatMap((set) => set.opens);
  const cases = sets.flatMap((set) => set.cases);
  const all = [...cards, ...quizzes, ...opens, ...cases];
  const questionsById = new Map(all.map((question) => [question.id, question]));
  if (questionsById.size !== all.length)
    throw new Error("Każde pytanie musi mieć własne ID.");

  return { sets, setsById, cards, quizzes, opens, cases, all, questionsById };
}
