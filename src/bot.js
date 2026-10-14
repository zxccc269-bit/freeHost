// src/bot.js
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// الكلمات الممنوعة
const FORBIDDEN_WORDS = [
  'spam', 'raid', 'nuke', 'hack', 'ddos',
  'token', 'password', 'ban all', 'kick all'
];

// عند التشغيل
client.once('ready', () => {
  console.log(`✅ البوت شغّال: ${client.user.tag}`);
  client.user.setActivity('🛡️ بوت آمن', { type: ActivityType.Watching });
});

// الرد على الرسائل
client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const content = message.content.toLowerCase().trim();
  if (!content.startsWith('!')) return;

  for (const word of FORBIDDEN_WORDS) {
    if (content.includes(word)) {
      message.reply('⚠️ هذا الأمر غير مسموح').catch(() => {});
      return;
    }
  }

  if (content === '!ping') {
    message.reply('🏓 Pong!').catch(() => {});
    return;
  }

  if (content === '!info') {
    message.reply(`📊 معلومات البوت:\n- الاسم: ${client.user.tag}\n- السيرفرات: ${client.guilds.cache.size}`).catch(() => {});
    return;
  }

  if (content === '!help') {
    message.reply('📖 الأوامر:\n!ping - اختبار\n!info - معلومات\n!server - السيرفر').catch(() => {});
    return;
  }

  if (content === '!server') {
    message.reply(`🏠 السيرفر: ${message.guild.name}\n👥 الأعضاء: ${message.guild.memberCount}`).catch(() => {});
    return;
  }

  message.reply('❌ أمر غير معروف. اكتب !help').catch(() => {});
});

client.on('error', (err) => {
  console.error('❌ خطأ:', err.message);
});

module.exports = client;