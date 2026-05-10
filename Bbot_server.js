const admin = require('firebase-admin');

// ══ FIREBASE ADMIN CONFIG ══
if(!admin.apps.length){
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://house-rent-app-3674a-default-rtdb.firebaseio.com/"
  });
}
const db = admin.database();

function ref(db, path){ return db.ref(path); }
async function set(refObj, val){ return refObj.set(val); }
async function get(refObj){ 
  const snap = await refObj.once('value');
  return { val: () => snap.val() };
}
async function update(refObj, val){ return refObj.update(val); }
function onValue(refObj, cb){
  refObj.on('value', snap => cb({ val: () => snap.val() }));
}

// ══ NAME SYSTEM (300 TOTAL) ══
const ethNames = [
  "Abebe","Kebede","Tadesse","Girma","Haile","Bekele","Tesfaye","Alemu","Demeke","Mulugeta",
  "Dawit","Yonas","Eyob","Nahom","Elias","Henok","Binyam","Samson","Yohannes","Amanuel",
  "Bereket","Fitsum","Ermias","Haben","Tekle","Meles","Yirgalem","Wondwossen","Abiy","Getnet",
  "Tomas","Ayele","Asefa","Sisay","Fekadu","Desalegn","Tilahun","Getachew","Tamiru","Negash",
  "Asfaw","Worku","Mekonnen","Seyoum","Zeleke","Andargachew","Mengistu","Kifle","Habtamu","Kefyalew",
  "Mehari","Temesgen","Mekonen","Gebremichael","Tesfamichael","Weldemichael","Hailegebriel","Girmay","Hagos","Berhane",
  "Kibrom","Mekdes","Tsehay","Yodit","Hiwot","Tigist","Meron","Selamawit","Bethel","Rahel",
  "Selam","Hanna","Firehiwot","Lidya","Rediet","Nardos","Sosina","Aster","Eden","Sara",
  "Liya","Beti","Feven","Tsion","Misgana","Yeshi","Almaz","Azeb","Nigist","Zinash",
  "Kalid","Hussein","Abdi","Omar","Suleiman","Jemal","Hamid","Yusuf","Ahmed","Mustafa",
  "Abdulaziz","Nasir","Idris","Bilal","Anwar","Jamal","Kadir","Aman","Bashir","Farid",
  "Lemi","Daba","Geda","Chala","Feyisa","Diriba","Gemechu","Tolosa","Negasa","Regasa",
  "Bikila","Dereje","Wubie","Shimelis","Mulatu","Gashaw","Belayneh","Tsegaye","Adane","Amare",
  "Natnael","Robel","Kaleab","Yabsra","Kidus","Abel","Mikael","Raphael","Gabriel","Daniel",
  "Leul","Andom","Teame","Goitom","Abreham","Biniam","Berhe","Tesfamariam","Woldu","Adhanom",
  "Sindu","Netsanet","Meklit","Melkam","Abebech","Worknesh","Meseret","Mahlet","Bezawit","Kokeb",
  "Tsega","Hiwot","Genet","Emebet","Tadelech","Woinshet","Yenealem","Birhan","Saba","Roza",
  "Miriam","Lulit","Bruck","Sirak","Yordanos","Kidan","Semhar","Freweini","Senait","Miruts",
  "Tesfay","Gebru","Hadush","Aregawi","Guesh","Tewolde","Abraha","Neguse","Zewdu","Tadele",
  "Muluneh","Aklilu","Fantahun","Endale","Belay","Meaza","Tigabu","Yalew","Zemen","Kebrom"
];

const amNames = [
  "አበበ","ከበደ","ሰላም","ሚካኤል","ማርታ","ሄለን","ዮናስ","ሶፊያ","ናርዶስ","ሃና",
  "ልዩ","አስቴር","ቤቴል","ሜሮን","ሰብለ","ፍቅር","ሩት","ሃይማኖት","ዘካሪያስ","ታደሰ",
  "ብርሃኔ","ሙሉወርቅ","ትዕግስት","አዳነ","ፍሬህይወት","ሃይሌ","ቃልኪዳን","ፀሃይ","ዮርዳኖስ","ቅድስት",
  "ናትናኤል","ዘሪቱ","ስምረት","ምህረት","ሃብቴ","ፍሬሰብ","ዓለምሰገድ","ክብሮም","ሃይለሚካኤል","ጸጋዬ",
  "ሙሉቀን","ወርቅነሽ","አሸናፊ","ዮሴፍ","ሃይካል","ቢኒያም","ሰሎሞን","ዮሐንስ","ጌታቸው","ያሬድ"
];

