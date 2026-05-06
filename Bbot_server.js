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

// Helper wrappers to match firebase client API style
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

// 200 Ethiopian Names (Latin)
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

// 50 Amharic Names (Amharic script)
const amNames = [
  "አበበ","ከበደ","ሰላም","ሚካኤል","ማርታ","ሄለን","ዮናስ","ሶፊያ","ናርዶስ","ሃና",
  "ልዩ","አስቴር","ቤቴል","ሜሮን","ሰብለ","ፍቅር","ሩት","ሃይማኖት","ዘካሪያስ","ታደሰ",
  "ብርሃኔ","ሙሉወርቅ","ትዕግስት","አዳነ","ፍሬህይወት","ሃይሌ","ቃልኪዳን","ፀሃይ","ዮርዳኖስ","ቅድስት",
  "ናትናኤል","ዘሪቱ","ስምረት","ምህረት","ሃብቴ","ፍሬሰብ","ዓለምሰገድ","ክብሮም","ሃይለሚካኤል","ጸጋዬ",
  "ሙሉቀን","ወርቅነሽ","አሸናፊ","ዮሴፍ","ሃይካል","ቢኒያም","ሰሎሞን","ዮሐንስ","ጌታቸው","ያሬድ"
];

// 50 Telegram Usernames
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

// 67% eth latin, 17% amharic, 16% telegram
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
let nextBotDelay = 6000;
let currentCdMinutes = 3;
let countdownStartAt = null;
let realPlayerEntryTimes = []; // track when real players join

// ══ HELPERS ══
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function log(msg) {
  const now = new Date().toLocaleTimeString('en-ET');
  console.log(`[${now}] 🤖 ${msg}`);
}

// ══ LISTEN: smartBot/enabled ══
onValue(ref(db, 'smartBot/enabled'), (snap) => {
  const val = snap.val();
  if (val === true && !smartBotEnabled) {
    smartBotEnabled = true;
    log('Smart Bot ENABLED by admin');
    startBotEngine();
  } else if (val === false && smartBotEnabled) {
    smartBotEnabled = false;
    log('Smart Bot DISABLED by admin');
    stopBotEngine();
  }
});

// ══ LISTEN: game/countdown ══
// Track countdown start for bot timing calculations
onValue(ref(db, 'game/countdown'), (snap) => {
  const val = snap.val();
  if (val && val.active && val.startAt) {
    countdownStartAt = val.startAt;
    currentCdMinutes = val.cdMinutes || val.mins || 3;
    realPlayerEntryTimes = []; // reset on new countdown
    log(`Countdown detected: ${currentCdMinutes} min, starts at ${new Date(val.startAt).toLocaleTimeString()}`);

    // If smart bot is enabled, make sure engine is running
    if (smartBotEnabled && !botEngineRunning) {
      startBotEngine();
    }
  } else {
    countdownStartAt = null;
    log('Countdown ended or not active');
  }
});

// ══ LISTEN: game/confirmedNumbers ══
// Track real player join times for speed calculation
let prevRealCount = 0;
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

  // New real player joined?
  if (realCount > prevRealCount) {
    const newJoins = realCount - prevRealCount;
    for (let i = 0; i < newJoins; i++) {
      realPlayerEntryTimes.push(Date.now());
    }
    log(`Real player joined! Total real: ${realCount}`);
  }
  prevRealCount = realCount;
});

