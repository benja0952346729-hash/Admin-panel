const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const https = require('https');
const multer = require('multer');
const { Pool } = require('pg');

// ══ PostgreSQL CONNECTION ══
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ══ DB INIT — create all tables ══
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value JSONB
    );

    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      display TEXT,
      balance NUMERIC DEFAULT 0,
      is_bot BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS game_called_numbers (
      id SERIAL PRIMARY KEY,
      number INTEGER
    );

    CREATE TABLE IF NOT EXISTS game_confirmed_numbers (
      card_id INTEGER PRIMARY KEY,
      user_id TEXT
    );

    CREATE TABLE IF NOT EXISTS game_winners (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      display_name TEXT,
      card_id INTEGER,
      prize NUMERIC,
      is_bot BOOLEAN DEFAULT FALSE,
      time BIGINT
    );

    CREATE TABLE IF NOT EXISTS all_winners (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      display_name TEXT,
      card_id INTEGER,
      prize NUMERIC,
      is_bot BOOLEAN DEFAULT FALSE,
      time BIGINT
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      text TEXT,
      photo_url TEXT,
      target_type TEXT DEFAULT 'bot',
      group_id TEXT DEFAULT '',
      interval_ms BIGINT DEFAULT 3600000,
      next_send_at BIGINT,
      last_sent_at BIGINT,
      active BOOLEAN DEFAULT TRUE,
      created_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      message TEXT,
      time BIGINT,
      read BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS analytics_history (
      date TEXT PRIMARY KEY,
      rounds INTEGER DEFAULT 0,
      profit NUMERIC DEFAULT 0
    );
  `);
  console.log('✅ DB initialized');
}
initDB();

// ══ KV HELPERS (replaces db.ref) ══
async function kvGet(key) {
  const res = await pool.query('SELECT value FROM kv_store WHERE key=$1', [key]);
  return res.rows.length ? res.rows[0].value : null;
}
async function kvSet(key, value) {
  await pool.query(
    'INSERT INTO kv_store(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',
    [key, JSON.stringify(value)]
  );
}
async function kvDel(key) {
  await pool.query('DELETE FROM kv_store WHERE key=$1', [key]);
}

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.static(__dirname));
app.use(express.json());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running!'));

// ══ CLOUDINARY SOUNDS ══
const CLOUDINARY_CLOUD = 'diado1bxi';
const CLOUDINARY_API_KEY = '117446111831141';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_SECRET || 'biCrRU-O4tFt_icW8ONKE5POXJk';

let soundsMap = {};

async function loadCloudinarySounds() {
  return new Promise((resolve) => {
    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUDINARY_CLOUD}/resources/video?max_results=100`,
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const resources = json.resources || [];
          resources.forEach(r => {
            const publicId = r.public_id;
            const match = publicId.match(/^([A-Z]+\d+)/);
            const key = match ? match[1] : publicId;
            soundsMap[key] = r.secure_url;
          });
          console.log(`✅ Loaded ${Object.keys(soundsMap).length} sounds from Cloudinary`);
        } catch(e) {
          console.error('❌ Cloudinary parse error:', e.message);
        }
        resolve();
      });
    });
    req.on('error', (e) => { console.error('❌ Cloudinary load error:', e.message); resolve(); });
    req.end();
  });
}

app.get('/sounds-map', (req, res) => res.json(soundsMap));
loadCloudinarySounds();

