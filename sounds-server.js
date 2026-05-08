const express = require('express');
const cors = require('cors');
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ══ CONFIG ══
const CLOUDINARY_CLOUD = 'diado1bxi';
const CLOUDINARY_API_KEY = '117446111831141';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_SECRET || 'biCrRU-O4tFt_icW8ONKE5POXJk';

// ══ AMHARIC NUMBERS ══
const AMHARIC_NUMBERS = {
  1:'አንድ',2:'ሁለት',3:'ሶስት',4:'አራት',5:'አምስት',
  6:'ስድስት',7:'ሰባት',8:'ስምንት',9:'ዘጠኝ',10:'አስር',
  11:'አስራ አንድ',12:'አስራ ሁለት',13:'አስራ ሶስት',14:'አስራ አራት',15:'አስራ አምስት',
  16:'አስራ ስድስት',17:'አስራ ሰባት',18:'አስራ ስምንት',19:'አስራ ዘጠኝ',20:'ሃያ',
  21:'ሃያ አንድ',22:'ሃያ ሁለት',23:'ሃያ ሶስት',24:'ሃያ አራት',25:'ሃያ አምስት',
  26:'ሃያ ስድስት',27:'ሃያ ሰባት',28:'ሃያ ስምንት',29:'ሃያ ዘጠኝ',30:'ሰላሳ',
  31:'ሰላሳ አንድ',32:'ሰላሳ ሁለት',33:'ሰላሳ ሶስት',34:'ሰላሳ አራት',35:'ሰላሳ አምስት',
  36:'ሰላሳ ስድስት',37:'ሰላሳ ሰባት',38:'ሰላሳ ስምንት',39:'ሰላሳ ዘጠኝ',40:'አርባ',
  41:'አርባ አንድ',42:'አርባ ሁለት',43:'አርባ ሶስት',44:'አርባ አራት',45:'አርባ አምስት',
  46:'አርባ ስድስት',47:'አርባ ሰባት',48:'አርባ ስምንት',49:'አርባ ዘጠኝ',50:'ሃምሳ',
  51:'ሃምሳ አንድ',52:'ሃምሳ ሁለት',53:'ሃምሳ ሶስት',54:'ሃምሳ አራት',55:'ሃምሳ አምስት',
  56:'ሃምሳ ስድስት',57:'ሃምሳ ሰባት',58:'ሃምሳ ስምንት',59:'ሃምሳ ዘጠኝ',60:'ስልሳ',
  61:'ስልሳ አንድ',62:'ስልሳ ሁለት',63:'ስልሳ ሶስት',64:'ስልሳ አራት',65:'ስልሳ አምስት',
  66:'ስልሳ ስድስት',67:'ስልሳ ሰባት',68:'ስልሳ ስምንት',69:'ስልሳ ዘጠኝ',70:'ሰባ',
  71:'ሰባ አንድ',72:'ሰባ ሁለት',73:'ሰባ ሶስት',74:'ሰባ አራት',75:'ሰባ አምስት'
};

function getBingoLetter(n) {
  if (n <= 15) return 'ቢ';
  if (n <= 30) return 'አይ';
  if (n <= 45) return 'ኤን';
  if (n <= 60) return 'ጂ';
  return 'ኦ';
}

// ══ TTS CACHE ══
const ttsCache = {};

