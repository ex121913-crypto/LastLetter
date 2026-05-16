/* bots.js — 13 Bots + Neural Network final boss */
var Bots=(function(){
'use strict';
var PFX={easy:[[8,1],[14,2],[Infinity,3]],medium:[[5,1],[10,2],[Infinity,3]],hard:[[3,1],[7,2],[11,3],[Infinity,4]],extreme:[[1,2],[4,3],[8,4],[Infinity,5]]};
var KILL_SUFFIXES=['ness','ly','tion','ment','ous','ive','ful','less','ity','ble','ing','ght','ck','rn','wn','pt','lk','mn','ism','ist'];
var TRAP_CHARS=['x','z','j','q','v'];
var HARD_ENDINGS=['ck','rn','ght','wn','pt','lk','x','z','j','q'];

var BOTS=[
  {id:'chill',name:'Chill Charlie',emoji:'😎',diff:'easy',desc:'No strategy. Vibes only.',speed:[3000,5000],errorRate:.18,strat:'random',minAdd:0},
  {id:'rookie',name:'Rookie Riley',emoji:'🐣',diff:'easy',desc:'Short common words.',speed:[2500,4000],errorRate:.12,strat:'short',minAdd:0},
  {id:'casual',name:'Casual Casey',emoji:'☕',diff:'medium',desc:'No preference, picks whatever.',speed:[2000,3200],errorRate:.06,strat:'random',minAdd:1},
  {id:'punny',name:'Punny Pete',emoji:'🃏',diff:'medium',desc:'Favors fun, uncommon words.',speed:[1800,3000],errorRate:.05,strat:'medium',minAdd:1},
  {id:'steady',name:'Steady Sam',emoji:'🧑‍💼',diff:'medium',desc:'Balanced medium words.',speed:[1600,2800],errorRate:.04,strat:'medium',minAdd:1},
  {id:'verbose',name:'Verbose Vera',emoji:'📚',diff:'medium',desc:'Maximizes word length.',speed:[1800,3200],errorRate:.05,strat:'long',minAdd:2},
  {id:'suffocator',name:'Suffocator Sue',emoji:'🫁',diff:'hard',desc:'Ends in -ness, -ly, -tion.',speed:[1100,2000],errorRate:.02,strat:'suffix_kill',minAdd:2},
  {id:'trapper',name:'Trapper Tom',emoji:'🪤',diff:'hard',desc:'Ends on X, Z, J, Q.',speed:[1000,1800],errorRate:.02,strat:'char_trap',minAdd:2},
  {id:'wildcard',name:'Wildcard Wes',emoji:'🎲',diff:'hard',desc:'Unpredictable mix.',speed:[900,2000],errorRate:.02,strat:'wildcard',minAdd:2},
  {id:'speed',name:'Speed Demon',emoji:'⚡',diff:'hard',desc:'Sub-second responses.',speed:[250,700],errorRate:.03,strat:'short',minAdd:1},
  {id:'combo',name:'Combo Queen',emoji:'👑',diff:'extreme',desc:'Suffix + letter traps + long.',speed:[800,1600],errorRate:.01,strat:'combo',minAdd:3},
  {id:'adaptive',name:'Neural Nyx',emoji:'🧠',diff:'extreme',desc:'Mirrors then counters.',speed:[700,1500],errorRate:.01,strat:'adaptive',minAdd:3},
  {id:'eliminator',name:'The Eliminator',emoji:'💀',diff:'extreme',desc:'Minimizes your options. Uses ck,rn,ght traps.',speed:[1000,2200],errorRate:0,strat:'eliminate',minAdd:3},
  {id:'neuralnet',name:'Ω Omega',emoji:'🤖',diff:'extreme',desc:'Neural network scores every move. The final boss.',speed:[1200,2500],errorRate:0,strat:'neural',minAdd:3}
];

var playerHist=[];
// Neural weights and memory
var OmegaData=(function(){
  try{var d=localStorage.getItem('ll_omega');if(d)return JSON.parse(d);}catch(e){}
  return {weights:{wLen:.3,wTrap:.5,wSuffix:.4,wScarcity:.6,wVariance:-.2},learnedSuffixes:[]};
})();
var NN=OmegaData.weights;
function saveOmega(){try{localStorage.setItem('ll_omega',JSON.stringify(OmegaData));}catch(e){}}
function trainOmega(suffix){
  if(suffix&&suffix.length>1&&!OmegaData.learnedSuffixes.includes(suffix)){
    OmegaData.learnedSuffixes.push(suffix);saveOmega();
  }
}

function getAll(){return BOTS;}
function getById(id){return BOTS.find(function(b){return b.id===id;});}
function resetAdaptive(){playerHist=[];}
function recordPlayerWord(w){playerHist.push(w);}

function getPrefixLength(diff,round){
  var s=PFX[diff]||PFX.medium;
  for(var i=0;i<s.length;i++)if(round<=s[i][0])return s[i][1];
  return s[s.length-1][1];
}
function getSoloPrefixLength(round){return round<6?1:round<11?2:Math.random()<.5?3:2;}

/** Smart prefix fallback: try longest prefix, fall back to shorter */
function findBestPrefix(word, diff, round, usedSet){
  var maxPfx=getPrefixLength(diff,round);
  for(var len=Math.min(maxPfx,word.length);len>=1;len--){
    var pfx=word.slice(-len);
    if(Dict.findWords(pfx,usedSet,1).length>0)return pfx;
  }
  // Total fallback: random letter
  return 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random()*26)];
}

