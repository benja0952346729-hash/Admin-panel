const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(`CREATE TABLE IF NOT EXISTS game_state (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, display TEXT, balance NUMERIC DEFAULT 0, is_bot BOOLEAN DEFAULT false); CREATE TABLE IF NOT EXISTS promotions (id SERIAL PRIMARY KEY, text TEXT, photo_url TEXT, target_type TEXT, group_id TEXT, interval_ms BIGINT, next_send_at BIGINT, last_sent_at BIGINT, active BOOLEAN DEFAULT true, created_at BIGINT); CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, uid TEXT, message TEXT, time BIGINT, read BOOLEAN DEFAULT false); CREATE TABLE IF NOT EXISTS analytics (key TEXT PRIMARY KEY, value NUMERIC DEFAULT 0); CREATE TABLE IF NOT EXISTS all_winners (id SERIAL PRIMARY KEY, uid TEXT, display_name TEXT, card_id TEXT, prize NUMERIC, is_bot BOOLEAN, time BIGINT);`)
.then(() => console.log('✅ DB ready!'))
.catch(e => console.error('DB error:', e.message));

async function getState(key) {
  const r = await pool.query('SELECT value FROM game_state WHERE key=$1', [key]);
  return r.rows.length ? JSON.parse(r.rows[0].value) : null;
}
async function setState(key, value) {
  await pool.query(
    'INSERT INTO game_state(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',
    [key, JSON.stringify(value)]
  );
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.static(__dirname));
app.use(express.json());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/user-state', async (req, res) => {
  const { userId, firstName } = req.query;
  const displayName = firstName ? decodeURIComponent(firstName) : userId;
  if (!userId) return res.json({ balance: 0, isNew: false });
  try {
    const insert = await pool.query(
  `INSERT INTO users(uid,display,balance,is_bot)
   VALUES($1,$2,0,false)
   ON CONFLICT(uid) DO UPDATE SET display=$2 RETURNING uid`,
  [userId, displayName]
);
    const isNew = insert.rows.length > 0;
    if (isNew) {
      await pool.query('UPDATE users SET balance=balance+20 WHERE uid=$1', [userId]);
    }
    const u = await pool.query('SELECT balance FROM users WHERE uid=$1', [userId]);
    res.json({ balance: u.rows[0]?.balance || 0, isNew });
  } catch(e) { res.json({ balance: 0, isNew: false }); }
});
app.post('/set-not-new', async (req, res) => {
  res.json({ ok: true });
});
app.get('/all-winners', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT uid as user, display_name as "displayName", card_id as "cardId", prize, time FROM all_winners ORDER BY time DESC LIMIT 100'
    );
    const round = (await getState('autoMode/round')) || 1;
    res.json({ winners: r.rows, round });
  } catch(e) { res.json({ winners: [], round: 1 }); }
});
app.post('/submit-payment',
  multer({ storage: multer.memoryStorage() }).single('photo'),
  async (req, res) => {
    const { userId, amount } = req.body;
    const file = req.file;
    if (!file || !userId || !amount)
      return res.json({ ok: false, msg: '❌ Data missing' });
    try {
      const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
      const boundary = '----FormBoundary' + Date.now();
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="pay.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        file.buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);
      const photoUrl = await new Promise((resolve) => {
        const opts = {
          hostname: 'api.cloudinary.com',
          path: `/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
          }
        };
        const req2 = require('https').request(opts, r => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => {
            try { resolve(JSON.parse(d).secure_url || ''); }
            catch { resolve(''); }
          });
        });
        req2.on('error', () => resolve(''));
        req2.write(body); req2.end();
      });

      const key = `pay_${userId}_${Date.now()}`;
      const existing = (await getState('bot/payments')) || {};
      existing[key] = {
        user_id: userId, amount: Number(amount),
        photo_url: photoUrl, status: 'pending',
        time: new Date().toISOString()
      };
      await setState('bot/payments', existing);

      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  }
);
// SSE clients
let sseClients = [];

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

function broadcast(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}
app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running!'));
// GET /game-state — ሁሉንም state ያስቀምጣል
app.get('/game-state', async (req, res) => {
  try {
    const rows = await pool.query('SELECT key, value FROM game_state');
    const result = {};
    rows.rows.forEach(r => {
      const keys = r.key.split('/');
      let obj = result;
      for(let i = 0; i < keys.length - 1; i++){
        if(!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      try { obj[keys[keys.length-1]] = JSON.parse(r.value); }
      catch { obj[keys[keys.length-1]] = r.value; }
    });
    // ✅ game/ ን flatten አድርግ
    const flat = result.game || {};
    flat.autoMode = result.autoMode;
    flat.smartBot = result.smartBot;
    flat.settings = result.settings;
    flat.announcement = result.game?.announcement;
flat.winners = result.game?.winners;
flat.pendingWinner = result.game?.pendingWinner;
flat.status = result.game?.status;
flat.calledNumbers = result.game?.calledNumbers;
flat.countdown = result.game?.countdown;
flat.bet = result.game?.bet;
flat.prize = result.game?.prize;
flat.percent = result.game?.percent;
flat.confirmedNumbers = result.game?.confirmedNumbers;
flat.paid = result.game?.paid;
    const usersRes = await pool.query('SELECT uid, display FROM users');
const displayNames = {};
usersRes.rows.forEach(r => { displayNames[r.uid] = r.display; });
flat.displayNames = displayNames;
    res.json(flat);
  } catch(e) { res.json({}); }
});

// POST /set-state — key/value ያስቀምጣል
app.post('/set-state', async (req, res) => {
  try {
    const { key, value } = req.body;
    await setState(key, value);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false, msg: e.message }); }
});

// GET /analytics
app.get('/analytics', async (req, res) => {
  try {
    const rows = await pool.query('SELECT key, value FROM analytics');
    const data = {};
    rows.rows.forEach(r => data[r.key] = Number(r.value));
    res.json(data);
  } catch(e) { res.json({}); }
});

// GET /withdrawals
app.get('/withdrawals', async (req, res) => {
  try {
    const r = await pool.query("SELECT value FROM game_state WHERE key='bot/withdrawals'");
    const data = r.rows.length ? JSON.parse(r.rows[0].value) : {};
    res.json({ withdrawals: data });
  } catch(e) { res.json({ withdrawals: {} }); }
});

// GET /agents
app.get('/agents', async (req, res) => {
  try {
    const r = await pool.query("SELECT value FROM game_state WHERE key='agents'");
    const data = r.rows.length ? JSON.parse(r.rows[0].value) : {};
    res.json(data);
  } catch(e) { res.json({}); }
});

// GET /promotions-list
app.get('/promotions-list', async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM promotions WHERE active=true ORDER BY created_at DESC');
    res.json(rows.rows);
  } catch(e) { res.json([]); }
});

// DELETE /promotions/:id
app.post('/delete-promotion', async (req, res) => {
  try {
    const { id } = req.body;
    await pool.query('UPDATE promotions SET active=false WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

// POST /give-balance
app.post('/give-balance', async (req, res) => {
  try {
    const { uid, amount } = req.body;
    await pool.query('INSERT INTO users(uid,display,balance) VALUES($1,$2,$3) ON CONFLICT(uid) DO UPDATE SET balance=users.balance+$3', [uid, uid, amount]);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false, msg: e.message }); }
});

// POST /save-accounts
app.post('/save-accounts', async (req, res) => {
  try {
    const { cbe, telebirr } = req.body;
    if(cbe) await setState('bot/settings/cbe_account', cbe);
    if(telebirr) await setState('bot/settings/telebirr_account', telebirr);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

// POST /withdrawal-action
app.post('/withdrawal-action', async (req, res) => {
  try {
    const { key, action, uid, amount } = req.body;
    const allWd = JSON.parse((await pool.query("SELECT value FROM game_state WHERE key='bot/withdrawals'")).rows[0]?.value || '{}');
    if(!allWd[key]) return res.json({ ok: false, msg: 'Not found' });
    allWd[key].status = action === 'approve' ? 'approved' : 'rejected';
    await setState('bot/withdrawals', allWd);
    if(action === 'approve') {
      await pool.query('UPDATE analytics SET value=value+$1 WHERE key=$2', [amount, 'totalWithdrawals']);
      await pool.query('UPDATE analytics SET value=GREATEST(0,value-$1) WHERE key=$2', [amount, 'totalProfit']);
      await pool.query('INSERT INTO notifications(uid,message,time,read) VALUES($1,$2,$3,false)', [uid, `✅ ${amount} ብር ተልኳል!`, Date.now()]);
    } else {
      await pool.query('UPDATE users SET balance=balance+$1 WHERE uid=$2', [amount, uid]);
      await pool.query('INSERT INTO notifications(uid,message,time,read) VALUES($1,$2,$3,false)', [uid, `❌ Withdrawal rejected — ${amount} ብር ተመለሰ!`, Date.now()]);
    }
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false, msg: e.message }); }
});

// POST /add-agent, /delete-agent, /change-agent-pass
app.post('/add-agent', async (req, res) => {
  try {
    const { name, id_number } = req.body;
    const agents = JSON.parse((await pool.query("SELECT value FROM game_state WHERE key='agents'")).rows[0]?.value || '{}');
    agents[name] = { id_number };
    await setState('agents', agents);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

app.post('/delete-agent', async (req, res) => {
  try {
    const { name } = req.body;
    const agents = JSON.parse((await pool.query("SELECT value FROM game_state WHERE key='agents'")).rows[0]?.value || '{}');
    delete agents[name];
    await setState('agents', agents);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

app.post('/change-agent-pass', async (req, res) => {
  try {
    const { password } = req.body;
    await setState('settings/agent_password', password);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});
app.post('/remove-bots', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE is_bot = true');
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false, msg: e.message }); }
});
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
app.get('/get-config', async (req, res) => {
  try {
    const r = await pool.query("SELECT value FROM game_state WHERE key='adminConfig'");
    const config = r.rows.length ? JSON.parse(r.rows[0].value) : {loginPassword:'1234', settingsPassword:'9999'};
    res.json(config);
  } catch(e) {
    res.json({loginPassword:'1234', settingsPassword:'9999'});
  }
});

app.post('/save-config', async (req, res) => {
  try {
    const { loginPassword, settingsPassword } = req.body;
    const config = { loginPassword, settingsPassword };
    await pool.query("INSERT INTO game_state(key,value) VALUES('adminConfig',$1) ON CONFLICT(key) DO UPDATE SET value=$1", [JSON.stringify(config)]);
    res.json({ ok: true });
  } catch(e) {
    res.json({ ok: false, msg: e.message });
  }
});
app.get('/sounds-map', (req, res) => res.json(soundsMap));
loadCloudinarySounds();
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
        const options = {
          hostname: 'api.cloudinary.com',
          path: `/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            'Authorization': `Basic ${auth}`
          }
        };
        const request = require('https').request(options, (r) => {
          let d = '';
          r.on('data', chunk => d += chunk);
          r.on('end', () => {
            try { resolve(JSON.parse(d).secure_url || ''); }
            catch(e) { resolve(''); }
          });
        });
        request.on('error', () => resolve(''));
        request.write(body);
        request.end();
      });
    }

    await pool.query(
  'INSERT INTO promotions(text,photo_url,target_type,group_id,interval_ms,next_send_at,active,created_at) VALUES($1,$2,$3,$4,$5,$6,true,$7)',
  [text||'', photoUrl, targetType||'bot', groupId||'', Number(intervalMs)||3600000, Date.now()+Number(intervalMs), Date.now()]
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

async function checkPromotions() {
  const promos = (await pool.query('SELECT * FROM promotions WHERE active=true')).rows;
    const now = Date.now();
    for (let key in promos) {
      const p = promos[key];
      if (!p.active) continue;
      if (!p.nextSendAt) continue;
      if (now < p.nextSendAt) continue;

      console.log(`📢 Sending interval promotion: ${key}`);
      try {
        await broadcastPromotion({
          text: p.text || '',
          photoBuffer: null,
          photoUrl: p.photoUrl || '',
          targetType: p.targetType || 'bot',
          groupId: p.groupId || ''
        });
        await pool.query(
  'UPDATE promotions SET next_send_at=$1, last_sent_at=$2 WHERE id=$3',
  [now + (p.intervalMs || 3600000), now, p.id]
);
        console.log(`✅ Promotion sent! Next in ${(p.intervalMs||3600000)/3600000}h`);
      } catch(e) {
        console.error('❌ Promotion send error:', e.message);
        await pool.query(
          'UPDATE promotions SET next_send_at=$1 WHERE id=$2',
          [now + (p.intervalMs || 3600000), p.id]
        );
      }
    }
}

setInterval(checkPromotions, 60 * 1000);
console.log('📢 Promotion interval scheduler started');

// ══ CONFIRM CARD ══
app.post('/confirm-card', async (req, res) => {
  const { userId, cardId } = req.body;
  if (!userId || !cardId) return res.json({ ok: false, msg: 'Missing data' });
  try {
    const bet = (await getState('game/bet')) || 0;
const balRes = await pool.query('SELECT balance FROM users WHERE uid=$1', [userId]);
const bal = balRes.rows.length ? Number(balRes.rows[0].balance) : 0;
    if (bal < bet) return res.json({ ok: false, msg: '❌ Balance አንስተኛ ነው!' });
    const status = await getState('game/status');
if (status?.started) return res.json({ ok: false, msg: '❌ Game ጀምሯል!' });
  const allCards = (await getState('game/confirmedNumbers')) || {};
const myCards = Object.values(allCards).filter(v => String(v) === String(userId));
if (myCards.length >= 5) return res.json({ ok: false, msg: '❌ Max 5 cards!' });
if (allCards[cardId]) return res.json({ ok: false, msg: '❌ Card ተይዟል!' });
allCards[cardId] = userId;
await setState('game/confirmedNumbers', allCards);
await pool.query('UPDATE users SET balance = balance - $1 WHERE uid=$2', [bet, userId]);
const total = Object.keys(allCards).length;
const pct = (await getState('game/percent')) || 80;
await setState('game/prize', Math.floor(bet * total * (pct/100)));
await setState('game/total', bet * total);
    return res.json({ ok: true, msg: '✅ Card confirmed!' });
  } catch (e) {
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
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
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

// ══ AUTO MODE ══
setInterval(async () => {
  try {
    const val = await getState('autoMode/on');
    if (val === true && !autoModeOn) {
      autoModeOn = true;
      console.log('✅ Auto Mode ON');
      autoCdMinutes = (await getState('autoMode/cdMinutes')) || 3;
      roundNumber = (await getState('autoMode/round')) || 1;
      startAutoCountdown();
    } else if (!val && autoModeOn) {
      autoModeOn = false;
      clearAllTimers();
      autoPhase = 'idle';
      await setState('autoMode/phase', 'idle');
      console.log('⏹ Auto Mode OFF');
    }
  } catch(e) {
    console.error('❌ autoMode poll error:', e.message);
  }
}, 3000);

async function startAutoCountdown() {
  if (!autoModeOn) return;
  clearAllTimers();
  const secs = autoCdMinutes * 60;
  const startAt = Date.now() + secs * 1000;
  await setState('game/countdown', { active: true, startAt, mins: autoCdMinutes, autoStart: true });
  await setState('autoMode/phase', 'countdown');
  console.log(`⏱ Countdown: ${autoCdMinutes} min`);
  let remain = secs;
  countdownTimer = setInterval(async () => {
    if (!autoModeOn) { clearInterval(countdownTimer); return; }
    remain--;
    if (remain <= 0) { clearInterval(countdownTimer); await startAutoGame(); }
  }, 1000);
}

// ══ FIX 1: startAutoGame — bots አስቀድሞ ይጨምራል፣ ከዚያ cards ያነባል ══
async function startAutoGame() {
  if (!autoModeOn) return;
  try {
    calledNumbers = [];
    await setState('game/countdown', { active: false });
    await setState('game/calledNumbers', []);
    await setState('game/pendingWinner', null);
    await setState('game/winners', null);
    await setState('game/paid', false);
    await setState('game/status', { started: true, autoStarted: true });
    await setState('autoMode/phase', 'playing');
    console.log('🎮 Game Started!');

    // ✅ FIX: confirmedNumbers reset አታድርግ — cards countdown ወቅት ስለሚያዙ
    // game/confirmedNumbers ን አትጥፋ! bots ለማከል ትንሽ ጠብቅ ከዚያ ጀምር
    const callSpeed = (await getState('autoMode/callSpeed')) || 6000;

    // Bots ካሉ ያስቀምጣቸዋል — ከዚያ 2 ሰኮንድ ቆይቶ ይጀምራል
    await addBotsIfNeeded();

    // ✅ 2 ሰኮንድ ቆይቶ cards ካረጋገጠ በኋላ ያነሳል
    setTimeout(() => {
      autoCallNumber(callSpeed);
    }, 2000);

  } catch(e) {
    console.error('❌ startAutoGame error:', e.message);
    setTimeout(() => { if (autoModeOn) startAutoCountdown(); }, 10000);
  }
}

// ✅ NEW: Bots ማከያ function
async function addBotsIfNeeded() {
  try {
    const smartBot = await getState('smartBot');
    if (!smartBot?.enabled) return;

    const allCards = (await getState('game/confirmedNumbers')) || {};
    const realPlayerCount = Object.keys(allCards).length;
    const minCards = smartBot.minCards || 5;
    const botsNeeded = Math.max(0, minCards - realPlayerCount);
    if (botsNeeded === 0) return;

    const bet = (await getState('game/bet')) || 0;
    const pct = (await getState('game/percent')) || 80;

    for (let i = 0; i < botsNeeded; i++) {
      const botId = `bot_${Date.now()}_${i}`;
      const botName = `Bot${Math.floor(Math.random() * 9000) + 1000}`;
      await pool.query(
        'INSERT INTO users(uid,display,balance,is_bot) VALUES($1,$2,$3,true) ON CONFLICT(uid) DO UPDATE SET display=$2',
        [botId, botName, bet * 10]
      );
      // Random card ID
      const cardId = String(Math.floor(Math.random() * 900000) + 100000);
      if (!allCards[cardId]) {
        allCards[cardId] = botId;
        await pool.query('UPDATE users SET balance = balance - $1 WHERE uid=$2', [bet, botId]);
      }
    }
    await setState('game/confirmedNumbers', allCards);
    const total = Object.keys(allCards).length;
    await setState('game/prize', Math.floor(bet * total * (pct / 100)));
    await setState('game/total', bet * total);
    console.log(`🤖 Added ${botsNeeded} bots. Total cards: ${total}`);
  } catch(e) {
    console.error('❌ addBotsIfNeeded error:', e.message);
  }
}

async function autoCallNumber(speed) {
  if (!autoModeOn) return;
  clearInterval(callTimer);

  // ✅ FIX: Cards ከDB ዘግቶ ያነባል
  const allCards = (await getState('game/confirmedNumbers')) || {};
  console.log(`📋 Cards at game start: ${Object.keys(allCards).length}`);

  // ✅ FIX: Cards ከሌሉ ቢያንስ 1 ሰኮንድ ጠብቆ እንደገና ይሞክራል
  if (Object.keys(allCards).length === 0) {
    console.log('⚠️ No cards found! Retrying in 3s...');
    setTimeout(async () => {
      if (autoModeOn) await autoCallNumber(speed);
    }, 3000);
    return;
  }

  const usersSnap = await pool.query('SELECT uid, display, is_bot FROM users');
  const allUsers = {};
  usersSnap.rows.forEach(r => { allUsers[r.uid] = { display: r.display, is_bot: r.is_bot }; });

  const cardInfoMap = {}, realCards = [], botCards = [];
  for (let cardId in allCards) {
    const uid = allCards[cardId];
    const isBot = allUsers[uid]?.is_bot === true;
    const name = allUsers[uid]?.display || String(uid);
    const entry = { user: uid, displayName: name, cardId, isBot };
    cardInfoMap[cardId] = entry;
    if (isBot) botCards.push(entry);
    else realCards.push(entry);
  }

  console.log(`🎮 Real cards: ${realCards.length}, Bot cards: ${botCards.length}`);

  const botWinPercent = (await getState('autoMode/botWinPercent')) ?? 50;
  const roll = Math.floor(Math.random() * 100) + 1;
  let targetCard = null;
  if (roll <= botWinPercent) {
    targetCard = botCards.length > 0
      ? botCards[Math.floor(Math.random() * botCards.length)]
      : realCards.length > 0
        ? realCards[Math.floor(Math.random() * realCards.length)] : null;
  } else {
    targetCard = realCards.length > 0
      ? realCards[Math.floor(Math.random() * realCards.length)]
      : botCards.length > 0
        ? botCards[Math.floor(Math.random() * botCards.length)] : null;
  }

  if (!targetCard) {
    console.log('⚠️ No target card after retry — scheduling next round');
    await scheduleNextRound();
    return;
  }

  const neededNums = generateBoard(Number(targetCard.cardId)).filter(n => n !== 'FREE');
  const allBoards = {};
  for (let cardId in cardInfoMap)
    allBoards[cardId] = generateBoard(Number(cardId));

  const gameTotal = (await getState('game/total')) || 0;
  const gamePct = (await getState('game/percent')) || 80;

  callTimer = setInterval(async () => {
    try {
      if (!autoModeOn) { clearInterval(callTimer); return; }

      const pend = await getState('game/pendingWinner');
      if (pend && !pend.announced) {
        clearInterval(callTimer);
        startAutoAnnounce();
        return;
      }

      const used = new Set(calledNumbers);
      const remaining = [...Array(75)].map((_, i) => i + 1).filter(n => !used.has(n));

      if (!remaining.length) {
        clearInterval(callTimer);
        for (let cardId in allCards) {
          const uid = allCards[cardId];
          if (allUsers[uid]?.is_bot) continue;
          const bet = (await getState('game/bet')) || 0;
          await pool.query('UPDATE users SET balance = balance + $1 WHERE uid=$2', [bet, uid]);
          await pool.query('INSERT INTO notifications(uid,message,time,read) VALUES($1,$2,$3,false)',
            [uid, `⚠️ Game ሳይጠናቀቅ ተዘጋ — ${bet} ብር ተመለሰ!`, Date.now()]);
        }
        await setState('game/announcement', { type: 'no_winner', message: 'ምንም አሸናፊ አልተገኘም', time: Date.now() });
        await scheduleNextRound();
        return;
      }

      const neededRemaining = remaining.filter(n => neededNums.includes(n) && !calledNumbers.includes(n));
      let safeRemaining = remaining.filter(n => !wouldCloseColumnSoon(n, allBoards, calledNumbers));
      if (safeRemaining.length === 0) safeRemaining = remaining;
      const safeNeeded = neededRemaining.filter(n => safeRemaining.includes(n));

      let n;
      const rand = Math.random();
      if (safeNeeded.length > 0 && rand < 0.65)
        n = safeNeeded[Math.floor(Math.random() * safeNeeded.length)];
      else if (safeRemaining.length > 0)
        n = safeRemaining[Math.floor(Math.random() * safeRemaining.length)];
      else
        n = remaining[Math.floor(Math.random() * remaining.length)];

      calledNumbers.push(n);
      const called = (await getState('game/calledNumbers')) || [];
      called.push(n);
      await setState('game/calledNumbers', called);
      console.log(`📢 ${getLetter(n)}${n}`);

      const prize = Math.floor(gameTotal * (gamePct / 100));
      await setState('game/prize', prize);

      const winners = [];
      for (let cardId in allBoards)
        if (checkWin(allBoards[cardId], calledNumbers))
          winners.push({ ...cardInfoMap[cardId], time: Date.now() });

      if (winners.length > 0) {
        clearInterval(callTimer);
        console.log(`🏆 Winner found after ${calledNumbers.length} calls`);
        await setState('game/pendingWinner', { winners, prize, announced: false, time: Date.now() });
        startAutoAnnounce();
      }
    } catch(e) {
      console.error('❌ callNumber error:', e.message);
    }
  }, speed);
}

// ✅ FIX 2: Winner announce — 5 ሰኮንድ ቆይቶ ከዚያ announceWinner ይጠራል
async function startAutoAnnounce() {
  if (!autoModeOn) return;
  clearAllTimers();
  await setState('autoMode/phase', 'announcing');
  console.log('🎉 Winner found! Announcing in 5 seconds...');

  // ✅ 5 ሰኮንድ countdown ከዚያ announce
  let count = 5;
  announceTimer = setInterval(async () => {
    count--;
    console.log(`⏳ Announcing in ${count}s...`);
    if (count <= 0) {
      clearInterval(announceTimer);
      announceTimer = null;
      await announceWinner();
      await scheduleNextRound();
    }
  }, 1000);
}

async function announceWinner() {
  try {
    const data = await getState('game/pendingWinner');
    if (!data) return;
    const { winners, prize } = data;
    const share = Math.floor(prize / winners.length);
    let botWinShare = 0;

    for (let w of winners) {
      if (w.isBot) { botWinShare += share; continue; }
      await pool.query('UPDATE users SET balance = balance + $1 WHERE uid=$2', [share, w.user]);
      await pool.query('INSERT INTO notifications(uid,message,time,read) VALUES($1,$2,$3,false)',
        [w.user, `🎉 አሸነፍክ! ${share} ብር balance ላይ ታከለ! Card #${w.cardId}`, Date.now()]);
      await pool.query('UPDATE analytics SET value = GREATEST(0, value - $1) WHERE key=$2',
        [share, 'totalProfit']);
    }

    if (botWinShare > 0) {
      await pool.query('INSERT INTO analytics(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value = analytics.value + $2', ['totalProfit', botWinShare]);
      await pool.query('INSERT INTO analytics(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value = analytics.value + $2', ['botWinProfit', botWinShare]);
    }
    const winnersObj = {};
    winners.forEach((w, i) => { winnersObj[i] = { ...w, prize: share }; });
    await setState('game/winners', winnersObj);
    for (const w of winners) {
      await pool.query('INSERT INTO all_winners(uid,display_name,card_id,prize,is_bot,time) VALUES($1,$2,$3,$4,$5,$6)',
        [w.user, w.displayName, w.cardId, share, w.isBot||false, Date.now()]);
    }
    broadcast({ type:'winner', winners, prize, share, calledNumbers: calledNumbers, time: Date.now() });
    await setState('game/announcement', { type:'winner', winners, prize, share, time:Date.now(), calledNumbers });
    await setState('game/paid', true);
    await setState('game/pendingWinner', { ...data, announced:true });
    await setState('game/status', { started:false, waitingRestart:true });
    const allCards = (await getState('game/confirmedNumbers')) || {};
    const total = (await getState('game/total')) || 0;
    await pool.query('INSERT INTO analytics(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value = analytics.value + $2', ['totalCollected', total]);
    await pool.query('INSERT INTO analytics(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value = analytics.value + $2', ['totalPaidOut', prize]);
    await pool.query('INSERT INTO analytics(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value = analytics.value + $2', ['dailyProfit', botWinShare]);
    await setState('analytics/dailyRound', roundNumber);
    console.log(`✅ Paid! ${share} ብር to ${winners.length} winner(s)`);
  } catch (e) { console.error('❌ announceWinner error:', e.message); }
}

// ══ PROMOTION BROADCAST ══
const BOT_PY_URL = 'https://telegram-bingo-bot-production.up.railway.app/broadcast';

async function broadcastPromotion(promoData) {
  try {
    const { text, photoBuffer, photoUrl, targetType, groupId } = promoData;

    if (targetType === 'group' && groupId) {
      const BOT_TOKEN = process.env.BOT_TOKEN || '';
      const bodyData = JSON.stringify({
        chat_id: groupId,
        text: text || '',
        parse_mode: 'HTML'
      });
      await new Promise((resolve) => {
        const options = {
          hostname: 'api.telegram.org',
          path: `/bot${BOT_TOKEN}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyData) }
        };
        const req = require('https').request(options, (res) => {
          let d = '';
          res.on('data', chunk => d += chunk);
          res.on('end', () => { console.log('Group promo:', d); resolve(); });
        });
        req.on('error', (e) => { console.error('Group promo error:', e.message); resolve(); });
        req.write(bodyData);
        req.end();
      });
      console.log(`✅ Promotion sent to group: ${groupId}`);

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
          const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': body.length
            }
          };
          const req = require('https').request(options, (r) => {
            let d = '';
            r.on('data', chunk => d += chunk);
            r.on('end', () => { console.log('✅ Buffer broadcast:', d); resolve(); });
          });
          req.on('error', (e) => { console.error('❌ error:', e.message); resolve(); });
          req.write(body);
          req.end();
        });

      } else if (photoUrl) {
        const boundary = '----FormBoundary' + Date.now();
        const body = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\n${text || ''}\r\n`),
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo_url"\r\n\r\n${photoUrl}\r\n`),
          Buffer.from(`--${boundary}--\r\n`)
        ]);
        await new Promise((resolve) => {
          const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': body.length
            }
          };
          const req = require('https').request(options, (r) => {
            let d = '';
            r.on('data', chunk => d += chunk);
            r.on('end', () => { console.log('✅ URL broadcast:', d); resolve(); });
          });
          req.on('error', (e) => { console.error('❌ error:', e.message); resolve(); });
          req.write(body);
          req.end();
        });

      } else {
        const postData = JSON.stringify({ text: text || '' });
        await new Promise((resolve) => {
          const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          };
          const req = require('https').request(options, (r) => {
            let d = '';
            r.on('data', chunk => d += chunk);
            r.on('end', () => {
              try {
                const result = JSON.parse(d);
                console.log('✅ Text broadcast:', result.msg);
              } catch(e) {
                console.log('Broadcast response:', d);
              }
              resolve();
            });
          });
          req.on('error', (e) => { console.error('❌ error:', e.message); resolve(); });
          req.write(postData);
          req.end();
        });
      }
    }
  } catch(e) {
    console.error('❌ broadcastPromotion error:', e.message);
  }
}

async function scheduleNextRound() {
  if (!autoModeOn) return;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastReset = await getState('analytics/lastResetDate');

    if (lastReset !== todayStr) {
      await setState('analytics/dailyRound', 0);
      await setState('analytics/dailyProfit', 0);
      await setState('analytics/lastResetDate', todayStr);
      roundNumber = 1;
      await setState('autoMode/round', roundNumber);
      console.log('🔄 Daily Reset:', todayStr);
    }

    roundNumber++;
    await setState('autoMode/round', roundNumber);
    await setState('game/calledNumbers', []);
    await setState('game/status', { started: false });
    await setState('game/winners', null);

    setTimeout(async () => {
      await setState('game/pendingWinner', null);
      await setState('game/announcement', null);
    }, 10000);

    await setState('game/paid', false);
    await setState('game/confirmedNumbers', {});
    await setState('game/prize', 0);
    await setState('game/total', 0);
    calledNumbers = [];

    await pool.query('DELETE FROM users WHERE is_bot = true');

    await setState('autoMode/phase', 'countdown');
    setTimeout(async () => { if (autoModeOn) await startAutoCountdown(); }, 3000);
  } catch(e) {
    console.error('❌ scheduleNextRound error:', e.message);
    setTimeout(() => { if (autoModeOn) startAutoCountdown(); }, 15000);
  }
}

setTimeout(async () => {
  try {
    const autoOn = await getState('autoMode/on');
    if (autoOn === true) {
      console.log('🔄 Restoring auto mode after restart...');
      autoModeOn = true;
      autoCdMinutes = (await getState('autoMode/cdMinutes')) || 3;
      roundNumber = (await getState('autoMode/round')) || 1;
      const gameStatus = await getState('game/status');
      if (gameStatus?.started) {
        await scheduleNextRound();
      } else {
        await startAutoCountdown();
      }
    }
  } catch(e) {
    console.error('❌ Restore error:', e.message);
  }
}, 3000);