// ══ GAME STATE API (for admin HTML) ══
app.get('/game-state', async (req, res) => {
  try {
    const [
      status, bet, percent, prize, total, countdown,
      calledRows, confirmedRows, winners, pendingWinner,
      announcement, paid, autoMode, analytics, smartBot,
      botSettings, allWinnersRows, historyRows, withdrawals,
      notifRows
    ] = await Promise.all([
      kvGet('game/status'),
      kvGet('game/bet'),
      kvGet('game/percent'),
      kvGet('game/prize'),
      kvGet('game/total'),
      kvGet('game/countdown'),
      pool.query('SELECT number FROM game_called_numbers ORDER BY id'),
      pool.query('SELECT card_id, user_id FROM game_confirmed_numbers'),
      pool.query('SELECT * FROM game_winners'),
      kvGet('game/pendingWinner'),
      kvGet('game/announcement'),
      kvGet('game/paid'),
      kvGet('autoMode'),
      kvGet('analytics'),
      kvGet('smartBot'),
      kvGet('bot/settings'),
      pool.query('SELECT * FROM all_winners ORDER BY time DESC LIMIT 50'),
      pool.query('SELECT * FROM analytics_history ORDER BY date DESC LIMIT 5'),
      kvGet('bot/withdrawals'),
      pool.query('SELECT * FROM notifications ORDER BY time DESC LIMIT 100')
    ]);

    // Build users object
    const usersRes = await pool.query('SELECT * FROM users');
    const users = {};
    usersRes.rows.forEach(u => {
      users[u.uid] = { display: u.display, balance: parseFloat(u.balance), is_bot: u.is_bot };
    });

    // Build confirmedNumbers object
    const confirmedNumbers = {};
    confirmedRows.rows.forEach(r => { confirmedNumbers[r.card_id] = r.user_id; });

    // Build calledNumbers object
    const calledNumbers = {};
    calledRows.rows.forEach((r, i) => { calledNumbers[i] = r.number; });

    // Build winners object
    const winnersObj = {};
    winners.rows.forEach((w, i) => {
      winnersObj[i] = {
        user: w.user_id,
        displayName: w.display_name,
        cardId: w.card_id,
        prize: parseFloat(w.prize),
        isBot: w.is_bot,
        time: w.time
      };
    });

    // Build allWinners
    const allWinnersObj = {};
    allWinnersRows.rows.forEach((w, i) => {
      allWinnersObj[i] = {
        user: w.user_id,
        displayName: w.display_name,
        cardId: w.card_id,
        prize: parseFloat(w.prize),
        isBot: w.is_bot,
        time: w.time
      };
    });

    // Build history
    const historyObj = {};
    historyRows.rows.forEach(h => {
      historyObj[h.date] = { date: h.date, rounds: h.rounds, profit: parseFloat(h.profit) };
    });

    // Build notifications
    const notifsObj = {};
    notifRows.rows.forEach(n => {
      notifsObj[n.user_id] = { message: n.message, time: n.time, read: n.read };
    });

    res.json({
      game: {
        status, bet, percent, prize, total,
        countdown, pendingWinner, announcement, paid,
        calledNumbers,
        confirmedNumbers,
        winners: winnersObj
      },
      autoMode,
      users,
      smartBot,
      analytics: {
        ...(analytics || {}),
        history: historyObj
      },
      bot: {
        settings: botSettings,
        withdrawals: withdrawals || {}
      },
      allWinners: allWinnersObj,
      notifications: notifsObj
    });
  } catch(e) {
    console.error('game-state error:', e.message);
    res.json({});
  }
});

// ══ SET STATE API ══
app.post('/set-state', async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.json({ ok: false });
  try {
    // Route specific keys to proper tables
    if (key.startsWith('users/') && key.split('/').length >= 2) {
      const parts = key.split('/');
      const uid = parts[1];
      const field = parts[2];
      if (field === 'balance') {
        await pool.query(
          'INSERT INTO users(uid,balance) VALUES($1,$2) ON CONFLICT(uid) DO UPDATE SET balance=$2',
          [uid, value]
        );
      } else if (field === 'display') {
        await pool.query(
          'INSERT INTO users(uid,display) VALUES($1,$2) ON CONFLICT(uid) DO UPDATE SET display=$2',
          [uid, value]
        );
      } else if (field === 'is_bot') {
        await pool.query(
          'INSERT INTO users(uid,is_bot) VALUES($1,$2) ON CONFLICT(uid) DO UPDATE SET is_bot=$2',
          [uid, value]
        );
      } else {
        await kvSet(key, value);
      }
    } else if (key === 'game/confirmedNumbers') {
      await pool.query('DELETE FROM game_confirmed_numbers');
      if (value && typeof value === 'object') {
        for (const [cardId, userId] of Object.entries(value)) {
          await pool.query(
            'INSERT INTO game_confirmed_numbers(card_id, user_id) VALUES($1,$2) ON CONFLICT(card_id) DO UPDATE SET user_id=$2',
            [parseInt(cardId), userId]
          );
        }
      }
    } else if (key === 'game/calledNumbers') {
      // handled separately
      await kvSet(key, value);
    } else if (key === 'game/winners') {
      await pool.query('DELETE FROM game_winners');
      if (value && typeof value === 'object') {
        for (const w of Object.values(value)) {
          await pool.query(
            'INSERT INTO game_winners(user_id,display_name,card_id,prize,is_bot,time) VALUES($1,$2,$3,$4,$5,$6)',
            [w.user, w.displayName, w.cardId, w.prize||0, w.isBot||false, w.time||Date.now()]
          );
        }
      }
    } else if (key.startsWith('analytics/history/')) {
      const date = key.split('/')[2];
      if (value) {
        await pool.query(
          'INSERT INTO analytics_history(date,rounds,profit) VALUES($1,$2,$3) ON CONFLICT(date) DO UPDATE SET rounds=$2,profit=$3',
          [date, value.rounds||0, value.profit||0]
        );
      } else {
        await pool.query('DELETE FROM analytics_history WHERE date=$1', [date]);
      }
    } else if (key.startsWith('notifications/')) {
      const uid = key.split('/')[1];
      if (value) {
        await pool.query(
          'INSERT INTO notifications(user_id,message,time,read) VALUES($1,$2,$3,$4)',
          [uid, value.message, value.time||Date.now(), false]
        );
      }
    } else {
      await kvSet(key, value);
    }
    res.json({ ok: true });
  } catch(e) {
    console.error('set-state error:', key, e.message);
    res.json({ ok: false, msg: e.message });
  }
});

