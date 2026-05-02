const admin = require('firebase-admin');
const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(process.env.PORT || 3000);
app.use(express.json());

app.post('/confirm-card', async (req, res) => {
  const { userId, cardId } = req.body;
  if(!userId || !cardId) return res.json({ok:false, msg:'Missing data'});

  try {
    const betSnap = await db.ref('game/bet').get();
    const bet = betSnap.val() || 0;

    const balSnap = await db.ref('users/'+userId+'/balance').get();
    const bal = balSnap.val() || 0;

    if(bal < bet) return res.json({ok:false, msg:'❌ Balance አንስተኛ ነው!'});

    const statusSnap = await db.ref('game/status').get();
    if(statusSnap.val()?.started) return res.json({ok:false, msg:'❌ Game ጀምሯል!'});

    const confSnap = await db.ref('game/confirmedNumbers').get();
    const data = confSnap.val() || {};

    if(data[String(cardId)]) return res.json({ok:false, msg:'❌ Card ተይዟል!'});

    const myCards = Object.values(data).filter(v => String(v) === String(userId));
    if(myCards.length >= 5) return res.json({ok:false, msg:'❌ Max 5 cards!'});

    await db.ref('game/confirmedNumbers/'+cardId).set(userId);
    await db.ref('users/'+userId+'/balance').set(bal - bet);

    const newConf = await db.ref('game/confirmedNumbers').get();
    const total = Object.keys(newConf.val()||{}).length;
    const pctSnap = await db.ref('game/percent').get();
    const pct = (pctSnap.val()||80)/100;
    await db.ref('game/prize').set(Math.floor(bet * total * pct));
    await db.ref('game/total').set(bet * total);

    return res.json({ok:true, msg:'✅ Card confirmed!'});
  } catch(e) {
    return res.json({ok:false, msg:'Error: '+e.message});
  }
});
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://house-rent-app-3674a-default-rtdb.firebaseio.com/"
});
const db = admin.database();

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
  for (let i = 0; i < 5; i++) b.push(B[i],I[i],N[i],G[i],O[i]);
  b[12] = 'FREE';
  return b;
}

function checkWin(board, called) {
  const g = [];
  for (let i = 0; i < 5; i++) g.push(board.slice(i*5, (i+1)*5));
  for (let r = 0; r < 5; r++)
    if (g[r].every(n => n==='FREE' || called.includes(n))) return true;
  for (let c = 0; c < 5; c++)
    if ([0,1,2,3,4].every(r => g[r][c]==='FREE' || called.includes(g[r][c]))) return true;
  if ([0,1,2,3,4].every(i => g[i][i]==='FREE' || called.includes(g[i][i]))) return true;
  if ([0,1,2,3,4].every(i => g[i][4-i]==='FREE' || called.includes(g[i][4-i]))) return true;
  return false;
}

function clearAllTimers() {
  clearInterval(callTimer); callTimer = null;
  clearInterval(countdownTimer); countdownTimer = null;
  clearInterval(announceTimer); announceTimer = null;
}

// AUTO MODE LISTENER
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

async function startAutoGame() {
  if (!autoModeOn) return;
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
}

function autoCallNumber(speed) {
  if (!autoModeOn) return;
  clearInterval(callTimer);
  callTimer = setInterval(async () => {
    if (!autoModeOn) { clearInterval(callTimer); return; }
    const pendSnap = await db.ref('game/pendingWinner').get();
    if (pendSnap.val() && !pendSnap.val().announced) {
      clearInterval(callTimer);
      startAutoAnnounce();
      return;
    }
    const used = new Set(calledNumbers);
    const remaining = [...Array(75)].map((_,i) => i+1).filter(n => !used.has(n));
    if (!remaining.length) {
      clearInterval(callTimer);
      await scheduleNextRound();
      return;
    }
    const n = remaining[Math.floor(Math.random() * remaining.length)];
    calledNumbers.push(n);
    await db.ref('game/calledNumbers').push(n);
    console.log(`📢 ${getLetter(n)}${n}`);
    const totalSnap = await db.ref('game/total').get();
    const pctSnap = await db.ref('game/percent').get();
    const prize = Math.floor((totalSnap.val()||0) * ((pctSnap.val()||80)/100));
    await db.ref('game/prize').set(prize);
    await checkWinners();
  }, speed);
}

