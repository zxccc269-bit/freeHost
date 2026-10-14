// src/mcBotManager.js
const mineflayer = require('mineflayer');
const crypto = require('crypto');

const runningMCBots = new Map();

function generatePassword() {
  return crypto.randomBytes(12).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 16);
}

async function startMCBot(id, config) {
  if (runningMCBots.has(id)) {
    return { success: false, error: 'البوت شغّال بالفعل' };
  }

  const { host, port, username, version } = config;
  const password = config.password || generatePassword();

  if (!host) return { success: false, error: 'IP السيرفر مطلوب' };
  if (!username) return { success: false, error: 'اسم البوت مطلوب' };

  try {
    const bot = mineflayer.createBot({
      host: host,
      port: parseInt(port) || 25565,
      username: username,
      version: version || false,
      auth: 'offline'
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('انتهت المهلة')), 90000);

      let loggedIn = false;
      let registerAttempted = false;
      let loginAttempted = false;
      let commandSent = false;

      // ⚡ أرسل الأمر فوراً عند spawn
      bot.once('spawn', () => {
        console.log(`🎮 ${username} دخل السيرفر`);

        // انتظر 2 ثواني (nLogin يحتاج وقت للتحميل)
        setTimeout(() => {
          if (commandSent || loggedIn) return;
          commandSent = true;
          registerAttempted = true;
          console.log(`📝 إرسال /register: ${username}`);
          bot.chat(`/register ${password} ${password}`);

          // إذا ما نجح بعد 5 ثواني، جرب login
          setTimeout(() => {
            if (!loggedIn && !loginAttempted) {
              loginAttempted = true;
              console.log(`🔑 إرسال /login: ${username}`);
              bot.chat(`/login ${password}`);
            }
          }, 5000);

          // إذا ما نجح بعد 10 ثواني، جرب صيغ ثانية
          setTimeout(() => {
            if (!loggedIn) {
              console.log(`🔄 محاولة صيغة ثانية: ${username}`);
              bot.chat(`/reg ${password} ${password}`);
            }
          }, 10000);

        }, 2000);
      });

      // راقب رسائل الشات (إذا كانت مفعلة)
      bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString().toLowerCase();
        console.log(`💬 ${msg.substring(0, 100)}`);

        // نجاح
        if (msg.includes('successful') ||
            msg.includes('logged in') ||
            msg.includes('تم تسجيل') ||
            msg.includes('registered') ||
            msg.includes('welcome') ||
            msg.includes('مرحبا')) {
          if (!loggedIn) {
            loggedIn = true;
            clearTimeout(timeout);
            console.log(`✅ تم تسجيل ${username} بنجاح`);
            resolve();
          }
        }

        // فشل - جرب login
        if (msg.includes('already registered') ||
            msg.includes('مسجل مسبقاً') ||
            msg.includes('already exists')) {
          if (!loginAttempted) {
            loginAttempted = true;
            bot.chat(`/login ${password}`);
          }
        }

        // فشل - جرب register
        if (msg.includes('not registered') ||
            msg.includes('غير مسجل') ||
            msg.includes('register')) {
          if (!registerAttempted) {
            registerAttempted = true;
            bot.chat(`/register ${password} ${password}`);
          }
        }
      });

      // راقب الأخطاء
      bot.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      // راقب الطرد
      bot.once('kicked', (reason) => {
        clearTimeout(timeout);
        const reasonStr = JSON.stringify(reason);
        console.log(`⚠️ طرد: ${reasonStr}`);
        reject(new Error('تم الطرد: ' + reasonStr));
      });

      // انتظر 15 ثانية - إذا ما صار شي، اعتبره نجح
      setTimeout(() => {
        if (!loggedIn) {
          loggedIn = true;
          clearTimeout(timeout);
          console.log(`⏰ ${username}: انتهت المهلة بدون تأكيد (لكن البوت داخل)`);
          resolve();
        }
      }, 15000);
    });

    bot.on('end', () => {
      console.log(`🛑 انقطع: ${username}`);
      runningMCBots.delete(id);
    });

    bot.on('error', (err) => {
      console.error(`❌ ${username}:`, err.message);
    });

    runningMCBots.set(id, {
      bot: bot,
      username: username,
      host: host,
      password: password,
      startedAt: new Date()
    });

    console.log(`✅ تم تشغيل: ${username} على ${host}`);
    return {
      success: true,
      username: bot.username,
      host: host,
      password: password
    };

  } catch (err) {
    console.error(`❌ فشل:`, err.message);
    return { success: false, error: err.message };
  }
}

async function stopMCBot(id) {
  const data = runningMCBots.get(id);
  if (!data) return { success: false, error: 'البوت غير شغّال' };

  try {
    data.bot.quit();
    runningMCBots.delete(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function restartMCBot(id, config) {
  await stopMCBot(id);
  await new Promise(r => setTimeout(r, 1000));
  return await startMCBot(id, config);
}

function getMCBotStatus(id) {
  const data = runningMCBots.get(id);
  if (!data) return { running: false };

  const bot = data.bot;
  const pos = bot.entity ? bot.entity.position : { x: 0, y: 0, z: 0 };

  return {
    running: true,
    username: data.username,
    host: data.host,
    health: bot.health || 0,
    food: bot.food || 0,
    position: {
      x: Math.floor(pos.x),
      y: Math.floor(pos.y),
      z: Math.floor(pos.z)
    },
    uptime: Math.floor((Date.now() - data.startedAt.getTime()) / 1000)
  };
}

async function stopAllMC() {
  for (const [id, data] of runningMCBots) {
    try { data.bot.quit(); } catch (e) {}
  }
  runningMCBots.clear();
}

module.exports = {
  startMCBot,
  stopMCBot,
  restartMCBot,
  getMCBotStatus,
  stopAllMC,
  generatePassword
};