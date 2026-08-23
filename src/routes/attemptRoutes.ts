import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { submitAttempt, getAttempt, getMyAttempts } from '../controllers/attemptController';

const router = Router();

router.post('/', optionalAuth, submitAttempt);
router.get('/mine', requireAuth, getMyAttempts);
router.get('/:id', optionalAuth, getAttempt);

export default router;