async function checkWinners() {
  const paidSnap = await db.ref('game/paid').get();
  if (paidSnap.val()) return;
  const confSnap = await db.ref('game/confirmedNumbers').get();
  const allCards = confSnap.val() || {};
  const winners = [];
  for (let id in allCards) {
    const board = generateBoard(Number(id));
    if (checkWin(board, calledNumbers)) {
      const uid = allCards[id];
      const isBotSnap = await db.ref('users/'+uid+'/is_bot').get();
      const isBot = isBotSnap.val() === true;
      const displaySnap = await db.ref('users/'+uid+'/display').get();
      const name = displaySnap.val() || String(uid);
      winners.push({ user: uid, displayName: name, cardId: id, isBot, time: Date.now() });
    }
  }
  if (winners.length > 0) {
    clearInterval(callTimer);
    const prizeSnap = await db.ref('game/prize').get();
    const prize = prizeSnap.val() || 0;
    await db.ref('game/pendingWinner').set({ winners, prize, announced: false, time: Date.now() });
    console.log(`🏆 Winner found!`);
    startAutoAnnounce();
  }
}

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

async function announceWinner() {
  const pendSnap = await db.ref('game/pendingWinner').get();
  const data = pendSnap.val();
  if (!data) return;
  const winners = data.winners;
  const prize = data.prize || 0;
  const share = Math.floor(prize / winners.length);
  let botWinShare = 0;
  for (let w of winners) {
    if (w.isBot) { botWinShare += share; continue; }
    const uRef = db.ref('users/'+w.user+'/balance');
    const s = await uRef.get();
    await uRef.set((s.val()||0) + share);
    const profSnap = await db.ref('analytics/totalProfit').get();
    await db.ref('analytics/totalProfit').set(Math.max(0,(profSnap.val()||0) - share));
  }
  if (botWinShare > 0) {
    const profSnap = await db.ref('analytics/totalProfit').get();
    await db.ref('analytics/totalProfit').set((profSnap.val()||0) + botWinShare);
    const bpSnap = await db.ref('analytics/botWinProfit').get();
    await db.ref('analytics/botWinProfit').set((bpSnap.val()||0) + botWinShare);
  }
  const winnersObj = {};
  winners.forEach((w,i) => { winnersObj[i] = {...w, prize: share}; });
  await db.ref('game/winners').set(winnersObj);
  await db.ref('game/announcement').set({ type:'winner', winners, prize, share, time: Date.now() });
  await db.ref('game/paid').set(true);
  await db.ref('game/pendingWinner/announced').set(true);
  await db.ref('game/status').set({ started: false, waitingRestart: true });
  const confSnap = await db.ref('game/confirmedNumbers').get();
  const playerCount = new Set(Object.values(confSnap.val()||{})).size;
  const totalSnap = await db.ref('game/total').get();
  const anCollSnap = await db.ref('analytics/totalCollected').get();
  const anPaidSnap = await db.ref('analytics/totalPaidOut').get();
  await db.ref('analytics/totalCollected').set((anCollSnap.val()||0) + (totalSnap.val()||0));
  await db.ref('analytics/totalPaidOut').set((anPaidSnap.val()||0) + prize);
  const prevAvg = (await db.ref('analytics/avgPlayers').get()).val() || 0;
  await db.ref('analytics/avgPlayers').set(((prevAvg*(roundNumber-1)) + playerCount) / roundNumber);
  console.log(`✅ Paid! Share: ${share} ብር`);
}

async function scheduleNextRound() {
  if (!autoModeOn) return;
  roundNumber++;
  console.log(`🔄 Round ${roundNumber}`);
  await db.ref('game/calledNumbers').remove();
  await db.ref('game/status').set({ started: false });
  await db.ref('game/pendingWinner').remove();
  await db.ref('game/winners').remove();
  await db.ref('game/announcement').remove();
  await db.ref('game/paid').set(false);
  await db.ref('game/confirmedNumbers').remove();
  await db.ref('game/prize').set(0);
  await db.ref('game/total').set(0);
  calledNumbers = [];
  const usersSnap = await db.ref('users').get();
  const usersData = usersSnap.val() || {};
  for (let uid in usersData) {
    if (usersData[uid] && usersData[uid].is_bot) {
      await db.ref('users/'+uid).remove();
    }
  }
  await db.ref('autoMode/round').set(roundNumber);
  await db.ref('autoMode/phase').set('countdown');
  setTimeout(async () => {
    if (!autoModeOn) return;
    await startAutoCountdown();
  }, 3000);
      }
