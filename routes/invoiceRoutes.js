// Person 3: Responsible for invoice CRUD route definitions.
const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireMerchantRole } = require('../middleware/merchantMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireMerchantRole, invoiceController.renderList);
router.get('/new', requireAuth, requireMerchantRole, invoiceController.renderCreate);
router.post('/', requireAuth, requireMerchantRole, validate('createInvoice'), invoiceController.createInvoice);
router.get('/:publicId', requireAuth, requireMerchantRole, invoiceController.renderDetail);
router.post('/:publicId/update', requireAuth, requireMerchantRole, invoiceController.updateInvoice);
router.post('/:publicId/delete', requireAuth, requireMerchantRole, invoiceController.deleteInvoice);
router.put('/:publicId', requireAuth, requireMerchantRole, invoiceController.updateInvoice);
router.delete('/:publicId', requireAuth, requireMerchantRole, invoiceController.deleteInvoice);

module.exports = router;