// ══ CONFIRM CARD ══
app.post('/confirm-card', async (req, res) => {
  const { userId, cardId } = req.body;
  if (!userId || !cardId) return res.json({ ok: false, msg: 'Missing data' });
  try {
    const bet = (await kvGet('game/bet')) || 0;
    const balRes = await pool.query('SELECT balance FROM users WHERE uid=$1', [userId]);
    const bal = balRes.rows.length ? parseFloat(balRes.rows[0].balance) : 0;
    if (bal < bet) return res.json({ ok: false, msg: '❌ Balance አንስተኛ ነው!' });
    const statusVal = await kvGet('game/status');
    if (statusVal?.started) return res.json({ ok: false, msg: '❌ Game ጀምሯል!' });
    const myCardsRes = await pool.query('SELECT card_id FROM game_confirmed_numbers WHERE user_id=$1', [userId]);
    if (myCardsRes.rows.length >= 5) return res.json({ ok: false, msg: '❌ Max 5 cards!' });
    const existing = await pool.query('SELECT user_id FROM game_confirmed_numbers WHERE card_id=$1', [parseInt(cardId)]);
    if (existing.rows.length) return res.json({ ok: false, msg: '❌ Card ተይዟል!' });
    await pool.query(
      'INSERT INTO game_confirmed_numbers(card_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [parseInt(cardId), userId]
    );
    await pool.query('UPDATE users SET balance=balance-$1 WHERE uid=$2', [bet, userId]);
    const totalCards = (await pool.query('SELECT COUNT(*) FROM game_confirmed_numbers')).rows[0].count;
    const pct = ((await kvGet('game/percent')) || 80) / 100;
    await kvSet('game/prize', Math.floor(bet * totalCards * pct));
    await kvSet('game/total', bet * totalCards);
    return res.json({ ok: true, msg: '✅ Card confirmed!' });
  } catch(e) {
    return res.json({ ok: false, msg: 'Error: ' + e.message });
  }
});

// ══ STATE ══
let autoModeOn = false;
let autoCdMinutes = 3;
let calledNumbers = [];
let callTimer = null;
let countdownTimer = null;
let announceTimer = null;
let roundNumber = 1;

console.log('🚀 Bingo Server Started!');

function getLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}

function generateBoard(seed) {
  function sr(s) { let x = Math.sin(s) * 10000; return x - Math.floor(x); }
  function getNums(min, max, s) {
    let arr = [], k = s;
    while (arr.length < 5) {
      let n = Math.floor(sr(k++) * (max - min + 1)) + min;
      if (!arr.includes(n)) arr.push(n);
    }
    return arr;
  }
  let B = getNums(1,15,seed+1), I = getNums(16,30,seed+2),
      N = getNums(31,45,seed+3), G = getNums(46,60,seed+4),
      O = getNums(61,75,seed+5);
  let b = [];
  for (let i = 0; i < 5; i++) b.push(B[i], I[i], N[i], G[i], O[i]);
  b[12] = 'FREE';
  return b;
}

function checkWin(board, called) {
  const g = [];
  for (let i = 0; i < 5; i++) g.push(board.slice(i * 5, (i + 1) * 5));
  for (let r = 0; r < 5; r++)
    if (g[r].every(n => n === 'FREE' || called.includes(n))) return true;
  for (let c = 0; c < 5; c++)
    if ([0,1,2,3,4].every(r => g[r][c] === 'FREE' || called.includes(g[r][c]))) return true;
  if ([0,1,2,3,4].every(i => g[i][i] === 'FREE' || called.includes(g[i][i]))) return true;
  if ([0,1,2,3,4].every(i => g[i][4-i] === 'FREE' || called.includes(g[i][4-i]))) return true;
  return false;
}

