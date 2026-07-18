// Person 1: Responsible for authentication route definitions.
const express = require('express');
const authController = require('../controllers/authController');
const { requireGuest, requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/login', requireGuest, authController.renderLogin);
router.post('/login', requireGuest, validate('login'), authController.login);
router.get('/register', requireGuest, authController.renderRegister);
router.post('/register', requireGuest, validate('register'), authController.register);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;