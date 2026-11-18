import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const site = new URL('https://example.invalid/project/');
const registryUrl = new URL('data/sets.json', site);
const updateMetadata = process.argv.includes('--update-metadata');
const groups = [
  ['cards', 'card', 'F'],
  ['quizzes', 'quiz', 'Q'],
  ['opens', 'open', 'O'],
  ['cases', 'case', 'C'],
];

function check(condition, location, message) {
  if (!condition) throw new Error(`${location}: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function checkTextFields(value, keys, location) {
  check(isObject(value), location, 'oczekiwano obiektu');
  for (const key of keys) check(isText(value[key]), location, `pole ${key} musi zawierać tekst`);
}

function optionalList(set, key, location) {
  if (set[key] === undefined) return [];
  check(Array.isArray(set[key]), location, `pole ${key} musi być tablicą`);
  return set[key];
}

function resolveAsset(reference, from, directories, location) {
  check(isText(reference) && reference === reference.trim() &&
    !/^(\/|[a-z][a-z\d+.-]*:)|[\\?#\t\r\n]/i.test(reference),
  location, 'oczekiwano względnej ścieżki do pliku');
  const url = new URL(reference, from);
  check(url.origin === site.origin && url.pathname.startsWith(site.pathname),
    location, 'ścieżka wychodzi poza stronę');
  const encodedPath = url.pathname.slice(site.pathname.length);
  check(!/%(?:2f|5c)/i.test(encodedPath), location, 'niedozwolony zakodowany separator ścieżki');
  const path = decodeURIComponent(encodedPath);
  check(directories.includes(path.split('/')[0]), location, 'plik jest poza katalogami publikowanymi przez aplikację');
  const file = join(root, path);
  check(statSync(file, { throwIfNoEntry: false })?.isFile(), location, `nie znaleziono pliku ${path}`);
  check(directories.includes(relative(root, realpathSync(file)).split(sep)[0]),
    location, 'ścieżka wskazuje poza katalogami publikowanymi przez aplikację');
  return { url, file, path };
}

function validateQuiz(quiz, location) {
  checkTextFields(quiz, ['why'], location);
  check(['tf', 'single', 'multi', 'order'].includes(quiz.qtype), location, `nieobsługiwany typ quizu ${quiz.qtype}`);
  if (quiz.qtype === 'tf') {
    check(typeof quiz.correct === 'boolean', location, 'correct musi być wartością logiczną');
    check(quiz.options === undefined || (Array.isArray(quiz.options) && quiz.options.length === 0),
      location, 'quiz prawda/fałsz nie przyjmuje opcji');
    return;
  }

  const { options, correct } = quiz;
  check(Array.isArray(options) && options.length >= 2 && options.every(isText),
    location, 'options musi zawierać co najmniej dwie odpowiedzi tekstowe');
  const isOptionIndex = (index) => Number.isInteger(index) && index >= 0 && index < options.length;
  switch (quiz.qtype) {
    case 'single':
      check(isOptionIndex(correct), location, 'correct musi wskazywać jedną z opcji');
      break;
    case 'multi':
      check(Array.isArray(correct) && correct.length > 0 && correct.every(isOptionIndex) &&
        new Set(correct).size === correct.length, location, 'correct musi wskazywać co najmniej jedną opcję i nie może zawierać powtórzeń');
      break;
    case 'order':
      check(correct === undefined || (Array.isArray(correct) && correct.length === options.length &&
        correct.every((index, position) => index === position)), location, 'options musi mieć poprawną kolejność');
      break;
  }
}

function validateQuestion(question, entry, kind, prefix, questionIds, location) {
  checkTextFields(question, ['id', 'slide', 'topic', 'question'], location);
  check(/^[FQOC]-[A-Za-z0-9][A-Za-z0-9_-]*-\d+$/.test(question.id) && question.id.startsWith(`${prefix}-`),
    location, `ID musi pasować do typu ${kind}`);
  check(!questionIds.has(question.id), location, `powtórzone ID ${question.id}`);
  questionIds.add(question.id);
  check(question.kind === kind && question.lecture === entry.id, location, `oczekiwano typu ${kind} w zestawie ${entry.id}`);
  check(['basic', 'medium', 'hard'].includes(question.difficulty), location, 'niepoprawna trudność');
  check(typeof question.priority === 'boolean', location, 'priority musi być wartością logiczną');
  if (kind === 'quiz') {
    validateQuiz(question, location);
    return;
  }
  checkTextFields(question, ['answer'], location);
  if (kind === 'card') return;
  check(Array.isArray(question.mandatory) && question.mandatory.every(isText),
    location, 'mandatory musi być tablicą tekstów');
  check(question.pitfall === undefined || typeof question.pitfall === 'string', location, 'pitfall musi być tekstem');
  if (kind === 'case') checkTextFields(question, ['title', 'scenario'], location);
}

function readJson(file, path) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

function validate() {
  const registryPath = join(root, 'data/sets.json');
  const registry = readJson(registryPath, 'data/sets.json');
  check(Array.isArray(registry), 'data/sets.json', 'oczekiwano tablicy zestawów');
  const setIds = new Set();
  const questionIds = new Set();
  for (const [index, entry] of registry.entries()) {
    const location = `data/sets.json [${index}]`;
    checkTextFields(entry, ['id', 'label', 'title', 'file'], location);
    check(/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(entry.id) && entry.id !== 'both', location, 'niepoprawne ID zestawu');
    check(!setIds.has(entry.id), location, `powtórzone ID zestawu ${entry.id}`);
    setIds.add(entry.id);
    if (entry.coverageTitle !== undefined) checkTextFields(entry, ['coverageTitle'], location);
    if (!updateMetadata && entry.counts !== undefined) check(isObject(entry.counts), location, 'counts musi być obiektem');

    const { url, file, path } = resolveAsset(entry.file, registryUrl, ['data'], location);
    check(path.endsWith('.json'), location, 'zestaw musi wskazywać plik JSON');
    const set = readJson(file, path);
    check(isObject(set), path, 'oczekiwano obiektu zestawu');
    const topics = new Set();
    const progressIds = new Set();
    const counts = {};
    for (const [group, kind, prefix] of groups) {
      const questions = optionalList(set, group, path);
      counts[group] = questions.length;
      if (!updateMetadata && entry.counts !== undefined) {
        check(entry.counts[group] === questions.length, location, `counts.${group} musi mieć wartość ${questions.length}`);
      }
      for (const [position, question] of questions.entries()) {
        validateQuestion(question, entry, kind, prefix, questionIds, `${path} ${group}[${position}]`);
        topics.add(question.topic);
        if (kind === 'card' || kind === 'quiz') progressIds.add(question.id);
      }
    }
    if (updateMetadata) {
      entry.counts = counts;
      entry.topics = [...topics].sort((a, b) => a.localeCompare(b, 'pl'));
      entry.progressIds = [...progressIds];
    } else {
      for (const [field, values] of [['topics', topics], ['progressIds', progressIds]]) {
        if (entry[field] === undefined) continue;
        check(Array.isArray(entry[field]) && new Set(entry[field]).size === values.size &&
          entry[field].length === values.size && entry[field].every((value) => values.has(value)),
        location, `pole ${field} musi zawierać dokładnie wartości z zestawu`);
      }
    }

    for (const [position, image] of optionalList(set, 'images', path).entries()) {
      const imageLocation = `${path} images[${position}]`;
      checkTextFields(image, ['src', 'alt', 'title', 'caption', 'lecture'], imageLocation);
      check(isText(image.slide) || (Number.isInteger(image.slide) && image.slide > 0),
        imageLocation, 'slide musi być tekstem lub dodatnią liczbą całkowitą');
      resolveAsset(image.src, url, ['data', 'images'], imageLocation);
    }
    for (const [position, coverage] of optionalList(set, 'coverage', path).entries()) {
      const coverageLocation = `${path} coverage[${position}]`;
      checkTextFields(coverage, ['name', 'status', 'note'], coverageLocation);
      check(coverage.slide === undefined || typeof coverage.slide === 'string', coverageLocation, 'slide musi być tekstem');
    }
  }
  if (updateMetadata) writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
  console.log(`Sprawdzono ${setIds.size} zestawów i ${questionIds.size} pytań.`);
}

try {
  validate();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
