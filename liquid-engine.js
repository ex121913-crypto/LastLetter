/* liquid-engine.js — Injects the FULL 12-circle UIverse orb pattern
   into all interactive elements when Liquid Glass theme is active. */

var LiquidEngine = (function(){
  'use strict';
  var active = false;

  /* ---- PURPLE color scheme (for menu-btn, diff-btn, bot-card, etc.) ---- */
  var PURPLE = {
    c1: 'rgba(173,95,255,0.05)',   // purple
    c2: 'rgba(71,30,236,0.06)',    // deep indigo
    c3: 'rgba(214,10,71,0.04)',    // crimson
    c4: 'rgba(200,160,255,0.05)',  // lavender
    shadow: 'rgba(173,95,255,0.4)',
    shadowInsetTop: 'rgba(200,160,255,0.7)',
    shadowInsetBot: 'rgba(230,210,255,0.5)',
    radialIn: 'rgba(120,50,200,0.25)',
    radialOut: 'rgba(160,100,255,0.12)'
  };
  
  /* ---- GOLD color scheme (for special UI highlights) ---- */
  var GOLD = {
    c1: 'rgba(255,215,0,0.05)',    // gold
    c2: 'rgba(255,165,0,0.06)',    // orange
    c3: 'rgba(255,69,0,0.04)',     // red-orange
    c4: 'rgba(255,255,224,0.05)',  // light yellow
    shadow: 'rgba(255,215,0,0.4)',
    shadowInsetTop: 'rgba(255,255,224,0.7)',
    shadowInsetBot: 'rgba(255,200,0,0.5)',
    radialIn: 'rgba(255,180,0,0.25)',
    radialOut: 'rgba(255,220,100,0.12)'
  };


  /* ---- UIVERSE HTML INJECTION ---- */
  function applyUiverseHtml(el) {
    if (el.querySelector('.wrapper')) return;
    
    var textNodes = [];
    var kids = Array.from(el.childNodes);
    for (var i=0; i<kids.length; i++) {
      textNodes.push(kids[i]);
    }
    
    var wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    
    var span = document.createElement('span');
    textNodes.forEach(function(n) { span.appendChild(n); });
    wrapper.appendChild(span);
    
    for (var i = 12; i >= 1; i--) {
      var c = document.createElement('div');
      c.className = 'circle circle-' + i;
      wrapper.appendChild(c);
    }
    
    el.appendChild(wrapper);
  }

  /* ---- TRUE LIQUID GLASS PHYSICS ENGINE ---- */
  var SURFACE_FNS = {
    convex_squircle: function(x) { return Math.pow(1 - Math.pow(1 - x, 4), 0.25); }
  };

  function calculateRefractionProfile(glassThickness, bezelWidth, heightFn, ior, samples) {
    samples = samples || 128;
    var eta = 1 / ior;
    function refract(nx, ny) {
      var dot = ny;
      var k = 1 - eta * eta * (1 - dot * dot);
      if (k < 0) return null;
      var sq = Math.sqrt(k);
      return [-(eta * dot + sq) * nx, eta - (eta * dot + sq) * ny];
    }
    var profile = new Float64Array(samples);
    for (var i = 0; i < samples; i++) {
      var x = i / samples;
      var y = heightFn(x);
      var dx = x < 1 ? 0.0001 : -0.0001;
      var y2 = heightFn(x + dx);
      var deriv = (y2 - y) / dx;
      var mag = Math.sqrt(deriv * deriv + 1);
      var ref = refract(-deriv / mag, -1 / mag);
      if (!ref) { profile[i] = 0; continue; }
      profile[i] = ref[0] * ((y * bezelWidth + glassThickness) / ref[1]);
    }
    return profile;
  }

  function generateDisplacementMap(w, h, radius, bezelWidth, profile, maxDisp) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    var img = ctx.createImageData(w, h);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      d[i] = 128; d[i + 1] = 128; d[i + 2] = 0; d[i + 3] = 255;
    }
    var r = radius, rSq = r * r, r1Sq = Math.pow(r + 1, 2);
    var rBSq = Math.pow(Math.max(r - bezelWidth, 0), 2);
    var wB = w - r * 2, hB = h - r * 2, S = profile.length;

    for (var y1 = 0; y1 < h; y1++) {
      for (var x1 = 0; x1 < w; x1++) {
        var x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
        var y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
        var dSq = x * x + y * y;
        if (dSq > r1Sq || dSq < rBSq) continue;
        var dist = Math.sqrt(dSq);
        var fromSide = r - dist;
        var op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
        if (op <= 0 || dist === 0) continue;
        var cos = x / dist, sin = y / dist;
        var bi = Math.min(((fromSide / bezelWidth) * S) | 0, S - 1);
        var disp = profile[bi] || 0;
        var dX = (-cos * disp) / maxDisp, dY = (-sin * disp) / maxDisp;
        var idx = (y1 * w + x1) * 4;
        d[idx] = (128 + dX * 127 * op + 0.5) | 0;
        d[idx + 1] = (128 + dY * 127 * op + 0.5) | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function generateSpecularMap(w, h, radius, bezelWidth, angle) {
    angle = angle != null ? angle : Math.PI / 3;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    var img = ctx.createImageData(w, h);
    var d = img.data;
    var r = radius, rSq = r * r, r1Sq = Math.pow(r + 1, 2);
    var rBSq = Math.pow(Math.max(r - bezelWidth, 0), 2);
    var wB = w - r * 2, hB = h - r * 2;
    var sv = [Math.cos(angle), Math.sin(angle)];

    for (var y1 = 0; y1 < h; y1++) {
      for (var x1 = 0; x1 < w; x1++) {
        var x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
        var y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
        var dSq = x * x + y * y;
        if (dSq > r1Sq || dSq < rBSq) continue;
        var dist = Math.sqrt(dSq);
        var fromSide = r - dist;
        var op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
        if (op <= 0 || dist === 0) continue;
        var cos = x / dist, sin = -y / dist;
        var dot = Math.abs(cos * sv[0] + sin * sv[1]);
        var edge = Math.sqrt(Math.max(0, 1 - Math.pow(1 - fromSide, 2)));
        var coeff = dot * edge;
        var col = (255 * coeff) | 0;
        var alpha = (col * coeff * op) | 0;
        var idx = (y1 * w + x1) * 4;
        d[idx] = col; d[idx + 1] = col; d[idx + 2] = col; d[idx + 3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  var filterIdCounter = 0;
  var glassCache = {}; // Cache filters by WxH

  function applyTrueLiquidGlass(el) {
    if (el.querySelector('.lq-true-glass')) return;
    
    var w = el.offsetWidth, h = el.offsetHeight;
    if (w < 2 || h < 2) {
      // Defer if not sized yet
      requestAnimationFrame(function() { applyTrueLiquidGlass(el); });
      return;
    }

    var radius = parseInt(getComputedStyle(el).borderRadius) || 24;
    var cacheKey = w + 'x' + h + 'x' + radius;
    var filterId = glassCache[cacheKey];

    if (!filterId) {
      filterId = 'lq-filter-' + (++filterIdCounter);
      glassCache[cacheKey] = filterId;

      var heightFn = SURFACE_FNS.convex_squircle;
      var glassThick = 80, bezelW = Math.min(60, radius - 1, Math.min(w, h) / 2 - 1);
      var ior = 3.0, scaleRatio = 1.0, blurAmt = 0.3, specOpacity = 0.25, specSat = 2.0;

      var profile = calculateRefractionProfile(glassThick, bezelW, heightFn, ior, 128);
      var maxDisp = Math.max.apply(null, Array.from(profile).map(Math.abs)) || 1;
      var dispUrl = generateDisplacementMap(w, h, radius, bezelW, profile, maxDisp);
      var specUrl = generateSpecularMap(w, h, radius, bezelW * 2.5);
      var scale = maxDisp * scaleRatio;

      var filterStr = '<filter id="' + filterId + '" x="0%" y="0%" width="100%" height="100%">' +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="' + blurAmt + '" result="blurred_source" />' +
        '<feImage href="' + dispUrl + '" x="0" y="0" width="' + w + '" height="' + h + '" result="disp_map" />' +
        '<feDisplacementMap in="blurred_source" in2="disp_map" scale="' + scale + '" xChannelSelector="R" yChannelSelector="G" result="displaced" />' +
        '<feColorMatrix in="displaced" type="saturate" values="' + specSat + '" result="displaced_sat" />' +
        '<feImage href="' + specUrl + '" x="0" y="0" width="' + w + '" height="' + h + '" result="spec_layer" />' +
        '<feComposite in="displaced_sat" in2="spec_layer" operator="in" result="spec_masked" />' +
        '<feComponentTransfer in="spec_layer" result="spec_faded">' +
        '<feFuncA type="linear" slope="' + specOpacity + '" />' +
        '</feComponentTransfer>' +
        '<feBlend in="spec_masked" in2="displaced" mode="normal" result="with_sat" />' +
        '<feBlend in="spec_faded" in2="with_sat" mode="normal" />' +
        '</filter>';
      
      var defs = document.getElementById('lq-glass-svg-defs');
      if (defs) defs.insertAdjacentHTML('beforeend', filterStr);
    }

    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';

    var layer = document.createElement('div');
    layer.className = 'lq-true-glass';
    layer.style.cssText =
      'position:absolute;inset:0;z-index:-1;pointer-events:none;' +
      'border-radius:inherit;' +
      'backdrop-filter:url(#' + filterId + ');' +
      '-webkit-backdrop-filter:url(#' + filterId + ');' +
      'isolation:isolate;';

    el.appendChild(layer);
  }

  /* The 12 circles with their initial positions — adapted from UIverse.
     Positions are in % so they scale to any container size. */
  var CIRCLE_DEFS = [
    { x: '5%',  y: '-30%', anim: 'lqC1',  group: 4 },  // c4
    { x: '70%', y: '15%',  anim: 'lqC2',  group: 1 },  // c1
    { x: '-5%', y: '-10%', anim: 'lqC3',  group: 2 },  // c2
    { x: '60%', y: '-10%', anim: 'lqC4',  group: 2 },  // c2
    { x: '10%', y: '0%',   anim: 'lqC5',  group: 3 },  // c3
    { x: '42%', y: '30%',  anim: 'lqC6',  group: 3 },  // c3
    { x: '8%',  y: '50%',  anim: 'lqC7',  group: 1 },  // c1
    { x: '22%', y: '-5%',  anim: 'lqC8',  group: 1 },  // c1
    { x: '15%', y: '-10%', anim: 'lqC9',  group: 4 },  // c4
    { x: '48%', y: '30%',  anim: 'lqC10', group: 4 },  // c4
    { x: '3%',  y: '8%',   anim: 'lqC11', group: 1 },  // c1
    { x: '40%', y: '8%',   anim: 'lqC12', group: 1 },  // c1
  ];

  /* Color groups: 1=c1, 2=c2, 3=c3, 4=c4 */
  /* Blur groups: 2,3 -> 14-16px  |  1 -> 12px  |  4 -> 8px */
  function getBlur(group) {
    if (group === 2) return 14;
    if (group === 3) return 16;
    if (group === 1) return 12;
    return 8;
  }
  function getColor(group, scheme) {
    if (group === 1) return scheme.c1;
    if (group === 2) return scheme.c2;
    if (group === 3) return scheme.c3;
    return scheme.c4;
  }

  /** Build the 12-circle orb layer inside an element 
      SHARED MAP VERSION: All orbs use position: fixed to align with a global grid */
  function injectFullOrbs(el, scheme, circleCount) {
    if (el.querySelector('.lq-orb-layer')) return;
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';

    // Push existing children above orbs
    Array.from(el.children).forEach(function(kid) {
      if (!kid.classList.contains('lq-orb-layer')) {
        kid.style.position = 'relative';
        kid.style.zIndex = '1';
      }
    });

    var layer = document.createElement('div');
    layer.className = 'lq-orb-layer';
    layer.style.cssText =
      'position:absolute;inset:0;z-index:0;pointer-events:none;' +
      'overflow:hidden;border-radius:inherit;' +
      '-webkit-mask-image:-webkit-radial-gradient(white,black);';

    // Generate a unique speed per glass panel (e.g., between 6s and 9.5s)
    var uniqueDuration = (6 + Math.random() * 3.5).toFixed(2) + 's';

    var n = circleCount || CIRCLE_DEFS.length;
    for (var i = 0; i < n && i < CIRCLE_DEFS.length; i++) {
      var def = CIRCLE_DEFS[i];
      var c = document.createElement('div');
      c.className = 'lq-circle';
      var blur = getBlur(def.group);
      var color = getColor(def.group, scheme);
      
      // Generate unique random left/top coordinates between -30% and 130% to scatter the orbs uniquely
      var randomX = (-30 + Math.random() * 160).toFixed(1) + '%';
      var randomY = (-30 + Math.random() * 160).toFixed(1) + '%';
      
      // Add a unique random animation delay offset for each circle so they are beautifully de-synchronized
      var uniqueDelay = '-' + (Math.random() * 10).toFixed(2) + 's';
      
      c.style.cssText =
        'position:fixed;border-radius:50%;pointer-events:none;' +
        'width:120px;height:120px;' +
        'background:' + color + ';' +
        'filter:blur(' + (blur * 1.5) + 'px);' +
        'left:' + randomX + ';top:' + randomY + ';' +
        'transform:translateZ(0);' +
        'animation:' + def.anim + ' var(--lq-duration,7s) linear infinite;' +
        'animation-delay:' + uniqueDelay + ';' +
        'will-change:transform;';
      layer.appendChild(c);
    }

    el.insertBefore(layer, el.firstChild);

    // Set the base duration variable locally for this panel (enables independent hover acceleration)
    el.style.setProperty('--lq-duration', uniqueDuration);
  }



  /** Convert text to letter-by-letter animated spans */
  function letterize(el, text) {
    if (!text) text = el.textContent;
    el.innerHTML = '';
    el.classList.add('lq-letterized');
    for (var i = 0; i < text.length; i++) {
      var sp = document.createElement('span');
      sp.className = 'lq-letter';
      sp.textContent = text[i] === ' ' ? '\u00a0' : text[i];
      sp.style.animationDelay = (i * 0.08) + 's';
      el.appendChild(sp);
    }
  }

  function activateAll() {
    if (active) return;
    active = true;

    // Glass panels — purple orbs (big)
    document.querySelectorAll('.glass').forEach(function(el) {
      injectFullOrbs(el, PURPLE, 12);
    });

    document.querySelectorAll('.menu-btn').forEach(function(el) {
      applyTrueLiquidGlass(el);
    });

    // Primary buttons — exact UIverse HTML
    document.querySelectorAll('.btn-primary').forEach(function(el) {
      applyUiverseHtml(el);
    });

    // Secondary buttons — purple orbs
    document.querySelectorAll('.btn-secondary').forEach(function(el) {
      injectFullOrbs(el, PURPLE, 8);
    });

    // Bot cards — purple orbs
    document.querySelectorAll('.bot-card').forEach(function(el) {
      injectFullOrbs(el, PURPLE, 8);
    });

    // Learn cards — purple orbs
    document.querySelectorAll('.learn-card').forEach(function(el) {
      injectFullOrbs(el, PURPLE, 8);
    });

    // Diff buttons — purple orbs
    document.querySelectorAll('.diff-btn').forEach(function(el) {
      injectFullOrbs(el, PURPLE, 6);
    });

    // Game over stats — purple
    document.querySelectorAll('.go-stats').forEach(function(el) {
      injectFullOrbs(el, PURPLE, 8);
    });

    // Letterize the menu logo
    var logo = document.querySelector('.menu-logo');
    if (logo && !logo.classList.contains('lq-letterized')) {
      logo.innerHTML = '';
      var line1 = document.createElement('div');
      var line2 = document.createElement('div');
      letterize(line1, 'Last');
      letterize(line2, 'Letter');
      logo.appendChild(line1);
      logo.appendChild(line2);
      logo.classList.add('lq-letterized');
    }
  }

  function deactivateAll() {
    active = false;
    document.querySelectorAll('.lq-orb-layer').forEach(function(el) { el.remove(); });
    document.querySelectorAll('.lq-true-glass').forEach(function(el) { el.remove(); });
    var defs = document.getElementById('lq-glass-svg-defs');
    if (defs) defs.innerHTML = '';
    glassCache = {};
    filterIdCounter = 0;
    // Restore btn-primary styles
    document.querySelectorAll('.btn-primary').forEach(function(el) {
      var w = el.querySelector('.wrapper');
      if (w) {
        var span = w.querySelector('span');
        if (span) {
          while (span.firstChild) {
            el.insertBefore(span.firstChild, w);
          }
        }
        w.remove();
      }
    });
    var logo = document.querySelector('.menu-logo');
    if (logo && logo.classList.contains('lq-letterized')) {
      logo.classList.remove('lq-letterized');
      logo.innerHTML = 'Last<br>Letter';
    }
  }

  function refreshDynamic() {
    if (!active) return;
    document.querySelectorAll('.bot-card').forEach(function(el) { injectFullOrbs(el, PURPLE, 8); });
    document.querySelectorAll('.menu-btn').forEach(function(el) { applyTrueLiquidGlass(el); });
    document.querySelectorAll('.btn-primary').forEach(function(el) { applyUiverseHtml(el); });
    document.querySelectorAll('.btn-secondary').forEach(function(el) { injectFullOrbs(el, PURPLE, 8); });
    document.querySelectorAll('.diff-btn').forEach(function(el) { injectFullOrbs(el, PURPLE, 6); });
  }

  return {
    activate: activateAll,
    deactivate: deactivateAll,
    refresh: refreshDynamic,
    injectOrbs: injectFullOrbs,
    letterize: letterize,
    isActive: function() { return active; },
    PURPLE: PURPLE,
    GOLD: GOLD
  };
})();
