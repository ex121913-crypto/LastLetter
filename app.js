/* app.js — Last Letter Engine */
(function () {
  'use strict';
  var ALP = 'abcdefghijklmnopqrstuvwxyz', CIRC = 2 * Math.PI * 26;
  var CFG = { lives: 3, tries: 5, candidates: 'on', wordbank: 'sowpods', radius: 20, theme: 'liquid', scale: 1.3, blur: 24, llmApiKey: '', llmModel: 'GLM-5.1', llmHost: 'https://cmkey.cn/v1', llmCors: false };
  var S = {}, typed = '', tickId = null, defCache = {};
  var $ = function (id) { return document.getElementById(id); };

  try { var sv = JSON.parse(localStorage.getItem('ll_cfg')); if (sv) { if (sv.wordbank === 'full' || sv.wordbank === 'dwyl' || !sv.wordbank) sv.wordbank = 'sowpods'; if (sv.theme === 'light' || !sv.theme) sv.theme = 'liquid'; Object.assign(CFG, sv); } } catch (e) { }
  applyCfg();
  Dict.load($('dict-status'), CFG.wordbank).then(function () { buildBotGrid(); renderHistory(); updateGlobalUsed(); });

  function showScreen(id) { document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); }); $(id).classList.add('active'); }
  document.querySelectorAll('[data-screen]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.classList.contains('menu-btn') && !Dict.isReady()) return;
      showScreen(b.getAttribute('data-screen'));
    });
  });
  document.querySelectorAll('.diff-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      b.parentElement.querySelectorAll('.diff-btn').forEach(function (x) { x.classList.remove('selected'); }); b.classList.add('selected');
    });
  });

  // Settings
  $('btn-settings-open').addEventListener('click', function () {
    $('s-wordbank').value = CFG.wordbank; $('s-lives').value = CFG.lives; $('s-tries').value = CFG.tries;
    $('s-cand').value = CFG.candidates; $('s-radius').value = CFG.radius; $('s-theme').value = CFG.theme;
    $('s-scale').value = CFG.scale; $('s-blur').value = CFG.blur;
    $('s-llm-key').value = CFG.llmApiKey || ''; $('s-llm-model').value = CFG.llmModel || 'GLM-5.1';
    $('s-llm-host').value = CFG.llmHost || 'https://cmkey.cn/v1'; $('s-llm-cors').checked = !!CFG.llmCors;
    renderOmegaConfig();
    showScreen('screen-settings');
  });
  $('btn-save-settings').addEventListener('click', function () {
    CFG.lives = +$('s-lives').value; CFG.tries = +$('s-tries').value; CFG.candidates = $('s-cand').value;
    CFG.radius = +$('s-radius').value; CFG.theme = $('s-theme').value; CFG.scale = +$('s-scale').value; CFG.blur = +$('s-blur').value;
    CFG.llmApiKey = $('s-llm-key').value.trim(); CFG.llmModel = $('s-llm-model').value.trim() || 'GLM-5.1';
    CFG.llmHost = $('s-llm-host').value.trim() || 'https://cmkey.cn/v1'; CFG.llmCors = $('s-llm-cors').checked;
    var wb = $('s-wordbank').value;
    if (wb !== CFG.wordbank) { CFG.wordbank = wb; Dict.load($('dict-status'), wb); }
    try { localStorage.setItem('ll_cfg', JSON.stringify(CFG)); } catch (e) { }
    applyCfg(); showScreen('screen-menu');
  });
  function applyCfg(){
  var r=document.documentElement;
  r.style.setProperty('--radius',CFG.radius+'px');
  r.style.setProperty('--scale',CFG.scale);
  r.style.setProperty('--blur',CFG.blur+'px');
  r.setAttribute('data-theme',CFG.theme);
  
  // Liquid Glass engine
  if(CFG.theme==='liquid'){
    // 1. Force the engine to clear all old cached sizes and SVG maps first
    LiquidEngine.deactivate(); 
    
    // 2. Wait slightly longer for the browser to render the new CSS scale, then recalculate
    setTimeout(function(){ LiquidEngine.activate(); }, 150);
  } else {
    LiquidEngine.deactivate();
  }
}

  // History
  var globalUsedWords = new Set();
  function updateGlobalUsed() {
    globalUsedWords.clear();
    getHist().forEach(function (g) { if (g.wordList) g.wordList.forEach(function (w) { globalUsedWords.add(w); }); });
  }
  $('btn-history').addEventListener('click', function () { renderHistory(); showScreen('screen-history'); });
  $('btn-clear-history').addEventListener('click', function () {
    if (confirm('Are you sure you want to clear your entire game history? This will also reset your learned words.')) {
      localStorage.removeItem('ll_hist');
      updateGlobalUsed();
      renderHistory();
    }
  });
  function saveHist(e) {
    var h = getHist(); h.unshift(e); if (h.length > 50) h.length = 50;
    try { localStorage.setItem('ll_hist', JSON.stringify(h)); } catch (e) { }
    updateGlobalUsed();
  }
  function getHist() { try { return JSON.parse(localStorage.getItem('ll_hist')) || []; } catch (e) { return []; } }
  function renderHistory() {
    var h = getHist(), el = $('history-list');
    if (!h.length) { el.innerHTML = '<p class="muted">No games yet.</p>'; return; }
    el.innerHTML = '';
    h.forEach(function (g, i) {
      var d = document.createElement('div'); d.className = 'history-item';
      var dt = g.date ? new Date(g.date).toLocaleDateString() : '';
      d.innerHTML = '<div><span class="hi-mode">' + g.mode + '</span>' + (g.bot ? ' vs ' + g.bot : '') +
        '<br><span class="hi-meta">' + g.words + ' words · ' + dt + '</span></div><span class="hi-score">' + g.score + '</span>';
      d.addEventListener('click', function () { showHistDetail(i); });
      el.appendChild(d);
    });
  }
  function showHistDetail(idx) {
    var g = getHist()[idx]; if (!g) return;
    $('hd-summary').innerHTML = '<strong>' + g.mode + (g.bot ? ' vs ' + g.bot : '') + '</strong> — Score: ' + g.score + ' · ' + g.words + ' words · ' + g.rounds + ' rounds';
    var el = $('hd-words'); el.innerHTML = '';
    if (g.wordList && g.wordList.length) {
      var pending = g.wordList.length;
      g.wordList.forEach(function (w) {
        var div = document.createElement('div'); div.className = 'hd-word-item';
        div.innerHTML = '<strong>' + w + '</strong> — <em>loading…</em>';
        el.appendChild(div);
        Dict.fetchDefinition(w).then(function (d) {
          div.innerHTML = '<strong>' + w + '</strong>' + (d.pos ? ' <em>(' + d.pos + ')</em>' : '') + ' — ' + d.def;
        });
      });
    } else el.innerHTML = '<p class="muted">Word list not available for this game.</p>';
    showScreen('screen-hist-detail');
  }

  // Bot grid
  function buildBotGrid() {
    var g = $('bot-grid'); g.innerHTML = '';
    Bots.getAll().forEach(function (b) {
      var c = document.createElement('button'); c.className = 'bot-card';
      c.innerHTML = '<span class="bot-avatar">' + b.emoji + '</span><div class="bot-info"><div class="bot-name">' + b.name + '</div><div class="bot-desc">' + b.desc + '</div></div><span class="bot-badge ' + b.diff + '">' + b.diff + '</span>';
      c.addEventListener('click', function () { startGame(window.isLearnVs ? 'vs-learn' : 'vs', b.id); });
      g.appendChild(c);
    });
    if (LiquidEngine.isActive()) LiquidEngine.refresh();
  }

  // Omega Config
  function renderOmegaConfig() {
    var el = $('omega-trap-list'); el.innerHTML = '';
    Bots.OmegaData.learnedSuffixes.forEach(function (s, i) {
      var sp = document.createElement('span'); sp.className = 'bot-badge extreme';
      sp.textContent = s + ' ✕'; sp.style.cursor = 'pointer'; sp.style.padding = '4px 8px';
      sp.addEventListener('click', function () { Bots.OmegaData.learnedSuffixes.splice(i, 1); Bots.saveOmega(); renderOmegaConfig(); });
      el.appendChild(sp);
    });
    if (!Bots.OmegaData.learnedSuffixes.length) el.innerHTML = '<span class="muted" style="margin-top:6px">No traps learned yet. Defeat Omega or add one above!</span>';
  }
  $('btn-omega-add-trap').addEventListener('click', function () {
    var v = $('omega-new-trap').value.trim().toLowerCase();
    if (v && v.length >= 1) { Bots.trainOmega(v); $('omega-new-trap').value = ''; renderOmegaConfig(); }
  });

  // Learn mode — toggle cards, show respective start buttons
  $('btn-learn-chain').addEventListener('click', function () {
    document.querySelectorAll('.learn-card').forEach(function (c) { c.classList.remove('active-card'); });
    this.classList.add('active-card');
    $('learn-options').classList.add('hidden');
    $('learn-chain-start').classList.remove('hidden');
  });
  $('btn-start-chain').addEventListener('click', function () {
    var sel = document.querySelector('#learn-chain-start .diff-btn.selected');
    if (sel && sel.getAttribute('data-chainmode') === 'vs') { window.isLearnVs = true; showScreen('screen-mode-vs'); }
    else { startGame('learn'); }
  });
  $('btn-learn-typing').addEventListener('click', function () {
    document.querySelectorAll('.learn-card').forEach(function (c) { c.classList.remove('active-card'); });
    this.classList.add('active-card');
    $('learn-chain-start').classList.add('hidden');
    $('learn-options').classList.remove('hidden');
  });
  $('btn-start-typing').addEventListener('click', function () { startTypingPractice(); });

  // Start buttons
  $('btn-start-solo').addEventListener('click', function () {
    var sel = document.querySelector('#screen-mode-solo .diff-btn.selected');
    startGame('solo', null, sel ? +sel.getAttribute('data-timer') : 30);
  });
  $('btn-start-endless').addEventListener('click', function () { startGame('endless'); });
  $('btn-replay').addEventListener('click', function () { if (S.mode === 'typing') startTypingPractice(); else startGame(S.isLearn && S.mode === 'vs' ? 'vs-learn' : S.mode, S.botId, S.timerSec); });
  $('btn-go-menu').addEventListener('click', function () { window.isLearnVs = false; showScreen('screen-menu'); });
  $('btn-quit').addEventListener('click', function () { endGame(); });

  // === START GAME ===
  function startGame(mode, botId, timerSec) {
    if (!Dict.isReady()) return;
    var isLearn = mode === 'learn' || mode === 'vs-learn';
    var actualMode = mode === 'vs-learn' ? 'vs' : mode;
    var isVs = actualMode === 'vs';
    var isEndless = actualMode === 'endless';
    timerSec = timerSec || (isLearn || isEndless ? 9999 : 30);
    S = {
      mode: actualMode, isLearn: isLearn, botId: botId || null, timerSec: timerSec, timerTicks: timerSec * 10, timer: timerSec * 10,
      round: 1, score: 0, lives: isEndless ? 99 : CFG.lives, tries: CFG.tries, maxTries: CFG.tries,
      prefix: ALP[Math.floor(Math.random() * 26)], usedWords: [], usedSet: new Set(), running: true,
      bestWord: '', bestScore: 0, isPlayerTurn: true, learnedDefs: [], botTimeout: null
    };
    typed = ''; Bots.resetAdaptive();
    $('chain-words').innerHTML = ''; $('def-list').innerHTML = '';
    $('turn-banner').classList.add('hidden'); $('go-learned').classList.add('hidden');
    if (isVs) $('turn-banner').classList.remove('hidden');
    $('timer-ring').style.opacity = timerSec >= 9999 ? '.3' : '1';
    $('sidebar-left').style.display = isLearn && CFG.candidates !== 'off' ? 'flex' : 'none';
    $('sidebar-right').style.display = isLearn ? 'flex' : 'none';
    $('game-layout').className = 'game-layout' + (isLearn ? '' : ' solo-layout');
    var title = isEndless ? 'Endless' : isLearn && !isVs ? 'Learn' : 'Last Letter';
    if (isVs && botId) { var bot = Bots.getById(botId); if (bot) title = 'vs ' + bot.name; }
    $('game-title').textContent = title;
    $('hud-lives').style.display = isEndless ? 'none' : 'flex';
    refreshAll(); showScreen('screen-game');
    if (tickId) clearInterval(tickId); tickId = setInterval(gameTick, 100);
    if (isVs) showTurn(true);
    if (isLearn) updateCands();
  }

  // === KEYBOARD ===
  document.addEventListener('keydown', function (e) {
    if ($('screen-typing').classList.contains('active')) { handleTypingKey(e); return; }
    if (!S.running || !S.isPlayerTurn || !$('screen-game').classList.contains('active')) return;
    if (e.key === 'Backspace') { e.preventDefault(); typed = typed.slice(0, -1); $('wd-typed').textContent = typed; if (S.isLearn) updateCands(); return; }
    if (e.key === 'Enter') { e.preventDefault(); submitWord(); return; }
    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); typed += e.key.toLowerCase(); $('wd-typed').textContent = typed; if (S.isLearn) updateCands(); }
  });

  function submitWord() {
    // Auto-submit: if no typed letters but prefix IS a valid word, submit it
    var word = S.prefix + typed;
    if (!typed.length) {
      if (Dict.isValid(S.prefix) && !S.usedSet.has(S.prefix)) { word = S.prefix; }
      else return;
    }
    if (!Dict.isValid(word)) { S.tries--; updateTries(); fb('Not a valid word', 'error'); shake(); if (S.tries <= 0) loseRound('No tries left!'); return; }
    if (S.usedSet.has(word)) { S.tries--; updateTries(); fb('Already used!', 'error'); shake(); if (S.tries <= 0) loseRound('No tries left!'); return; }
    var pts = scoreWord(word); S.score += pts; S.usedSet.add(word); S.usedWords.push(word);
    if (pts > S.bestScore) { S.bestScore = pts; S.bestWord = word; }
    Bots.recordPlayerWord(word);
    fb('+' + pts, 'success'); addChain(word, pts, 'player');
    if (S.isLearn) addSideDef(word);
    advance(word);
  }

  function advance(word) {
    var diff = S.mode === 'vs' && S.botId ? Bots.getById(S.botId).diff : 'medium';
    var next = Bots.findBestPrefix(word, diff, S.round, S.usedSet);
    S.round++; S.tries = S.maxTries; S.prefix = next; typed = '';
    // Solo timer refill: longer words refill more, diminishes with rounds
    if (S.mode === 'solo' && S.timerSec < 9999) {
      var baseRefill = Math.max(5, S.timerSec - Math.floor(S.round / 3));// shrinks each 3 rounds
      var lengthBonus = Math.min(word.length * 2, 20);// up to +20 ticks for long words
      var speedBonus = Math.floor(S.timer / S.timerTicks * 10);// bonus for answering fast
      var refill = Math.min((baseRefill + lengthBonus + speedBonus) * 10, S.timerTicks);
      S.timer = refill;
    } else {
      S.timer = S.timerTicks;
    }
    refreshAll(); if (S.isLearn) updateCands();
    if (S.mode === 'vs') { S.isPlayerTurn = false; showTurn(false); botTurn(); }
  }

  function botTurn() {
    S.botTimeout = setTimeout(async function () {
      if (!S.running) return;
      var word = await Bots.pickWordAsync(S.botId, S.prefix, S.usedSet);
      if (!word) {
        if (S.botId === 'neuralnet' && S.usedWords.length > 0) {
          var lw = S.usedWords[S.usedWords.length - 1];
          Bots.trainOmega(S.prefix.length >= 2 ? S.prefix : (lw.length >= 4 ? lw.slice(-2) : lw.slice(-1)));
        }
        fb("Bot failed!", 'success'); addChain('— bot failed —', 0, 'skip');
        S.round++; S.prefix = ALP[Math.floor(Math.random() * 26)]; S.timer = S.timerTicks; S.tries = S.maxTries;
        S.isPlayerTurn = true; typed = ''; showTurn(true); refreshAll(); if (S.isLearn) updateCands(); return;
      }
      var pts = scoreWord(word); S.usedSet.add(word); S.usedWords.push(word); addChain(word, pts, 'bot');
      if (S.isLearn) addSideDef(word);
      var diff = Bots.getById(S.botId).diff;
      var next = Bots.findBestPrefix(word, diff, S.round, S.usedSet, true);
      S.round++; S.tries = S.maxTries; S.timer = S.timerTicks; S.prefix = next;
      S.isPlayerTurn = true; typed = ''; showTurn(true); refreshAll(); if (S.isLearn) updateCands();
    }, Bots.getDelay(S.botId));
  }

  function scoreWord(w) { var b = 100 + w.length * (40 + (Math.random() * 10 | 0)); var R = { q: 150, z: 150, x: 150, j: 100, k: 75, v: 75, w: 60, y: 60 }; for (var i = 0; i < w.length; i++)if (R[w[i]]) b += R[w[i]]; return b; }
  function loseRound(r) { S.lives--; updateLives(); if (S.lives <= 0) { endGame(); return; } fb(r, 'error'); addChain('— skip —', 0, 'skip'); S.round++; S.tries = S.maxTries; S.timer = S.timerTicks; S.prefix = ALP[Math.floor(Math.random() * 26)]; typed = ''; refreshAll(); if (S.isLearn) updateCands(); if (S.mode === 'vs') { S.isPlayerTurn = false; showTurn(false); botTurn(); } }
  function gameTick() { if (!S.running || S.timerSec >= 9999) return; if (S.mode === 'vs' && !S.isPlayerTurn) return; if (S.timer > 0) { S.timer--; updateTimer(); } else loseRound("Time's up!"); }

  function endGame() {
    S.running = false; if (tickId) { clearInterval(tickId); tickId = null; } if (S.botTimeout) clearTimeout(S.botTimeout);
    $('go-score').textContent = S.mode === 'endless' ? S.usedWords.length : S.score.toLocaleString();
    $('go-rounds').textContent = S.round; $('go-rounds-lbl').textContent = 'Rounds';
    $('go-words').textContent = S.usedWords.length; $('go-best').textContent = S.bestWord || '—';
    var gc = $('go-chain'); gc.innerHTML = '';
    S.usedWords.forEach(function (w, i) {
      var sp = document.createElement('span'); sp.textContent = w;
      sp.style.cursor = 'default';
      sp.addEventListener('mouseenter', function (ev) { showTip(w, ev); });
      sp.addEventListener('mouseleave', hideTip);
      gc.appendChild(sp);
      if (i < S.usedWords.length - 1) { var sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = ' → '; gc.appendChild(sep); }
    });
    if (S.learnedDefs.length) { $('go-learned').classList.remove('hidden'); var gl = $('go-learned-list'); gl.innerHTML = ''; S.learnedDefs.forEach(function (d) { var div = document.createElement('div'); div.className = 'go-learned-item'; div.innerHTML = '<strong>' + d.word + '</strong>' + (d.pos ? ' <em>(' + d.pos + ')</em>' : '') + ' — ' + d.def; gl.appendChild(div); }); }
    var bn = ''; if (S.botId) { var b = Bots.getById(S.botId); if (b) bn = b.name; }
    var finalScore = S.mode === 'endless' ? S.usedWords.length : S.score;
    if (finalScore > 0) {
      saveHist({ mode: S.mode, bot: bn, score: finalScore, rounds: S.round, words: S.usedWords.length, date: Date.now(), wordList: S.usedWords.slice(0, 200) });
    }
    showScreen('screen-gameover');
  }

  // Side defs (learn, no popup)
  function addSideDef(word) {
    Dict.fetchDefinition(word).then(function (d) {
      S.learnedDefs.push({ word: word, pos: d.pos, def: d.def }); var el = document.createElement('div'); el.className = 'def-entry'; el.innerHTML = '<div class="def-entry-word">' + word + '</div>' + (d.pos ? '<div class="def-entry-pos">' + d.pos + '</div>' : '') +
        '<div class="def-entry-text">' + d.def + '</div><div class="def-entry-src">' + d.source + '</div>'; $('def-list').prepend(el);
    });
  }

  function updateCands() {
    if (CFG.candidates === 'off' || !S.isLearn) return;
    if (!S.isPlayerTurn) {
      $('cand-list').innerHTML = '<div style="text-align:center;padding:30px 10px;font-style:italic;color:var(--ink3);font-size:11px">Waiting for opponent...</div>';
      $('cand-count').textContent = '—';
      return;
    }
    var combinedExclude = new Set(S.usedSet);
    globalUsedWords.forEach(function (w) { combinedExclude.add(w); });

    var pfx = S.prefix + (typed || ''), cands = Dict.findWords(pfx, combinedExclude, CFG.candidates === 'count' ? 0 : 80);
    $('cand-count').textContent = Dict.countWords(pfx, combinedExclude);
    // Sort candidates
    var sort = $('cand-sort') ? $('cand-sort').value : 'alpha';
    var RARE_SCORE = { q: 10, z: 10, x: 10, j: 8, k: 5, v: 5, w: 4, y: 3 };
    function countVowels(w) { var v = 0; for (var i = 0; i < w.length; i++)if ('aeiou'.indexOf(w[i]) !== -1) v++; return v; }
    function rareScore(w) { var s = 0; for (var i = 0; i < w.length; i++)s += (RARE_SCORE[w[i]] || 0); return s; }
    if (sort === 'alpha-desc') cands.sort(function (a, b) { return b.localeCompare(a); });
    else if (sort === 'short') cands.sort(function (a, b) { return a.length - b.length; });
    else if (sort === 'long') cands.sort(function (a, b) { return b.length - a.length; });
    else if (sort === 'vowels') cands.sort(function (a, b) { return countVowels(b) - countVowels(a); });
    else if (sort === 'rare') cands.sort(function (a, b) { return rareScore(b) - rareScore(a); });
    else if (sort === 'random') { for (var i = cands.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cands[i]; cands[i] = cands[j]; cands[j] = t; } }
    else cands.sort();
    var l = $('cand-list'); l.innerHTML = '';
    if (CFG.candidates === 'on') cands.slice(0, 50).forEach(function (w) {
      var d = document.createElement('div'); d.className = 'cand-word'; d.textContent = w;
      d.addEventListener('click', function () {
        if (!S.running || !S.isPlayerTurn) return;
        typed = w.slice(S.prefix.length);
        $('wd-typed').textContent = typed;
        submitWord();
      });
      l.appendChild(d);
    });
  }
  if ($('cand-sort')) $('cand-sort').addEventListener('change', function () { updateCands(); });

  // Tooltip on hover (chain words + game over words)
  function showTip(word, ev) {
    var tip = $('tooltip');
    $('tip-word').textContent = word; $('tip-pos').textContent = ''; $('tip-def').textContent = 'Loading…';
    tip.classList.remove('hidden');
    tip.style.left = Math.min(ev.clientX + 12, window.innerWidth - 290) + 'px';
    tip.style.top = Math.max(ev.clientY - 60, 10) + 'px';
    Dict.fetchDefinition(word).then(function (d) { $('tip-pos').textContent = d.pos; $('tip-def').textContent = d.def; });
  }
  function hideTip() { $('tooltip').classList.add('hidden'); }
  // Add hover to chain words
  var chainEl = $('chain-words');
  chainEl.addEventListener('mouseover', function (e) { var t = e.target.closest('.chain-word'); if (t && !t.classList.contains('skip')) { var w = t.querySelector('.cw-text'); if (w) showTip(w.textContent.trim(), e); } });
  chainEl.addEventListener('mouseout', function (e) { if (e.target.closest('.chain-word')) hideTip(); });

  // UI helpers
  function refreshAll() { $('hud-round').textContent = S.round; $('hud-score').textContent = S.score.toLocaleString(); $('wd-prefix').textContent = S.prefix; $('wd-typed').textContent = typed; updateLives(); updateTries(); updateTimer(); clearFb(); }
  function updateLives() { var el = $('hud-lives'); el.innerHTML = ''; for (var i = 0; i < Math.min(CFG.lives, 10); i++) { var sp = document.createElement('span'); sp.className = 'life-pip' + (i >= S.lives ? ' lost' : ''); sp.textContent = '♥'; el.appendChild(sp); } }
  function updateTries() { var el = $('tries-dots'); el.innerHTML = ''; for (var i = 0; i < Math.min(S.maxTries, 10); i++) { var d = document.createElement('span'); d.className = 'try-dot' + (i < S.tries ? ' filled' : ''); el.appendChild(d); } }
  function updateTimer() { var sec = Math.ceil(S.timer / 10); $('timer-text').textContent = sec; var f = S.timer / S.timerTicks; $('timer-arc').style.strokeDashoffset = CIRC * (1 - f); $('timer-arc').classList.remove('warning', 'danger'); if (f < .2) $('timer-arc').classList.add('danger'); else if (f < .4) $('timer-arc').classList.add('warning'); }
  function addChain(word, pts, type) {
    var isCheeky = /^(butt|ass|asses|bitch|peachy|peach|boobs?|tits?|titty|arse)s?$/i.test(word);
    var isBanana = word.toLowerCase().indexOf('erect') !== -1 || /^(dick|cock|penis|penises)s?$/i.test(word);
    var div = document.createElement('div');
    div.className = 'chain-word ' + (isCheeky ? 'cheeky-shimmer ' : (isBanana ? 'banana-shimmer ' : '')) + type;

    if (type === 'skip') div.innerHTML = '<span class="cw-text">' + word + '</span>';
    else {
      var hl = S.prefix, rest = word.slice(hl.length), cls = type === 'bot' ? 'cw-bot-hl' : 'cw-highlight';
      div.innerHTML = '<span class="cw-text"><span class="' + cls + '">' + hl + '</span>' + rest + '</span><span class="cw-score">+' + pts + '</span>';
    }

    $('chain-words').appendChild(div);
    $('chain-area').scrollTop = $('chain-area').scrollHeight;

    if (isCheeky || isBanana) {
      setTimeout(function () {
        div.style.transition = 'all 1s ease-out';
        void div.offsetWidth;
        div.classList.remove('cheeky-shimmer', 'banana-shimmer');
      }, 2500);
    }

    if (isCheeky) {
      triggerPeachBurst();
    }
    if (isBanana) {
      triggerBananaBurst();
    }
  }

  function triggerPeachBurst() {
    var container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '99999';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    var count = 35;
    for (var i = 0; i < count; i++) {
      (function () {
        var peach = document.createElement('div');
        peach.textContent = '🍑';
        peach.style.position = 'absolute';
        peach.style.userSelect = 'none';
        var size = Math.floor(40 + Math.random() * 140);
        peach.style.fontSize = size + 'px';
        peach.style.filter = 'drop-shadow(0 15px 30px rgba(255, 120, 150, 0.6)) saturate(1.8) brightness(1.2)';
        var x = Math.random() * 100;
        peach.style.left = x + 'vw';
        var y = -200 - Math.random() * 300;
        peach.style.top = y + 'px';
        container.appendChild(peach);

        var velY = 2 + Math.random() * 6;
        var velX = (Math.random() - 0.5) * 4;
        var rot = Math.random() * 360;
        var rotVel = (Math.random() - 0.5) * 8;
        var gravity = 0.35 + Math.random() * 0.25;
        var bounceFactor = 0.5 + Math.random() * 0.25;
        var currentY = y;
        var currentX = window.innerWidth * (x / 100);

        var animFrame;
        function updatePhysics() {
          velY += gravity;
          currentY += velY;
          currentX += velX;
          rot += rotVel;
          var screenHeight = window.innerHeight;
          var floor = screenHeight - size - 20;
          if (currentY >= floor) {
            currentY = floor;
            velY = -Math.abs(velY) * bounceFactor;
            rotVel *= 0.8;
          }
          if (currentX < -size) currentX = window.innerWidth;
          if (currentX > window.innerWidth) currentX = -size;
          peach.style.top = currentY + 'px';
          peach.style.left = currentX + 'px';
          peach.style.transform = 'rotate(' + rot + 'deg)';

          if (Math.abs(velY) < 0.2 && currentY >= floor - 5) {
            peach.style.transition = 'opacity 1s ease';
            peach.style.opacity = '0';
            setTimeout(function () {
              try { peach.remove(); } catch (e) { }
            }, 1000);
          } else {
            animFrame = requestAnimationFrame(updatePhysics);
          }
        }
        setTimeout(function () {
          animFrame = requestAnimationFrame(updatePhysics);
        }, Math.random() * 400);
      })();
    }
    setTimeout(function () {
      try { container.remove(); } catch (e) { }
    }, 12000);
  }

  function triggerBananaBurst() {
    var container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '99999';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    var count = 35;
    for (var i = 0; i < count; i++) {
      (function () {
        var banana = document.createElement('div');
        banana.textContent = '🍌';
        banana.style.position = 'absolute';
        banana.style.userSelect = 'none';
        var size = Math.floor(40 + Math.random() * 140);
        banana.style.fontSize = size + 'px';
        banana.style.filter = 'drop-shadow(0 15px 30px rgba(255, 220, 100, 0.6)) saturate(1.8) brightness(1.2)';
        var x = Math.random() * 100;
        banana.style.left = x + 'vw';
        var y = -200 - Math.random() * 300;
        banana.style.top = y + 'px';
        container.appendChild(banana);

        var velY = 2 + Math.random() * 6;
        var velX = (Math.random() - 0.5) * 4;
        var rot = Math.random() * 360;
        var rotVel = (Math.random() - 0.5) * 8;
        var gravity = 0.35 + Math.random() * 0.25;
        var bounceFactor = 0.5 + Math.random() * 0.25;
        var currentY = y;
        var currentX = window.innerWidth * (x / 100);

        var animFrame;
        function updatePhysics() {
          velY += gravity;
          currentY += velY;
          currentX += velX;
          rot += rotVel;
          var screenHeight = window.innerHeight;
          var floor = screenHeight - size - 20;
          if (currentY >= floor) {
            currentY = floor;
            velY = -Math.abs(velY) * bounceFactor;
            rotVel *= 0.8;
          }
          if (currentX < -size) currentX = window.innerWidth;
          if (currentX > window.innerWidth) currentX = -size;
          banana.style.top = currentY + 'px';
          banana.style.left = currentX + 'px';
          banana.style.transform = 'rotate(' + rot + 'deg)';

          if (Math.abs(velY) < 0.2 && currentY >= floor - 5) {
            banana.style.transition = 'opacity 1s ease';
            banana.style.opacity = '0';
            setTimeout(function () {
              try { banana.remove(); } catch (e) { }
            }, 1000);
          } else {
            animFrame = requestAnimationFrame(updatePhysics);
          }
        }
        setTimeout(function () {
          animFrame = requestAnimationFrame(updatePhysics);
        }, Math.random() * 400);
      })();
    }
    setTimeout(function () {
      try { container.remove(); } catch (e) { }
    }, 12000);
  }
  function showTurn(p) { var el = $('turn-banner'); el.className = 'turn-banner ' + (p ? 'yours' : 'theirs'); var b = Bots.getById(S.botId); el.textContent = p ? 'Your turn' : (b ? b.emoji + ' ' + b.name + ' thinking…' : '…'); }
  function fb(m, t) { var el = $('input-feedback'); el.textContent = m; el.className = 'input-feedback ' + t; clearTimeout(el._t); el._t = setTimeout(clearFb, 2200); }
  function clearFb() { $('input-feedback').textContent = ''; $('input-feedback').className = 'input-feedback'; }
  function shake() { var w = $('word-display'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }

  // ========== TYPING PRACTICE ==========
  var TP = { words: [], idx: 0, typed: '', startTime: 0, gs: 0, tc: 0, cc: 0, wd: 0, run: false };
  var WS = {
    niche: ['ephemeral', 'quintessence', 'serendipity', 'mellifluous', 'petrichor', 'sonder', 'limerence', 'saudade', 'ethereal', 'luminescent', 'ineffable', 'eloquence', 'resilience', 'diaphanous', 'gossamer', 'halcyon', 'incandescent', 'labyrinthine', 'melancholy', 'nebulous', 'obfuscate', 'panacea', 'quixotic', 'redolent', 'sanguine', 'tintinnabulation', 'ubiquitous', 'verisimilitude', 'wistful', 'apricity', 'denouement', 'evanescent', 'felicity', 'hiraeth', 'lacuna', 'meraki', 'numinous', 'phosphene', 'reverie', 'susurrus', 'wanderlust'],
    long: ['antidisestablishmentarianism', 'electroencephalograph', 'incomprehensibility', 'interdisciplinary', 'counterproductive', 'electromagnetic', 'anthropomorphism', 'disproportionate', 'extraterrestrial', 'impressionistic', 'indistinguishable', 'oversimplification', 'phantasmagoria', 'quintessentially', 'representational', 'telecommunications', 'unconstitutional', 'compartmentalize', 'contemporaneous', 'environmentalism', 'extraordinarily', 'gastrointestinal', 'inconsequential', 'jurisprudence', 'kaleidoscopic', 'metamorphosis', 'nomenclature', 'onomatopoeia', 'pharmaceutical', 'rehabilitation', 'superfluous', 'transcontinental'],
    sat: ['aberration', 'benevolent', 'cacophony', 'delineate', 'enervate', 'fastidious', 'gregarious', 'hegemony', 'iconoclast', 'juxtapose', 'languid', 'magnanimous', 'nefarious', 'obsequious', 'paradigm', 'querulous', 'recalcitrant', 'sycophant', 'truculent', 'usurp', 'vacillate', 'whimsical', 'acrimonious', 'bombastic', 'capricious', 'deleterious', 'ebullient', 'fallacious', 'garrulous', 'idiosyncratic', 'laconic', 'mercurial', 'ostentatious', 'perfidious', 'sagacious', 'trepidation', 'unctuous', 'vicissitude', 'zealous', 'ameliorate', 'conundrum', 'duplicity'],
    ielts: ['abundance', 'acknowledge', 'acquisition', 'adjacent', 'advocate', 'alleviate', 'ambiguous', 'analogous', 'annotate', 'anticipate', 'apparatus', 'arbitrary', 'articulate', 'aspiration', 'assimilate', 'attribute', 'augment', 'autonomous', 'benchmark', 'bureaucracy', 'calibrate', 'catastrophe', 'circumvent', 'collaborate', 'commodities', 'compatible', 'compensate', 'comprehensive', 'compromise', 'configuration', 'consecutive', 'consolidate', 'contemporary', 'contradict', 'controversial', 'conventional', 'correlation', 'criterion', 'cumulative', 'curriculum', 'debilitate', 'dedicate', 'demographic', 'depreciate', 'deteriorate', 'differentiate', 'diminish', 'discretion', 'disseminate', 'distinctive', 'diversify', 'domain', 'elaborate', 'empirical', 'encompass', 'endeavour', 'enumerate'],
    random: []
  };

  function startTypingPractice() {
    var sel = document.querySelector('.ws-grid .diff-btn.selected');
    var ws = sel ? sel.getAttribute('data-wordset') : 'niche';
    var list = (WS[ws] && WS[ws].length) ? WS[ws].slice() : [];
    if (!list.length) { var all = Array.from(Dict.words); for (var i = 0; i < 40 && all.length; i++) { var idx = Math.floor(Math.random() * all.length); var w = all.splice(idx, 1)[0]; if (w.length >= 6) list.push(w); else i--; } }
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    TP = { words: list.slice(0, 30), idx: 0, typed: '', tc: 0, cc: 0, wd: 0, run: true, wordsDone: [], activeTimeMs: 0, wordStart: 0 };
    S.mode = 'typing';
    $('typing-history').innerHTML = ''; $('typing-wpm').textContent = '0'; $('typing-count').textContent = '0'; $('typing-acc').textContent = '100%';
    showScreen('screen-typing'); loadTW();
  }
  function loadTW() {
    if (TP.idx >= TP.words.length) { finishTyping(); return; }
    var w = TP.words[TP.idx]; TP.typed = ''; TP.wordStart = 0;
    $('typing-target').textContent = w.toUpperCase();
    $('typing-pos').textContent = ''; $('typing-def').textContent = 'Loading…';
    renderTP(w);
    Dict.fetchDefinition(w).then(function (d) { $('typing-pos').textContent = d.pos; $('typing-def').textContent = d.def; });
  }
  function handleTypingKey(e) {
    if (!TP.run) return; var w = TP.words[TP.idx];
    if (e.key === 'Backspace') { e.preventDefault(); if (TP.typed.length) TP.typed = TP.typed.slice(0, -1); renderTP(w); return; }
    if (e.key.length !== 1 || !/^[a-zA-Z]$/.test(e.key)) return;
    e.preventDefault(); var ch = e.key.toLowerCase();
    if (TP.wordStart === 0) TP.wordStart = Date.now();
    TP.typed += ch; TP.tc++;
    if (ch === w[TP.typed.length - 1]) TP.cc++;
    renderTP(w);
    if (TP.typed.length === w.length) {
      var el = (Date.now() - TP.wordStart) / 60000;
      TP.activeTimeMs += (Date.now() - TP.wordStart);
      var wordWpm = el > 0 ? Math.round((w.length / 5) / el) : 0;
      var totalEl = TP.activeTimeMs / 60000;
      var sessionWpm = totalEl > 0 ? Math.round((TP.tc / 5) / totalEl) : 0;
      TP.wd++; TP.wordsDone.push(w); TP.idx++;
      var hi = document.createElement('div'); hi.className = 'th-item';
      hi.innerHTML = '<span class="th-word">' + w + '</span><span class="th-wpm">' + wordWpm + ' WPM</span>';
      hi.addEventListener('mouseenter', function (ev) { showTip(w, ev); });
      hi.addEventListener('mouseleave', hideTip);
      $('typing-history').prepend(hi);
      $('typing-count').textContent = TP.wd; $('typing-wpm').textContent = sessionWpm;
      $('typing-acc').textContent = Math.round(TP.cc / TP.tc * 100) + '%';
      setTimeout(loadTW, 450);
    }
  }
  // Render with natural-width spans and a precise DOM-measured smooth cursor
  function renderTP(w) {
    var container = $('typing-display');
    var cursor = container.querySelector('.smooth-cursor');

    if (!cursor || container.getAttribute('data-word') !== w) {
      var html = '<div class="text-wrapper">';
      for (var i = 0; i < w.length; i++) {
        var cls = 'tchar ';
        if (i < TP.typed.length) cls += TP.typed[i] === w[i] ? 'tc' : 'te';
        else cls += 'tr';
        html += '<span class="' + cls + '">' + w[i] + '</span>';
      }
      html += '<div class="smooth-cursor"></div></div>';
      container.innerHTML = html;
      container.setAttribute('data-word', w);
    } else {
      // Preserve DOM to allow CSS transition on the cursor
      var spans = container.querySelectorAll('.tchar');
      for (var i = 0; i < w.length; i++) {
        var cls = 'tchar ';
        if (i < TP.typed.length) cls += TP.typed[i] === w[i] ? 'tc' : 'te';
        else cls += 'tr';
        if (spans[i].className !== cls) spans[i].className = cls;
      }
    }

    // Use requestAnimationFrame to measure exact offsets
    requestAnimationFrame(function () {
      var c = container.querySelector('.smooth-cursor');
      var spans = container.querySelectorAll('.tchar');
      if (!c || spans.length !== w.length) return;
      var targetLeft = 0;
      if (TP.typed.length < w.length) {
        targetLeft = spans[TP.typed.length].offsetLeft;
      } else {
        var last = spans[w.length - 1];
        targetLeft = last.offsetLeft + last.offsetWidth;
      }
      c.style.transform = 'translateX(' + targetLeft + 'px)';
    });
  }
  function finishTyping() {
    TP.run = false;
    if (TP.wordStart > 0) TP.activeTimeMs += (Date.now() - TP.wordStart);
    var tm = TP.activeTimeMs / 60000, avg = tm > 0 ? Math.round((TP.tc / 5) / tm) : 0;
    $('go-score').textContent = avg + ' WPM'; $('go-rounds').textContent = Math.round(TP.cc / Math.max(1, TP.tc) * 100) + '%';
    $('go-rounds-lbl').textContent = 'Accuracy'; $('go-words').textContent = TP.wd; $('go-best').textContent = '—';
    $('go-chain').innerHTML = ''; $('go-learned').classList.add('hidden');
    saveHist({ mode: 'typing', bot: '', score: avg, rounds: TP.wd, words: TP.wd, date: Date.now(), wordList: TP.wordsDone });
    showScreen('screen-gameover');
  }
  $('btn-typing-quit').addEventListener('click', function () {
    if (TP.run && TP.wd > 0) {
      TP.run = false;
      var tm = (Date.now() - TP.gs) / 60000, avg = tm > 0 ? Math.round((TP.tc / 5) / tm) : 0;
      saveHist({ mode: 'typing', bot: '', score: avg, rounds: TP.wd, words: TP.wd, date: Date.now(), wordList: TP.wordsDone });
    }
    TP.run = false; showScreen('screen-menu');
  });
})();
