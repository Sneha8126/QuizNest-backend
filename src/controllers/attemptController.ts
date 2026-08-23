import { Request, Response } from 'express';
import crypto from 'crypto';
import { Quiz } from '../models/Quiz';
import { Attempt } from '../models/Attempt';
import { ApiError } from '../middleware/errorHandler';
import { submitAttemptSchema } from '../utils/validation';
import { evaluateAttempt } from '../services/evaluationService';

export async function submitAttempt(req: Request, res: Response) {
  const body = submitAttemptSchema.parse(req.body);

  const quiz = await Quiz.findById(body.quizId);
  if (!quiz || quiz.status !== 'published') {
    throw new ApiError(404, 'Quiz not found or not available');
  }

  const evaluation = await evaluateAttempt(quiz, body.answers);

  const attempt = await Attempt.create({
    quizId: quiz._id,
    participantId: req.user?.userId || null,
    participantName: body.participantName,
    answers: evaluation.answers,
    score: evaluation.score,
    maxScore: evaluation.maxScore,
    percentage: evaluation.percentage,
    correctCount: evaluation.correctCount,
    incorrectCount: evaluation.incorrectCount,
    skippedCount: evaluation.skippedCount,
    timeTakenSeconds: body.timeTakenSeconds,
    passed: evaluation.passed,
    resultToken: crypto.randomBytes(24).toString('hex'),
  });

  const resultToken = (attempt as any).resultToken as string;
  res.status(201).json({ attempt, resultToken });
}

export async function getAttempt(req: Request, res: Response) {
  const attempt = await Attempt.findById(req.params.id).select('+resultToken');
  if (!attempt) throw new ApiError(404, 'Attempt not found');

  const quiz = await Quiz.findById(attempt.quizId);
  if (!quiz) throw new ApiError(404, 'Quiz not found');

  const isCreator = quiz.creatorId.toString() === req.user?.userId;
  const isParticipant = Boolean(req.user?.userId && attempt.participantId?.toString() === req.user.userId);
  const suppliedToken = typeof req.query.token === 'string' ? req.query.token : '';
  const isTokenHolder = Boolean(suppliedToken && suppliedToken === attempt.resultToken);

  if (!isCreator && !isParticipant && !isTokenHolder) {
    throw new ApiError(403, 'You do not have access to this result');
  }

  // Include full question detail only after a legitimate result-access check.
  res.json({ attempt, quiz });
}

export async function getQuizAttempts(req: Request, res: Response) {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  if (quiz.creatorId.toString() !== req.user!.userId) {
    throw new ApiError(403, 'You do not own this quiz');
  }

  const attempts = await Attempt.find({ quizId: quiz._id }).sort({ submittedAt: -1 });
  res.json({ attempts });
}

export async function getMyAttempts(req: Request, res: Response) {
  const attempts = await Attempt.find({ participantId: req.user!.userId }).sort({
    submittedAt: -1,
  });
  res.json({ attempts });
}
