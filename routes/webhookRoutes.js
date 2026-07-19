// Person 3: Webhook and payment verification routes.
const express = require('express');
const WebhookController = require('../controllers/webhookController');
const { apiRateLimit } = require('../middleware/rateLimitMiddleware');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/webhooks/alchemy', apiRateLimit({ windowMs: 60 * 1000, maxRequests: 60 }), (req, res) =>
	WebhookController.handleAlchemyWebhook(req, res)
);

router.post('/internal/payments/verify', auth.verifyInternalApiKey, (req, res) =>
	WebhookController.verifyPayment(req, res)
);

router.get('/api/invoices/:publicId/status', (req, res) => WebhookController.getPaymentStatus(req, res));

router.post('/webhooks/test', (req, res) => WebhookController.testWebhook(req, res));

module.exports = router;