function pickWord(botId,prefix,usedSet){
  var bot=getById(botId);if(!bot)return null;
  if(Math.random()<bot.errorRate)return null;
  var cands=Dict.findWords(prefix,usedSet,800);
  if(!cands.length)return null;
  // Filter: hard bots must add letters (not just match prefix exactly)
  if(bot.minAdd>0){
    var minLen=prefix.length+bot.minAdd;
    var filtered=cands.filter(function(w){return w.length>=minLen;});
    if(filtered.length>0)cands=filtered;
  }
  // Filter: avoid dead-end words (where opponent has <3 options)
  if(bot.diff!=='easy'){
    var safe=cands.filter(function(w){
      var e=w[w.length-1];var ns=new Set(usedSet);ns.add(w);
      return Dict.findWords(e,ns,3).length>=2;
    });
    if(safe.length>0)cands=safe;
  }
  switch(bot.strat){
    case'short':return _short(cands,6);
    case'medium':return _medium(cands);
    case'long':return _long(cands);
    case'suffix_kill':return _suffixKill(cands);
    case'char_trap':return _charTrap(cands);
    case'wildcard':return _wildcard(cands);
    case'combo':return _combo(cands);
    case'adaptive':return _adaptive(cands);
    case'eliminate':return _eliminate(cands,usedSet);
    case'neural':return _neural(cands,usedSet);
    default:return cands[Math.floor(Math.random()*cands.length)];
  }
}

function _short(c,mx){var s=c.filter(function(w){return w.length<=mx;});return(s.length?s:c)[Math.floor(Math.random()*(s.length||c.length))];}
function _medium(c){var m=c.filter(function(w){return w.length>=4&&w.length<=8;});return(m.length?m:c)[Math.floor(Math.random()*(m.length||c.length))];}
function _long(c){c.sort(function(a,b){return b.length-a.length;});return c[Math.floor(Math.random()*Math.max(1,Math.floor(c.length*.08)))];}

function _suffixKill(c){
  for(var si=0;si<KILL_SUFFIXES.length;si++){
    var suf=KILL_SUFFIXES[si];
    var m=c.filter(function(w){return w.length>suf.length+2&&w.slice(-suf.length)===suf;});
    if(m.length)return m[Math.floor(Math.random()*m.length)];
  }
  return c[Math.floor(Math.random()*c.length)];
}

function _charTrap(c){
  // Try hard endings first (ck, rn, ght, etc.)
  for(var i=0;i<HARD_ENDINGS.length;i++){
    var end=HARD_ENDINGS[i];
    var m=c.filter(function(w){return w.slice(-end.length)===end;});
    if(m.length)return m[Math.floor(Math.random()*m.length)];
  }
  return c[Math.floor(Math.random()*c.length)];
}

function _wildcard(c){
  var r=Math.random();
  if(r<.3)return _suffixKill(c);if(r<.5)return _charTrap(c);if(r<.7)return _long(c);
  return c[Math.floor(Math.random()*c.length)];
}