// ══ BOT ENGINE ══
function startBotEngine() {
  if (botEngineRunning) return;
  botEngineRunning = true;
  lastBotAddedTime = 0;
  log('Bot engine started — checking every 2 seconds');
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

    // Timing
    const now = Date.now();
    const remainMs = Math.max(0, cdData.startAt - now);
    const remainSecs = remainMs / 1000;
    const totalSecs = (cdData.cdMinutes || cdData.mins || currentCdMinutes) * 60;
    const elapsedSecs = totalSecs - remainSecs;

    // 5s ይጠብቃል
    if (elapsedSecs < 5) {
      await set(ref(db, 'smartBot/status'), 'WAITING_5S');
      return;
    }

    // ══ PURE BALANCE CALCULATION ══
    // Real player rate per second so far
    const realRate = elapsedSecs > 0 ? realPlayers / elapsedSecs : 0;

    // Project how many real players will join by end
    const projectedReal = Math.min(100, realRate * totalSecs);

    // How many bots still needed considering projection
    const projectedBotsNeeded = Math.max(1, Math.ceil(100 - projectedReal));

    // Time window to finish: target finish at 5s remaining
    const timeWindow = Math.max(1, remainSecs - 5);

    // Required bot rate: bots per second
    const requiredRate = botsNeeded / timeWindow;

    // Gap between bots in ms
    let gapMs = 1000 / requiredRate;

    // Over-pace: real players joining way too fast → pause bots
    const expectedRealNow = realRate > 0 ? realRate * totalSecs : 0;
    if (realPlayers > projectedBotsNeeded && realRate * totalSecs > 90 && realPlayers > 10) {
      await set(ref(db, 'smartBot/status'), 'PAUSED_REAL_FAST');
      log(`⏸ Real players filling fast (${realPlayers}) — pausing`);
      return;
    }

    // Human-like variation ±20%
    const variation = gapMs * 0.20;
    gapMs = gapMs + (Math.random() * variation * 2 - variation);

    // Safety: min 250ms, max 10s
    gapMs = Math.max(250, Math.min(10000, gapMs));

    await set(ref(db, 'smartBot/status'), `ACTIVE|${Math.round(remainSecs)}s|gap:${Math.round(gapMs)}ms`);
    log(`📊 ${Math.round(remainSecs)}s | real:${realPlayers} | bots:${botsNeeded} | gap:${Math.round(gapMs)}ms`);

    // Add bot only if enough time has passed since last bot
    if (now - lastBotAddedTime >= gapMs) {
      await addOneBot(confData, usersData, bet, pct, botsNeeded);
    }

  } catch (err) {
    log(`❌ Engine error: ${err.message}`);
  }
}

// ══ ADD ONE BOT (with multi-card support) ══
async function addOneBot(confData, usersData, bet, pct, botsNeeded) {
  // Available card slots
  const taken = new Set(Object.keys(confData).map(Number));
  const avail = [];
  for (let i = 1; i <= 100; i++) {
    if (!taken.has(i)) avail.push(i);
  }
  if (!avail.length) return;

  // 10% chance → multi card (2-3 cards), 90% → 1 card
  // Only take multi if enough cards available and enough bots needed
  let cardCount = 1;
  if (botsNeeded >= 3 && avail.length >= 3 && Math.random() < 0.10) {
    cardCount = Math.random() < 0.6 ? 2 : 3; // 60% chance 2 cards, 40% chance 3 cards
  }

  // Pick unused name & ID — one bot, multiple cards
  const botName = getRandomName();
  const fakeBotId = String(7000000000 + Math.floor(Math.random() * 999999999));

  // Shuffle avail and pick cardCount slots
  const shuffled = avail.sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, cardCount);

  // Write user once
  await set(ref(db, `users/${fakeBotId}/display`), botName);
  await set(ref(db, `users/${fakeBotId}/is_bot`), true);
  await set(ref(db, `users/${fakeBotId}/balance`), 0);

  // Write each card
  for (const cardId of selectedCards) {
    await set(ref(db, `game/confirmedNumbers/${cardId}`), fakeBotId);
  }

  // Update prize pool
  const newSnap = await get(ref(db, 'game/confirmedNumbers'));
  const newTotal = Object.keys(newSnap.val() || {}).length;
  if (bet > 0) {
    await set(ref(db, 'game/prize'), Math.floor(bet * newTotal * pct));
    await set(ref(db, 'game/total'), bet * newTotal);
  }

  lastBotAddedTime = Date.now();

  // Log to Firebase for admin UI
  await set(ref(db, 'smartBot/lastAdded'), {
    name: botName,
    cardId: selectedCards.join(','),
    cards: cardCount,
    time: Date.now(),
    remaining: botsNeeded - cardCount
  });

  log(`✅ Bot added: ${botName} → Card #${selectedCards.join(',')} | ${botsNeeded - cardCount} remaining`);
}

// ══ KEEP ALIVE — no HTTP server (port conflict fix) ══
log('🚀 Smart Bot Server running — no HTTP port needed');
log('Listening for smartBot/enabled changes...');
