import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import {
  generateQuiz,
  listMyQuizzes,
  getQuiz,
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

router.post('/generate', requireAuth, generateQuiz);
router.post('/practice', requireAuth, generatePracticeQuiz);
router.get('/', requireAuth, listMyQuizzes);
router.get('/code/:code', optionalAuth, getQuizByCode);
router.get('/:id', optionalAuth, getQuiz);
router.put('/:id', requireAuth, updateQuiz);
router.delete('/:id', requireAuth, deleteQuiz);
router.post('/:id/publish', requireAuth, publishQuiz);
router.post('/:id/close', requireAuth, closeQuiz);
router.post('/:id/duplicate', requireAuth, duplicateQuiz);
router.get('/:id/attempts', requireAuth, getQuizAttempts);
router.get('/:id/analytics', requireAuth, getQuizAnalytics);

export default router;
