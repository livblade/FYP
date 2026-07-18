// Person 1: Responsible for auth routes and session lifecycle.
const bcrypt = require('bcrypt');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineUser = require('../models/User');
const defineMerchant = require('../models/Merchant');

const User = defineUser(sequelize, DataTypes);
const Merchant = defineMerchant(sequelize, DataTypes);

function renderLogin(req, res, next) {
  try {
    return res.render('auth/login', {
      title: 'Login',
      user: req.session.user || null,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    return next(error);
  }
}

function renderRegister(req, res, next) {
  try {
    return res.render('auth/register', {
      title: 'Register',
      user: req.session.user || null,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.redirect('/auth/login?error=Invalid%20email%20or%20password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.redirect('/auth/login?error=Invalid%20email%20or%20password');
    }

    if (user.status !== 'ACTIVE') {
      return res.redirect('/auth/login?error=Account%20is%20inactive');
    }

    user.last_login = new Date();
    await user.save();

    req.session.user = {
      id: user.user_id,
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      full_name: user.name,
      role: user.role
    };

    return req.session.save(() => res.redirect('/dashboard'));
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const fullName = String(req.body.name || req.body.full_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const businessName = String(req.body.business_name || '').trim() || `${fullName} Business`;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.redirect('/auth/register?error=Email%20is%20already%20registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const transaction = await sequelize.transaction();

    try {
      const user = await User.create(
        {
          name: fullName,
          email,
          password_hash: passwordHash,
          role: 'MERCHANT',
          status: 'ACTIVE',
          email_verified: false
        },
        { transaction }
      );

      await Merchant.create(
        {
          user_id: user.user_id,
          business_name: businessName,
          business_email: email,
          status: 'PENDING'
        },
        { transaction }
      );

      await transaction.commit();

      req.session.user = {
        id: user.user_id,
        user_id: user.user_id,
        email,
        name: fullName,
        full_name: fullName,
        role: 'MERCHANT'
      };

      return req.session.save(() => res.redirect('/dashboard'));
    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }
  } catch (error) {
    return next(error);
  }
}

function logout(req, res, next) {
  try {
    req.session.destroy((error) => {
      if (error) {
        return next(error);
      }
      return res.redirect('/auth/login?success=Logged%20out%20successfully');
    });
    return undefined;
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderLogin,
  renderRegister,
  login,
  register,
  logout
};