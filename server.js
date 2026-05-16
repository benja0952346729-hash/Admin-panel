<!DOCTYPE html>
<html lang="am">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bingo Pro — Admin</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Noto+Sans+Ethiopic:wght@400;600;700&display=swap');

  :root {
    --bg: #0a0c10;
    --card: #111318;
    --card2: #161a22;
    --border: #1e2330;
    --gold: #f5c518;
    --cyan: #00e5ff;
    --green: #00e676;
    --red: #ff1744;
    --purple: #ce93d8;
    --blue: #64b5f6;
    --text: #e8eaf0;
    --muted: #5a6070;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Rajdhani', 'Noto Sans Ethiopic', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .header {
    background: #0d0f14;
    border-bottom: 1px solid var(--border);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .logo { font-size: 28px; font-weight: 700; color: var(--gold); letter-spacing: 4px; text-shadow: 0 0 20px rgba(245,197,24,0.4); }
  .header-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .badge { display: flex; align-items: center; gap: 5px; background: var(--card2); border: 1px solid var(--border); border-radius: 20px; padding: 5px 12px; font-size: 14px; font-weight: 600; }
  .badge.round { border-color: #9c27b0; color: var(--gold); }
  .badge.players { border-color: #1565c0; color: var(--blue); }
  .badge.cards { border-color: #b71c1c; color: #ef9a9a; }
  .badge.prize { border-color: #1b5e20; color: var(--green); }

  .nav-tabs { display: flex; gap: 4px; padding: 10px 16px; background: #0d0f14; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; }
  .nav-tabs::-webkit-scrollbar { display: none; }
  .nav-tab { flex-shrink: 0; padding: 8px 16px; border-radius: 10px; border: 1px solid var(--border); background: var(--card2); color: var(--muted); font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .nav-tab:hover { border-color: var(--gold); color: var(--text); }
  .nav-tab.active { background: var(--gold); border-color: var(--gold); color: #000; }

  .page { display: none; }
  .page.active { display: block; }
  .main { padding: 16px; max-width: 600px; margin: 0 auto; }

  .auto-card { border: 2px solid var(--gold); border-radius: 16px; background: var(--card); overflow: hidden; margin-bottom: 14px; box-shadow: 0 0 30px rgba(245,197,24,0.05); }
  .auto-header { padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; }
  .auto-title-row { display: flex; align-items: center; gap: 10px; }
  .status-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--green); box-shadow: 0 0 10px var(--green); animation: pulse 1.5s infinite; flex-shrink: 0; }
  .status-dot.off { background: var(--muted); box-shadow: none; animation: none; }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
  .auto-title { font-size: 16px; font-weight: 700; letter-spacing: 2px; color: var(--cyan); text-transform: uppercase; }
  .collapse-btn { background: none; border: none; cursor: pointer; color: var(--cyan); font-size: 18px; transition: transform 0.3s; }
  .collapse-btn.collapsed { transform: rotate(180deg); }
  .divider { height: 1px; background: var(--border); margin: 0 18px; }
  .section-label { padding: 12px 18px 8px; font-size: 11px; letter-spacing: 2px; color: var(--cyan); font-weight: 700; display: flex; align-items: center; gap: 6px; }
  .cd-grid { padding: 0 14px 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .cd-btn { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700; padding: 10px 4px; cursor: pointer; transition: all 0.2s; letter-spacing: 1px; }
  .cd-btn:hover { border-color: var(--gold); color: var(--gold); }
  .cd-btn.active { background: var(--green); border-color: var(--green); color: #000; box-shadow: 0 0 15px rgba(0,230,118,0.3); }
  .saved-msg { padding: 0 18px 12px; font-size: 13px; color: var(--green); display: flex; align-items: center; gap: 6px; }
  .speed-row { padding: 0 18px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .speed-label { font-size: 14px; color: var(--muted); font-weight: 600; font-family: 'Noto Sans Ethiopic', sans-serif; }
  .speed-select, .speed-input { background: var(--card2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600; padding: 8px 12px; cursor: pointer; outline: none; transition: border-color 0.2s; min-width: 100px; }
  .speed-select:focus, .speed-input:focus { border-color: var(--cyan); }
  .speed-select option { background: #1a1e28; }
  .main-btn { margin: 0 14px 14px; width: calc(100% - 28px); padding: 16px; border-radius: 12px; border: none; font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 2px; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; }
  .btn-stop { background: linear-gradient(135deg,#e53935,#b71c1c); color:#fff; box-shadow:0 4px 20px rgba(229,57,53,0.3); }
  .btn-stop:hover { box-shadow:0 4px 30px rgba(229,57,53,0.5); transform:translateY(-1px); }
  .btn-start { background: linear-gradient(135deg,#00c853,#1b5e20); color:#fff; box-shadow:0 4px 20px rgba(0,200,83,0.3); }
  .btn-start:hover { box-shadow:0 4px 30px rgba(0,200,83,0.5); transform:translateY(-1px); }
  .btn-blue { background: linear-gradient(135deg,#1565c0,#0d47a1); color:#fff; }
  .btn-purple { background: linear-gradient(135deg,#7b1fa2,#4a148c); color:#fff; }
  .btn-gold { background: linear-gradient(135deg,#f5c518,#e6a800); color:#000; font-weight:800; }
  .btn-cyan { background: linear-gradient(135deg,#00acc1,#006064); color:#fff; }
  .phase-card { margin: 0 14px 14px; background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
  .phase-lbl { font-size:11px; letter-spacing:2px; color:var(--muted); font-weight:600; margin-bottom:4px; }
  .phase-value { font-size:16px; font-weight:700; color:var(--cyan); letter-spacing:1.5px; display:flex; align-items:center; gap:6px; }
  .phase-sub { font-size:12px; color:var(--muted); margin-top:4px; font-family:'Noto Sans Ethiopic',sans-serif; }
  .phase-bar { width:40px; height:3px; background:var(--gold); border-radius:2px; animation:shimmer 2s infinite; }
  @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .collapsible { overflow:hidden; transition:max-height 0.35s ease; }
  .collapsible.collapsed { max-height:0 !important; }

  .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; }
  .stat-box { background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
  .stat-lbl { font-size:10px; letter-spacing:2px; color:var(--muted); font-weight:700; margin-bottom:4px; text-transform:uppercase; }
  .stat-val { font-size:20px; font-weight:700; }
  .c-cyan{color:var(--cyan);} .c-gold{color:var(--gold);} .c-green{color:var(--green);}
  .c-red{color:var(--red);} .c-purple{color:var(--purple);} .c-blue{color:var(--blue);}

  .list-item { background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
  .list-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .list-item-name { font-size:15px; font-weight:700; color:var(--text); }
  .list-item-val { font-size:16px; font-weight:700; color:var(--gold); }
  .list-item-sub { font-size:12px; color:var(--muted); margin-bottom:10px; font-family:'Noto Sans Ethiopic',sans-serif; }
  .row-btns { display:flex; gap:8px; }
  .small-btn { flex:1; padding:10px 8px; border:none; border-radius:8px; color:#fff; font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:700; cursor:pointer; letter-spacing:1px; transition:all 0.2s; }
  .small-btn:hover { opacity:0.85; transform:translateY(-1px); }
  .s-green{background:linear-gradient(135deg,#00c853,#1b5e20);}
  .s-red{background:linear-gradient(135deg,#e53935,#b71c1c);}
  .s-blue{background:linear-gradient(135deg,#1565c0,#0d47a1);}
  .s-purple{background:linear-gradient(135deg,#7b1fa2,#4a148c);}
  .s-gold{background:linear-gradient(135deg,#f5c518,#e6a800);color:#000;}
  .s-cyan{background:linear-gradient(135deg,#00acc1,#006064);}

  .field-row { padding: 0 14px 12px; display: flex; flex-direction: column; gap: 6px; }
  .field-lbl { font-size:12px; letter-spacing:1px; color:var(--muted); font-weight:700; }
  .field-input { background: var(--card2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'Noto Sans Ethiopic','Rajdhani',sans-serif; font-size: 14px; font-weight: 600; padding: 10px 14px; outline: none; width: 100%; transition: border-color 0.2s; }
  .field-input:focus { border-color: var(--cyan); }
  .field-input::placeholder { color: var(--muted); }
  textarea.field-input { resize: vertical; min-height: 80px; }

  .health-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 14px; }

  .winner-row { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
  .winner-left .wname { font-size:14px; font-weight:700; }
  .winner-left .wcard { font-size:11px; color:var(--muted); margin-top:2px; }
  .winner-right { text-align:right; }
  .winner-right .wprize { font-size:16px; font-weight:700; color:var(--gold); }
  .winner-right .wtime { font-size:11px; color:var(--muted); margin-top:2px; }

  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(80px); background:#1a1e28; border:1px solid var(--border); border-radius:10px; padding:12px 22px; font-size:14px; font-weight:600; color:var(--text); transition:transform 0.3s ease; z-index:9999; white-space:nowrap; }
  .toast.show { transform:translateX(-50%) translateY(0); }
  .toast.success { border-color:var(--green); color:var(--green); }
  .toast.error { border-color:var(--red); color:var(--red); }
  .toast.info { border-color:var(--cyan); color:var(--cyan); }

  .empty { color:var(--muted); text-align:center; padding:24px 20px; font-family:'Noto Sans Ethiopic',sans-serif; }
  .loading { color:var(--muted); text-align:center; padding:24px 20px; }

  .refresh-btn { width:34px; height:34px; background:var(--card2); border:1px solid var(--border); border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; transition:all 0.2s; }
  .refresh-btn:hover { border-color:var(--cyan); }

  .promo-tag { display:inline-flex; align-items:center; gap:4px; background:#1a1e28; border:1px solid var(--border); border-radius:20px; padding:3px 10px; font-size:11px; color:var(--muted); font-weight:600; }
  .sep { height:1px; background:var(--border); margin:0 0 14px; }
  .file-btn { display:flex; align-items:center; gap:8px; background:var(--card2); border:1px dashed var(--border); border-radius:8px; color:var(--muted); padding:10px 14px; cursor:pointer; font-size:13px; font-family:'Noto Sans Ethiopic',sans-serif; transition:border-color 0.2s; width:100%; }
  .file-btn:hover { border-color:var(--cyan); color:var(--text); }
  .file-btn.has-file { border-color:var(--green); color:var(--green); }

  /* ══ AGENT HISTORY STYLES ══ */
  .agent-card { background:var(--card2); border:1px solid var(--border); border-radius:14px; margin-bottom:12px; overflow:hidden; transition:border-color 0.2s; }
  .agent-card:hover { border-color:rgba(100,181,246,0.35); }
  .agent-card-header { padding:14px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none; }
  .agent-card-header:hover { background:rgba(255,255,255,0.02); }
  .agent-name-row { display:flex; align-items:center; gap:10px; }
  .agent-avatar { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#1565c0,#0d47a1); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  .agent-name { font-size:15px; font-weight:700; color:var(--text); }
  .agent-id-tag { font-size:11px; color:var(--muted); margin-top:2px; letter-spacing:1px; }
  .agent-summary { display:flex; gap:7px; align-items:center; flex-wrap:wrap; }
  .agent-sum-pill { background:rgba(0,230,118,0.08); border:1px solid rgba(0,230,118,0.2); border-radius:8px; padding:4px 9px; font-size:12px; font-weight:700; color:var(--green); text-align:center; line-height:1.3; }
  .agent-sum-pill span { display:block; font-size:9px; color:var(--muted); font-weight:600; letter-spacing:1px; }
  .agent-sum-pill.red { background:rgba(255,23,68,0.07); border-color:rgba(255,23,68,0.2); color:var(--red); }
  .agent-toggle-icon { color:var(--muted); font-size:13px; transition:transform 0.3s; margin-left:4px; flex-shrink:0; }
  .agent-toggle-icon.open { transform:rotate(180deg); }

  .agent-history-body { border-top:1px solid var(--border); overflow:hidden; max-height:0; transition:max-height 0.45s ease; }
  .agent-history-body.open { max-height:3000px; }

  /* mini bar chart */
  .agent-mini-chart { padding:12px 16px 14px; background:rgba(0,0,0,0.15); }
  .mini-chart-title { font-size:10px; letter-spacing:2px; color:var(--muted); font-weight:700; margin-bottom:10px; text-transform:uppercase; }
  .mini-bar-row { display:flex; align-items:flex-end; gap:5px; height:56px; }
  .mini-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; }
  .mini-bar { width:100%; border-radius:4px 4px 0 0; min-height:3px; background:linear-gradient(180deg,var(--gold),#a07830); }
  .mini-bar-day { font-size:9px; color:var(--muted); text-align:center; }
  .mini-bar-amt { font-size:9px; color:var(--gold); text-align:center; white-space:nowrap; overflow:hidden; max-width:100%; }

  /* day section */
  .day-section { border-bottom:1px solid rgba(30,35,48,0.9); }
  .day-section:last-of-type { border-bottom:none; }
  .day-header { padding:10px 16px; display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.18); }
  .day-label { font-size:12px; font-weight:700; letter-spacing:2px; color:var(--cyan); }
  .day-stats-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .day-stat-val { font-size:12px; font-weight:700; }

  /* bar rows */
  .day-bars { padding:8px 16px 4px; }
  .dbar-row { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
  .dbar-lbl { width:62px; font-size:10px; color:var(--muted); letter-spacing:1px; flex-shrink:0; }
  .dbar-track { flex:1; background:rgba(255,255,255,0.04); border-radius:4px; height:14px; overflow:hidden; }
  .dbar-fill { height:100%; border-radius:4px; }
  .dbar-fill.approved { background:linear-gradient(90deg,#00c853,#1b5e20); }
  .dbar-fill.rejected { background:linear-gradient(90deg,#e53935,#7f0000); }
  .dbar-val { width:60px; font-size:10px; text-align:right; flex-shrink:0; }

  /* tx list */
  .tx-list { padding:4px 12px 10px; }
  .tx-row { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-radius:7px; margin-bottom:3px; background:rgba(0,0,0,0.12); gap:6px; flex-wrap:wrap; }
  .tx-row:hover { background:rgba(255,255,255,0.03); }
  .tx-user { font-size:12px; color:var(--text); font-weight:600; flex:1; min-width:70px; }
  .tx-method { font-size:10px; color:var(--blue); letter-spacing:1px; }
  .tx-amount { font-size:13px; font-weight:700; color:var(--gold); white-space:nowrap; }
  .tx-ok { font-size:10px; color:var(--green); letter-spacing:1px; font-weight:700; }
  .tx-no { font-size:10px; color:var(--red); letter-spacing:1px; font-weight:700; }
  .tx-time { font-size:10px; color:var(--muted); white-space:nowrap; }
  .no-tx { font-size:12px; color:var(--muted); text-align:center; padding:10px 0; font-family:'Noto Sans Ethiopic',sans-serif; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="logo">BINGO</div>
  <div class="header-badges">
    <div class="badge round">🔄 <span id="roundNum">—</span></div>
    <div class="badge players">👥 <span id="playerCount">—</span></div>
    <div class="badge cards">🃏 <span id="cardCount">—</span></div>
    <div class="badge prize">💰 <span id="prizeAmt">—</span> ብር</div>
  </div>
</div>

<!-- NAV TABS -->
<div class="nav-tabs">
  <button class="nav-tab active" onclick="switchPage('home')">🏠 HOME</button>
  <button class="nav-tab" onclick="switchPage('withdrawals')">💸 WITHDRAWALS <span id="wdTabBadge"></span></button>
  <button class="nav-tab" onclick="switchPage('notifications')">🔔 NOTIFS</button>
  <button class="nav-tab" onclick="switchPage('analytics')">📊 ANALYTICS</button>
  <button class="nav-tab" onclick="switchPage('winners')">🏆 WINNERS</button>
  <button class="nav-tab" onclick="switchPage('promotions')">📢 PROMOS</button>
  <button class="nav-tab" onclick="switchPage('agents')">🕵️ AGENTS</button>
  <button class="nav-tab" onclick="switchPage('settings')">⚙️ SETTINGS</button>
</div>

<!-- ══════════════ PAGE: HOME ══════════════ -->
<div class="page active" id="page-home">
<div class="main">

  <div class="auto-card">
    <div class="auto-header">
      <div class="auto-title-row">
        <div class="status-dot off" id="statusDot"></div>
        <div class="auto-title" id="autoTitle">SERVER AUTO — LOADING</div>
      </div>
      <button class="collapse-btn" id="collapseBtn" onclick="toggleCollapse()">▲</button>
    </div>
    <div style="padding:0 18px 12px; color:var(--muted); font-size:12px; font-family:'Noto Sans Ethiopic',sans-serif; line-height:1.5;">
      Time ምሪጥ — game እራሱ ይጀምራል, ይጨዋጣል, አሸናፊ ይወጃል, ደሞ ይስጀምራል!
    </div>
    <div class="collapsible" id="collapseBody" style="max-height:600px">
      <div class="divider"></div>
      <div class="section-label">⏱ BETWEEN-GAME COUNTDOWN</div>
      <div class="cd-grid" id="cdGrid">
        <button class="cd-btn" onclick="selectCD(1)">1 MIN</button>
        <button class="cd-btn" onclick="selectCD(2)">2 MIN</button>
        <button class="cd-btn" onclick="selectCD(3)">3 MIN</button>
        <button class="cd-btn" onclick="selectCD(4)">4 MIN</button>
        <button class="cd-btn" onclick="selectCD(5)">5 MIN</button>
        <button class="cd-btn" onclick="selectCD(6)">6 MIN</button>
        <button class="cd-btn" onclick="selectCD(7)">7 MIN</button>
      </div>
      <div class="saved-msg" id="savedMsg" style="display:none">✅ Saved: <span id="savedMin">—</span> ደቂቃ</div>
      <div class="speed-row">
        <span class="speed-label">Number call speed:</span>
        <select class="speed-select" id="speedSelect" onchange="saveSettings()">
          <option value="3000">3 sec</option>
          <option value="4000">4 sec</option>
          <option value="5000">5 sec</option>
          <option value="6000" selected>6 sec</option>
          <option value="8000">8 sec</option>
          <option value="10000">10 sec</option>
        </select>
      </div>
      <button class="main-btn btn-stop" id="mainBtn" onclick="toggleAuto()">
        <span id="btnIcon">⏹</span>
        <span id="btnText">STOP AUTO</span>
      </button>
      <div class="phase-card">
        <div>
          <div class="phase-lbl">CURRENT PHASE</div>
          <div class="phase-value"><span id="phaseIcon">⏱</span><span id="phaseText">COUNTDOWN</span></div>
          <div class="phase-sub" id="phaseSub">Railway server ያስተዳድራል</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <div class="phase-lbl">TIME</div>
          <div id="countdownDisplay" style="font-size:20px;font-weight:700;color:var(--gold);">—</div>
          <div class="phase-bar"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- GAME SETTINGS -->
  <div class="auto-card" style="border-color:#1565c0;">
    <div class="auto-header">
      <div class="auto-title" style="color:var(--blue);">⚙️ GAME SETTINGS</div>
    </div>
    <div class="divider"></div>
    <div class="speed-row">
      <span class="speed-label">Bet (ብር):</span>
      <input type="number" class="speed-select" id="betAmount" min="1" placeholder="ለምሳሌ 10" style="min-width:120px;">
    </div>
    <div class="speed-row">
      <span class="speed-label">Prize %:</span>
      <select class="speed-select" id="prizePercent">
        <option value="60">60%</option>
        <option value="70">70%</option>
        <option value="80" selected>80%</option>
        <option value="90">90%</option>
        <option value="100">100%</option>
      </select>
    </div>
    <button class="main-btn btn-blue" onclick="saveGameSettings()">💾 SAVE SETTINGS</button>
  </div>

  <!-- SMART BOT -->
  <div class="auto-card" style="border-color:#9c27b0;">
    <div class="auto-header">
      <div class="auto-title-row">
        <div class="status-dot off" id="botDot"></div>
        <div class="auto-title" id="botTitle" style="color:var(--purple);">SMART BOT — OFF</div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="speed-row" style="margin-top:6px;">
      <span class="speed-label">Game Bias:</span>
      <select class="speed-select" id="gameBias" onchange="saveBias()">
        <option value="0.10">0.10 — በጣም ይከብዳል</option>
        <option value="0.20">0.20 — ይከብዳል</option>
        <option value="0.30">0.30 — መካከለኛ</option>
        <option value="0.40">0.40 — ትንሽ ቀላል</option>
        <option value="0.50" selected>0.50 — Fair</option>
        <option value="0.60">0.60 — ቀላል</option>
        <option value="0.70">0.70 — ቶሎ ያልቃል</option>
      </select>
    </div>
    <div class="speed-row" style="margin-top:6px;">
      <span class="speed-label">Bot Win %:</span>
      <select class="speed-select" id="botWinPct">
        <option value="0">0%</option>
        <option value="10">10%</option>
        <option value="20">20%</option>
        <option value="30">30%</option>
        <option value="40">40%</option>
        <option value="50" selected>50%</option>
        <option value="60">60%</option>
        <option value="70">70%</option>
        <option value="80">80%</option>
        <option value="90">90%</option>
        <option value="100">100%</option>
      </select>
    </div>
    <button class="main-btn" onclick="saveBotSettings()" 
  style="background:linear-gradient(135deg,#f57c00,#e65100);margin-bottom:0;">
  💾 SAVE BOT SETTINGS
</button>
    <button class="main-btn btn-purple" id="botBtn" onclick="toggleBot()">
      <span id="botBtnIcon">▶</span>
      <span id="botBtnText">ENABLE SMART BOT</span>
    </button>
    <button class="main-btn" onclick="removeBots()" style="background:linear-gradient(135deg,#e53935,#b71c1c);margin-top:0;">
      🗑️ REMOVE ALL BOTS
    </button>
  </div>
<div class="auto-card" style="border-color:var(--gold);">
  <div class="auto-header">
    <div class="auto-title-row">
      <div class="status-dot off" id="wdDot"></div>
      <div class="auto-title" id="wdTitle" style="color:var(--gold);">WITHDRAWAL — LOADING</div>
    </div>
  </div>
  <div class="divider"></div>
  <div style="padding:14px 18px;color:var(--muted);font-size:13px;font-family:'Noto Sans Ethiopic',sans-serif;">
    Off ሲሆን users withdrawal መጠየቅ አይችሉም
  </div>
  <button class="main-btn btn-start" id="wdBtn" onclick="toggleWithdrawal()">
    <span id="wdBtnIcon">⏹</span>
    <span id="wdBtnText">LOADING...</span>
  </button>
</div>
  <!-- GIVE BALANCE -->
  <div class="auto-card" style="border-color:var(--green);">
    <div class="auto-header"><div class="auto-title" style="color:var(--green);">💰 GIVE BALANCE</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">TELEGRAM ID</div>
      <input type="text" class="field-input" id="giveUid" placeholder="User ID">
    </div>
    <div class="field-row">
      <div class="field-lbl">AMOUNT (ብር)</div>
      <input type="number" class="field-input" id="giveAmount" min="1" placeholder="ብር">
    </div>
    <button class="main-btn btn-start" onclick="giveBalance()">💰 GIVE BALANCE</button>
  </div>

  <div class="auto-card" style="border-color:var(--cyan);">
    <div class="auto-header"><div class="auto-title" style="color:var(--cyan);">🔧 UPDATE BALANCE</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">TELEGRAM ID</div>
      <input type="text" class="field-input" id="updateUid" placeholder="User ID">
    </div>
    <div class="field-row">
      <div class="field-lbl">AMOUNT (ብር)</div>
      <input type="number" class="field-input" id="updateAmount" min="1" placeholder="ብር">
    </div>
    <div class="speed-row" style="padding-top:0;">
      <span class="speed-label">Type:</span>
      <select class="speed-select" id="updateType">
        <option value="add">➕ Add</option>
        <option value="subtract">➖ Subtract</option>
      </select>
    </div>
    <button class="main-btn btn-cyan" onclick="updateBalance()">🔧 UPDATE BALANCE</button>
  </div>

  <div class="auto-card" style="border-color:#ff9800;">
    <div class="auto-header">
      <div class="auto-title" style="color:#ff9800;">🖥️ SERVER HEALTH</div>
      <button class="refresh-btn" onclick="fetchHealth()">🔄</button>
    </div>
    <div class="divider"></div>
    <div class="health-grid" id="healthGrid"><div class="loading">Loading...</div></div>
  </div>

</div>
</div>

<!-- ══════════════ PAGE: WITHDRAWALS ══════════════ -->
<div class="page" id="page-withdrawals">
<div class="main">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div style="color:var(--gold);font-size:16px;font-weight:700;letter-spacing:2px;">💸 WITHDRAWALS</div>
    <button class="refresh-btn" onclick="fetchWithdrawals()">🔄</button>
  </div>
 
  <div id="wdList"><div class="loading">Loading...</div></div>
</div>
</div>

<!-- ══════════════ PAGE: NOTIFICATIONS ══════════════ -->
<div class="page" id="page-notifications">
<div class="main">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div style="color:var(--purple);font-size:16px;font-weight:700;letter-spacing:2px;">🔔 NOTIFICATIONS</div>
    <button class="refresh-btn" onclick="fetchNotifications()">🔄</button>
  </div>
  <div id="notifList"><div class="loading">Loading...</div></div>
</div>
</div>

<!-- ══════════════ PAGE: ANALYTICS ══════════════ -->
<div class="page" id="page-analytics">
<div class="main">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div style="color:var(--cyan);font-size:16px;font-weight:700;letter-spacing:2px;">📊 ANALYTICS</div>
    <div style="display:flex;gap:8px;">
      <button class="refresh-btn" onclick="fetchAnalytics()">🔄</button>
      <button class="refresh-btn" onclick="clearAnalytics()" style="border-color:var(--red);color:var(--red);">🗑️</button>
    </div>
  </div>
  <div id="analyticsList"><div class="loading">Loading...</div></div>
</div>
</div>

<!-- ══════════════ PAGE: WINNERS ══════════════ -->
<div class="page" id="page-winners">
<div class="main">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div style="color:var(--gold);font-size:16px;font-weight:700;letter-spacing:2px;">🏆 ALL WINNERS</div>
    <button class="refresh-btn" onclick="fetchWinners()">🔄</button>
  </div>
  <div id="winnersList"><div class="loading">Loading...</div></div>
</div>
</div>

<!-- ══════════════ PAGE: PROMOTIONS ══════════════ -->
<div class="page" id="page-promotions">
<div class="main">
  <div class="auto-card" style="border-color:#ff9800;">
    <div class="auto-header"><div class="auto-title" style="color:#ff9800;">📤 SEND NOW</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">MESSAGE</div>
      <textarea class="field-input" id="promoText" placeholder="Promotion message..."></textarea>
    </div>
    <div class="field-row">
      <div class="field-lbl">TARGET</div>
      <select class="field-input" id="promoTarget">
        <option value="bot">🤖 Bot Users</option>
        <option value="group">👥 Group</option>
      </select>
    </div>
    <div class="field-row" id="promoGroupRow" style="display:none;">
      <div class="field-lbl">GROUP ID</div>
      <input type="text" class="field-input" id="promoGroupId" placeholder="-100xxxxxxxxxx">
    </div>
    <div class="field-row">
  <div class="field-lbl">PHOTO (optional)</div>
  <div style="display:flex;gap:8px;align-items:center;">
    <label class="file-btn" id="promoFileLabel" style="flex:1;">📷 Choose Photo
      <input type="file" id="promoFile" accept="image/*" style="display:none;" onchange="onPromoFileChange()">
    </label>
    <button id="promoFileX" onclick="removePromoPhoto()" style="display:none;background:var(--red);border:none;border-radius:8px;color:#fff;width:34px;height:34px;cursor:pointer;font-size:16px;flex-shrink:0;">✕</button>
  </div>
</div>
    <button class="main-btn btn-gold" onclick="sendPromo()">📤 SEND NOW</button>
  </div>

  <div class="auto-card" style="border-color:var(--cyan);">
    <div class="auto-header"><div class="auto-title" style="color:var(--cyan);">⏰ AUTO INTERVAL PROMO</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">MESSAGE</div>
      <textarea class="field-input" id="intervalText" placeholder="Auto promotion message..."></textarea>
    </div>
    <div class="field-row">
      <div class="field-lbl">INTERVAL</div>
      <select class="field-input" id="intervalMs">
        <option value="1800000">30 ደቂቃ</option>
        <option value="3600000" selected>1 ሰዓት</option>
        <option value="7200000">2 ሰዓት</option>
        <option value="10800000">3 ሰዓት</option>
        <option value="21600000">6 ሰዓት</option>
        <option value="43200000">12 ሰዓት</option>
        <option value="86400000">1 ቀን</option>
      </select>
    </div>
    <div class="field-row">
      <div class="field-lbl">TARGET</div>
      <select class="field-input" id="intervalTarget">
        <option value="bot">🤖 Bot Users</option>
        <option value="group">👥 Group</option>
      </select>
    </div>
    <div class="field-row" id="intervalGroupRow" style="display:none;">
      <div class="field-lbl">GROUP ID</div>
      <input type="text" class="field-input" id="intervalGroupId" placeholder="-100xxxxxxxxxx">
    </div>
    <div class="field-row">
      <div class="field-lbl">PHOTO (optional)</div>
      <label class="file-btn" id="intervalFileLabel">📷 Choose Photo
        <input type="file" id="intervalFile" accept="image/*" style="display:none;" onchange="onFileChange('intervalFile','intervalFileLabel')">
      </label>
    </div>
    <button class="main-btn btn-cyan" onclick="createIntervalPromo()">⏰ CREATE INTERVAL PROMO</button>
  </div>

  <div class="auto-card" style="border-color:var(--border);">
    <div class="auto-header">
      <div class="auto-title" style="color:var(--text);">📋 ACTIVE PROMOS</div>
      <button class="refresh-btn" onclick="fetchPromos()">🔄</button>
    </div>
    <div class="divider"></div>
    <div id="promoList" style="padding:14px;"><div class="loading">Loading...</div></div>
  </div>
</div>
</div>

<!-- ══════════════ PAGE: AGENTS ══════════════ -->
<div class="page" id="page-agents">
<div class="main">

  <div class="auto-card" style="border-color:var(--blue);">
    <div class="auto-header"><div class="auto-title" style="color:var(--blue);">➕ ADD AGENT</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">AGENT NAME</div>
      <input type="text" class="field-input" id="agentName" placeholder="ስም">
    </div>
    <div class="field-row">
      <div class="field-lbl">ID NUMBER</div>
      <input type="text" class="field-input" id="agentId" placeholder="ቁጥር">
    </div>
    <button class="main-btn btn-blue" onclick="addAgent()">➕ ADD AGENT</button>
  </div>

  <div class="auto-card" style="border-color:var(--gold);">
    <div class="auto-header"><div class="auto-title" style="color:var(--gold);">🔐 AGENT PASSWORD</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">NEW PASSWORD</div>
      <input type="password" class="field-input" id="agentPass" placeholder="Password">
    </div>
    <button class="main-btn btn-gold" onclick="changeAgentPass()">🔐 CHANGE PASSWORD</button>
  </div>

  <div class="auto-card" style="border-color:var(--border);">
    <div class="auto-header">
      <div class="auto-title" style="color:var(--text);">👥 AGENTS &amp; HISTORY</div>
      <button class="refresh-btn" onclick="fetchAgents()">🔄</button>
    </div>
    <div class="divider"></div>
    <div id="agentsList" style="padding:14px;"><div class="loading">Loading...</div></div>
  </div>

</div>
</div>

<!-- ══════════════ PAGE: SETTINGS ══════════════ -->
<div class="page" id="page-settings">
<div class="main">
  <div class="auto-card" style="border-color:var(--red);">
    <div class="auto-header"><div class="auto-title" style="color:var(--red);">🔒 ADMIN CONFIG</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">LOGIN PASSWORD</div>
      <input type="password" class="field-input" id="loginPass" placeholder="Login password">
    </div>
    <div class="field-row">
      <div class="field-lbl">SETTINGS PASSWORD</div>
      <input type="password" class="field-input" id="settingsPass" placeholder="Settings password">
    </div>
    <button class="main-btn btn-stop" onclick="saveConfig()">🔒 SAVE CONFIG</button>
  </div>

  <div class="auto-card" style="border-color:var(--green);">
    <div class="auto-header"><div class="auto-title" style="color:var(--green);">🏦 PAYMENT ACCOUNTS</div></div>
    <div class="divider"></div>
    <div class="field-row" style="padding-top:12px;">
      <div class="field-lbl">CBE ACCOUNT</div>
      <input type="text" class="field-input" id="cbeAccount" placeholder="CBE account number">
    </div>
    <div class="field-row">
      <div class="field-lbl">TELEBIRR ACCOUNT</div>
      <input type="text" class="field-input" id="telebirrAccount" placeholder="Telebirr number">
    </div>
    <button class="main-btn btn-start" onclick="saveAccounts()">💾 SAVE ACCOUNTS</button>
  </div>
</div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script>
const BASE = 'https://admin-panel-production-b31a.up.railway.app';
let autoOn = false;
let selectedCD = 2;
let collapsed = false;
let currentPage = 'home';

// ── PAGE SWITCH ──
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('onclick') === `switchPage('${page}')`) t.classList.add('active');
  });
  currentPage = page;
  if (page === 'withdrawals') fetchWithdrawals();
  if (page === 'notifications') fetchNotifications();
  if (page === 'analytics') fetchAnalytics();
  if (page === 'winners') fetchWinners();
  if (page === 'promotions') fetchPromos();
  if (page === 'agents') fetchAgents();
  if (page === 'settings') fetchConfig();
}

// ── FETCH STATE ──
async function fetchState() {
  try {
    const r = await fetch(`${BASE}/game-state`);
    const d = await r.json();
    document.getElementById('roundNum').textContent = d['autoMode/round'] ?? '—';
    const confirmedCards = d['game/confirmedNumbers'] || {};
    const cards = Object.keys(confirmedCards).length;
    const players = new Set(Object.values(confirmedCards)).size;
    document.getElementById('cardCount').textContent = cards;
    document.getElementById('playerCount').textContent = players;
    document.getElementById('prizeAmt').textContent = d['game/prize'] ?? '0';
    const on = d['autoMode/on'] === true;
    autoOn = on; updateAutoUI(on);
    const cd = d['autoMode/cdMinutes'];
    if (cd) { selectedCD = Number(cd); updateCDButtons(); document.getElementById('savedMin').textContent = cd; document.getElementById('savedMsg').style.display = 'flex'; }
    const speed = d['autoMode/callSpeed'];
    if (speed) document.getElementById('speedSelect').value = String(speed);
    updatePhase(d['autoMode/phase'] || 'idle');
    const cdData = d['game/countdown'];
    if (cdData && cdData.active && cdData.startAt) {
      const remain = Math.max(0, Math.floor((cdData.startAt - Date.now()) / 1000));
      document.getElementById('countdownDisplay').textContent = `${Math.floor(remain/60)}:${String(remain%60).padStart(2,'0')}`;
    } else { document.getElementById('countdownDisplay').textContent = '—'; }
    const botOn = d['smartBot/enabled'] === true;
    updateBotUI(botOn);
    const botWin = d['autoMode/botWinPercent'];
    if (botWin !== undefined) document.getElementById('botWinPct').value = String(botWin);
    const bias = d['autoMode/noBotBias'];
    if (bias !== undefined) document.getElementById('gameBias').value = String(bias);
    const bet = d['game/bet'];
    if (bet) document.getElementById('betAmount').value = bet;
    const pct = d['game/percent'];
    if (pct) document.getElementById('prizePercent').value = String(pct);
    fetchWithdrawalBadge();
  } catch(e) { console.error(e); }
}

function updateAutoUI(on) {
  document.getElementById('statusDot').classList.toggle('off', !on);
  document.getElementById('autoTitle').textContent = on ? 'SERVER AUTO — RUNNING' : 'SERVER AUTO — STOPPED';
  document.getElementById('autoTitle').style.color = on ? 'var(--cyan)' : 'var(--muted)';
  document.getElementById('mainBtn').className = 'main-btn ' + (on ? 'btn-stop' : 'btn-start');
  document.getElementById('btnIcon').textContent = on ? '⏹' : '▶';
  document.getElementById('btnText').textContent = on ? 'STOP AUTO' : 'START AUTO';
}

function updatePhase(phase) {
  const icons = { countdown:'⏱', playing:'🎮', announcing:'🎉', idle:'💤' };
  const labels = { countdown:'COUNTDOWN', playing:'PLAYING', announcing:'ANNOUNCING', idle:'IDLE' };
  const subs = { countdown:'ቆጠራ እየሄደ ነው...', playing:'Game እየተጫወተ ነው!', announcing:'አሸናፊ ይነሳሉ...', idle:'Railway server ያስተዳድራል' };
  document.getElementById('phaseIcon').textContent = icons[phase] || '⏱';
  document.getElementById('phaseText').textContent = labels[phase] || phase.toUpperCase();
  document.getElementById('phaseSub').textContent = subs[phase] || '';
}

function selectCD(min) { selectedCD = min; updateCDButtons(); saveSettings(); }
function updateCDButtons() { document.querySelectorAll('.cd-btn').forEach((btn, i) => btn.classList.toggle('active', (i+1) === selectedCD)); }

async function saveSettings() {
  try {
    const speed = document.getElementById('speedSelect').value;
    await fetch(`${BASE}/admin/set-settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ cdMinutes: selectedCD, callSpeed: Number(speed) }) });
    document.getElementById('savedMin').textContent = selectedCD;
    document.getElementById('savedMsg').style.display = 'flex';
    showToast('✅ Saved: ' + selectedCD + ' ደቂቃ', 'success');
  } catch(e) { showToast('❌ Save failed', 'error'); }
}

async function saveBias() {
  const gameBias = document.getElementById('gameBias').value;
  try {
    const r = await fetch(`${BASE}/admin/set-settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ noBotBias: Number(gameBias) }) });
    const d = await r.json();
    if (d.ok) showToast('✅ Bias saved: ' + gameBias, 'success'); else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function saveGameSettings() {
  const bet = document.getElementById('betAmount').value;
  const percent = document.getElementById('prizePercent').value;
  const gameBias = document.getElementById('gameBias').value;
  if (!bet) return showToast('❌ Bet ያስገባ!', 'error');
  try {
    const r = await fetch(`${BASE}/admin/set-settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bet: Number(bet), percent: Number(percent), noBotBias: Number(gameBias) }) });
    const d = await r.json();
    if (d.ok) showToast('✅ Settings saved!', 'success'); else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function toggleAuto() {
  const btn = document.getElementById('mainBtn');
  btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none';
  try {
    const ep = autoOn ? '/admin/auto-stop' : '/admin/auto-start';
    const r = await fetch(`${BASE}${ep}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
    const d = await r.json();
    if (d.ok) { autoOn = !autoOn; updateAutoUI(autoOn); showToast(d.msg || (autoOn ? '✅ Auto started!' : '✅ Auto stopped!'), 'success'); }
    else showToast('❌ ' + (d.msg || 'Error'), 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
}

function toggleCollapse() {
  collapsed = !collapsed;
  document.getElementById('collapseBody').classList.toggle('collapsed', collapsed);
  document.getElementById('collapseBtn').classList.toggle('collapsed', collapsed);
}

function updateBotUI(on) {
  document.getElementById('botDot').classList.toggle('off', !on);
  document.getElementById('botTitle').textContent = on ? 'SMART BOT — RUNNING' : 'SMART BOT — OFF';
  document.getElementById('botTitle').style.color = on ? 'var(--purple)' : 'var(--muted)';
  document.getElementById('botBtn').style.background = on ? 'linear-gradient(135deg,#e53935,#b71c1c)' : 'linear-gradient(135deg,#7b1fa2,#4a148c)';
  document.getElementById('botBtnIcon').textContent = on ? '⏹' : '▶';
  document.getElementById('botBtnText').textContent = on ? 'DISABLE SMART BOT' : 'ENABLE SMART BOT';
}
let wdEnabled = true;

async function fetchWithdrawalStatus() {
  try {
    const r = await fetch(`${BASE}/withdrawal-status`);
    const d = await r.json();
    wdEnabled = d.enabled;
    updateWdUI(wdEnabled);
  } catch(e) {}
}

function updateWdUI(enabled) {
  document.getElementById('wdDot').classList.toggle('off', !enabled);
  document.getElementById('wdTitle').textContent = enabled ? 'WITHDRAWAL — OPEN' : 'WITHDRAWAL — CLOSED';
  document.getElementById('wdTitle').style.color = enabled ? 'var(--green)' : 'var(--red)';
  document.getElementById('wdBtn').className = 'main-btn ' + (enabled ? 'btn-stop' : 'btn-start');
  document.getElementById('wdBtnIcon').textContent = enabled ? '⏹' : '▶';
  document.getElementById('wdBtnText').textContent = enabled ? 'CLOSE WITHDRAWAL' : 'OPEN WITHDRAWAL';
}

async function toggleWithdrawal() {
  const btn = document.getElementById('wdBtn');
  btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none';
  try {
    const r = await fetch(`${BASE}/withdrawal-toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !wdEnabled })
    });
    const d = await r.json();
    if (d.ok) {
      wdEnabled = d.enabled;
      updateWdUI(wdEnabled);
      showToast(wdEnabled ? '✅ Withdrawal OPEN!' : '🔒 Withdrawal CLOSED!', wdEnabled ? 'success' : 'error');
    }
  } catch(e) { showToast('❌ Connection error', 'error'); }
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
}
async function saveBotSettings() {
  const botWinPercent = document.getElementById('botWinPct').value;
  const gameBias = document.getElementById('gameBias').value;
  try {
    const r = await fetch(`${BASE}/admin/set-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        botWinPercent: Number(botWinPercent), 
        noBotBias: Number(gameBias) 
      })
    });
    const d = await r.json();
    if (d.ok) showToast(`✅ Saved! Bot Win: ${botWinPercent}% | Bias: ${gameBias}`, 'success');
    else showToast('❌ Save failed', 'error');
  } catch(e) { 
    showToast('❌ Connection error', 'error'); 
  }
}
async function toggleBot() {
  const btn = document.getElementById('botBtn');
  btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none';
  try {
    const isOn = document.getElementById('botBtnText').textContent.includes('DISABLE');
    const botWinPercent = document.getElementById('botWinPct').value;
    const gameBias = document.getElementById('gameBias').value;
    await fetch(`${BASE}/admin/set-settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ botWinPercent: Number(botWinPercent), noBotBias: Number(gameBias) }) });
    await fetch(`${BASE}/set-state`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key:'smartBot/enabled', value: !isOn }) });
    updateBotUI(!isOn);
    showToast(!isOn ? '✅ Smart Bot enabled!' : '✅ Smart Bot disabled!', 'success');
  } catch(e) { showToast('❌ Error', 'error'); }
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
}

async function removeBots() {
  try {
    const r = await fetch(`${BASE}/remove-bots`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
    const d = await r.json();
    if (d.ok) showToast('✅ Bots removed!', 'success'); else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function giveBalance() {
  const uid = document.getElementById('giveUid').value.trim();
  const amount = document.getElementById('giveAmount').value;
  if (!uid) return showToast('❌ Telegram ID ያስገባ!', 'error');
  if (!amount) return showToast('❌ Amount ያስገባ!', 'error');
  try {
    const r = await fetch(`${BASE}/give-balance`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uid, amount: Number(amount) }) });
    const d = await r.json();
    if (d.ok) { showToast(`✅ ${amount} ብር ተጨመረ!`, 'success'); document.getElementById('giveUid').value = ''; document.getElementById('giveAmount').value = ''; }
    else showToast('❌ ' + (d.msg || 'Error'), 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function updateBalance() {
  const uid = document.getElementById('updateUid').value.trim();
  const amount = document.getElementById('updateAmount').value;
  const type = document.getElementById('updateType').value;
  if (!uid) return showToast('❌ Telegram ID ያስገባ!', 'error');
  if (!amount) return showToast('❌ Amount ያስገባ!', 'error');
  try {
    const r = await fetch(`${BASE}/update-balance`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uid, amount: Number(amount), type }) });
    const d = await r.json();
    if (d.ok) { showToast(`✅ Balance updated! New: ${d.balance} ብር`, 'success'); document.getElementById('updateUid').value = ''; document.getElementById('updateAmount').value = ''; }
    else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function fetchHealth() {
  const grid = document.getElementById('healthGrid');
  grid.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const r = await fetch(`${BASE}/health`);
    const d = await r.json();
    grid.innerHTML = `
      <div class="stat-box"><div class="stat-lbl">STATUS</div><div class="stat-val c-green">${d.ok ? '✅ ONLINE' : '❌ DOWN'}</div></div>
      <div class="stat-box"><div class="stat-lbl">USERS</div><div class="stat-val c-cyan">${d.users ?? '—'}</div></div>
      <div class="stat-box"><div class="stat-lbl">NOTIFICATIONS</div><div class="stat-val c-purple">${d.notifications ?? '—'}</div></div>
      <div class="stat-box"><div class="stat-lbl">WINNERS</div><div class="stat-val c-gold">${d.winners ?? '—'}</div></div>
      <div class="stat-box" style="grid-column:span 2;"><div class="stat-lbl">DB SIZE</div><div class="stat-val c-blue">${d.db_size ?? '—'}</div></div>`;
  } catch(e) { grid.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">❌ Server unreachable</div>'; }
}

async function fetchWithdrawalBadge() {
  try {
    const r = await fetch(`${BASE}/withdrawals`);
    const d = await r.json();
    const keys = Object.keys(d.withdrawals || {}).filter(k => d.withdrawals[k].status === 'pending');
    document.getElementById('wdTabBadge').textContent = keys.length > 0 ? ` (${keys.length})` : '';
  } catch(e) {}
}

async function fetchWithdrawals() {
  const list = document.getElementById('wdList');
  if (!list) return;
  list.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const r = await fetch(`${BASE}/withdrawals`);
    const d = await r.json();
    const wds = d.withdrawals || {};
    const keys = Object.keys(wds).filter(k => wds[k].status === 'pending');
    if (!keys.length) { list.innerHTML = '<div class="empty">ምንም pending withdrawal የለም</div>'; return; }
    list.innerHTML = keys.map(key => {
      const w = wds[key];
      return `<div class="list-item">
        <div class="list-item-header">
          <span class="list-item-name">👤 ${w.user_id}</span>
          <span class="list-item-val">${w.amount} ብር</span>
        </div>
        ${w.method ? `<div style="font-size:12px;color:var(--cyan);margin-bottom:4px;">📱 ${w.method} — ${w.account || '—'}</div>` : ''}
        <div class="list-item-sub">${new Date(w.time).toLocaleString()}</div>
        <div class="row-btns">
          <button class="small-btn s-green" onclick="wdAction('${key}','approve','${w.user_id}',${w.amount})">✅ APPROVE</button>
          <button class="small-btn s-red" onclick="wdAction('${key}','reject','${w.user_id}',${w.amount})">❌ REJECT</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) { list.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">❌ Error</div>'; }
}

async function wdAction(key, action, uid, amount) {
  try {
    const r = await fetch(`${BASE}/withdrawal-action`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, action, uid, amount }) });
    const d = await r.json();
    if (d.ok) { showToast(action === 'approve' ? '✅ Approved!' : '✅ Rejected!', 'success'); fetchWithdrawals(); fetchWithdrawalBadge(); }
    else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function fetchNotifications() {
  const list = document.getElementById('notifList');
  list.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const r = await fetch(`${BASE}/unread-notifications`);
    const d = await r.json();
    if (!d.length) { list.innerHTML = '<div class="empty">ምንም unread notification የለም ✅</div>'; return; }
    list.innerHTML = d.map(n => `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-name">👤 ${n.uid}</span>
          <button class="small-btn s-cyan" style="width:auto;padding:6px 12px;" onclick="markRead(${n.id}, this)">✓ READ</button>
        </div>
        <div style="color:var(--text);font-size:13px;font-family:'Noto Sans Ethiopic',sans-serif;">${n.message}</div>
      </div>`).join('');
  } catch(e) { list.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">❌ Error</div>'; }
}

async function markRead(id, btn) {
  try {
    await fetch(`${BASE}/mark-notification-read`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    btn.closest('.list-item').remove();
    showToast('✅ Marked as read', 'success');
  } catch(e) { showToast('❌ Error', 'error'); }
}
async function clearAnalytics() {
  if (!confirm('Analytics ሁሉ ይጠፋል! እርግጠኛ ነህ?')) return;
  try {
    const r = await fetch(`${BASE}/clear-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const d = await r.json();
    if (d.ok) { showToast('✅ Analytics cleared!', 'success'); fetchAnalytics(); }
    else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}
async function fetchAnalytics() {
  const list = document.getElementById('analyticsList');
  if (!list) return;
  try {
    const r = await fetch(`${BASE}/game-state`);
    const d = await r.json();
    const totalCollected   = d['analytics/totalCollected']   || 0;
    const totalPaidOut     = d['analytics/totalPaidOut']     || 0;
    const totalProfit      = d['analytics/totalProfit']      || 0;
    const botBet           = d['analytics/botBet']           || 0;
    const totalDeposits    = d['analytics/totalDeposits']    || 0;
    const totalWithdrawals = d['analytics/totalWithdrawals'] || 0;
    const history          = d['analytics/history']          || [];
    const isProfit = totalProfit >= 0;
    const profitColor = isProfit ? 'var(--green)' : 'var(--red)';
    const profitBg = isProfit ? 'linear-gradient(135deg,#1b5e20,#0a1f0a)' : 'linear-gradient(135deg,#7f0000,#1a0000)';
    const profitBorder = isProfit ? 'var(--green)' : 'var(--red)';
    const profitLabel = isProfit ? '🏠 TOTAL HOUSE PROFIT' : '📉 TOTAL HOUSE LOSS';
    list.innerHTML = `
      <div style="background:${profitBg};border:2px solid ${profitBorder};border-radius:14px;padding:18px;margin-bottom:14px;text-align:center;">
        <div style="color:var(--muted);font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:6px;">${profitLabel}</div>
        <div style="color:${profitColor};font-size:36px;font-weight:700;">${totalProfit >= 0 ? '+' : ''}${totalProfit} ብር</div>
        <div style="color:var(--muted);font-size:12px;margin-top:8px;font-family:'Noto Sans Ethiopic',sans-serif;line-height:1.6;">
          Bot ካሸነፈ → ሰዎች bet ሁሉ ቤቱ ያገኛል ✅<br>Real player ካሸነፈ → ሰዎች bet - prize = ±ብር
        </div>
      </div>
      <div style="color:var(--cyan);font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:8px;">📊 GAME STATS</div>
      <div class="stat-grid" style="padding:0 0 14px;">
        <div class="stat-box"><div class="stat-lbl">REAL BETS COLLECTED</div><div class="stat-val c-cyan">${totalCollected} ብር</div></div>
        <div class="stat-box"><div class="stat-lbl">TOTAL PAID OUT</div><div class="stat-val c-gold">${totalPaidOut} ብር</div></div>
        <div class="stat-box"><div class="stat-lbl">BOT BET (ቤቱ)</div><div class="stat-val c-purple">${botBet} ብር</div></div>
        <div class="stat-box"><div class="stat-lbl">TOTAL DEPOSITS</div><div class="stat-val c-blue">${totalDeposits} ብር</div></div>
        <div class="stat-box" style="grid-column:span 2;"><div class="stat-lbl">TOTAL WITHDRAWALS</div><div class="stat-val c-red">${totalWithdrawals} ብር</div></div>
      </div>
      <div style="color:var(--cyan);font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:10px;">📅 7 ቀን HISTORY</div>
      ${history.length ? history.slice(-7).reverse().map(h => {
        const hp = h.profit || 0;
        const hc = hp >= 0 ? 'var(--green)' : 'var(--red)';
        return `<div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="color:var(--muted);font-size:13px;">${h.date}</div>
            <div style="color:${hc};font-weight:700;font-size:16px;">${hp >= 0 ? '+' : ''}${hp} ብር</div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${h.rounds ? `<span style="color:var(--muted);font-size:11px;">🎮 ${h.rounds} rounds</span>` : ''}
            ${h.botWins ? `<span style="color:var(--muted);font-size:11px;">🤖 Bot wins: <span style="color:var(--green);">${h.botWins}</span></span>` : ''}
            ${h.playerWins ? `<span style="color:var(--muted);font-size:11px;">👤 Player wins: <span style="color:var(--red);">${h.playerWins}</span></span>` : ''}
          </div>
        </div>`;
      }).join('') : '<div class="empty">History የለም</div>'}`;
  } catch(e) { if (list) list.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">❌ Error</div>'; }
}

async function fetchWinners() {
  const list = document.getElementById('winnersList');
  list.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const r = await fetch(`${BASE}/all-winners`);
    const d = await r.json();
    const winners = d.winners || [];
    if (!winners.length) { list.innerHTML = '<div class="empty">ምንም winner የለም</div>'; return; }
    list.innerHTML = winners.map(w => `
      <div class="winner-row">
        <div class="winner-left">
          <div class="wname">${w.displayName || w.user}</div>
          <div class="wcard">Card #${w.cardId}</div>
        </div>
        <div class="winner-right">
          <div class="wprize">${w.prize} ብር</div>
          <div class="wtime">${new Date(w.time).toLocaleString()}</div>
        </div>
      </div>`).join('');
  } catch(e) { list.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">❌ Error</div>'; }
}

// ── PROMOTIONS ──
document.getElementById('promoTarget').addEventListener('change', function() {
  document.getElementById('promoGroupRow').style.display = this.value === 'group' ? 'flex' : 'none';
});
document.getElementById('intervalTarget').addEventListener('change', function() {
  document.getElementById('intervalGroupRow').style.display = this.value === 'group' ? 'flex' : 'none';
});

function onFileChange(inputId, labelId) {
  const f = document.getElementById(inputId).files[0];
  const lbl = document.getElementById(labelId);
  if (f) { lbl.textContent = '✅ ' + f.name; lbl.classList.add('has-file'); }
  else { lbl.textContent = '📷 Choose Photo'; lbl.classList.remove('has-file'); }
}

let sendNowPromoId = null;
let sendNowPhotoUrl = null;

async function onPromoFileChange() {
  const file = document.getElementById('promoFile').files[0];
  const label = document.getElementById('promoFileLabel');
  const xBtn = document.getElementById('promoFileX');
  if (!file) return;

  label.textContent = '⏳ Uploading...';
  const formData = new FormData();
  formData.append('photo', file);
  try {
    const r = await fetch(`${BASE}/save-promo-photo`, { method:'POST', body: formData });
    const d = await r.json();
    if (d.ok) {
      sendNowPromoId = d.promoId;
      sendNowPhotoUrl = d.photoUrl;
      label.textContent = '✅ ' + file.name;
      label.classList.add('has-file');
      xBtn.style.display = 'inline-flex';
      showToast('✅ Photo uploaded!', 'success');
    } else {
      label.textContent = '📷 Choose Photo';
      showToast('❌ Upload failed', 'error');
    }
  } catch(e) {
    label.textContent = '📷 Choose Photo';
    showToast('❌ Connection error', 'error');
  }
}

async function removePromoPhoto() {
  if (!sendNowPromoId && !sendNowPhotoUrl) return;
  try {
    await fetch(`${BASE}/delete-promo-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promoId: sendNowPromoId, photoUrl: sendNowPhotoUrl })
    });
  } catch(e) {}
  sendNowPromoId = null;
  sendNowPhotoUrl = null;
  document.getElementById('promoFile').value = '';
  document.getElementById('promoFileLabel').textContent = '📷 Choose Photo';
  document.getElementById('promoFileLabel').classList.remove('has-file');
  document.getElementById('promoFileX').style.display = 'none';
  showToast('✅ Photo removed!', 'success');
}

async function sendPromo() {
  const text = document.getElementById('promoText').value.trim();
  const targetType = document.getElementById('promoTarget').value;
  const groupId = document.getElementById('promoGroupId').value.trim();
  const file = document.getElementById('promoFile').files[0];
  if (!text && !file) return showToast('❌ Message ወይም Photo ያስፈልጋል!', 'error');
  const formData = new FormData();
  formData.append('text', text);
  formData.append('targetType', targetType);
  if (groupId) formData.append('groupId', groupId);
  if (sendNowPhotoUrl) formData.append('photoUrl', sendNowPhotoUrl);
  else if (file) formData.append('photo', file);
  try {
    const r = await fetch(`${BASE}/send-promotion`, { method:'POST', body: formData });
    const d = await r.json();
    if (d.ok) {
      showToast(d.msg || '✅ Promotion ተላከ!', 'success');
      document.getElementById('promoText').value = '';
      // Photo ከ DB ይሰርዛል (ከ Cloudinary አይሰርዝም — ተልኳልና)
      if (sendNowPromoId) {
        await fetch(`${BASE}/delete-promo-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promoId: sendNowPromoId, photoUrl: null })
        });
      }
      sendNowPromoId = null;
      sendNowPhotoUrl = null;
      document.getElementById('promoFile').value = '';
      document.getElementById('promoFileLabel').textContent = '📷 Choose Photo';
      document.getElementById('promoFileLabel').classList.remove('has-file');
      document.getElementById('promoFileX').style.display = 'none';
    } else showToast('❌ ' + (d.msg || 'Error'), 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function createIntervalPromo() {
  const text = document.getElementById('intervalText').value.trim();
  const intervalMs = document.getElementById('intervalMs').value;
  const targetType = document.getElementById('intervalTarget').value;
  const groupId = document.getElementById('intervalGroupId').value.trim();
  const file = document.getElementById('intervalFile').files[0];
  if (!text && !file) return showToast('❌ Message ወይም Photo ያስፈልጋል!', 'error');
  const formData = new FormData();
  formData.append('text', text); formData.append('intervalMs', intervalMs); formData.append('targetType', targetType);
  if (groupId) formData.append('groupId', groupId);
  if (file) formData.append('photo', file);
  try {
    const r = await fetch(`${BASE}/create-interval-promotion`, { method:'POST', body: formData });
    const d = await r.json();
    if (d.ok) { showToast(d.msg || '✅ Interval Promo ተፈጠረ!', 'success'); document.getElementById('intervalText').value = ''; fetchPromos(); }
    else showToast('❌ ' + (d.msg || 'Error'), 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function fetchPromos() {
  const list = document.getElementById('promoList');
  list.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const r = await fetch(`${BASE}/promotions-list`);
    const d = await r.json();
    if (!d.length) { list.innerHTML = '<div class="empty">ምንም active promo የለም</div>'; return; }
    const intervals = { 1800000:'30min', 3600000:'1hr', 7200000:'2hr', 10800000:'3hr', 21600000:'6hr', 43200000:'12hr', 86400000:'1day' };
    list.innerHTML = d.map(p => `
      <div class="list-item">
        <div class="list-item-header">
          <span class="promo-tag">⏰ ${intervals[p.interval_ms] || (p.interval_ms/3600000).toFixed(1)+'hr'}</span>
          <span class="promo-tag">📡 ${p.target_type}</span>
        </div>
        <div style="color:var(--text);font-size:13px;margin:8px 0;font-family:'Noto Sans Ethiopic',sans-serif;">${p.text || '(Photo only)'}</div>
        ${p.photo_url ? `<div style="font-size:11px;color:var(--cyan);margin-bottom:8px;">📷 Photo attached</div>` : ''}
        <button class="small-btn s-red" onclick="if(confirm('Promo ይሰረዛል?')) deletePromo(${p.id})">🗑️ DELETE</button>
      </div>`).join('');
  } catch(e) { list.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">❌ Error</div>'; }
}

async function deletePromo(id) {
  try {
    const r = await fetch(`${BASE}/delete-promotion`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    const d = await r.json();
    if (d.ok) { showToast('✅ Promo deleted!', 'success'); fetchPromos(); }
    else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

// ══════════════════════════════════════════════════
//  AGENTS — 5 ቀን DAILY HISTORY
// ══════════════════════════════════════════════════
function getLast5Days() {
  const days = [];
  for (let i = 4; i >= 0; i--) {
    const s = new Date(); s.setHours(0,0,0,0); s.setDate(s.getDate() - i);
    const e = new Date(s.getTime() + 86400000);
    const label = s.toLocaleDateString('am-ET', { month:'short', day:'numeric' });
    days.push({ label, start: s.getTime(), end: e.getTime() });
  }
  return days;
}

function fmtT(str) {
  try { return new Date(str).toLocaleTimeString('am-ET', { hour:'2-digit', minute:'2-digit' }); } catch { return ''; }
}

async function fetchAgents() {
  const list = document.getElementById('agentsList');
  list.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const [agentsData, wData] = await Promise.all([
      fetch(`${BASE}/agents`).then(r => r.json()),
      fetch(`${BASE}/withdrawals`).then(r => r.json())
    ]);
    const allWD = wData.withdrawals || {};
    const names = Object.keys(agentsData);
    if (!names.length) { list.innerHTML = '<div class="empty">ምንም agent አልተጨመረም</div>'; return; }

    const days = getLast5Days();

    list.innerHTML = names.map(name => {
      const info = agentsData[name];
      const myTx = Object.values(allWD).filter(
        w => w.acceptedBy === name && (w.status === 'approved' || w.status === 'rejected')
      );
      const totalApprAmt = myTx.filter(w => w.status === 'approved').reduce((s,w) => s + (w.amount||0), 0);
      const totalApprCnt = myTx.filter(w => w.status === 'approved').length;
      const totalRejCnt  = myTx.filter(w => w.status === 'rejected').length;

      const dayStats = days.map(day => {
        const dt = myTx.filter(w => { const t = w.time ? new Date(w.time).getTime() : 0; return t >= day.start && t < day.end; });
        const appr = dt.filter(w => w.status === 'approved');
        const rej  = dt.filter(w => w.status === 'rejected');
        return { label: day.label, all: dt, appr, rej, apprAmt: appr.reduce((s,w) => s+(w.amount||0), 0) };
      });

      const maxAmt = Math.max(...dayStats.map(d => d.apprAmt), 1);
      const cid = 'ac-' + name.replace(/[^a-zA-Z0-9]/g, '_');

      return `
<div class="agent-card" id="${cid}">
  <div class="agent-card-header" onclick="toggleAgent('${cid}')">
    <div class="agent-name-row">
      <div class="agent-avatar">🕵️</div>
      <div>
        <div class="agent-name">${name}</div>
        <div class="agent-id-tag">ID: ${info.id_number || '—'}</div>
      </div>
    </div>
    <div class="agent-summary">
      <div class="agent-sum-pill"><span>PAID</span>${totalApprAmt.toLocaleString()} ብር</div>
      <div class="agent-sum-pill"><span>TX</span>${totalApprCnt} ጊዜ</div>
      <div class="agent-sum-pill red"><span>REJ</span>${totalRejCnt} ጊዜ</div>
      <div class="agent-toggle-icon" id="ico-${cid}">▼</div>
    </div>
  </div>

  <div class="agent-history-body" id="bdy-${cid}">

    <!-- 5 ቀን MINI BAR CHART -->
    <div class="agent-mini-chart">
      <div class="mini-chart-title">📊 5 ቀን OVERVIEW</div>
      <div class="mini-bar-row">
        ${dayStats.map(d => `
          <div class="mini-bar-col">
            <div class="mini-bar-amt">${d.apprAmt > 0 ? (d.apprAmt >= 1000 ? (d.apprAmt/1000).toFixed(1)+'k' : d.apprAmt) : '—'}</div>
            <div class="mini-bar" style="height:${Math.max(3, Math.round(d.apprAmt/maxAmt*44))}px;"></div>
            <div class="mini-bar-day">${d.label}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- PER DAY BREAKDOWN -->
    ${dayStats.map(d => {
      const total = d.all.length || 1;
      const apprPct = Math.round(d.appr.length / total * 100);
      const rejPct  = Math.round(d.rej.length  / total * 100);
      return `
      <div class="day-section">
        <div class="day-header">
          <div class="day-label">📅 ${d.label}</div>
          <div class="day-stats-row">
            <div class="day-stat-val" style="color:var(--green);">✅ ${d.apprAmt.toLocaleString()} ብር (${d.appr.length})</div>
            <div style="color:var(--muted);font-size:11px;">|</div>
            <div class="day-stat-val" style="color:var(--red);">❌ ${d.rej.length}</div>
          </div>
        </div>
        ${d.all.length > 0 ? `
        <div class="day-bars">
          <div class="dbar-row">
            <div class="dbar-lbl">APPROVED</div>
            <div class="dbar-track"><div class="dbar-fill approved" style="width:${apprPct}%;"></div></div>
            <div class="dbar-val" style="color:var(--green);">${d.appr.length} · ${apprPct}%</div>
          </div>
          <div class="dbar-row">
            <div class="dbar-lbl">REJECTED</div>
            <div class="dbar-track"><div class="dbar-fill rejected" style="width:${rejPct}%;"></div></div>
            <div class="dbar-val" style="color:var(--red);">${d.rej.length} · ${rejPct}%</div>
          </div>
        </div>
        <div class="tx-list">
          ${d.all.sort((a,b) => new Date(b.time) - new Date(a.time)).map(w => `
            <div class="tx-row">
              <div class="tx-user">${w.display || w.full_name || w.username || w.user_id || '—'}</div>
              <div class="tx-method">${w.method || 'BANK'}</div>
              <div class="tx-amount">${(w.amount||0).toLocaleString()} ብር</div>
              <div class="${w.status === 'approved' ? 'tx-ok' : 'tx-no'}">${w.status === 'approved' ? '✅ PAID' : '❌ REJ'}</div>
              <div class="tx-time">${fmtT(w.time)}</div>
            </div>`).join('')}
        </div>` : '<div class="no-tx">— ምንም transaction የለም —</div>'}
      </div>`;
    }).join('')}

    <div style="padding:12px 14px;">
      <button class="small-btn s-red" onclick="deleteAgent('${name}')">🗑️ REMOVE AGENT</button>
    </div>
  </div>
</div>`;
    }).join('');

  } catch(e) {
    list.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">❌ Error loading agents</div>';
    console.error(e);
  }
}

function toggleAgent(cid) {
  const bdy = document.getElementById('bdy-' + cid);
  const ico = document.getElementById('ico-' + cid);
  const open = bdy.classList.toggle('open');
  ico.classList.toggle('open', open);
}

async function addAgent() {
  const name = document.getElementById('agentName').value.trim();
  const id_number = document.getElementById('agentId').value.trim();
  if (!name) return showToast('❌ Name ያስገባ!', 'error');
  if (!id_number) return showToast('❌ ID Number ያስገባ!', 'error');
  try {
    const r = await fetch(`${BASE}/add-agent`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, id_number }) });
    const d = await r.json();
    if (d.ok) { showToast('✅ Agent added!', 'success'); document.getElementById('agentName').value=''; document.getElementById('agentId').value=''; fetchAgents(); }
    else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function deleteAgent(name) {
  try {
    const r = await fetch(`${BASE}/delete-agent`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
    const d = await r.json();
    if (d.ok) { showToast('✅ Agent removed!', 'success'); fetchAgents(); }
    else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function changeAgentPass() {
  const password = document.getElementById('agentPass').value;
  if (!password) return showToast('❌ Password ያስገባ!', 'error');
  try {
    const r = await fetch(`${BASE}/change-agent-pass`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password }) });
    const d = await r.json();
    if (d.ok) { showToast('✅ Password changed!', 'success'); document.getElementById('agentPass').value=''; }
    else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

// ── SETTINGS ──
async function fetchConfig() {
  try {
    await fetch(`${BASE}/get-config`);
    document.getElementById('loginPass').placeholder = 'Current: ****';
    document.getElementById('settingsPass').placeholder = 'Current: ****';
  } catch(e) {}
}

async function saveConfig() {
  const loginPassword = document.getElementById('loginPass').value;
  const settingsPassword = document.getElementById('settingsPass').value;
  if (!loginPassword && !settingsPassword) return showToast('❌ Password ያስገባ!', 'error');
  try {
    const r = await fetch(`${BASE}/save-config`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ loginPassword, settingsPassword }) });
    const d = await r.json();
    if (d.ok) { showToast('✅ Config saved!', 'success'); document.getElementById('loginPass').value=''; document.getElementById('settingsPass').value=''; }
    else showToast('❌ ' + (d.msg || 'Error'), 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

async function saveAccounts() {
  const cbe = document.getElementById('cbeAccount').value.trim();
  const telebirr = document.getElementById('telebirrAccount').value.trim();
  if (!cbe && !telebirr) return showToast('❌ Account ያስገባ!', 'error');
  try {
    const r = await fetch(`${BASE}/save-accounts`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ cbe, telebirr }) });
    const d = await r.json();
    if (d.ok) showToast('✅ Accounts saved!', 'success'); else showToast('❌ Error', 'error');
  } catch(e) { showToast('❌ Connection error', 'error'); }
}

// ── TOAST ──
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast ' + type; }, 2800);
}

// ── INIT ──
fetchState();
fetchHealth();
fetchWithdrawalStatus();
setInterval(fetchState, 4000);
setInterval(fetchWithdrawalStatus, 10000);
</script>
</body>
</html>