function wouldCloseColumnSoon(n, allBoards, called) {
  const colIndices = [
    [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24]
  ];
  const simulatedCalled = [...called, n];
  for (let cardId in allBoards) {
    const board = allBoards[cardId];
    for (let col of colIndices) {
      const cells = col.map(i => board[i]);
      const matched = cells.filter(c => c === 'FREE' || simulatedCalled.includes(c)).length;
      if (matched === 4) return true;
    }
  }
  return false;
}

function clearAllTimers() {
  clearInterval(callTimer); callTimer = null;
  clearInterval(countdownTimer); countdownTimer = null;
  clearInterval(announceTimer); announceTimer = null;
}

// ══ AUTO MODE POLLING (replaces Firebase listeners) ══
setInterval(async () => {
  try {
    const val = await kvGet('autoMode/on');
    if (val === true && !autoModeOn) {
      autoModeOn = true;
      console.log('✅ Auto Mode ON');
      const cdVal = await kvGet('autoMode/cdMinutes');
      autoCdMinutes = cdVal || 3;
      const rVal = await kvGet('autoMode/round');
      roundNumber = rVal || 1;
      startAutoCountdown();
    } else if (val === false && autoModeOn) {
      autoModeOn = false;
      clearAllTimers();
      await kvSet('autoMode/phase', 'idle');
      console.log('⏹ Auto Mode OFF');
    }
  } catch(e) {}
}, 2000);

async function startAutoCountdown() {
  if (!autoModeOn) return;
  clearAllTimers();
  const secs = autoCdMinutes * 60;
  const startAt = Date.now() + secs * 1000;
  await kvSet('game/countdown', { active: true, startAt, mins: autoCdMinutes, autoStart: true });
  await kvSet('autoMode/phase', 'countdown');
  console.log(`⏱ Countdown: ${autoCdMinutes} min`);
  let remain = secs;
  countdownTimer = setInterval(async () => {
    if (!autoModeOn) { clearInterval(countdownTimer); return; }
    remain--;
    if (remain <= 0) { clearInterval(countdownTimer); await startAutoGame(); }
  }, 1000);
}

async function startAutoGame() {
  if (!autoModeOn) return;
  try {
    calledNumbers = [];
    await kvSet('game/countdown', { active: false });
    await kvSet('game/status', { started: true, autoStarted: true });
    await pool.query('DELETE FROM game_called_numbers');
    await pool.query('DELETE FROM game_winners');
    await kvDel('game/pendingWinner');
    await kvDel('game/announcement');
    await kvSet('game/paid', false);
    await kvSet('autoMode/phase', 'playing');
    console.log('🎮 Game Started!');
    const speedVal = await kvGet('autoMode/callSpeed');
    autoCallNumber(speedVal || 6000);
  } catch(e) {
    console.error('❌ startAutoGame error:', e.message);
    await kvSet('autoMode/phase', 'error');
    setTimeout(() => { if (autoModeOn) startAutoCountdown(); }, 10000);
  }
}

