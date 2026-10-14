// src/routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('../auth');

// تسجيل دخول
router.get('/discord', passport.authenticate('discord'));

// Callback
router.get('/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard.html');
  }
);

// معلومات المستخدم
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'غير مسجل' });
  }
  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar
  });
});

// تسجيل خروج
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

module.exports = router;