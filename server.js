// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./src/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// ===== Routes =====
const botsRouter = require('./src/routes/bots');
const dashboardRouter = require('./src/routes/dashboard');
const authRouter = require('./src/routes/auth');

app.use('/api/bots', botsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/auth', authRouter);

// ===== السيرفر =====
const server = app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`🌐 افتح: http://localhost:${PORT}`);
  console.log(`🎛️  لوحة التحكم: http://localhost:${PORT}/dashboard.html`);
});

// ===== إغلاق نظيف =====
const botManager = require('./src/botManager');
const mcBotManager = require('./src/mcBotManager');

process.on('SIGINT', async () => {
  console.log('\n🛑 جاري إيقاف البوتات...');
  await botManager.stopAll();
  await mcBotManager.stopAllMC();
  server.close(() => {
    console.log('✅ تم الإغلاق');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('❌ خطأ:', err.message);
});