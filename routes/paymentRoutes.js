// Person 3: Responsible for checkout and payment API routes.
const express = require('express');
const checkoutController = require('../controllers/checkoutController');
const paymentController = require('../controllers/paymentController');
const { apiRateLimit } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.get('/checkout/:invoicePublicId', checkoutController.renderPay);
router.get('/checkout/:invoicePublicId/success', checkoutController.renderSuccess);
router.get('/checkout/:invoicePublicId/failed', checkoutController.renderFailed);

router.post('/intent', apiRateLimit(), paymentController.createPaymentIntent);
router.post('/submit', apiRateLimit(), paymentController.submitPayment);
router.get('/status/:invoicePublicId', paymentController.getPaymentStatus);
router.get('/', paymentController.listPayments);

module.exports = router;
