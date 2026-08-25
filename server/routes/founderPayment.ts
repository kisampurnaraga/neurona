import { Router } from 'express';
import { FounderService } from '../../src/server/fcc/FounderService';
import { verifyToken, requireRole, userDatabase } from '../middleware/auth';

const router = Router();

// Public payment configuration (Accessible by visitors on Landing Page & Checkout)
router.get('/', (req, res) => {
  const config = FounderService.getPaymentConfig();
  res.json({
    success: true,
    paymentConfig: {
      whatsappNumber: config.whatsappNumber,
      telegramBotUsername: config.telegramBotUsername || 'NeuronnaAIBot',
      bankAccounts: config.bankAccounts
    }
  });
});

router.get('/public', (req, res) => {
  const config = FounderService.getPaymentConfig();
  res.json({
    success: true,
    paymentConfig: {
      whatsappNumber: config.whatsappNumber,
      telegramBotUsername: config.telegramBotUsername || 'NeuronnaAIBot',
      bankAccounts: config.bankAccounts
    }
  });
});

// Founder / Admin update payment configuration (WhatsApp + Telegram + Banks)
router.post('/', verifyToken, requireRole(['founder', 'admin']), (req, res) => {
  const { whatsappNumber, telegramBotUsername, telegramBotToken, bankAccounts } = req.body;
  FounderService.updatePaymentConfig({ whatsappNumber, telegramBotUsername, telegramBotToken, bankAccounts });
  res.json({
    success: true,
    paymentConfig: FounderService.getPaymentConfig()
  });
});

// Telegram Bot Webhook Integration for Automated Top-up & Account Activation
router.post('/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('[Telegram Webhook] Received update:', JSON.stringify(update));

    // Handle Callback Queries (When Admin clicks inline buttons: [Approve 100 Cr], [Approve Lifetime])
    if (update && update.callback_query) {
      const data = update.callback_query.data || '';
      // Format: ACTIVATE:user_id:credits or TOPUP:user_id:credits
      const parts = data.split(':');
      const action = parts[0];
      const targetUserId = parts[1];
      const creditsAmount = parseInt(parts[2], 10) || 100;

      if (action === 'ACTIVATE' && targetUserId) {
        const user = await userDatabase.activateUser(targetUserId, creditsAmount);
        console.log(`[Telegram Bot] User ${targetUserId} activated with ${creditsAmount} credits via Telegram`);
        return res.json({ success: true, action: 'activated', user });
      }

      if (action === 'TOPUP' && targetUserId) {
        const user = await userDatabase.adjustCredits(targetUserId, creditsAmount, true);
        console.log(`[Telegram Bot] User ${targetUserId} topped up with +${creditsAmount} credits via Telegram`);
        return res.json({ success: true, action: 'topped_up', user });
      }
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err);
    res.status(200).json({ status: 'error_handled', message: err.message });
  }
});

export default router;

