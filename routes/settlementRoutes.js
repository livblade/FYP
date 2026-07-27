// Person 4: Responsible for settlement management routes.
const express = require('express');
const settlementController = require('../controllers/settlementController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireSettlementManagerRole } = require('../middleware/merchantMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireSettlementManagerRole, settlementController.renderList);
router.get('/api', requireAuth, requireSettlementManagerRole, settlementController.listSettlementsApi);
router.get('/api/reconcile', requireAuth, requireSettlementManagerRole, settlementController.reconcileSettlements);
router.get('/api/:publicId', requireAuth, requireSettlementManagerRole, settlementController.getSettlementDetailApi);
router.get('/:publicId', requireAuth, requireSettlementManagerRole, settlementController.renderDetail);
router.post('/', requireAuth, requireSettlementManagerRole, settlementController.createSettlement);
router.post('/api/reconcile', requireAuth, requireSettlementManagerRole, settlementController.reconcileSettlements);
router.post('/:publicId/status', requireAuth, requireSettlementManagerRole, settlementController.updateSettlementStatus);

module.exports = router;
