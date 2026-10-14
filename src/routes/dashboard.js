// src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const botManager = require('../botManager');
const mcBotManager = require('../mcBotManager');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'bots.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadBots() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]');
      return [];
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('❌ خطأ:', err.message);
    return [];
  }
}

function saveBots(bots) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bots, null, 2));
    return true;
  } catch (err) {
    console.error('❌ خطأ في الحفظ:', err.message);
    return false;
  }
}

let savedBots = loadBots();

// حماية - لازم تسجيل دخول
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }
  next();
}

// ==========================================
// ===== بوتات ديسكورد =====
// ==========================================

router.get('/bots', requireAuth, (req, res) => {
  const userId = req.user.id;
  const userBots = savedBots.filter(b => b.ownerId === userId && b.type !== 'minecraft');

  const bots = userBots.map(bot => {
    const status = botManager.getBotStatus(bot.id);
    return {
      id: bot.id,
      name: bot.name,
      description: bot.description,
      running: status.running,
      tag: status.tag || null,
      guilds: status.guilds || 0,
      uptime: status.uptime || 0,
      createdAt: bot.createdAt
    };
  });
  res.json(bots);
});

router.post('/bots', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  const token = (req.body.token || '').trim();
  const description = (req.body.description || '').trim();
  const userId = req.user.id;

  if (name.length < 2) return res.status(400).json({ error: 'الاسم مطلوب' });
  if (token.length < 50) return res.status(400).json({ error: 'التوكن غير صالح' });

  const exists = savedBots.find(b => b.token === token);
  if (exists) return res.status(400).json({ error: 'هذا البوت مضاف مسبقاً' });

  const newId = savedBots.length > 0
    ? Math.max(...savedBots.map(b => b.id)) + 1
    : 1;

  const newBot = {
    id: newId,
    type: 'discord',
    name: name,
    token: token,
    description: description,
    ownerId: userId,
    ownerName: req.user.username,
    createdAt: new Date().toISOString()
  };

  savedBots.push(newBot);
  saveBots(savedBots);

  res.status(201).json({
    id: newBot.id,
    name: newBot.name,
    description: newBot.description,
    running: false
  });
});

router.post('/bots/:id/start', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type !== 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  const result = await botManager.startBot(bot.id, bot.token, bot.name);
  res.json(result);
});

router.post('/bots/:id/stop', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type !== 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  const result = await botManager.stopBot(id);
  res.json(result);
});

router.post('/bots/:id/restart', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type !== 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  const result = await botManager.restartBot(bot.id, bot.token, bot.name);
  res.json(result);
});

router.delete('/bots/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type !== 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  await botManager.stopBot(id);
  const index = savedBots.findIndex(b => b.id === id);
  savedBots.splice(index, 1);
  saveBots(savedBots);
  res.json({ message: 'تم الحذف' });
});

// ==========================================
// ===== بوتات ماين كرافت =====
// ==========================================

router.get('/mc-bots', requireAuth, (req, res) => {
  const userId = req.user.id;
  const userBots = savedBots.filter(b => b.ownerId === userId && b.type === 'minecraft');

  const bots = userBots.map(bot => {
    const status = mcBotManager.getMCBotStatus(bot.id);
    return {
      id: bot.id,
      name: bot.name,
      host: bot.host,
      port: bot.port,
      username: bot.username,
      running: status.running,
      health: status.health || 0,
      position: status.position || null,
      uptime: status.uptime || 0,
      createdAt: bot.createdAt
    };
  });
  res.json(bots);
});

router.post('/mc-bots', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  const host = (req.body.host || '').trim();
  const port = (req.body.port || '25565').trim();
  const username = (req.body.username || '').trim();
  const version = (req.body.version || '').trim();
  const userId = req.user.id;

  if (name.length < 2) return res.status(400).json({ error: 'الاسم مطلوب' });
  if (!host) return res.status(400).json({ error: 'IP السيرفر مطلوب' });
  if (username.length < 3) return res.status(400).json({ error: 'اسم البوت مطلوب' });

  const password = mcBotManager.generatePassword();

  const newId = savedBots.length > 0
    ? Math.max(...savedBots.map(b => b.id)) + 1
    : 1;

  const newBot = {
    id: newId,
    type: 'minecraft',
    name: name,
    host: host,
    port: port,
    username: username,
    version: version,
    password: password,
    ownerId: userId,
    ownerName: req.user.username,
    createdAt: new Date().toISOString()
  };

  savedBots.push(newBot);
  saveBots(savedBots);

  res.status(201).json({
    id: newBot.id,
    name: newBot.name,
    host: newBot.host,
    running: false
  });
});

router.post('/mc-bots/:id/start', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type === 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  const result = await mcBotManager.startMCBot(bot.id, {
    host: bot.host,
    port: bot.port,
    username: bot.username,
    version: bot.version,
    password: bot.password
  });
  res.json(result);
});

router.post('/mc-bots/:id/stop', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type === 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  const result = await mcBotManager.stopMCBot(id);
  res.json(result);
});

router.post('/mc-bots/:id/restart', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type === 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  const result = await mcBotManager.restartMCBot(bot.id, {
    host: bot.host,
    port: bot.port,
    username: bot.username,
    version: bot.version,
    password: bot.password
  });
  res.json(result);
});

router.delete('/mc-bots/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const bot = savedBots.find(b => b.id === id && b.ownerId === req.user.id && b.type === 'minecraft');
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  await mcBotManager.stopMCBot(id);
  const index = savedBots.findIndex(b => b.id === id);
  savedBots.splice(index, 1);
  saveBots(savedBots);
  res.json({ message: 'تم الحذف' });
});

module.exports = router;