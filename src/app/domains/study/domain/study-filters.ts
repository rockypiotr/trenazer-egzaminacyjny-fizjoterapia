import { matchesLecture } from '../../question-bank/domain/questions';
import type { Question } from '../../question-bank/domain/question-bank.models';
import type { StudyFilters } from './study.models';

export function matches(question: Question, filters: StudyFilters): boolean {
  return (
    matchesLecture(question, filters.lecture) &&
    (filters.topic === 'all' || question.topic === filters.topic) &&
    (filters.difficulty === 'all' || question.difficulty === filters.difficulty) &&
    (!filters.priority || question.priority)
  );
}
