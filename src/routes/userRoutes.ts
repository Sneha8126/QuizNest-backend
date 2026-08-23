import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getUserAnalytics } from '../controllers/analyticsController';
import { me } from '../controllers/authController';

const router = Router();

router.get('/me', requireAuth, me);
router.get('/me/analytics', requireAuth, getUserAnalytics);

export default router;