async function autoCallNumber(speed) {
  if (!autoModeOn) return;
  clearInterval(callTimer);

  const confirmedRows = await pool.query('SELECT card_id, user_id FROM game_confirmed_numbers');
  const allCards = {};
  confirmedRows.rows.forEach(r => { allCards[r.card_id] = r.user_id; });

  const cardInfoMap = {}, realCards = [], botCards = [];
  for (let cardId in allCards) {
    const uid = allCards[cardId];
    const uRes = await pool.query('SELECT is_bot, display FROM users WHERE uid=$1', [uid]);
    const isBot = uRes.rows.length ? uRes.rows[0].is_bot : false;
    const name = uRes.rows.length ? uRes.rows[0].display : String(uid);
    const entry = { user: uid, displayName: name, cardId, isBot };
    cardInfoMap[cardId] = entry;
    if (isBot) botCards.push(entry); else realCards.push(entry);
  }

  const botWinPct = await kvGet('autoMode/botWinPercent');
  const botWinPercent = Math.min(100, Math.max(0, botWinPct ?? 50));
  const roll = Math.floor(Math.random() * 100) + 1;
  let targetCard = null;
  if (roll <= botWinPercent) {
    targetCard = botCards.length > 0 ? botCards[Math.floor(Math.random() * botCards.length)]
      : realCards.length > 0 ? realCards[Math.floor(Math.random() * realCards.length)] : null;
  } else {
    targetCard = realCards.length > 0 ? realCards[Math.floor(Math.random() * realCards.length)]
      : botCards.length > 0 ? botCards[Math.floor(Math.random() * botCards.length)] : null;
  }

  if (!targetCard) { console.log('⚠️ No cards'); await scheduleNextRound(); return; }

  const neededNums = generateBoard(Number(targetCard.cardId)).filter(n => n !== 'FREE');
  const allBoards = {};
  for (let cardId in cardInfoMap) allBoards[cardId] = generateBoard(Number(cardId));

  callTimer = setInterval(async () => {
    try {
      if (!autoModeOn) { clearInterval(callTimer); return; }
      const pend = await kvGet('game/pendingWinner');
      if (pend && !pend.announced) { clearInterval(callTimer); startAutoAnnounce(); return; }

      const used = new Set(calledNumbers);
      const remaining = [...Array(75)].map((_, i) => i + 1).filter(n => !used.has(n));

      if (!remaining.length) {
        clearInterval(callTimer);
        const bet = (await kvGet('game/bet')) || 0;
        const confirmedRes = await pool.query('SELECT card_id, user_id FROM game_confirmed_numbers');
        for (let row of confirmedRes.rows) {
          const uid = row.user_id;
          const uRes = await pool.query('SELECT is_bot FROM users WHERE uid=$1', [uid]);
          if (uRes.rows.length && uRes.rows[0].is_bot) continue;
          await pool.query('UPDATE users SET balance=balance+$1 WHERE uid=$2', [bet, uid]);
          await pool.query('INSERT INTO notifications(user_id,message,time,read) VALUES($1,$2,$3,$4)',
            [uid, `⚠️ Game ሳይጠናቀቅ ተዘጋ — ${bet} ብር ተመለሰ!`, Date.now(), false]);
        }
        await kvSet('game/announcement', { type: 'no_winner', message: 'ምንም አሸናፊ አልተገኘም', time: Date.now() });
        await scheduleNextRound();
        return;
      }

      const neededRemaining = remaining.filter(n => neededNums.includes(n) && !calledNumbers.includes(n));
      let safeRemaining = remaining.filter(n => !wouldCloseColumnSoon(n, allBoards, calledNumbers));
      if (safeRemaining.length === 0) safeRemaining = remaining;
      const safeNeeded = neededRemaining.filter(n => safeRemaining.includes(n));

      let n;
      const rand = Math.random();
      if (safeNeeded.length > 0 && rand < 0.65) {
        n = safeNeeded[Math.floor(Math.random() * safeNeeded.length)];
      } else if (safeRemaining.length > 0) {
        n = safeRemaining[Math.floor(Math.random() * safeRemaining.length)];
      } else {
        n = remaining[Math.floor(Math.random() * remaining.length)];
      }

      calledNumbers.push(n);
      await pool.query('INSERT INTO game_called_numbers(number) VALUES($1)', [n]);
      console.log(`📢 ${getLetter(n)}${n} (called: ${calledNumbers.length})`);

      const totalVal = (await kvGet('game/total')) || 0;
      const pctVal = ((await kvGet('game/percent')) || 80) / 100;
      const prize = Math.floor(totalVal * pctVal);
      await kvSet('game/prize', prize);

      const winners = [];
      for (let cardId in allBoards) {
        if (checkWin(allBoards[cardId], calledNumbers))
          winners.push({ ...cardInfoMap[cardId], time: Date.now() });
      }

      if (winners.length > 0) {
        clearInterval(callTimer);
        console.log(`🏆 Winner found after ${calledNumbers.length} calls!`);
        await kvSet('game/pendingWinner', { winners, prize, announced: false, time: Date.now() });
        startAutoAnnounce();
      }
    } catch(e) { console.error('❌ callNumber error:', e.message); }
  }, speed);
}

async function startAutoAnnounce() {
  if (!autoModeOn) return;
  clearAllTimers();
  await kvSet('autoMode/phase', 'announcing');
  let count = 5;
  announceTimer = setInterval(async () => {
    if (--count <= 0) { clearInterval(announceTimer); await announceWinner(); await scheduleNextRound(); }
  }, 1000);
}

