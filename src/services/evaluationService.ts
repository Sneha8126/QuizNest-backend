import { IQuiz } from '../models/Quiz';
import { IQuestion } from '../models/Question';
import { IAnswerResult } from '../models/Attempt';
import { gradeShortAnswer } from './aiServiceClient';

interface SubmittedAnswer {
  questionId: string;
  givenAnswer: string | string[] | null;
}

interface EvaluationSummary {
  answers: IAnswerResult[];
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  passed: boolean;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

async function evaluateOne(
  question: IQuestion,
  given: string | string[] | null,
  negativeMarking: boolean
): Promise<IAnswerResult> {
  const questionId = question._id;

  if (given === null || given === undefined || (Array.isArray(given) && given.length === 0) || given === '') {
    return { questionId, givenAnswer: null, isCorrect: false, marksAwarded: 0 };
  }

  switch (question.type) {
    case 'mcq':
    case 'true_false': {
      const correct = String(question.correctAnswer);
      const isCorrect = typeof given === 'string' && normalize(given) === normalize(correct);
      const marksAwarded = isCorrect
        ? question.marks
        : negativeMarking
        ? -(question.negativeMarks || question.marks * 0.25)
        : 0;
      return { questionId, givenAnswer: given, isCorrect, marksAwarded };
    }

    case 'multiple_correct': {
      const correctArr = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [String(question.correctAnswer)];
      const givenArr = Array.isArray(given) ? given : [given];
      const isCorrect = arraysEqualAsSets(correctArr, givenArr);
      const marksAwarded = isCorrect
        ? question.marks
        : negativeMarking
        ? -(question.negativeMarks || question.marks * 0.25)
        : 0;
      return { questionId, givenAnswer: given, isCorrect, marksAwarded };
    }

    case 'short_answer': {
      const studentAnswer = Array.isArray(given) ? given.join(' ') : given;
      const graded = await gradeShortAnswer({
        questionText: question.questionText,
        expectedAnswer: question.expectedAnswer || '',
        keyConcepts: question.keyConcepts,
        studentAnswer,
        marks: question.marks,
      });
      return {
        questionId,
        givenAnswer: given,
        isCorrect: graded.isCorrect,
        marksAwarded: graded.marksAwarded,
        feedback: graded.feedback,
      };
    }

    default:
      return { questionId, givenAnswer: given, isCorrect: false, marksAwarded: 0 };
  }
}

export async function evaluateAttempt(
  quiz: IQuiz,
  submittedAnswers: SubmittedAnswer[]
): Promise<EvaluationSummary> {
  const answerMap = new Map(submittedAnswers.map((a) => [a.questionId, a.givenAnswer]));

  const results: IAnswerResult[] = [];
  for (const question of quiz.questions) {
    const given = answerMap.get(String(question._id)) ?? null;
    const result = await evaluateOne(question, given, quiz.settings.negativeMarking);
    results.push(result);
  }

  const maxScore = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
  const score = results.reduce((sum, r) => sum + r.marksAwarded, 0);
  const correctCount = results.filter((r) => r.isCorrect).length;
  const skippedCount = results.filter((r) => r.givenAnswer === null).length;
  const incorrectCount = results.length - correctCount - skippedCount;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  const passed = percentage >= quiz.settings.passingPercentage;

  return {
    answers: results,
    score: Math.max(0, Math.round(score * 100) / 100),
    maxScore,
    percentage: Math.max(0, percentage),
    correctCount,
    incorrectCount,
    skippedCount,
    passed,
  };
}
