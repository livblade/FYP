// Person 4: Responsible for settlement management routes.
const express = require('express');
const settlementController = require('../controllers/settlementController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireMerchantRole } = require('../middleware/merchantMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireMerchantRole, settlementController.renderList);
router.get('/api', requireAuth, requireMerchantRole, settlementController.listSettlementsApi);
router.get('/api/reconcile', requireAuth, requireMerchantRole, settlementController.reconcileSettlements);
router.get('/api/:publicId', requireAuth, requireMerchantRole, settlementController.getSettlementDetailApi);
router.get('/:publicId', requireAuth, requireMerchantRole, settlementController.renderDetail);
router.post('/', requireAuth, requireMerchantRole, settlementController.createSettlement);
router.post('/:publicId/status', requireAuth, requireMerchantRole, settlementController.updateSettlementStatus);

module.exports = router;