async function announceWinner() {
  try {
    const data = await kvGet('game/pendingWinner');
    if (!data) return;
    const { winners, prize } = data;
    const share = Math.floor(prize / winners.length);
    let botWinShare = 0;

    for (let w of winners) {
      if (w.isBot) { botWinShare += share; continue; }
      await pool.query('UPDATE users SET balance=balance+$1 WHERE uid=$2', [share, w.user]);
      await pool.query('INSERT INTO notifications(user_id,message,time,read) VALUES($1,$2,$3,$4)',
        [w.user, `🎉 አሸነፍክ! ${share} ብር balance ላይ ታከለ! Card #${w.cardId}`, Date.now(), false]);
      const anProfit = (await kvGet('analytics/totalProfit')) || 0;
      await kvSet('analytics/totalProfit', Math.max(0, anProfit - share));
    }

    if (botWinShare > 0) {
      const anProfit = (await kvGet('analytics/totalProfit')) || 0;
      await kvSet('analytics/totalProfit', anProfit + botWinShare);
      const botProfit = (await kvGet('analytics/botWinProfit')) || 0;
      await kvSet('analytics/botWinProfit', botProfit + botWinShare);
    }

    await pool.query('DELETE FROM game_winners');
    for (let w of winners) {
      await pool.query(
        'INSERT INTO game_winners(user_id,display_name,card_id,prize,is_bot,time) VALUES($1,$2,$3,$4,$5,$6)',
        [w.user, w.displayName, w.cardId, share, w.isBot||false, Date.now()]
      );
      await pool.query(
        'INSERT INTO all_winners(user_id,display_name,card_id,prize,is_bot,time) VALUES($1,$2,$3,$4,$5,$6)',
        [w.user, w.displayName, w.cardId, share, w.isBot||false, Date.now()]
      );
    }

    await kvSet('game/announcement', { type: 'winner', winners, prize, share, time: Date.now() });
    await kvSet('game/paid', true);
    const pend = await kvGet('game/pendingWinner');
    await kvSet('game/pendingWinner', { ...pend, announced: true });
    await kvSet('game/status', { started: false, waitingRestart: true });

    const confirmedRes = await pool.query('SELECT COUNT(DISTINCT user_id) as cnt FROM game_confirmed_numbers');
    const playerCount = parseInt(confirmedRes.rows[0].cnt);
    const totalVal = (await kvGet('game/total')) || 0;
    const collected = (await kvGet('analytics/totalCollected')) || 0;
    await kvSet('analytics/totalCollected', collected + totalVal);
    const paidOut = (await kvGet('analytics/totalPaidOut')) || 0;
    await kvSet('analytics/totalPaidOut', paidOut + prize);
    const prevAvg = (await kvGet('analytics/avgPlayers')) || 0;
    await kvSet('analytics/avgPlayers', ((prevAvg * (roundNumber - 1)) + playerCount) / roundNumber);
    const dailyProfit = (await kvGet('analytics/dailyProfit')) || 0;
    await kvSet('analytics/dailyProfit', dailyProfit + botWinShare);
    await kvSet('analytics/dailyRound', roundNumber);
    console.log(`✅ Paid! ${share} ብር to ${winners.length} winner(s)`);
  } catch(e) { console.error('❌ announceWinner error:', e.message); }
}

// ══ PROMOTION BROADCAST ══
const BOT_PY_URL = 'https://telegram-bingo-bot-production.up.railway.app/broadcast';

async function broadcastPromotion(promoData) {
  try {
    const { text, photoBuffer, photoUrl, targetType, groupId } = promoData;
    if (targetType === 'group' && groupId) {
      const BOT_TOKEN = process.env.BOT_TOKEN || '';
      const bodyData = JSON.stringify({ chat_id: groupId, text: text || '', parse_mode: 'HTML' });
      await new Promise((resolve) => {
        const options = {
          hostname: 'api.telegram.org',
          path: `/bot${BOT_TOKEN}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyData) }
        };
        const req = require('https').request(options, (res) => {
          let d = ''; res.on('data', chunk => d += chunk); res.on('end', () => resolve());
        });
        req.on('error', () => resolve()); req.write(bodyData); req.end();
      });
    } else {
      const url = new URL(BOT_PY_URL);
      if (photoBuffer) {
        const boundary = '----FormBoundary' + Date.now();
        const body = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\n${text || ''}\r\n`),
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="promo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
          photoBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);
        await new Promise((resolve) => {
          const options = { hostname: url.hostname, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length } };
          const req = require('https').request(options, (r) => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve()); });
          req.on('error', () => resolve()); req.write(body); req.end();
        });
      } else if (photoUrl) {
        const boundary = '----FormBoundary' + Date.now();
        const body = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\n${text || ''}\r\n`),
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo_url"\r\n\r\n${photoUrl}\r\n`),
          Buffer.from(`--${boundary}--\r\n`)
        ]);
        await new Promise((resolve) => {
          const options = { hostname: url.hostname, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length } };
          const req = require('https').request(options, (r) => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve()); });
          req.on('error', () => resolve()); req.write(body); req.end();
        });
      } else {
        const postData = JSON.stringify({ text: text || '' });
        await new Promise((resolve) => {
          const options = { hostname: url.hostname, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
          const req = require('https').request(options, (r) => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve()); });
          req.on('error', () => resolve()); req.write(postData); req.end();
        });
      }
    }
  } catch(e) { console.error('❌ broadcastPromotion error:', e.message); }
}

