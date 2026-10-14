// ===== المتغيرات العامة =====
let allBots = [];
let filteredBots = [];
const VOTED_KEY = 'voted_bots';
const VOTE_COOLDOWN = 12 * 60 * 60 * 1000; // 12 ساعة

// ===== تحميل البوتات =====
async function loadBots() {
  try {
    const res = await fetch('/api/bots');
    allBots = await res.json();
    filteredBots = [...allBots];

    updateStats();
    renderBots();
  } catch (err) {
    console.error('خطأ في تحميل البوتات:', err);
    document.getElementById('bots-container').innerHTML =
      '<div class="empty">❌ فشل تحميل البوتات</div>';
  }
}

// ===== تحديث الإحصائيات =====
function updateStats() {
  const totalVotes = allBots.reduce((sum, bot) => sum + (bot.votes || 0), 0);
  document.getElementById('total-bots').textContent = allBots.length;
  document.getElementById('total-votes').textContent = totalVotes;
}

// ===== عرض البوتات =====
function renderBots() {
  const container = document.getElementById('bots-container');

  if (filteredBots.length === 0) {
    container.innerHTML = '<div class="empty">🔍 لا توجد بوتات مطابقة</div>';
    return;
  }

  container.innerHTML = filteredBots.map(bot => {
    const voted = hasVoted(bot.id);
    const categoryNames = {
      moderation: '🛡️ إدارة',
      utility: '🔧 أدوات',
      economy: '💰 اقتصاد',
      games: '🎮 ألعاب',
      music: '🎵 موسيقى',
      general: '📁 عام'
    };

    return `
      <div class="bot-card">
        <div class="bot-header">
          <div class="bot-avatar">🤖</div>
          <div class="bot-title">
            <h3>${escapeHtml(bot.name)}</h3>
            <span class="bot-category-badge">
              ${categoryNames[bot.category] || bot.category}
            </span>
          </div>
        </div>
        <p class="bot-description">${escapeHtml(bot.description)}</p>
        <div class="bot-footer">
          <span class="bot-votes">⭐ <span id="votes-${bot.id}">${bot.votes || 0}</span> صوت</span>
          <button class="vote-btn" onclick="vote(${bot.id})" ${voted ? 'disabled' : ''}>
            ${voted ? '✅ تم التصويت' : '👍 صوّت'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== التصويت =====
async function vote(id) {
  if (hasVoted(id)) {
    alert('⏰ يمكنك التصويت مرة كل 12 ساعة');
    return;
  }

  try {
    const res = await fetch(`/api/bots/${id}/vote`, { method: 'POST' });
    const data = await res.json();

    // تحديث الرقم مباشرة
    const votesEl = document.getElementById(`votes-${id}`);
    if (votesEl) votesEl.textContent = data.votes;

    // حفظ التصويت
    saveVote(id);

    // تحديث البوت في المصفوفة
    const bot = allBots.find(b => b.id === id);
    if (bot) bot.votes = data.votes;

    updateStats();
    renderBots();

    alert('✅ شكراً على تصويتك!');
  } catch (err) {
    alert('❌ حدث خطأ في التصويت');
  }
}

// ===== إدارة التصويتات =====
function getVotes() {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY)) || {};
  } catch {
    return {};
  }
}

function hasVoted(id) {
  const votes = getVotes();
  const lastVote = votes[id];
  if (!lastVote) return false;
  return Date.now() - lastVote < VOTE_COOLDOWN;
}

function saveVote(id) {
  const votes = getVotes();
  votes[id] = Date.now();
  localStorage.setItem(VOTED_KEY, JSON.stringify(votes));
}

// ===== البحث والفلترة =====
function applyFilters() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const category = document.getElementById('category-filter').value;
  const sort = document.getElementById('sort-filter').value;

  filteredBots = allBots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(search) ||
                          bot.description.toLowerCase().includes(search);
    const matchesCategory = category === 'all' || bot.category === category;
    return matchesSearch && matchesCategory;
  });

  // الترتيب
  if (sort === 'votes') {
    filteredBots.sort((a, b) => (b.votes || 0) - (a.votes || 0));
  } else if (sort === 'name') {
    filteredBots.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'newest') {
    filteredBots.sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  renderBots();
}

// ===== حماية من XSS =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ===== ربط الأحداث =====
document.getElementById('search-input').addEventListener('input', applyFilters);
document.getElementById('category-filter').addEventListener('change', applyFilters);
document.getElementById('sort-filter').addEventListener('change', applyFilters);

// ===== تشغيل =====
loadBots();