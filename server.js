const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const https = require('https');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://house-rent-app-3674a-default-rtdb.firebaseio.com/"
});
const db = admin.database();

app.use(cors());
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
            // suffix አስወግድ: "B1_lecny2" → "B1"
            const key = publicId.replace(/[_-][a-z0-9]+$/i, '');
            soundsMap[key] = r.secure_url;
          });
          console.log(`✅ Loaded ${Object.keys(soundsMap).length} sounds from Cloudinary`);
        } catch(e) {
          console.error('❌ Cloudinary parse error:', e.message);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('❌ Cloudinary load error:', e.message);
      resolve();
    });

    req.end();
  });
}

// Client sounds map endpoint
app.get('/sounds-map', (req, res) => {
  res.json(soundsMap);
});

// Startup ላይ sounds load አድርግ
loadCloudinarySounds();

// ══ CONFIRM CARD ══
app.post('/confirm-card', async (req, res) => {
  const { userId, cardId } = req.body;
  if (!userId || !cardId) return res.json({ ok: false, msg: 'Missing data' });
  try {
    const betSnap = await db.ref('game/bet').get();
    const bet = betSnap.val() || 0;
    const balSnap = await db.ref('users/' + userId + '/balance').get();
    const bal = balSnap.val() || 0;
    if (bal < bet) return res.json({ ok: false, msg: '❌ Balance አንስተኛ ነው!' });
    const statusSnap = await db.ref('game/status').get();
    if (statusSnap.val()?.started) return res.json({ ok: false, msg: '❌ Game ጀምሯል!' });
    const confSnap = await db.ref('game/confirmedNumbers').get();
    const data = confSnap.val() || {};
    const myCards = Object.values(data).filter(v => String(v) === String(userId));
    if (myCards.length >= 5) return res.json({ ok: false, msg: '❌ Max 5 cards!' });
    const cardRef = db.ref('game/confirmedNumbers/' + cardId);
    const result = await cardRef.transaction(current => {
      if (current !== null && current !== undefined) return;
      return userId;
    });
    if (!result.committed) return res.json({ ok: false, msg: '❌ Card ተይዟል!' });
    await db.ref('users/' + userId + '/balance').set(bal - bet);
    const newConf = await db.ref('game/confirmedNumbers').get();
    const total = Object.keys(newConf.val() || {}).length;
    const pctSnap = await db.ref('game/percent').get();
    const pct = (pctSnap.val() || 80) / 100;
    await db.ref('game/prize').set(Math.floor(bet * total * pct));
    await db.ref('game/total').set(bet * total);
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

// ══ HELPERS ══
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
  let B = getNums(1, 15, seed + 1), I = getNums(16, 30, seed + 2),
    N = getNums(31, 45, seed + 3), G = getNums(46, 60, seed + 4),
    O = getNums(61, 75, seed + 5);
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

function clearAllTimers() {
  clearInterval(callTimer); callTimer = null;
  clearInterval(countdownTimer); countdownTimer = null;
  clearInterval(announceTimer); announceTimer = null;
}

// ══ AUTO MODE LISTENER ══
db.ref('autoMode/on').on('value', async snap => {
  const val = snap.val();
  if (val === true && !autoModeOn) {
    autoModeOn = true;
    console.log('✅ Auto Mode ON');
    const cdSnap = await db.ref('autoMode/cdMinutes').get();
    autoCdMinutes = cdSnap.val() || 3;
    const rSnap = await db.ref('autoMode/round').get();
    roundNumber = rSnap.val() || 1;
    startAutoCountdown();
  } else if (val === false && autoModeOn) {
    autoModeOn = false;
    clearAllTimers();
    await db.ref('autoMode/phase').set('idle');
    console.log('⏹ Auto Mode OFF');
  }
});

// ══ COUNTDOWN ══
async function startAutoCountdown() {
  if (!autoModeOn) return;
  clearAllTimers();
  const secs = autoCdMinutes * 60;
  const startAt = Date.now() + secs * 1000;
  await db.ref('game/countdown').set({ active: true, startAt, mins: autoCdMinutes, autoStart: true });
  await db.ref('autoMode/phase').set('countdown');
  console.log(`⏱ Countdown: ${autoCdMinutes} min`);
  let remain = secs;
  countdownTimer = setInterval(async () => {
    if (!autoModeOn) { clearInterval(countdownTimer); return; }
    remain--;
    if (remain <= 0) { clearInterval(countdownTimer); await startAutoGame(); }
  }, 1000);
}

// ══ START GAME ══
async function startAutoGame() {
  if (!autoModeOn) return;
  try {
    calledNumbers = [];
    await db.ref('game/countdown').set({ active: false });
    await db.ref('game/status').set({ started: true, autoStarted: true });
    await db.ref('game/calledNumbers').remove();
    await db.ref('game/winners').remove();
    await db.ref('game/pendingWinner').remove();
    await db.ref('game/announcement').remove();
    await db.ref('game/paid').set(false);
    await db.ref('autoMode/phase').set('playing');
    console.log('🎮 Game Started!');
    const speedSnap = await db.ref('autoMode/callSpeed').get();
    const callSpeed = speedSnap.val() || 6000;
    autoCallNumber(callSpeed);
  } catch (e) {
    console.error('❌ startAutoGame error:', e.message);
    await db.ref('autoMode/phase').set('error');
    setTimeout(() => { if (autoModeOn) startAutoCountdown(); }, 10000);
  }
}

async function autoCallNumber(speed) {
  if (!autoModeOn) return;
  clearInterval(callTimer);

  const confSnap = await db.ref('game/confirmedNumbers').get();
  const allCards = confSnap.val() || {};

  const cardInfoMap = {};
  const realCards = [];
  const botCards = [];

  for (let cardId in allCards) {
    const uid = allCards[cardId];
    const isBotSnap = await db.ref('users/' + uid + '/is_bot').get();
    const isBot = isBotSnap.val() === true;
    const displaySnap = await db.ref('users/' + uid + '/display').get();
    const name = displaySnap.val() || String(uid);
    const entry = { user: uid, displayName: name, cardId, isBot };
    cardInfoMap[cardId] = entry;
    if (isBot) botCards.push(entry);
    else realCards.push(entry);
  }

  const botPctSnap = await db.ref('autoMode/botWinPercent').get();
  const botWinPercent = Math.min(100, Math.max(0, botPctSnap.val() ?? 50));
  const roll = Math.floor(Math.random() * 100) + 1;

  let targetCard = null;

  if (roll <= botWinPercent) {
    if (botCards.length > 0) {
      targetCard = botCards[Math.floor(Math.random() * botCards.length)];
    } else {
      targetCard = realCards.length > 0 ? realCards[Math.floor(Math.random() * realCards.length)] : null;
    }
  } else {
    if (realCards.length > 0) {
      targetCard = realCards[Math.floor(Math.random() * realCards.length)];
    } else {
      targetCard = botCards.length > 0 ? botCards[Math.floor(Math.random() * botCards.length)] : null;
    }
  }

  if (!targetCard) {
    console.log('⚠️ No cards found — ending game');
    await scheduleNextRound();
    return;
  }

  const targetBoard = generateBoard(Number(targetCard.cardId));
  const neededNums = targetBoard.filter(n => n !== 'FREE');

  const allBoards = {};
  for (let cardId in cardInfoMap) {
    allBoards[cardId] = generateBoard(Number(cardId));
  }

  callTimer = setInterval(async () => {
    try {
      if (!autoModeOn) { clearInterval(callTimer); return; }

      const pendSnap = await db.ref('game/pendingWinner').get();
      if (pendSnap.val() && !pendSnap.val().announced) {
        clearInterval(callTimer);
        startAutoAnnounce();
        return;
      }

      const used = new Set(calledNumbers);
      const remaining = [...Array(75)].map((_, i) => i + 1).filter(n => !used.has(n));

      if (!remaining.length) {
        clearInterval(callTimer);
        console.log('⚠️ All 75 called — refunding...');
        const betSnap = await db.ref('game/bet').get();
        const bet = betSnap.val() || 0;
        for (let cardId in allCards) {
          const uid = allCards[cardId];
          const isBotSnap = await db.ref('users/' + uid + '/is_bot').get();
          if (isBotSnap.val() === true) continue;
          const uRef = db.ref('users/' + uid + '/balance');
          const s = await uRef.get();
          await uRef.set((s.val() || 0) + bet);
          await db.ref('notifications/' + uid).set({
            message: `⚠️ Game ሳይጠናቀቅ ተዘጋ — ${bet} ብር ተመለሰ!`,
            time: Date.now(), read: false
          });
        }
        await db.ref('game/announcement').set({
          type: 'no_winner', message: 'ምንም አሸናፊ አልተገኘም — ብር ተመለሰ', time: Date.now()
        });
        await scheduleNextRound();
        return;
      }

      const neededRemaining = remaining.filter(n => neededNums.includes(n) && !calledNumbers.includes(n));

      let n;
      if (neededRemaining.length > 0 && Math.random() < 0.65) {
        n = neededRemaining[Math.floor(Math.random() * neededRemaining.length)];
      } else {
        n = remaining[Math.floor(Math.random() * remaining.length)];
      }

      calledNumbers.push(n);
      await db.ref('game/calledNumbers').push(n);
      console.log(`📢 ${getLetter(n)}${n}`);

      const totalSnap = await db.ref('game/total').get();
      const pctSnap = await db.ref('game/percent').get();
      const prize = Math.floor((totalSnap.val() || 0) * ((pctSnap.val() || 80) / 100));
      await db.ref('game/prize').set(prize);

      const winners = [];
      for (let cardId in allBoards) {
        const board = allBoards[cardId];
        if (checkWin(board, calledNumbers)) {
          const info = cardInfoMap[cardId];
          winners.push({ ...info, time: Date.now() });
          console.log(`🏆 Winner: Card#${cardId}`);
        }
      }

      if (winners.length > 0) {
        clearInterval(callTimer);
        console.log(`🎉 ${winners.length} winner(s) found! Prize: ${prize}`);
        await db.ref('game/pendingWinner').set({
          winners,
          prize,
          announced: false,
          time: Date.now()
        });
        startAutoAnnounce();
      }

    } catch (e) {
      console.error('❌ callNumber error:', e.message);
    }
  }, speed);
}

// ══ ANNOUNCE ══
async function startAutoAnnounce() {
  if (!autoModeOn) return;
  clearAllTimers();
  await db.ref('autoMode/phase').set('announcing');
  let count = 5;
  announceTimer = setInterval(async () => {
    count--;
    if (count <= 0) {
      clearInterval(announceTimer);
      await announceWinner();
      await scheduleNextRound();
    }
  }, 1000);
}

// ══ ANNOUNCE WINNER ══
async function announceWinner() {
  try {
    const pendSnap = await db.ref('game/pendingWinner').get();
    const data = pendSnap.val();
    if (!data) return;

    const winners = data.winners;
    const prize = data.prize || 0;
    const share = Math.floor(prize / winners.length);
    let botWinShare = 0;

    for (let w of winners) {
      if (w.isBot) {
        botWinShare += share;
        console.log(`🤖 Bot won ${share} ብር — profit kept`);
        continue;
      }
      const uRef = db.ref('users/' + w.user + '/balance');
      const s = await uRef.get();
      await uRef.set((s.val() || 0) + share);
      await db.ref('notifications/' + w.user).set({
        message: `🎉 አሸነፍክ! ${share} ብር balance ላይ ታከለ! Card #${w.cardId}`,
        time: Date.now(), read: false
      });
      const profSnap = await db.ref('analytics/totalProfit').get();
      await db.ref('analytics/totalProfit').set(Math.max(0, (profSnap.val() || 0) - share));
    }

    if (botWinShare > 0) {
      const profSnap = await db.ref('analytics/totalProfit').get();
      await db.ref('analytics/totalProfit').set((profSnap.val() || 0) + botWinShare);
      const bpSnap = await db.ref('analytics/botWinProfit').get();
      await db.ref('analytics/botWinProfit').set((bpSnap.val() || 0) + botWinShare);
    }

    const winnersObj = {};
    winners.forEach((w, i) => { winnersObj[i] = { ...w, prize: share }; });
    await db.ref('game/winners').set(winnersObj);

    for (const w of winners) {
      await db.ref('allWinners').push({
        user: w.user, displayName: w.displayName,
        cardId: w.cardId, prize: share,
        isBot: w.isBot || false, time: Date.now()
      });
    }

    await db.ref('game/announcement').set({ type: 'winner', winners, prize, share, time: Date.now() });
    await db.ref('game/paid').set(true);
    await db.ref('game/pendingWinner/announced').set(true);
    await db.ref('game/status').set({ started: false, waitingRestart: true });

    const confSnap = await db.ref('game/confirmedNumbers').get();
    const playerCount = new Set(Object.values(confSnap.val() || {})).size;
    const totalSnap = await db.ref('game/total').get();
    const anCollSnap = await db.ref('analytics/totalCollected').get();
    const anPaidSnap = await db.ref('analytics/totalPaidOut').get();
    await db.ref('analytics/totalCollected').set((anCollSnap.val() || 0) + (totalSnap.val() || 0));
    await db.ref('analytics/totalPaidOut').set((anPaidSnap.val() || 0) + prize);
    const prevAvg = (await db.ref('analytics/avgPlayers').get()).val() || 0;
    await db.ref('analytics/avgPlayers').set(((prevAvg * (roundNumber - 1)) + playerCount) / roundNumber);
    const dailyProfitSnap = await db.ref('analytics/dailyProfit').get();
    await db.ref('analytics/dailyProfit').set((dailyProfitSnap.val() || 0) + botWinShare);
    await db.ref('analytics/dailyRound').set(roundNumber);

    console.log(`✅ Paid! Share: ${share} ብር to ${winners.length} winner(s)`);
  } catch (e) {
    console.error('❌ announceWinner error:', e.message);
  }
}

// ══ NEXT ROUND ══
async function scheduleNextRound() {
  if (!autoModeOn) return;
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastResetSnap = await db.ref('analytics/lastResetDate').get();
    const lastReset = lastResetSnap.val();

    if (lastReset !== todayStr) {
      const prevRoundSnap = await db.ref('analytics/dailyRound').get();
      const prevProfitSnap = await db.ref('analytics/dailyProfit').get();
      const prevRound = prevRoundSnap.val() || 0;
      const prevProfit = prevProfitSnap.val() || 0;
      if (prevRound > 0 && lastReset) {
        await db.ref('analytics/history/' + lastReset).set({
          date: lastReset, rounds: prevRound, profit: prevProfit
        });
      }
      await db.ref('analytics/dailyRound').set(0);
      await db.ref('analytics/dailyProfit').set(0);
      await db.ref('analytics/lastResetDate').set(todayStr);
      roundNumber = 1;
      await db.ref('autoMode/round').set(roundNumber);
      console.log('🔄 Daily Reset:', todayStr);

      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const histSnap = await db.ref('analytics/history').get();
      const histData = histSnap.val() || {};
      for (let date in histData) {
        if (date < fiveDaysAgo) await db.ref('analytics/history/' + date).remove();
      }
      const fiveDaysAgoMs = Date.now() - 5 * 24 * 60 * 60 * 1000;
      const awSnap = await db.ref('allWinners').get();
      const awData = awSnap.val() || {};
      for (let key in awData) {
        if ((awData[key].time || 0) < fiveDaysAgoMs) await db.ref('allWinners/' + key).remove();
      }
    }

    await db.ref('autoMode/round').set(roundNumber);
    roundNumber++;
    await db.ref('autoMode/round').set(roundNumber);
    console.log(`🔄 Round ${roundNumber}`);

    await db.ref('game/calledNumbers').remove();
    await db.ref('game/status').set({ started: false });
    await db.ref('game/pendingWinner').remove();
    await db.ref('game/winners').set(null);
    await db.ref('game/announcement').remove();
    await db.ref('game/paid').set(false);
    await db.ref('game/confirmedNumbers').remove();
    await db.ref('game/prize').set(0);
    await db.ref('game/total').set(0);
    calledNumbers = [];

    const usersSnap = await db.ref('users').get();
    const usersData = usersSnap.val() || {};
    for (let uid in usersData) {
      if (usersData[uid] && usersData[uid].is_bot) await db.ref('users/' + uid).remove();
    }

    await db.ref('autoMode/phase').set('countdown');
    setTimeout(async () => { if (!autoModeOn) return; await startAutoCountdown(); }, 3000);

  } catch (e) {
    console.error('❌ scheduleNextRound error:', e.message);
    setTimeout(() => { if (autoModeOn) startAutoCountdown(); }, 15000);
  }
}