// ══ PROMOTION ENDPOINTS ══
app.post('/create-interval-promotion', multer({ storage: multer.memoryStorage() }).single('photo'), async (req, res) => {
  const { text, targetType, groupId, intervalMs } = req.body;
  const photoBuffer = req.file ? req.file.buffer : null;
  if (!text && !photoBuffer) return res.json({ ok: false, msg: '❌ Message ወይም Photo ያስፈልጋል!' });
  try {
    let photoUrl = '';
    if (photoBuffer) {
      const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
      const boundary = '----FormBoundary' + Date.now();
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="promo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        photoBuffer,
        Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="upload_preset"\r\n\r\nunsigned_preset\r\n--${boundary}--\r\n`)
      ]);
      photoUrl = await new Promise((resolve) => {
        const options = { hostname: 'api.cloudinary.com', path: `/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
          method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length, 'Authorization': `Basic ${auth}` } };
        const request = require('https').request(options, (r) => {
          let d = ''; r.on('data', chunk => d += chunk);
          r.on('end', () => { try { resolve(JSON.parse(d).secure_url || ''); } catch(e) { resolve(''); } });
        });
        request.on('error', () => resolve('')); request.write(body); request.end();
      });
    }
    await pool.query(
      'INSERT INTO promotions(text,photo_url,target_type,group_id,interval_ms,next_send_at,active,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [text||'', photoUrl, targetType||'bot', groupId||'', Number(intervalMs)||3600000,
        Date.now()+Number(intervalMs), true, Date.now()]
    );
    res.json({ ok: true, msg: '✅ Interval promotion ተጀምሯል!' });
  } catch(e) {
    res.json({ ok: false, msg: '❌ Error: ' + e.message });
  }
});

app.post('/send-promotion', multer({ storage: multer.memoryStorage() }).single('photo'), async (req, res) => {
  const { text, targetType, groupId } = req.body;
  const photoBuffer = req.file ? req.file.buffer : null;
  if (!text && !photoBuffer) return res.json({ ok: false, msg: '❌ Message ወይም Photo ያስፈልጋል!' });
  try {
    await broadcastPromotion({ text, photoBuffer, targetType, groupId });
    res.json({ ok: true, msg: '✅ Promotion ተላከ!' });
  } catch(e) {
    res.json({ ok: false, msg: '❌ Error: ' + e.message });
  }
});

app.get('/promotions-list', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotions WHERE active=true ORDER BY created_at DESC');
    res.json(result.rows.map(p => ({
      id: p.id, text: p.text, photo_url: p.photo_url,
      target_type: p.target_type, group_id: p.group_id,
      interval_ms: parseInt(p.interval_ms),
      next_send_at: parseInt(p.next_send_at),
      active: p.active
    })));
  } catch(e) { res.json([]); }
});

