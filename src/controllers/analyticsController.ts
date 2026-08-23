import { Request, Response } from 'express';
import { Quiz } from '../models/Quiz';
import { Attempt } from '../models/Attempt';
import { ApiError } from '../middleware/errorHandler';

export async function getQuizAnalytics(req: Request, res: Response) {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  if (quiz.creatorId.toString() !== req.user!.userId) {
    throw new ApiError(403, 'You do not own this quiz');
  }

  const attempts = await Attempt.find({ quizId: quiz._id });

  if (attempts.length === 0) {
    return res.json({
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      averageTimeSeconds: 0,
      questionAccuracy: [],
    });
  }

  const percentages = attempts.map((a) => a.percentage);
  const totalAttempts = attempts.length;
  const averageScore = round2(avg(percentages));
  const highestScore = Math.max(...percentages);
  const lowestScore = Math.min(...percentages);
  const passRate = round2((attempts.filter((a) => a.passed).length / totalAttempts) * 100);
  const averageTimeSeconds = Math.round(avg(attempts.map((a) => a.timeTakenSeconds)));

  // Per-question accuracy across all attempts, to surface hardest/easiest/most-skipped.
  const questionStats = new Map<
    string,
    { questionText: string; correct: number; incorrect: number; skipped: number; total: number }
  >();

  for (const question of quiz.questions) {
    questionStats.set(String(question._id), {
      questionText: question.questionText,
      correct: 0,
      incorrect: 0,
      skipped: 0,
      total: 0,
    });
  }

  for (const attempt of attempts) {
    for (const ans of attempt.answers) {
      const stat = questionStats.get(String(ans.questionId));
      if (!stat) continue;
      stat.total += 1;
      if (ans.givenAnswer === null) stat.skipped += 1;
      else if (ans.isCorrect) stat.correct += 1;
      else stat.incorrect += 1;
    }
  }

  const questionAccuracy = Array.from(questionStats.entries()).map(([questionId, s]) => ({
    questionId,
    questionText: s.questionText,
    accuracy: s.total > 0 ? round2((s.correct / s.total) * 100) : 0,
    skipRate: s.total > 0 ? round2((s.skipped / s.total) * 100) : 0,
  }));

  const sortedByAccuracy = [...questionAccuracy].sort((a, b) => a.accuracy - b.accuracy);
  const sortedBySkip = [...questionAccuracy].sort((a, b) => b.skipRate - a.skipRate);

  res.json({
    totalAttempts,
    averageScore,
    highestScore,
    lowestScore,
    passRate,
    averageTimeSeconds,
    questionAccuracy,
    hardestQuestion: sortedByAccuracy[0] || null,
    easiestQuestion: sortedByAccuracy[sortedByAccuracy.length - 1] || null,
    mostSkippedQuestion: sortedBySkip[0] || null,
  });
}

export async function getUserAnalytics(req: Request, res: Response) {
  const [createdQuizzes, attempts] = await Promise.all([
    Quiz.find({ creatorId: req.user!.userId }),
    Attempt.find({ participantId: req.user!.userId }).sort({ submittedAt: 1 }),
  ]);

  const percentages = attempts.map((a) => a.percentage);

  // Group by topic for "strong areas / needs practice" (adaptive practice feature).
  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) continue;
    const questionById = new Map(quiz.questions.map((q) => [String(q._id), q]));
    for (const ans of attempt.answers) {
      const q = questionById.get(String(ans.questionId));
      const topic = q?.topic || 'General';
      const stat = topicStats.get(topic) || { correct: 0, total: 0 };
      stat.total += 1;
      if (ans.isCorrect) stat.correct += 1;
      topicStats.set(topic, stat);
    }
  }

  const topicBreakdown = Array.from(topicStats.entries()).map(([topic, s]) => ({
    topic,
    accuracy: s.total > 0 ? round2((s.correct / s.total) * 100) : 0,
  }));

  res.json({
    quizzesCreated: createdQuizzes.length,
    quizzesAttempted: attempts.length,
    averageScore: percentages.length > 0 ? round2(avg(percentages)) : 0,
    bestScore: percentages.length > 0 ? Math.max(...percentages) : 0,
    scoreTrend: attempts.map((a) => ({ date: a.submittedAt, percentage: a.percentage })),
    topicBreakdown: topicBreakdown.sort((a, b) => b.accuracy - a.accuracy),
    strongTopics: topicBreakdown.filter((t) => t.accuracy >= 75),
    weakTopics: topicBreakdown.filter((t) => t.accuracy < 65),
  });
}

function avg(nums: number[]): number {
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
