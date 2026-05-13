const { Pool } = require('pg');

// ══ POSTGRESQL CONFIG ══
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ══ DB HELPERS ══
async function getState(key) {
  try {
    const r = await pool.query('SELECT value FROM game_state WHERE key=$1', [key]);
    return r.rows.length ? JSON.parse(r.rows[0].value) : null;
  } catch (e) {
    log(`❌ getState(${key}) error: ${e.message}`);
    return null;
  }
}

async function setState(key, value) {
  try {
    await pool.query(
      'INSERT INTO game_state(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',
      [key, JSON.stringify(value)]
    );
  } catch (e) {
    log(`❌ setState(${key}) error: ${e.message}`);
  }
}

async function getUser(uid) {
  try {
    const r = await pool.query('SELECT * FROM users WHERE uid=$1', [uid]);
    return r.rows.length ? r.rows[0] : null;
  } catch (e) { return null; }
}

async function upsertUser(uid, display, isBot, balance) {
  try {
    await pool.query(
      'INSERT INTO users(uid,display,is_bot,balance) VALUES($1,$2,$3,$4) ON CONFLICT(uid) DO UPDATE SET display=$2,is_bot=$3',
      [uid, display, isBot, balance]
    );
  } catch (e) {
    log(`❌ upsertUser error: ${e.message}`);
  }
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
  "Tsega","Genet","Emebet","Tadelech","Woinshet","Yenealem","Birhan","Saba","Roza",
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

function getRandomName() {
  const r = Math.random();
  if (r < 0.67) return ethNames[Math.floor(Math.random() * ethNames.length)];
  else if (r < 0.84) return amNames[Math.floor(Math.random() * amNames.length)];
  else return tgNames[Math.floor(Math.random() * tgNames.length)];
}

// ══ LOGGING ══
function log(msg) {
  const now = new Date().toLocaleTimeString('en-ET');
  console.log(`[${now}] 🤖 ${msg}`);
}

// ══ STATE ══
let smartBotEnabled = false;
let botEngineRunning = false;
let botEngineTimer = null;
let lastBotAddedTime = 0;
let currentCdMinutes = 3;
let prevRealCount = 0;

// ══ TIME-OF-DAY MULTIPLIER (Ethiopian Time) ══
function getEthiopianHour() {
  const now = new Date();
  let ethHours = (now.getUTCHours() + 3) - 6;
  if (ethHours < 0) ethHours += 24;
  return ethHours + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
}

function getTimeMultiplier() {
  const ethHour = getEthiopianHour();

  // ☠️ DEAD: 6:30 ማታ+ (18.5+)
  if (ethHour >= 18.5) return null;

  // 🌙 MORNING: 12:00 ሌሊት → 4:50 ጥዋት
  if (ethHour < 4.833) {
    const progress = ethHour / 4.833;
    return 4.0 - (progress * 3.0);
  }

  // 🚀 PEAK: 4:50 ጥዋት → 4:45 ማታ
  if (ethHour < 16.75) return 1.0;

  // 🌆 EVENING: 4:45 ማታ → 6:30 ማታ
  const progress = (ethHour - 16.75) / (18.5 - 16.75);
  return 1.0 + (progress * 3.0);
}

// ══ POLL: smartBot/enabled (every 3s) ══
async function pollSmartBotEnabled() {
  try {
    const val = await getState('smartBot/enabled');
    if (val === true && !smartBotEnabled) {
      smartBotEnabled = true;
      log('Smart Bot ENABLED by admin');
      startBotEngine();
    } else if (!val && smartBotEnabled) {
      smartBotEnabled = false;
      log('Smart Bot DISABLED by admin');
      stopBotEngine();
    }
  } catch (e) {
    log(`❌ pollSmartBotEnabled error: ${e.message}`);
  }
}
setInterval(pollSmartBotEnabled, 3000);

// ══ POLL: real player count (every 5s) ══
async function pollRealPlayers() {
  try {
    const confData = (await getState('game/confirmedNumbers')) || {};
    const allUids = Object.values(confData);
    if (!allUids.length) { prevRealCount = 0; return; }

    // Get bot IDs from DB
    const botRes = await pool.query('SELECT uid FROM users WHERE is_bot=true');
    const botIds = new Set(botRes.rows.map(r => String(r.uid)));

    const realCount = allUids.filter(uid => !botIds.has(String(uid))).length;
    if (realCount > prevRealCount) {
      log(`Real player joined! Total real: ${realCount}`);
    }
    prevRealCount = realCount;
  } catch (e) {
    log(`❌ pollRealPlayers error: ${e.message}`);
  }
}
setInterval(pollRealPlayers, 5000);

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

async function botEngineTick() {
  if (!smartBotEnabled) { stopBotEngine(); return; }

  try {
    // ══ TIME CHECK ══
    const timeMultiplier = getTimeMultiplier();
    if (timeMultiplier === null) {
      await setState('smartBot/status', 'DEAD_ZONE');
      return;
    }

    // ══ READ STATE ══
    const [confData, bet, pctRaw, statusData, cdData] = await Promise.all([
      getState('game/confirmedNumbers'),
      getState('game/bet'),
      getState('game/percent'),
      getState('game/status'),
      getState('game/countdown'),
    ]);

    const conf = confData || {};
    const betVal = bet || 0;
    const pct = (pctRaw || 80) / 100;
    const status = statusData || {};
    const cd = cdData || {};

    // Game ሲጀምር bot አይገባም
    if (status.started) {
      await setState('smartBot/status', 'GAME_LIVE');
      return;
    }

    // Countdown ከሌለ ይጠብቃል
    if (!cd.active || !cd.startAt) {
      await setState('smartBot/status', 'WAITING');
      return;
    }

    // ══ COUNT real vs bot ══
    const botRes = await pool.query('SELECT uid FROM users WHERE is_bot=true');
    const botIds = new Set(botRes.rows.map(r => String(r.uid)));

    const allEntries = Object.values(conf);
    let realPlayers = 0;
    allEntries.forEach(uid => { if (!botIds.has(String(uid))) realPlayers++; });

    const total = allEntries.length;
    const botsNeeded = Math.max(0, 100 - total);

    if (botsNeeded <= 0) {
      await setState('smartBot/status', 'FULL');
      return;
    }

    // ══ TIMING ══
    const now = Date.now();
    const remainMs = Math.max(0, cd.startAt - now);
    const remainSecs = remainMs / 1000;
    const totalSecs = (cd.cdMinutes || cd.mins || currentCdMinutes) * 60;
    const elapsedSecs = Math.max(1, totalSecs - remainSecs);

    // 5s ይጠብቃል
    if (elapsedSecs < 5) {
      await setState('smartBot/status', 'WAITING_5S');
      return;
    }

    // ══ SPEED CALCULATION ══
    const realRatePerSec = realPlayers / elapsedSecs;
    const projectedRealTotal = Math.min(100, Math.round(realRatePerSec * totalSecs));
    const projectedBotsNeeded = Math.max(botsNeeded, 100 - projectedRealTotal);
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

    // Random ±15% variation
    const variation = gapMs * 0.15;
    gapMs = gapMs + (Math.random() * variation * 2 - variation);

    // Apply time multiplier
    gapMs = gapMs * timeMultiplier;

    // Safety clamps
    gapMs = Math.max(200, Math.min(8000, gapMs));

    // Emergency mode
    if (remainSecs <= 10 && botsNeeded > 0) gapMs = 200;

    await setState('smartBot/status',
      `ACTIVE|${Math.round(remainSecs)}s|real:${realPlayers}|botsLeft:${botsNeeded}|gap:${Math.round(gapMs)}ms|tMult:×${timeMultiplier.toFixed(2)}`
    );

    log(`📊 ${Math.round(remainSecs)}s | real:${realPlayers} | botsLeft:${botsNeeded} | gap:${Math.round(gapMs)}ms | ×${timeMultiplier.toFixed(2)}`);

    if (now - lastBotAddedTime >= gapMs) {
      await addOneBot(conf, botIds, betVal, pct, botsNeeded);
    }

  } catch (err) {
    log(`❌ Engine error: ${err.message}`);
  }
}

// ══ ADD ONE BOT ══
async function addOneBot(confData, botIds, bet, pct, botsNeeded) {
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

  const botName = getRandomName();
  const fakeBotId = String(7000000000 + Math.floor(Math.random() * 999999999));
  const shuffled = avail.sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, cardCount);

  // Insert user
  await upsertUser(fakeBotId, botName, true, 0);

  // Confirm cards
  const currentConf = (await getState('game/confirmedNumbers')) || {};
  for (const cardId of selectedCards) {
    currentConf[cardId] = fakeBotId;
  }
  await setState('game/confirmedNumbers', currentConf);

  // Update prize/total
  const newTotal = Object.keys(currentConf).length;
  if (bet > 0) {
    await setState('game/prize', Math.floor(bet * newTotal * pct));
    await setState('game/total', bet * newTotal);
  }

  lastBotAddedTime = Date.now();

  await setState('smartBot/lastAdded', {
    name: botName,
    cardId: selectedCards.join(','),
    cards: cardCount,
    time: Date.now(),
    remaining: botsNeeded - cardCount
  });

  log(`✅ Bot: ${botName} → Card #${selectedCards.join(',')} | ${botsNeeded - cardCount} remaining`);
}

// ══ STARTUP ══
log('🚀 Smart Bot v3.0 (PostgreSQL/Railway) running');
log('Polling smartBot/enabled every 3s...');

// Initial check
pollSmartBotEnabled();
