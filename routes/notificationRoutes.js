const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, notificationController.renderList);
router.get('/recent', requireAuth, notificationController.getRecent);

module.exports = router;
