// Person 1: Responsible for dashboard route definitions and metrics endpoint.
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, dashboardController.renderIndex);
router.get('/metrics', requireAuth, dashboardController.getMetrics);

module.exports = router;