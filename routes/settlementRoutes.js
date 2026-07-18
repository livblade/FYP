// Person 4: Responsible for settlement management routes.
const express = require('express');
const settlementController = require('../controllers/settlementController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireMerchantRole } = require('../middleware/merchantMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireMerchantRole, settlementController.renderList);
router.get('/:publicId', requireAuth, requireMerchantRole, settlementController.renderDetail);
router.post('/', requireAuth, requireMerchantRole, settlementController.createSettlement);

module.exports = router;