const tgNames = [
  "king.abel","ethio.star","bingo.master","lucky777","fastwin",
  "darkpro","alphauser","betagamer","proplay","luckyeth",
  "ethboss","tgking","nightwolf","fireplay","topwinner",
  "bingoeth","flashboy","cryptowin","megapro","soloking",
  "ghostplay","silentwolf","fasteth","darkangel","starpro",
  "winfast","ethlion","addisguy","megawin","topeth",
  "luckystar","hyenapro","nightpro","ethchamp","bingostar",
  "cashking","rapidwin","darkstar","speedpro","ethwinner",
  "thunderboy","stormpro","eaglewin","flashpro","lioneth",
  "wolfking","ninjapro","shadowwin","turboeth","blazepro"
];

function getRandomName(){
  const r = Math.random();
  if(r < 0.67) return ethNames[Math.floor(Math.random()*ethNames.length)];
  else if(r < 0.84) return amNames[Math.floor(Math.random()*amNames.length)];
  else return tgNames[Math.floor(Math.random()*tgNames.length)];
}

// ══ STATE ══
let smartBotEnabled = false;
let botEngineRunning = false;
let botEngineTimer = null;
let lastBotAddedTime = 0;
let currentCdMinutes = 3;
let countdownStartAt = null;
let realPlayerEntryTimes = [];

// ══ FEATURE 5: BOT POOL (Recycling) ══
// Firebase ውስጥ bot pool ይጠብቃል - አዲስ IDs አይፈጠርም
const BOT_POOL_SIZE = 300;
let botPool = []; // { id, name } array
let botPoolLoaded = false;

async function loadOrCreateBotPool() {
  const snap = await get(ref(db, 'botPool'));
  const existing = snap.val();
  if (existing && Object.keys(existing).length >= BOT_POOL_SIZE) {
    botPool = Object.values(existing);
    botPoolLoaded = true;
    log(`Bot pool loaded: ${botPool.length} bots`);
    return;
  }
  // Pool አልተፈጠረም → አዲስ እንፍጠር
  log('Creating new bot pool...');
  const usedNames = new Set();
  const pool = {};
  for (let i = 0; i < BOT_POOL_SIZE; i++) {
    let name;
    do { name = getRandomName(); } while (usedNames.has(name));
    usedNames.add(name);
    const id = String(7000000000 + i);
    pool[id] = { id, name };
    await set(ref(db, `users/${id}/display`), name);
    await set(ref(db, `users/${id}/is_bot`), true);
    await set(ref(db, `users/${id}/balance`), 0);
  }
  await set(ref(db, 'botPool'), pool);
  botPool = Object.values(pool);
  botPoolLoaded = true;
  log(`Bot pool created: ${botPool.length} bots`);
}

function getRandomBotFromPool() {
  if (!botPool.length) return null;
  return botPool[Math.floor(Math.random() * botPool.length)];
}

// ══ FEATURE 2: HISTORY LEARNING ══
// ከቀዳሚ games ተምሮ real player projection ያሻሽላል
let gameHistory = []; // [{ bet, cdMinutes, realCount, hour }]

async function loadGameHistory() {
  const snap = await get(ref(db, 'smartBot/history'));
  const data = snap.val();
  if (data) {
    gameHistory = Object.values(data).slice(-50); // last 50 games
    log(`History loaded: ${gameHistory.length} games`);
  }
}

async function saveGameResult(bet, cdMinutes, realCount) {
  const hour = getEthiopianHour();
  const entry = { bet, cdMinutes, realCount, hour, time: Date.now() };
  gameHistory.push(entry);
  if (gameHistory.length > 50) gameHistory.shift();
  const key = Date.now();
  await set(ref(db, `smartBot/history/${key}`), entry);
}