function _combo(c){
  for(var si=0;si<KILL_SUFFIXES.length;si++){
    var suf=KILL_SUFFIXES[si];
    var m=c.filter(function(w){return w.length>7&&w.slice(-suf.length)===suf;});
    if(m.length)return m[Math.floor(Math.random()*m.length)];
  }
  return _charTrap(c);
}

function _adaptive(c){
  var avg=5;
  if(playerHist.length>0){var s=0;for(var i=0;i<playerHist.length;i++)s+=playerHist[i].length;avg=Math.round(s/playerHist.length)+2;}
  c.sort(function(a,b){return Math.abs(a.length-avg)-Math.abs(b.length-avg);});
  var top=c.slice(0,Math.min(20,c.length));
  for(var si=0;si<KILL_SUFFIXES.length;si++){
    var suf=KILL_SUFFIXES[si];var m=top.filter(function(w){return w.slice(-suf.length)===suf;});
    if(m.length)return m[Math.floor(Math.random()*m.length)];
  }
  var traps=top.filter(function(w){return TRAP_CHARS.indexOf(w[w.length-1])!==-1;});
  return(traps.length?traps:top)[Math.floor(Math.random()*(traps.length||top.length))];
}

function _eliminate(c,us){
  var best=null,min=Infinity;
  var sample=c.length>60?_sample(c,60):c;
  for(var i=0;i<sample.length;i++){
    var w=sample[i],ns=new Set(us);ns.add(w);
    var e1=w[w.length-1];
    var opts=Dict.findWords(e1,ns,200).length;
    // Bonus for hard endings
    var bonus=0;
    for(var hi=0;hi<HARD_ENDINGS.length;hi++){
      if(w.slice(-HARD_ENDINGS[hi].length)===HARD_ENDINGS[hi]){bonus=-30;break;}
    }
    for(var si=0;si<KILL_SUFFIXES.length;si++){
      if(w.slice(-KILL_SUFFIXES[si].length)===KILL_SUFFIXES[si]){bonus-=15;break;}
    }
    if(opts+bonus<min){min=opts+bonus;best=w;}
  }
  return best||c[0];
}

/** Neural network bot — scores each candidate on multiple features */
function _neural(c,us){
  var sample=c.length>80?_sample(c,80):c;
  var best=null,bestScore=-Infinity;
  for(var i=0;i<sample.length;i++){
    var w=sample[i],ns=new Set(us);ns.add(w);
    // Feature 1: word length (longer = more pressure)
    var fLen=w.length/15;
    // Feature 2: ending is a trap char
    var fTrap=0;for(var t=0;t<TRAP_CHARS.length;t++)if(w[w.length-1]===TRAP_CHARS[t])fTrap=1;
    // Feature 3: ending is a kill suffix
    var fSuffix=0;for(var s=0;s<KILL_SUFFIXES.length;s++)if(w.slice(-KILL_SUFFIXES[s].length)===KILL_SUFFIXES[s])fSuffix=1;
    for(var s=0;s<OmegaData.learnedSuffixes.length;s++)if(w.slice(-OmegaData.learnedSuffixes[s].length)===OmegaData.learnedSuffixes[s])fSuffix=1;
    // Feature 4: scarcity — how few options the opponent has
    var opts=Dict.findWords(w[w.length-1],ns,200).length;
    var fScarcity=1-Math.min(opts,200)/200;
    // Feature 5: variance from player avg (surprise factor)
    var fVar=0;
    if(playerHist.length>1){var avg=0;for(var p=0;p<playerHist.length;p++)avg+=playerHist[p].length;avg/=playerHist.length;fVar=Math.abs(w.length-avg)/10;}
    // Score
    var score=NN.wLen*fLen+NN.wTrap*fTrap+NN.wSuffix*fSuffix+NN.wScarcity*fScarcity+NN.wVariance*fVar;
    // Add small randomness for variety
    score+=Math.random()*.08;
    if(score>bestScore){bestScore=score;best=w;}
  }
  return best||c[0];
}

