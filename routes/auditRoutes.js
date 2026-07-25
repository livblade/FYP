// Person 4: Responsible for audit log viewer routes.
const express = require('express');
const auditController = require('../controllers/auditController');
const { requireAuth, requireAdminRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireAdminRole, auditController.renderList);

module.exports = router;