// ══ FEATURE 4: BET-BASED INTELLIGENCE ══
// Bet amount ተመልክቶ expected real players ይተነብያል
function getExpectedRealFromHistory(bet, cdMinutes, currentHour) {
  if (!gameHistory.length) return null;

  // ተመሳሳይ bet + ሰዓት ያላቸው games ይፈልጋል
  const similar = gameHistory.filter(g =>
    Math.abs(g.bet - bet) <= bet * 0.3 && // ±30% bet range
    Math.abs(g.hour - currentHour) <= 1    // ±1 ሰዓት
  );

  if (similar.length < 3) return null; // ብዙ data ከሌለ አይጠቀምም

  const avg = similar.reduce((sum, g) => sum + g.realCount, 0) / similar.length;
  log(`History prediction: ${Math.round(avg)} real players expected (from ${similar.length} similar games)`);
  return Math.round(avg);
}

// ══ TIME SYSTEM (Ethiopian Time) ══
// Ethiopian time = GMT+3, offset by 6 hours from Gregorian
// Ethiopian hour 12:00 night = GMT+3 6:00am

function getEthiopianHour() {
  const now = new Date();
  // GMT+3
  const gmt3Hours = now.getUTCHours() + 3;
  const gmt3Minutes = now.getUTCMinutes();
  // Ethiopian time = GMT+3 - 6 hours
  let ethHours = gmt3Hours - 6;
  if (ethHours < 0) ethHours += 24;
  return ethHours + gmt3Minutes / 60; // decimal hours e.g. 4.5 = 4:30
}

function getGMT3DecimalHour() {
  const now = new Date();
  const h = now.getUTCHours() + 3;
  const m = now.getUTCMinutes();
  return (h % 24) + m / 60;
}

// ══ FEATURE 1: TIME-OF-DAY SPEED MULTIPLIER ══
// Ethiopian time based
// ጠዋት 12:00 - 4:50 → slow እያጠነሰ (multiplier ↓)
// ቀን 4:50 - 10:45 → max speed (multiplier = 1.0)
// ማታ 10:45 - 12:30 → slow እየሄደ (multiplier ↑)
// 12:30+ → dead (bot አይግባ)

function getTimeMultiplier() {
  const ethHour = getEthiopianHour(); // 0-23 decimal

  // Ethiopian clock:
  // 12:00 midnight eth = 0.0
  // 4:50 morning eth  = 4.833
  // 10:45 day eth     = 10.75
  // 12:30 night eth   = 12.5

  // ☠️ DEAD ZONE: 12:30 ማታ → 12:00 ሌሊት (12.5 to 24/0)
  if (ethHour >= 12.5 || ethHour < 0) {
    return null; // dead - bot አይግባ
  }

  // 🌙 SLOW MORNING: 12:00 ሌሊት → 4:50 ጥዋት (0 to 4.833)
  // multiplier: 3.0 (12:00) → 1.0 (4:50) - linearly decreasing
  if (ethHour < 4.833) {
    const progress = ethHour / 4.833; // 0 to 1
    const multiplier = 3.0 - (progress * 2.0); // 3.0 → 1.0
    return multiplier;
  }

  // 🚀 PEAK ZONE: 4:50 ጥዋት → 10:45 ቀን (4.833 to 10.75)
  if (ethHour >= 4.833 && ethHour < 10.75) {
    return 1.0; // max speed - code ሳይቀይር
  }

  // 🌆 SLOW EVENING: 10:45 ቀን → 12:30 ማታ (10.75 to 12.5)
  // multiplier: 1.0 (10:45) → 4.0 (12:30) - linearly increasing
  if (ethHour >= 10.75 && ethHour < 12.5) {
    const progress = (ethHour - 10.75) / (12.5 - 10.75); // 0 to 1
    const multiplier = 1.0 + (progress * 3.0); // 1.0 → 4.0
    return multiplier;
  }

  return 1.0; // fallback
}

function log(msg) {
  const now = new Date().toLocaleTimeString('en-ET');
  console.log(`[${now}] 🤖 ${msg}`);
}

