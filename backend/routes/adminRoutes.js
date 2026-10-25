import express from 'express';
import { adminLogin, getAdminDashboard, updateWithdrawalStatus } from '../controllers/adminController.js';
import adminAuth from '../middleware/adminAuth.js';
import { loginLimiter } from '../middleware/rateLimits.js';

const router = express.Router();

router.post('/login', loginLimiter, adminLogin);
router.get('/dashboard', adminAuth, getAdminDashboard);
router.patch('/withdrawals/:id', adminAuth, updateWithdrawalStatus);

export default router;
