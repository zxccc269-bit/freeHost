const express = require('express');
const router = express.Router();

let bots = [
  {
    id: 1,
    name: "SkyBot",
    description: "بوت إدارة سيرفرات ماين كرافت",
    votes: 150,
    category: "moderation",
    invite: ""
  },
  {
    id: 2,
    name: "MCStatus",
    description: "يعرض حالة سيرفر ماين كرافت",
    votes: 320,
    category: "utility",
    invite: ""
  }
];

// جلب كل البوتات
router.get('/', function(req, res) {
  res.json(bots);
});

// جلب بوت واحد
router.get('/:id', function(req, res) {
  const bot = bots.find(function(b) { return b.id === parseInt(req.params.id); });
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });
  res.json(bot);
});

// إضافة بوت جديد
router.post('/', function(req, res) {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  const category = req.body.category || 'general';
  const invite = (req.body.invite || '').trim();

  if (name.length < 2) {
    return res.status(400).json({ error: 'اسم البوت مطلوب (حرفان على الأقل)' });
  }
  if (description.length < 10) {
    return res.status(400).json({ error: 'الوصف مطلوب (10 أحرف على الأقل)' });
  }

  const newId = bots.length > 0 ? Math.max.apply(null, bots.map(function(b) { return b.id; })) + 1 : 1;

  const newBot = {
    id: newId,
    name: name,
    description: description,
    category: category,
    invite: invite,
    votes: 0
  };

  bots.push(newBot);
  res.status(201).json(newBot);
});

// تصويت
router.post('/:id/vote', function(req, res) {
  const bot = bots.find(function(b) { return b.id === parseInt(req.params.id); });
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });

  bot.votes = (bot.votes || 0) + 1;
  res.json({ message: 'تم التصويت بنجاح', votes: bot.votes });
});

module.exports = router;