function logEthTime() {
  const ethHour = getEthiopianHour();
  const h = Math.floor(ethHour);
  const m = Math.floor((ethHour - h) * 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ETH`;
}

// ══ LISTEN: smartBot/enabled ══
onValue(ref(db, 'smartBot/enabled'), async (snap) => {
  const val = snap.val();
  if (val === true && !smartBotEnabled) {
    smartBotEnabled = true;
    log('Smart Bot ENABLED by admin');
    if (!botPoolLoaded) await loadOrCreateBotPool();
    await loadGameHistory();
    startBotEngine();
  } else if (val === false && smartBotEnabled) {
    smartBotEnabled = false;
    log('Smart Bot DISABLED by admin');
    stopBotEngine();
  }
});

// ══ LISTEN: game/countdown ══
let lastGameRealCount = 0;
onValue(ref(db, 'game/countdown'), (snap) => {
  const val = snap.val();
  if (val && val.active && val.startAt) {
    // New countdown started
    if (!countdownStartAt || countdownStartAt !== val.startAt) {
      // Save previous game result
      if (countdownStartAt && lastGameRealCount > 0) {
        saveGameResult(
          lastBet || 0,
          currentCdMinutes,
          lastGameRealCount
        );
      }
      lastGameRealCount = 0;
    }
    countdownStartAt = val.startAt;
    currentCdMinutes = val.cdMinutes || val.mins || 3;
    realPlayerEntryTimes = [];
    log(`Countdown detected: ${currentCdMinutes} min | ${logEthTime()}`);
    if (smartBotEnabled && !botEngineRunning) {
      startBotEngine();
    }
  } else {
    countdownStartAt = null;
    log('Countdown ended or not active');
  }
});

// ══ LISTEN: real player joins ══
let prevRealCount = 0;
let lastBet = 0;
onValue(ref(db, 'game/confirmedNumbers'), async (snap) => {
  const data = snap.val() || {};
  const usersSnap = await get(ref(db, 'users'));
  const usersData = usersSnap.val() || {};
  const botIds = new Set(
    Object.keys(usersData).filter(uid => usersData[uid]?.is_bot === true)
  );

  let realCount = 0;
  Object.values(data).forEach(uid => {
    if (!botIds.has(String(uid))) realCount++;
  });

  if (realCount > prevRealCount) {
    const newJoins = realCount - prevRealCount;
    for (let i = 0; i < newJoins; i++) {
      realPlayerEntryTimes.push(Date.now());
    }
    log(`Real player joined! Total real: ${realCount}`);
  }
  prevRealCount = realCount;
  lastGameRealCount = realCount;
});

// ══ BOT ENGINE ══
function startBotEngine() {
  if (botEngineRunning) return;
  botEngineRunning = true;
  lastBotAddedTime = 0;
  log('Bot engine started');
  botEngineTimer = setInterval(botEngineTick, 1000);
}

function stopBotEngine() {
  if (botEngineTimer) {
    clearInterval(botEngineTimer);
    botEngineTimer = null;
  }
  botEngineRunning = false;
  log('Bot engine stopped');
}

// ══ FEATURE 3: BURST & PAUSE PATTERN ══
let burstMode = false;
let burstCount = 0;
let pauseUntil = 0;

function shouldApplyBurstPause(now, gapMs) {
  // Dead pause ውስጥ ከሆነ
  if (now < pauseUntil) return { skip: true, gapMs };

  // Burst mode ውስጥ ከሆነ
  if (burstMode) {
    burstCount--;
    if (burstCount <= 0) {
      burstMode = false;
      // Burst ከጨረሰ በኋላ pause (3-8 ሰከንድ)
      pauseUntil = now + (3000 + Math.random() * 5000);
      log('Burst done → pause');
    }
    return { skip: false, gapMs: Math.max(200, gapMs * 0.4) }; // burst = ፈጣን
  }

  // 8% chance → burst ይጀምር
  if (Math.random() < 0.08) {
    burstMode = true;
    burstCount = Math.floor(2 + Math.random() * 3); // 2-4 bots burst
    log(`Burst started: ${burstCount} bots`);
    return { skip: false, gapMs: Math.max(200, gapMs * 0.4) };
  }

  return { skip: false, gapMs };
}

async function botEngineTick() {
  if (!smartBotEnabled) { stopBotEngine(); return; }

  try {
    // ══ FEATURE 1: TIME CHECK ══
    const timeMultiplier = getTimeMultiplier();
    if (timeMultiplier === null) {
      await set(ref(db, 'smartBot/status'), `DEAD_ZONE|${logEthTime()}`);
      return; // ☠️ dead zone - bot አይግባ
    }

    const [confSnap, betSnap, pctSnap, statusSnap, cdSnap, usersSnap] = await Promise.all([
      get(ref(db, 'game/confirmedNumbers')),
      get(ref(db, 'game/bet')),
      get(ref(db, 'game/percent')),
      get(ref(db, 'game/status')),
      get(ref(db, 'game/countdown')),
      get(ref(db, 'users')),
    ]);

    const confData = confSnap.val() || {};
    const bet = betSnap.val() || 0;
    lastBet = bet;
    const pct = (pctSnap.val() || 80) / 100;
    const statusData = statusSnap.val() || {};
    const cdData = cdSnap.val() || {};
    const usersData = usersSnap.val() || {};

    // Game ሲጀምር bot አይገባም
    if (statusData.started) {
      await set(ref(db, 'smartBot/status'), 'GAME_LIVE');
      return;
    }

    // Countdown ከሌለ ይጠብቃል
    if (!cdData.active || !cdData.startAt) {
      await set(ref(db, 'smartBot/status'), 'WAITING');
      return;
    }

    // Count real vs bot
    const botIds = new Set(Object.keys(usersData).filter(uid => usersData[uid]?.is_bot === true));
    let realPlayers = 0;
    const allEntries = Object.values(confData);
    allEntries.forEach(uid => { if (!botIds.has(String(uid))) realPlayers++; });

    const total = allEntries.length;
    const botsNeeded = Math.max(0, 100 - total);

    if (botsNeeded <= 0) {
      await set(ref(db, 'smartBot/status'), 'FULL');
      return;
    }

    // ══ TIMING ══
    const now = Date.now();
    const remainMs = Math.max(0, cdData.startAt - now);
    const remainSecs = remainMs / 1000;
    const totalSecs = (cdData.cdMinutes || cdData.mins || currentCdMinutes) * 60;
    const elapsedSecs = Math.max(1, totalSecs - remainSecs);

    // 5s ይጠብቃል
    if (elapsedSecs < 5) {
      await set(ref(db, 'smartBot/status'), 'WAITING_5S');
      return;
    }

    // ══ FEATURE 2+4: SMART PROJECTION ══
    const realRatePerSec = realPlayers / elapsedSecs;
    
    // History ተጠቅሞ ይተነብያል
    const currentHour = getEthiopianHour();
    const historyPrediction = getExpectedRealFromHistory(bet, currentCdMinutes, currentHour);
    
    // History prediction vs rate-based projection → ትልቁን ይወስዳል
    const ratePrediction = Math.min(100, Math.round(realRatePerSec * totalSecs));
    const projectedRealTotal = historyPrediction
      ? Math.max(ratePrediction, historyPrediction)
      : ratePrediction;

    const projectedBotsNeeded = Math.max(botsNeeded, 100 - projectedRealTotal);

    // FEATURE 4: Bet-based adjustment (fixed thresholds)
    // 30 በታች  → feature አይሰራም (× 1.0)
    // 30 ብር   → Normal  (× 1.0)
    // 40 ብር   → መካከለኛ (× 1.2 ቀስ - real players ሊመጡ ይችላሉ)
    // 50+ ብር  → ብዙ    (× 1.5 ቀስ - real players ይጠብቅ)
    let betMultiplier = 1.0;
    if (bet >= 50) {
      betMultiplier = 1.5; // ብዙ → ቀስ
    } else if (bet >= 40) {
      betMultiplier = 1.2; // መካከለኛ → ትንሽ ቀስ
    } else if (bet >= 30) {
      betMultiplier = 1.0; // Normal → እንደነበረ
    }
    // 30 በታች → betMultiplier = 1.0 (feature አይሰራም)

    const timeWindow = Math.max(1, remainSecs - 5);
    const requiredRate = projectedBotsNeeded / timeWindow;
    let gapMs = 1000 / requiredRate;

    // Phase timing
    const progress = elapsedSecs / totalSecs;
    let slowPhase, fastPhase;
    if (currentCdMinutes <= 1) {
      slowPhase = 0.05; fastPhase = 0.70;
    } else if (currentCdMinutes <= 2) {
      slowPhase = 0.10; fastPhase = 0.75;
    } else {
      slowPhase = 0.20; fastPhase = 0.80;
    }

    if (progress < slowPhase) {
      gapMs = gapMs * 1.5;
    } else if (progress > fastPhase) {
      gapMs = gapMs * 0.6;
    }

    // Random variation ±15%
    const variation = gapMs * 0.15;
    gapMs = gapMs + (Math.random() * variation * 2 - variation);

    // ══ FEATURE 1: APPLY TIME MULTIPLIER ══
    // Peak zone (multiplier=1.0) → ምንም አይቀይርም
    // Morning/Evening → gapMs ትልቅ ያደርጋል (ቀስ)
    gapMs = gapMs * timeMultiplier;

    // ══ FEATURE 4: APPLY BET MULTIPLIER ══
    gapMs = gapMs * betMultiplier;

    // Safety clamps
    gapMs = Math.max(200, Math.min(8000, gapMs));

    // Emergency mode
    if (remainSecs <= 10 && botsNeeded > 0) {
      gapMs = 200;
    }

    // ══ FEATURE 3: BURST & PAUSE ══
    const { skip, gapMs: adjustedGap } = shouldApplyBurstPause(now, gapMs);
    if (skip) {
      await set(ref(db, 'smartBot/status'),
        `PAUSE|${Math.round(remainSecs)}s|ethTime:${logEthTime()}|real:${realPlayers}|botsLeft:${botsNeeded}`
      );
      return;
    }

    await set(ref(db, 'smartBot/status'),
      `ACTIVE|${Math.round(remainSecs)}s|ethTime:${logEthTime()}|real:${realPlayers}|proj:${projectedRealTotal}|botsLeft:${botsNeeded}|gap:${Math.round(adjustedGap)}ms|tMult:${timeMultiplier.toFixed(2)}`
    );

    log(`📊 ${Math.round(remainSecs)}s | ETH:${logEthTime()} | real:${realPlayers} | proj:${projectedRealTotal} | botsLeft:${botsNeeded} | gap:${Math.round(adjustedGap)}ms | tMult:×${timeMultiplier.toFixed(2)}`);

    // Add bot only if enough time has passed
    if (now - lastBotAddedTime >= adjustedGap) {
      await addOneBot(confData, usersData, bet, pct, botsNeeded);
    }

  } catch (err) {
    log(`❌ Engine error: ${err.message}`);
  }
}

// ══ ADD ONE BOT (uses pool) ══
async function addOneBot(confData, usersData, bet, pct, botsNeeded) {
  const taken = new Set(Object.keys(confData).map(Number));
  const avail = [];
  for (let i = 1; i <= 100; i++) {
    if (!taken.has(i)) avail.push(i);
  }
  if (!avail.length) return;

  // 10% chance multi-card (2-3 cards)
  let cardCount = 1;
  if (botsNeeded >= 3 && avail.length >= 3 && Math.random() < 0.10) {
    cardCount = Math.random() < 0.6 ? 2 : 3;
  }

  // ══ FEATURE 5: USE BOT FROM POOL ══
  let botName, fakeBotId;
  if (botPoolLoaded && botPool.length) {
    const poolBot = getRandomBotFromPool();
    fakeBotId = poolBot.id;
    botName = poolBot.name;
  } else {
    // Fallback to old method
    botName = getRandomName();
    fakeBotId = String(7000000000 + Math.floor(Math.random() * 999999999));
    await set(ref(db, `users/${fakeBotId}/display`), botName);
    await set(ref(db, `users/${fakeBotId}/is_bot`), true);
    await set(ref(db, `users/${fakeBotId}/balance`), 0);
  }

  const shuffled = avail.sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, cardCount);

  for (const cardId of selectedCards) {
    await set(ref(db, `game/confirmedNumbers/${cardId}`), fakeBotId);
  }

  const newSnap = await get(ref(db, 'game/confirmedNumbers'));
  const newTotal = Object.keys(newSnap.val() || {}).length;
  if (bet > 0) {
    await set(ref(db, 'game/prize'), Math.floor(bet * newTotal * pct));
    await set(ref(db, 'game/total'), bet * newTotal);
  }

  lastBotAddedTime = Date.now();

  await set(ref(db, 'smartBot/lastAdded'), {
    name: botName,
    cardId: selectedCards.join(','),
    cards: cardCount,
    time: Date.now(),
    remaining: botsNeeded - cardCount,
    ethTime: logEthTime()
  });

  log(`✅ Bot: ${botName} (pool) → Card #${selectedCards.join(',')} | ${botsNeeded - cardCount} remaining`);
}

// ══ STARTUP ══
log('🚀 Smart Bot v2.0 running');
log('Features: Time-of-Day | History Learning | Burst&Pause | Bet Intelligence | Bot Pool');
log('Listening for smartBot/enabled changes...');
