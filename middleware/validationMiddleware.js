// Person 3: Responsible for Joi schema validation middleware and request contracts.
const Joi = require('joi');

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),
  register: Joi.object({
    // Accept both API-style and form-style field names, then normalize later.
    name: Joi.string().min(2),
    full_name: Joi.string().min(2),
    fullName: Joi.string().min(2),
    business_name: Joi.string().min(2).allow('').optional(),
    businessName: Joi.string().min(2).allow('').optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }).or('name', 'full_name', 'fullName'),
  createInvoice: Joi.object({
    amount_sgd: Joi.number().positive().required(),
    customer_name: Joi.string().max(200).allow('').optional(),
    customer_email: Joi.string().email().allow('').optional(),
    description: Joi.string().max(2000).allow('').optional(),
    accepted_token: Joi.string().valid('ETH', 'USDC', 'USDT').optional(),
    expiry_minutes: Joi.number().integer().min(1).max(1440).optional(),
    expires_at: Joi.date().optional()
  })
};

function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return next();
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: error.details.map((item) => item.message)
      });
    }

    req.body = value;

    if (schemaName === 'register') {
      if (!req.body.name && req.body.full_name) {
        req.body.name = req.body.full_name;
      }
      if (!req.body.full_name && req.body.fullName) {
        req.body.full_name = req.body.fullName;
      }
      if (!req.body.name && req.body.fullName) {
        req.body.name = req.body.fullName;
      }
      if (req.body.businessName && !req.body.business_name) {
        req.body.business_name = req.body.businessName;
      }
      delete req.body.fullName;
      delete req.body.businessName;
    }

    return next();
  };
}

module.exports = {
  validate,
  schemas
};