async function _neuralLLM(prefix, usedSet) {
  var apiKey = "sk-F6KZVk12q66qOWO0XdlVga8z9SFXklUBDiPQmEh5VYWylNB9";
  var modelName = "GLM-5.1";
  var apiHost = "https://cmkey.cn/v1";
  var useCors = false;
  try {
    var globalCfg = JSON.parse(localStorage.getItem('ll_cfg'));
    if(globalCfg && globalCfg.llmApiKey) apiKey = globalCfg.llmApiKey;
    if(globalCfg && globalCfg.llmModel) modelName = globalCfg.llmModel;
    if(globalCfg && globalCfg.llmHost) apiHost = globalCfg.llmHost;
    if(globalCfg && globalCfg.llmCors !== undefined) useCors = globalCfg.llmCors;
  } catch(e) {}
  
  apiHost = apiHost.replace(/\/$/, ""); // remove trailing slash
  var endpoint = apiHost + "/chat/completions";
  var fetchUrl = useCors ? "https://corsproxy.io/?" + encodeURIComponent(endpoint) : endpoint;

  var ui = document.getElementById('llm-training-ui');
  var status = document.getElementById('llm-status');
  var results = document.getElementById('llm-results');
  if(ui) {
    ui.classList.remove('hidden');
    ui.style.display = 'block';
    status.textContent = 'Omega (' + modelName + ') is thinking...';
    results.innerHTML = '';
  }

  var usedArr = Array.from(usedSet);
  var usedStr = usedArr.length > 0 ? " Do not use these words: " + usedArr.join(", ") : "";
  var prompt = `Given the starting prefix "${prefix}", generate 5 really hard, obscure English words that start with "${prefix}".${usedStr} Format your response ONLY as a JSON array of objects. Each object must have a "word" string and a "score" integer (1-10) for difficulty. Example: [{"word": "example", "score": 8}]. Output nothing else.`;

  try {
    var res = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{role: "user", content: prompt}],
        temperature: 0.7
      })
    });
    
    var data = await res.json();
    var content = data.choices[0].message.content;
    
    var match = content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found in response");
    
    var parsed = JSON.parse(match[0]);

    var html = '<ul style="padding-left:15px; margin:0;">';
    var bestWord = null;
    var bestScore = -1;
    for(var i=0; i<parsed.length; i++) {
      var w = parsed[i].word.toLowerCase();
      var sc = parsed[i].score;
      html += '<li style="margin-bottom:4px;"><strong>' + w + '</strong> <span style="color:var(--accent)">★ ' + sc + '/10</span></li>';
      if(sc > bestScore && w.startsWith(prefix.toLowerCase()) && !usedSet.has(w)) {
         bestScore = sc;
         bestWord = w;
      }
    }
    html += '</ul>';

    if(ui) {
      status.textContent = modelName + ' Selected: ' + (bestWord ? bestWord.toUpperCase() : 'None');
      results.innerHTML = html;
      await new Promise(r => setTimeout(r, 2000));
    }
    
    if(bestWord) return bestWord;

  } catch(e) {
    console.error("LLM API Error:", e);
    if(ui) {
      status.textContent = modelName + ' Error. Using local Neural Net.';
      results.innerHTML = '<span style="color:var(--wrong)">' + (e.message || 'Connection failed or invalid JSON.') + '</span>';
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Fallback
  var cands=Dict.findWords(prefix,usedSet,800);
  if(!cands.length) return null;
  return _neural(cands, usedSet);
}

async function pickWordAsync(botId, prefix, usedSet) {
  var bot = getById(botId);
  if(!bot) return null;
  if(bot.strat === 'neural') {
    return await _neuralLLM(prefix, usedSet);
  }
  // For all other bots, resolve synchronously
  return pickWord(botId, prefix, usedSet);
}

function _sample(a,n){var cp=a.slice(),r=[];for(var i=0;i<n&&cp.length;i++){var idx=Math.floor(Math.random()*cp.length);r.push(cp.splice(idx,1)[0]);}return r;}
function getDelay(id){return 10;} // Removed fake thinking wait as requested

return{getAll:getAll,getById:getById,pickWord:pickWord,pickWordAsync:pickWordAsync,getDelay:getDelay,
       resetAdaptive:resetAdaptive,recordPlayerWord:recordPlayerWord,
       getPrefixLength:getPrefixLength,getSoloPrefixLength:getSoloPrefixLength,
       findBestPrefix:findBestPrefix,OmegaData:OmegaData,saveOmega:saveOmega,trainOmega:trainOmega};
})();