app.post('/delete-promotion', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query('UPDATE promotions SET active=false WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

// ══ PROMOTION SCHEDULER ══
async function checkPromotions() {
  try {
    const result = await pool.query('SELECT * FROM promotions WHERE active=true');
    const now = Date.now();
    for (let p of result.rows) {
      if (!p.next_send_at || now < parseInt(p.next_send_at)) continue;
      console.log(`📢 Sending interval promotion: ${p.id}`);
      try {
        await broadcastPromotion({
          text: p.text || '', photoBuffer: null, photoUrl: p.photo_url || '',
          targetType: p.target_type || 'bot', groupId: p.group_id || ''
        });
        await pool.query(
          'UPDATE promotions SET next_send_at=$1, last_sent_at=$2 WHERE id=$3',
          [now + parseInt(p.interval_ms), now, p.id]
        );
        console.log(`✅ Promotion sent!`);
      } catch(e) {
        console.error('❌ Promotion send error:', e.message);
        await pool.query('UPDATE promotions SET next_send_at=$1 WHERE id=$2', [now + parseInt(p.interval_ms), p.id]);
      }
    }
  } catch(e) {}
}
setInterval(checkPromotions, 60 * 1000);

// ══ SCHEDULE NEXT ROUND ══
async function scheduleNextRound() {
  if (!autoModeOn) return;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastReset = await kvGet('analytics/lastResetDate');

    if (lastReset !== todayStr) {
      const prevRound = (await kvGet('analytics/dailyRound')) || 0;
      const prevProfit = (await kvGet('analytics/dailyProfit')) || 0;
      if (prevRound > 0 && lastReset) {
        await pool.query(
          'INSERT INTO analytics_history(date,rounds,profit) VALUES($1,$2,$3) ON CONFLICT(date) DO UPDATE SET rounds=$2,profit=$3',
          [lastReset, prevRound, prevProfit]
        );
      }
      await kvSet('analytics/dailyRound', 0);
      await kvSet('analytics/dailyProfit', 0);
      await kvSet('analytics/lastResetDate', todayStr);
      roundNumber = 1;
      await kvSet('autoMode/round', roundNumber);

      // Clean old history (>5 days)
      const fiveDaysAgo = new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0];
      await pool.query('DELETE FROM analytics_history WHERE date < $1', [fiveDaysAgo]);
      const fiveMs = Date.now() - 5*24*60*60*1000;
      await pool.query('DELETE FROM all_winners WHERE time < $1', [fiveMs]);
    }

    roundNumber++;
    await kvSet('autoMode/round', roundNumber);
    console.log(`🔄 Round ${roundNumber}`);

    await pool.query('DELETE FROM game_called_numbers');
    await kvSet('game/status', { started: false });
    await kvDel('game/pendingWinner');
    await pool.query('DELETE FROM game_winners');
    await kvDel('game/announcement');
    await kvSet('game/paid', false);
    await pool.query('DELETE FROM game_confirmed_numbers');
    await kvSet('game/prize', 0);
    await kvSet('game/total', 0);
    calledNumbers = [];

    // Remove bots
    await pool.query('DELETE FROM users WHERE is_bot=true');

    await kvSet('autoMode/phase', 'countdown');
    setTimeout(async () => { if (!autoModeOn) return; await startAutoCountdown(); }, 3000);
  } catch(e) {
    console.error('❌ scheduleNextRound error:', e.message);
    setTimeout(() => { if (autoModeOn) startAutoCountdown(); }, 15000);
  }
}

// ══ GIVE BALANCE ══
app.post('/give-balance', async (req, res) => {
  const { uid, amount } = req.body;
  if (!uid) return res.json({ ok: false, msg: 'Missing uid' });
  try {
    await pool.query(
      'INSERT INTO users(uid,balance) VALUES($1,$2) ON CONFLICT(uid) DO UPDATE SET balance=users.balance+$2',
      [uid, amount || 0]
    );
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false, msg: e.message }); }
});

// ══ REMOVE BOTS ══
app.post('/remove-bots', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE is_bot=true');
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

// ══ WITHDRAWAL ACTION ══
app.post('/withdrawal-action', async (req, res) => {
  const { key, uid, amount, action } = req.body;
  try {
    const withdrawals = (await kvGet('bot/withdrawals')) || {};
    if (!withdrawals[key]) return res.json({ ok: false, msg: 'Not found' });
    if (action === 'approve') {
      withdrawals[key].status = 'approved';
      withdrawals[key].time = new Date().toISOString();
      await kvSet('bot/withdrawals', withdrawals);
      const anWd = (await kvGet('analytics/totalWithdrawals')) || 0;
      await kvSet('analytics/totalWithdrawals', anWd + (amount || 0));
      res.json({ ok: true });
    } else {
      withdrawals[key].status = 'rejected';
      await kvSet('bot/withdrawals', withdrawals);
      await pool.query('UPDATE users SET balance=balance+$1 WHERE uid=$2', [amount || 0, uid]);
      res.json({ ok: true });
    }
  } catch(e) { res.json({ ok: false, msg: e.message }); }
});

// ══ AGENTS ══
app.get('/agents', async (req, res) => {
  try {
    const agents = (await kvGet('agents')) || {};
    res.json(agents);
  } catch(e) { res.json({}); }
});

app.post('/add-agent', async (req, res) => {
  const { name, id_number } = req.body;
  if (!name) return res.json({ ok: false });
  try {
    const agents = (await kvGet('agents')) || {};
    agents[name] = { id_number: id_number || '', created_at: Date.now() };
    await kvSet('agents', agents);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

app.post('/delete-agent', async (req, res) => {
  const { name } = req.body;
  try {
    const agents = (await kvGet('agents')) || {};
    delete agents[name];
    await kvSet('agents', agents);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

app.post('/change-agent-pass', async (req, res) => {
  const { password } = req.body;
  try {
    await kvSet('agentPassword', password);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

// ══ CONFIG (passwords) ══
app.get('/get-config', async (req, res) => {
  try {
    const cfg = (await kvGet('config')) || {};
    res.json(cfg);
  } catch(e) { res.json({}); }
});

app.post('/save-config', async (req, res) => {
  try {
    await kvSet('config', req.body);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});
