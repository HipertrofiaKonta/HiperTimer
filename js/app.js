/* Aplikacja — UI, ekrany, runner treningu, PWA. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var settings = Store.getSettings();
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var deferredPrompt = null;

  /* ══════════ ROUTER ══════════ */
  var SCREENS = ['home', 'config', 'workout', 'summary', 'settings'];
  function show(name) {
    SCREENS.forEach(function (s) { $('screen-' + s).classList.toggle('hidden', s !== name); });
    if (name !== 'workout') setBodyState('idle');
    if (name === 'home' || name === 'config') {
      Store.setLast({ cfg: cfg, name: cfgName, screen: name });
    }
  }
  function setBodyState(st) {
    document.body.className = 'state-' + st;
  }

  /* ══════════ KONFIGURACJA (model) ══════════ */
  var cfg = cloneCfg(Presets[0].cfg);
  var cfgName = 'Tabata';

  function fmtTotal(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ' min' + (s ? ' ' + s + ' s' : '');
  }
  function fmtClock(ms) {
    var sec = Math.ceil(ms / 1000);
    if (sec >= 60) {
      var m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    }
    return String(sec);
  }

  /* ── ekran główny ── */
  function renderHome() {
    var box = $('home-tiles');
    box.innerHTML = '';
    var last = Store.getLast();
    if (last && last.cfg) {
      box.appendChild(makeTile(last.name || 'Ostatni trening', 'Twój ostatni trening — stuknij i START',
        function () { openConfig(cloneCfg(last.cfg), last.name || 'Ostatni trening'); }, 'last'));
    }
    Presets.forEach(function (p) {
      box.appendChild(makeTile(p.name, p.desc, function () { openConfig(cloneCfg(p.cfg), p.name); }));
    });
    Store.getTemplates().forEach(function (t, i) {
      var tile = makeTile('⭐ ' + t.name, 'Własny szablon', function () { openConfig(cloneCfg(t.cfg), t.name); });
      var del = document.createElement('button');
      del.className = 't-del'; del.textContent = 'usuń';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        var arr = Store.getTemplates(); arr.splice(i, 1); Store.setTemplates(arr);
        renderHome();
      });
      tile.appendChild(del);
      box.appendChild(tile);
    });
  }
  function makeTile(name, desc, onTap, extra) {
    var b = document.createElement('button');
    b.className = 'tile' + (extra ? ' ' + extra : '');
    b.innerHTML = '<span class="t-name"></span><span class="t-desc"></span>';
    b.querySelector('.t-name').textContent = name;
    b.querySelector('.t-desc').textContent = desc;
    b.addEventListener('click', onTap);
    return b;
  }

  /* ── ekran konfiguracji ── */
  function openConfig(newCfg, name) {
    cfg = newCfg; cfgName = name || '';
    $('cfg-name').value = cfgName;
    renderConfig();
    show('config');
  }
  function renderConfig() {
    document.querySelector('[data-field=rounds] input').value = cfg.rounds;
    document.querySelector('[data-field=prep] input').value = cfg.prep;
    var list = $('station-list');
    list.innerHTML = '';
    cfg.stations.forEach(function (st, i) { list.appendChild(stationRow(st, i)); });
    renderTimeline();
  }
  function stationRow(st, i) {
    var d = document.createElement('div');
    d.className = 'station';
    d.innerHTML =
      '<div class="st-top">' +
        '<input type="text" placeholder="Nazwa ćwiczenia (stacja ' + (i + 1) + ')" maxlength="30">' +
        '<button class="st-type"></button>' +
        (cfg.stations.length > 1 ? '<button class="st-del" aria-label="Usuń">✕</button>' : '') +
      '</div>' +
      '<div class="st-fields"></div>';
    var nameIn = d.querySelector('input');
    nameIn.value = st.name;
    nameIn.addEventListener('input', function () { st.name = nameIn.value; renderTimeline(); });
    var typeBtn = d.querySelector('.st-type');
    function paintType() {
      typeBtn.textContent = st.type === 'reps' ? 'Na powtórzenia' : 'Na czas';
      typeBtn.classList.toggle('reps', st.type === 'reps');
    }
    paintType();
    typeBtn.addEventListener('click', function () {
      st.type = st.type === 'reps' ? 'time' : 'reps';
      paintType(); renderConfig();
    });
    var delBtn = d.querySelector('.st-del');
    if (delBtn) delBtn.addEventListener('click', function () {
      cfg.stations.splice(i, 1); renderConfig();
    });
    var fields = d.querySelector('.st-fields');
    if (st.type === 'time') fields.appendChild(stField('Praca (s)', st.work, 5, 1, 3600, function (v) { st.work = v; }));
    fields.appendChild(stField('Przerwa (s)', st.rest, 5, 0, 600, function (v) { st.rest = v; }));
    return d;
  }
  function stField(label, val, step, min, max, onChange) {
    var w = document.createElement('div');
    w.className = 'st-field';
    w.innerHTML = '<label></label><div class="stepper">' +
      '<button class="step-btn">−</button>' +
      '<input type="number" inputmode="numeric">' +
      '<button class="step-btn">＋</button></div>';
    w.querySelector('label').textContent = label;
    var input = w.querySelector('input');
    input.min = min; input.max = max; input.value = val;
    var btns = w.querySelectorAll('.step-btn');
    function setV(v) {
      v = Math.max(min, Math.min(max, v | 0));
      input.value = v; onChange(v); renderTimeline();
    }
    btns[0].addEventListener('click', function () { setV((input.value | 0) - step); });
    btns[1].addEventListener('click', function () { setV((input.value | 0) + step); });
    input.addEventListener('change', function () { setV(input.value | 0); });
    return w;
  }

  // globalne steppery (rundy / przygotowanie)
  document.querySelectorAll('.cfg-row .stepper').forEach(function (el) {
    var field = el.dataset.field;
    var input = el.querySelector('input');
    function setV(v) {
      var min = input.min | 0, max = input.max | 0;
      v = Math.max(min, Math.min(max, v | 0));
      input.value = v; cfg[field] = v; renderTimeline();
    }
    el.querySelectorAll('.step-btn').forEach(function (b) {
      b.addEventListener('click', function () { setV((input.value | 0) + (b.dataset.d | 0)); });
    });
    input.addEventListener('change', function () { setV(input.value | 0); });
  });
  $('cfg-name').addEventListener('input', function () { cfgName = this.value; });

  /* ── timeline (podgląd) + long-press quick edit + swipe ── */
  var hlStation = -1;
  function renderTimeline() {
    var segs = IntervalEngine.buildSegments(cfg);
    var total = IntervalEngine.totalPlanned(segs);
    $('tl-total').textContent = '— ' + fmtTotal(total);
    var tl = $('timeline-preview');
    tl.innerHTML = '';
    segs.forEach(function (seg, i) {
      var b = document.createElement('div');
      b.className = 'tl-block ' + (seg.dur === null ? 'reps' : seg.kind);
      if (seg.kind === 'work' && seg.stIdx === hlStation) b.classList.add('hl');
      b.style.flexGrow = IntervalEngine.plannedDur(seg);
      attachLongPress(b, function () { openBlockEditor(seg, i); });
      tl.appendChild(b);
    });
  }
  // swipe w podglądzie = podświetl kolejną stację
  (function () {
    var x0 = null;
    var tl = $('timeline-preview');
    tl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    tl.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) {
        var n = cfg.stations.length;
        hlStation = ((hlStation + (dx < 0 ? 1 : -1)) % n + n) % n;
        renderTimeline();
      }
      x0 = null;
    }, { passive: true });
  })();

  function attachLongPress(el, fn) {
    var timer = null;
    function clear() { if (timer) { clearTimeout(timer); timer = null; } }
    el.addEventListener('touchstart', function (e) {
      timer = setTimeout(function () { timer = null; fn(); }, 550);
    }, { passive: true });
    el.addEventListener('touchmove', clear, { passive: true });
    el.addEventListener('touchend', clear);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); fn(); }); // desktop/prawy klik
  }

  var beSeg = null;
  function openBlockEditor(seg) {
    if (seg.dur === null) return; // segment na powtórzenia nie ma czasu
    beSeg = seg;
    $('be-title').textContent = (seg.kind === 'work' ? 'Praca' : seg.kind === 'rest' ? 'Przerwa' : 'Przygotowanie') +
      (seg.name ? ' — ' + seg.name : '');
    $('be-value').value = seg.dur;
    $('block-editor').classList.remove('hidden');
  }
  $('be-minus').addEventListener('click', function () { $('be-value').value = Math.max(1, ($('be-value').value | 0) - 5); });
  $('be-plus').addEventListener('click', function () { $('be-value').value = ($('be-value').value | 0) + 5; });
  $('be-cancel').addEventListener('click', function () { $('block-editor').classList.add('hidden'); });
  $('be-ok').addEventListener('click', function () {
    var v = Math.max(1, $('be-value').value | 0);
    if (beSeg) {
      // szybka edycja: zmienia definicję stacji (dotyczy wszystkich rund tej stacji)
      var st = cfg.stations[beSeg.stIdx];
      if (beSeg.kind === 'work' && st) st.work = v;
      else if (beSeg.kind === 'rest' && st) st.rest = v;
      else if (beSeg.kind === 'prep') cfg.prep = v;
    }
    $('block-editor').classList.add('hidden');
    renderConfig();
  });

  /* ══════════ WAKE LOCK ══════════ */
  var wakeLock = null;
  function acquireWakeLock() {
    if (!('wakeLock' in navigator)) { $('wakelock-banner').classList.remove('hidden'); return; }
    navigator.wakeLock.request('screen').then(function (wl) {
      wakeLock = wl;
      $('wakelock-banner').classList.add('hidden');
      wl.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () {
      // odmowa (np. tryb oszczędzania baterii) — tylko baner, bez fallbacku (decyzja D5)
      $('wakelock-banner').classList.remove('hidden');
    });
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }

  /* ══════════ RUNNER TRENINGU ══════════ */
  var engine = null;
  var rafId = null, intervalId = null;
  var lastTickBeep = -1;
  var hideTimer = null;
  var locked = false;

  function startWorkout() {
    Sound.unlock();                       // gest użytkownika = odblokowanie audio
    Store.setLast({ cfg: cfg, name: cfgName, screen: 'config' });
    engine = new IntervalEngine.Engine(cfg);
    engine.start();
    lastTickBeep = -1;
    renderMiniTimeline();
    show('workout');
    acquireWakeLock();
    announceSeg(engine.current(), false);
    unfadeControls();
    loop();
    intervalId = setInterval(frame, 250);  // zapas gdy rAF przystopowany
  }

  function loop() { frame(); rafId = requestAnimationFrame(loop); }

  function frame() {
    if (!engine) return;
    var r = engine.tick();
    r.events.forEach(function (ev) {
      if (ev.type === 'finished') { finishWorkout(ev.missed); }
      else if (ev.type === 'segStart' && !ev.missed) announceSeg(ev.seg, true);
    });
    if (!engine) return;
    render(r.snap);
  }

  function announceSeg(seg, withCue) {
    if (!seg) return;
    var opts = { soundSet: settings.soundSet, loud: settings.loud };
    if (seg.kind === 'work') {
      if (withCue) Sound.cue('workStart', opts);
      if (settings.vibration) Sound.vibrate([300, 100, 300]);
      if (settings.voice) {
        var txt = seg.name || 'Praca';
        if (seg.round === engine.cfg.rounds && seg.round > 1 && seg.stIdx === 0) txt = 'Ostatnia runda. ' + txt;
        Sound.speak(txt);
      }
    } else if (seg.kind === 'rest') {
      if (withCue) Sound.cue('restStart', opts);
      if (settings.vibration) Sound.vibrate([500]);
      if (settings.voice) {
        var nx = null;
        for (var i = engine.idx + 1; i < engine.segments.length; i++) {
          if (engine.segments[i].kind === 'work') { nx = engine.segments[i]; break; }
        }
        Sound.speak('Przerwa.' + (nx && nx.name ? ' Następnie: ' + nx.name : ''));
      }
    } else if (seg.kind === 'prep' && settings.voice) {
      Sound.speak('Przygotuj się');
    }
  }

  function render(snap) {
    if (!snap.seg) return;
    var seg = snap.seg;
    var isReps = seg.dur === null;

    // stan / kolor tła
    var state = seg.kind;
    var remS = snap.remainingMs === null ? null : Math.ceil(snap.remainingMs / 1000);
    if (snap.paused) state = 'paused';
    else if (!isReps && remS !== null && remS <= 5 && seg.kind !== 'prep') state = 'ending';
    setBodyState(state === 'paused' ? 'paused' : state);

    // sygnały ostatnich 3 s
    if (!snap.paused && !isReps && remS !== null && remS <= 3 && remS >= 1 && remS !== lastTickBeep) {
      lastTickBeep = remS;
      Sound.cue('tick', { soundSet: settings.soundSet, loud: settings.loud });
    }
    if (remS !== null && remS > 3) lastTickBeep = -1;

    // zegar
    var clock = $('wo-clock');
    var txt = isReps ? fmtClock(snap.elapsedMs) : fmtClock(snap.remainingMs);
    if (clock.textContent !== txt) clock.textContent = txt;
    clock.classList.toggle('longfmt', txt.length > 3);

    // etykiety
    $('wo-round').textContent = seg.kind === 'prep' ? 'PRZYGOTUJ SIĘ'
      : 'RUNDA ' + seg.round + '/' + snap.roundsTotal;
    $('wo-phase').textContent = snap.paused ? 'PAUZA'
      : seg.kind === 'work' ? (isReps ? 'PRACA — NA POWTÓRZENIA' : 'PRACA')
      : seg.kind === 'rest' ? 'PRZERWA' : '';
    $('wo-station').textContent = seg.kind === 'work' ? (seg.name || '') :
      (seg.kind === 'rest' && seg.name ? '' : '');
    $('wo-next').textContent = snap.nextWork
      ? 'NEXT: ' + (snap.nextWork.name || 'stacja ' + (snap.nextWork.stIdx + 1))
      : 'OSTATNI INTERWAŁ';

    // tank-fill
    var p = isReps ? 0 : snap.progress;
    var scale = seg.kind === 'rest' ? p : (1 - p);   // praca: opróżnia się, przerwa: napełnia
    $('tank').style.transform = 'scaleY(' + scale.toFixed(4) + ')';

    // przycisk Zrobione tylko dla segmentów na powtórzenia
    $('btn-done').classList.toggle('hidden', !isReps || snap.paused);
    $('btn-plus30').classList.toggle('hidden', isReps);

    // mini-timeline marker
    var pct = snap.totalSec > 0 ? (snap.overallSec / snap.totalSec) * 100 : 0;
    $('mini-marker').style.left = 'calc(' + pct.toFixed(2) + '% - 2px)';

    $('btn-pause').textContent = snap.paused ? '▶' : '⏸';
  }

  function renderMiniTimeline() {
    var mt = $('mini-timeline');
    mt.querySelectorAll('.tl-block').forEach(function (b) { b.remove(); });
    engine.segments.forEach(function (seg) {
      var b = document.createElement('div');
      b.className = 'tl-block ' + (seg.dur === null ? 'reps' : seg.kind);
      b.style.flexGrow = IntervalEngine.plannedDur(seg);
      mt.appendChild(b);
    });
  }

  function finishWorkout(missed) {
    if (!missed) {
      Sound.cue('finish', { soundSet: settings.soundSet, loud: settings.loud });
      if (settings.voice) Sound.speak('Trening ukończony. Dobra robota!');
      if (settings.vibration) Sound.vibrate([400, 150, 400, 150, 600]);
    }
    var s = engine.summary();
    stopRunner();
    $('sum-total').textContent = fmtTotal(s.totalSec);
    $('sum-work').textContent = fmtTotal(s.workSec);
    $('sum-rest').textContent = fmtTotal(s.restSec);
    $('sum-rounds').textContent = s.roundsDone + '/' + s.roundsTotal;
    $('sum-stations').textContent = s.stationsDone;
    lastSummary = s;
    show('summary');
  }

  function stopRunner() {
    if (rafId) cancelAnimationFrame(rafId);
    if (intervalId) clearInterval(intervalId);
    rafId = intervalId = null;
    engine = null;
    releaseWakeLock();
    Sound.stop();
    locked = false;
    $('lock-overlay').classList.add('hidden');
  }

  /* ── kontrolki mid-workout ── */
  $('btn-pause').addEventListener('click', function () {
    if (!engine) return;
    if (engine.paused) engine.resume(); else engine.pause();
    frame();
    unfadeControls();
  });
  $('btn-plus30').addEventListener('click', function () { if (engine) { engine.addSeconds(30); unfadeControls(); } });
  $('btn-skip').addEventListener('click', function () { if (engine) { engine.skip(); frame(); unfadeControls(); } });
  $('btn-done').addEventListener('click', function () { if (engine) { engine.markDone(); frame(); unfadeControls(); } });
  $('btn-abort').addEventListener('click', function () {
    if (engine && confirm('Zakończyć trening?')) finishWorkout(true);
  });

  /* ── blokada przed przypadkowym dotykiem (przycisk-kłódka, odblokowanie 1 s) ── */
  $('btn-lock').addEventListener('click', function () {
    locked = true;
    $('lock-overlay').classList.remove('hidden');
  });
  (function () {
    var t = null;
    var btn = $('btn-unlock');
    function begin(e) {
      e.preventDefault();
      btn.classList.add('holding');
      t = setTimeout(function () {
        locked = false;
        $('lock-overlay').classList.add('hidden');
        btn.classList.remove('holding');
      }, 1000);
    }
    function cancel() { btn.classList.remove('holding'); if (t) { clearTimeout(t); t = null; } }
    btn.addEventListener('touchstart', begin, { passive: false });
    btn.addEventListener('mousedown', begin);
    btn.addEventListener('touchend', cancel);
    btn.addEventListener('touchmove', cancel);
    btn.addEventListener('mouseup', cancel);
    btn.addEventListener('mouseleave', cancel);
  })();

  /* ── auto-ukrywanie kontrolek podczas pracy ── */
  function unfadeControls() {
    $('wo-controls').classList.remove('faded');
    $('btn-abort').style.opacity = '';
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (engine && !engine.paused && !locked) {
        $('wo-controls').classList.add('faded');
        $('btn-abort').style.opacity = '0';
      }
    }, 4000);
  }
  $('screen-workout').addEventListener('click', function () { if (!locked) unfadeControls(); });

  /* ── powrót z tła: re-acquire wake lock, silnik sam nadrabia ── */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && engine) {
      acquireWakeLock();
      frame();
    }
  });

  /* ══════════ PODSUMOWANIE + GRAFIKA (Instagram Story 1080×1920) ══════════ */
  var lastSummary = null;
  function drawStory(s) {
    var c = $('share-canvas'), x = c.getContext('2d');
    var W = 1080, H = 1920;
    var g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#101418'); g.addColorStop(1, '#1c2830');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#17a24a'; x.fillRect(0, 0, W, 18); x.fillRect(0, H - 18, W, 18);
    x.textAlign = 'center'; x.fillStyle = '#f2f5f7';
    if (settings.brandName) {
      x.font = '700 64px -apple-system, Roboto, sans-serif';
      x.fillText(settings.brandName, W / 2, 200);
    }
    x.font = '900 110px -apple-system, Roboto, sans-serif';
    x.fillText('TRENING', W / 2, 420);
    x.fillText('UKOŃCZONY 💪', W / 2, 550);
    x.font = '400 52px -apple-system, Roboto, sans-serif';
    x.fillStyle = '#8a939c';
    x.fillText(new Date().toLocaleDateString('pl-PL'), W / 2, 640);
    var rows = [
      ['Czas łącznie', fmtTotal(s.totalSec)],
      ['Czas pracy', fmtTotal(s.workSec)],
      ['Przerwy', fmtTotal(s.restSec)],
      ['Rundy', s.roundsDone + '/' + s.roundsTotal],
      ['Stacje', String(s.stationsDone)]
    ];
    var y = 840;
    rows.forEach(function (r) {
      x.fillStyle = '#233038';
      roundRect(x, 90, y - 90, W - 180, 150, 28);
      x.fillStyle = '#8a939c';
      x.font = '400 44px -apple-system, Roboto, sans-serif';
      x.textAlign = 'left'; x.fillText(r[0], 140, y);
      x.fillStyle = '#f2f5f7';
      x.font = '800 60px -apple-system, Roboto, sans-serif';
      x.textAlign = 'right'; x.fillText(r[1], W - 140, y + 4);
      x.textAlign = 'center';
      y += 190;
    });
    if (settings.brandInsta) {
      x.fillStyle = '#33d17a';
      x.font = '600 54px -apple-system, Roboto, sans-serif';
      x.fillText(settings.brandInsta, W / 2, H - 120);
    }
    return c;
  }
  function roundRect(x, a, b, w, h, r) {
    x.beginPath();
    x.moveTo(a + r, b);
    x.arcTo(a + w, b, a + w, b + h, r);
    x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r);
    x.arcTo(a, b, a + w, b, r);
    x.closePath(); x.fill();
  }
  $('btn-share').addEventListener('click', function () {
    if (!lastSummary) return;
    var c = drawStory(lastSummary);
    c.toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'trening.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Trening ukończony' }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'trening.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      }
    }, 'image/png');
  });
  $('btn-again').addEventListener('click', function () { startWorkout(); });
  $('btn-home').addEventListener('click', function () { renderHome(); show('home'); });

  /* ══════════ USTAWIENIA ══════════ */
  function loadSettingsUI() {
    $('set-filldir').value = settings.fillDir;
    $('set-loud').checked = settings.loud;
    $('set-voice').checked = settings.voice;
    $('set-soundset').value = settings.soundSet;
    $('set-vibration').checked = settings.vibration;
    $('set-brandname').value = settings.brandName;
    $('set-brandinsta').value = settings.brandInsta;
    if (!Sound.canVibrate) $('row-vibration').classList.add('hidden'); // iOS: brak API
    applyFillDir();
  }
  function saveSettings() {
    settings.fillDir = $('set-filldir').value;
    settings.loud = $('set-loud').checked;
    settings.voice = $('set-voice').checked;
    settings.soundSet = $('set-soundset').value;
    settings.vibration = $('set-vibration').checked;
    settings.brandName = $('set-brandname').value.trim();
    settings.brandInsta = $('set-brandinsta').value.trim();
    Store.setSettings(settings);
    applyFillDir();
  }
  function applyFillDir() {
    $('tank').classList.toggle('from-top', settings.fillDir === 'up');
  }
  ['set-filldir', 'set-loud', 'set-voice', 'set-soundset', 'set-vibration', 'set-brandname', 'set-brandinsta']
    .forEach(function (id) { $(id).addEventListener('change', saveSettings); });
  $('btn-settings').addEventListener('click', function () { loadSettingsUI(); show('settings'); });
  $('btn-set-back').addEventListener('click', function () { renderHome(); show('home'); });
  $('btn-set-test').addEventListener('click', function () {
    Sound.test({ soundSet: settings.soundSet, loud: settings.loud, vibration: settings.vibration && Sound.canVibrate });
  });
  $('btn-sound-test').addEventListener('click', function () {
    Sound.test({ soundSet: settings.soundSet, loud: settings.loud, vibration: settings.vibration && Sound.canVibrate });
  });
  $('btn-clear-tpl').addEventListener('click', function () {
    if (confirm('Usunąć wszystkie zapisane szablony?')) { Store.setTemplates([]); renderHome(); }
  });

  /* ══════════ NAWIGACJA / START ══════════ */
  $('btn-new').addEventListener('click', function () {
    openConfig({ prep: 10, rounds: 3, stations: [{ name: '', type: 'time', work: 30, rest: 15 }] }, '');
  });
  $('btn-cfg-back').addEventListener('click', function () { renderHome(); show('home'); });
  $('btn-save-tpl').addEventListener('click', function () {
    var name = cfgName || $('cfg-name').value.trim() || 'Szablon';
    var arr = Store.getTemplates();
    arr.push({ name: name, cfg: cloneCfg(cfg) });
    if (!Store.setTemplates(arr)) alert('Nie udało się zapisać (brak miejsca lub tryb prywatny).');
    else alert('Zapisano szablon: ' + name);
  });
  $('btn-start').addEventListener('click', startWorkout);

  /* ══════════ ONBOARDING / INSTALACJA ══════════ */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    $('btn-native-install').classList.remove('hidden');
    $('android-manual').classList.add('hidden');
  });
  function showInstall() {
    $('install-ios').classList.toggle('hidden', !isIOS);
    $('install-android').classList.toggle('hidden', isIOS);
    $('install-modal').classList.remove('hidden');
  }
  $('btn-native-install').addEventListener('click', function () {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
    $('install-modal').classList.add('hidden');
  });
  $('btn-install-close').addEventListener('click', function () {
    $('install-modal').classList.add('hidden');
    Store.setOnboarded();
  });
  $('btn-show-install').addEventListener('click', showInstall);

  /* ══════════ SERVICE WORKER (ścieżka względna — GitHub Pages subpath) ══════════ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  /* ══════════ INIT — przywrócenie ostatniego stanu ══════════ */
  (function init() {
    applyFillDir();
    renderHome();
    var last = Store.getLast();
    var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (last && last.screen === 'config' && last.cfg) {
      openConfig(cloneCfg(last.cfg), last.name || '');
    } else {
      show('home');
    }
    if (!Store.onboarded() && !standalone) showInstall();
  })();
})();
