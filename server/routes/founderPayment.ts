import { Router } from 'express';
import { FounderService } from '../../src/server/fcc/FounderService';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, (req, res) => {
  res.json({
    success: true,
    paymentConfig: FounderService.getPaymentConfig()
  });
});

router.post('/', verifyToken, requireRole(['founder', 'admin']), (req, res) => {
  const { whatsappNumber, bankAccounts } = req.body;
  FounderService.updatePaymentConfig({ whatsappNumber, bankAccounts });
  res.json({
    success: true,
    paymentConfig: FounderService.getPaymentConfig()
  });
});

export default router;
