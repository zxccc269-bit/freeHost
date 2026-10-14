// src/botManager.js
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const runningBots = new Map();

async function startBot(id, token, name) {
  if (runningBots.has(id)) {
    return { success: false, error: 'البوت شغّال بالفعل' };
  }

  if (!token || token.length < 50) {
    return { success: false, error: 'التوكن غير صالح' };
  }

  try {
    // بدون MessageContent
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('انتهت المهلة')), 15000);

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      client.login(token).catch(reject);
    });

    client.user.setActivity('🛡️ بوت آمن', { type: ActivityType.Watching });

    runningBots.set(id, {
      client: client,
      name: name,
      startedAt: new Date(),
      status: 'online',
      tag: client.user.tag,
      guilds: client.guilds.cache.size
    });

    console.log(`✅ تم تشغيل: ${name} (${client.user.tag})`);
    return {
      success: true,
      tag: client.user.tag,
      guilds: client.guilds.cache.size
    };

  } catch (err) {
    console.error(`❌ فشل ${name}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function stopBot(id) {
  const bot = runningBots.get(id);
  if (!bot) return { success: false, error: 'البوت غير شغّال' };

  try {
    await bot.client.destroy();
    runningBots.delete(id);
    console.log(`🛑 تم إيقاف: ${bot.name}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function restartBot(id, token, name) {
  await stopBot(id);
  await new Promise(r => setTimeout(r, 1000));
  return await startBot(id, token, name);
}

function getBotStatus(id) {
  const bot = runningBots.get(id);
  if (!bot) return { running: false };
  return {
    running: true,
    tag: bot.tag,
    guilds: bot.guilds,
    startedAt: bot.startedAt,
    uptime: Math.floor((Date.now() - bot.startedAt.getTime()) / 1000)
  };
}

function getAllRunning() {
  const result = [];
  runningBots.forEach((bot, id) => {
    result.push({
      id: id,
      name: bot.name,
      tag: bot.tag,
      guilds: bot.guilds,
      uptime: Math.floor((Date.now() - bot.startedAt.getTime()) / 1000)
    });
  });
  return result;
}

async function stopAll() {
  for (const [id, bot] of runningBots) {
    try { await bot.client.destroy(); } catch (e) {}
  }
  runningBots.clear();
}

module.exports = {
  startBot,
  stopBot,
  restartBot,
  getBotStatus,
  getAllRunning,
  stopAll
};