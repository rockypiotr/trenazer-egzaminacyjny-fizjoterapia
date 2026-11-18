import { ALL_LECTURES, type Question, type Quiz } from './question-bank.models';

const questionIdPattern = /^[FQOC]-[A-Za-z0-9][A-Za-z0-9_-]*-\d+$/;

export function isQuestionId(id: unknown, prefix?: string): id is string {
  return typeof id === 'string' && questionIdPattern.test(id) && (!prefix || id.startsWith(prefix + '-'));
}

export function matchesLecture(question: Question, lecture: string): boolean {
  return lecture === ALL_LECTURES || question.lecture === lecture;
}

export function correctQuizText(question: Quiz): string {
  switch (question.qtype) {
    case 'tf':
      return question.correct ? 'Prawda' : 'Fałsz';
    case 'order':
      return question.options.join(' → ');
    case 'single':
      return question.options[question.correct];
    case 'multi':
      return question.correct.map((index) => question.options[index]).join(' · ');
  }
}
