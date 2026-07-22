// Person 1: Responsible for application bootstrap and middleware wiring.
require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const sessionConfig = require('./config/session');
const { connectDatabase } = require('./config/database');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const checkoutController = require('./controllers/checkoutController');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/merchants', merchantRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/payments', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.get('/pay/:invoicePublicId', checkoutController.renderPay);
app.use('/', webhookRoutes);
app.use('/settlements', settlementRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/notifications', notificationRoutes);

app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.render('index', { title: 'CryptoPay Platform', user: null });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start application:', error.message);
  process.exit(1);
});
