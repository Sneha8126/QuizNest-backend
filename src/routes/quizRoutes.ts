import { Router } from 'express';

import { requireAuth, optionalAuth } from '../middleware/auth';

import {
  generateQuiz,
  listMyQuizzes,
  getQuiz,
  getQuizForAttempt,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  closeQuiz,
  duplicateQuiz,
  getQuizByCode,
  generatePracticeQuiz,
} from '../controllers/quizController';

import { getQuizAttempts } from '../controllers/attemptController';
import { getQuizAnalytics } from '../controllers/analyticsController';

const router = Router();

// ============================================================
// QUIZ GENERATION
// ============================================================

router.post('/generate', requireAuth, generateQuiz);

// ============================================================
// PRACTICE QUIZ
// ============================================================

router.post('/practice', requireAuth, generatePracticeQuiz);

// ============================================================
// MY QUIZZES
// ============================================================

router.get('/', requireAuth, listMyQuizzes);

// ============================================================
// PUBLIC QUIZ BY SHARE CODE
// ============================================================

router.get('/code/:code', optionalAuth, getQuizByCode);

// ============================================================
// QUIZ ATTEMPT
// IMPORTANT: Keep this BEFORE /:id
// This endpoint removes all answer keys.
// ============================================================

router.get(
  '/:id/attempt',
  optionalAuth,
  getQuizForAttempt
);

// ============================================================
// GET QUIZ
// Creator can receive full quiz.
// Participants receive safe quiz.
// ============================================================

router.get('/:id', optionalAuth, getQuiz);

// ============================================================
// UPDATE QUIZ
// ============================================================

router.put('/:id', requireAuth, updateQuiz);

// ============================================================
// DELETE QUIZ
// ============================================================

router.delete('/:id', requireAuth, deleteQuiz);

// ============================================================
// PUBLISH QUIZ
// ============================================================

router.post('/:id/publish', requireAuth, publishQuiz);

// ============================================================
// CLOSE QUIZ
// ============================================================

router.post('/:id/close', requireAuth, closeQuiz);

// ============================================================
// DUPLICATE QUIZ
// ============================================================

router.post('/:id/duplicate', requireAuth, duplicateQuiz);

// ============================================================
// QUIZ ATTEMPTS / ANALYTICS
// ============================================================

router.get('/:id/attempts', requireAuth, getQuizAttempts);

router.get('/:id/analytics', requireAuth, getQuizAnalytics);

export default router;