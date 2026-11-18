import { ALL_LECTURES } from "./study-data.js";

export const ALL_TOPICS = "all";
export const ALL_DIFFICULTIES = "all";

export function matchesLecture(question, lecture) {
  return lecture === ALL_LECTURES || question.lecture === lecture;
}

export function matches(question, filters) {
  return (
    matchesLecture(question, filters.lecture) &&
    (filters.topic === ALL_TOPICS || question.topic === filters.topic) &&
    (filters.difficulty === ALL_DIFFICULTIES ||
      question.difficulty === filters.difficulty) &&
    (!filters.priority || question.priority)
  );
}

export function correctQuizText(question) {
  switch (question.qtype) {
    case "tf":
      return question.correct ? "Prawda" : "Fałsz";
    case "order":
      return question.options.join(" → ");
    case "single":
      return question.options[question.correct];
    case "multi":
      return question.correct
        .map((index) => question.options[index])
        .join(" · ");
    default:
      return "";
  }
}
