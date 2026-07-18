// Person 2: Responsible for merchant account and wallet management routes.
const express = require('express');
const merchantController = require('../controllers/merchantController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireMerchantRole } = require('../middleware/merchantMiddleware');

const router = express.Router();

router.get('/profile', requireAuth, requireMerchantRole, merchantController.getProfile);
router.post('/profile', requireAuth, requireMerchantRole, merchantController.updateProfile);
router.put('/profile', requireAuth, requireMerchantRole, merchantController.updateProfile);
router.get('/dashboard', requireAuth, requireMerchantRole, merchantController.getDashboard);
router.get('/wallets', requireAuth, requireMerchantRole, merchantController.listWallets);
router.post('/wallets', requireAuth, requireMerchantRole, merchantController.createWallet);
router.post('/wallets/:walletId/delete', requireAuth, requireMerchantRole, merchantController.deleteWallet);
router.delete('/wallets/:walletId', requireAuth, requireMerchantRole, merchantController.deleteWallet);

module.exports = router;