// ══ edge-tts — ወንድ አማርኛ ድምፅ ══
function fetchTTS(text) {
  return new Promise((resolve, reject) => {
    const filename = `/tmp/tts_${Date.now()}.mp3`;
    try {
      const safeText = text.replace(/"/g, '\\"');
      // am-ET-AmehaNeural — ወንድ አማርኛ ድምፅ
      execSync(
        `edge-tts --voice am-ET-AmehaNeural --rate="-10%" --text "${safeText}" --write-media ${filename}`,
        { timeout: 10000 }
      );
      const buffer = fs.readFileSync(filename);
      try { fs.unlinkSync(filename); } catch(e) {}
      resolve({ buffer, type: 'audio/mpeg' });
    } catch (e) {
      try { fs.unlinkSync(filename); } catch(err) {}
      reject(new Error('edge-tts failed: ' + e.message));
    }
  });
}

// ══ TTS ENDPOINTS ══

// /tts/number/:n — ቁጥር ማስታወቂያ
app.get('/tts/number/:n', async (req, res) => {
  const n = parseInt(req.params.n);
  if (!n || n < 1 || n > 75) {
    return res.status(400).json({ error: 'Invalid number (1-75 only)' });
  }

  const key = 'num_' + n;

  // Cache ካለ ቀጥታ ላክ
  if (ttsCache[key]) {
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(ttsCache[key]);
  }

  try {
    const letter = getBingoLetter(n);
    const numWord = AMHARIC_NUMBERS[n];
    const text = `${letter}... ${numWord}`;

    const { buffer, type } = await fetchTTS(text);
    ttsCache[key] = buffer;

    res.set('Content-Type', type);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    console.error('TTS number error:', e.message);
    res.status(500).json({ error: 'TTS failed', detail: e.message });
  }
});

// /tts/winner — አሸናፊ ማስታወቂያ
app.get('/tts/winner', async (req, res) => {
  if (ttsCache['winner']) {
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(ttsCache['winner']);
  }

  try {
    const { buffer, type } = await fetchTTS('ቢንጎ! አሸናፊ ተገኘ!');
    ttsCache['winner'] = buffer;

    res.set('Content-Type', type);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    console.error('TTS winner error:', e.message);
    res.status(500).json({ error: 'TTS failed', detail: e.message });
  }
});

// /tts/warmup — Server ሲጀምር ሁሉም ቁጥሮች pre-cache ያድርግ
app.get('/tts/warmup', async (req, res) => {
  res.json({ ok: true, message: 'Warmup started in background' });

  // Background ውስጥ ሁሉም 1-75 pre-generate
  (async () => {
    console.log('🔄 TTS Warmup starting...');
    for (let n = 1; n <= 75; n++) {
      const key = 'num_' + n;
      if (ttsCache[key]) continue;
      try {
        const letter = getBingoLetter(n);
        const numWord = AMHARIC_NUMBERS[n];
        const text = `${letter}... ${numWord}`;
        const { buffer } = await fetchTTS(text);
        ttsCache[key] = buffer;
        console.log(`✅ Cached: ${n} — ${text}`);
        // ትንሽ ቆይ — gTTS rate limit ለማስቀረት
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`❌ Failed: ${n} — ${e.message}`);
      }
    }
    // Winner ድምፅ
    try {
      if (!ttsCache['winner']) {
        const { buffer } = await fetchTTS('ቢንጎ! አሸናፊ ተገኘ!');
        ttsCache['winner'] = buffer;
        console.log('✅ Cached: winner');
      }
    } catch(e) {}
    console.log('🎉 TTS Warmup complete!');
  })();
});

// ══ CLOUDINARY SOUNDS ══
let soundsMap = {};

function loadCloudinarySounds() {
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
          soundsMap = {};
          resources.forEach(r => {
            const match = r.public_id.match(/^([A-Z]+\d+)/);
            const key = match ? match[1] : r.public_id;
            soundsMap[key] = r.secure_url;
          });
          console.log(`✅ Loaded ${Object.keys(soundsMap).length} sounds from Cloudinary`);
        } catch (e) {
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

app.get('/sounds-map', (req, res) => {
  res.json(soundsMap);
});

app.post('/sounds-reload', async (req, res) => {
  await loadCloudinarySounds();
  res.json({ ok: true, count: Object.keys(soundsMap).length });
});

// ══ HEALTH CHECK ══
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ttsCache: Object.keys(ttsCache).length,
    sounds: Object.keys(soundsMap).length,
    cachedNumbers: Object.keys(ttsCache).filter(k => k.startsWith('num_')).length
  });
});

// ══ START ══
const PORT = process.env.PORT || 3001;

loadCloudinarySounds().then(() => {
  app.listen(PORT, () => {
    console.log(`🔊 Server running on port ${PORT}`);
    console.log(`   /tts/number/:n  — Amharic TTS (gTTS)`);
    console.log(`   /tts/winner     — Winner announcement`);
    console.log(`   /tts/warmup     — Pre-cache all numbers`);
    console.log(`   /sounds-map     — Cloudinary sounds`);
    console.log(`   /sounds-reload  — Reload from Cloudinary`);
    console.log(`   /health         — Status check`);
  });
});
