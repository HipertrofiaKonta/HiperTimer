/* Warstwa audio: Web Audio (sygnały 2–4 kHz), odblokowanie gestem,
   trik <audio> na przełącznik wyciszenia iOS, Web Speech PL, wibracje (Android). */
(function (root) {
  'use strict';

  var ctx = null;
  var silentEl = null;
  var unlocked = false;

  // 0,01 s ciszy — zapętlone odtwarzanie przez <audio> ustawia sesję audio iOS
  // w tryb "media", dzięki czemu Web Audio gra mimo przełącznika wyciszenia.
  var SILENT_WAV = 'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  // Wywołać z gestu użytkownika (tap "Start"). Bezpieczne wielokrotnie.
  function unlock() {
    try {
      if (!ctx) ctx = new (root.AudioContext || root.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (!silentEl) {
        silentEl = new Audio(SILENT_WAV);
        silentEl.loop = true;
        silentEl.volume = 0.01;
        silentEl.setAttribute('playsinline', '');
      }
      var p = silentEl.play();
      if (p && p.catch) p.catch(function () {});
      unlocked = true;
    } catch (e) { /* audio niedostępne — appka działa dalej wizualnie */ }
    // rozgrzewka syntezatora mowy (iOS wymaga pierwszego wywołania z gestu)
    try {
      if (root.speechSynthesis) {
        var u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        root.speechSynthesis.speak(u);
      }
    } catch (e) {}
  }

  function stop() {
    try { if (silentEl) silentEl.pause(); } catch (e) {}
  }

  // pojedynczy ton zaplanowany na osi AudioContext (zero opóźnienia)
  function tone(freq, dur, when, type, gain) {
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    var t0 = ctx.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.5, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  // Zestawy brzmień (2–4 kHz — przebijają się przez muzykę na sali)
  var SETS = {
    beep:    { hi: 2600, lo: 2100, wave: 'square' },
    whistle: { hi: 3400, lo: 2900, wave: 'sine' },
    gong:    { hi: 2200, lo: 1900, wave: 'triangle' }
  };

  // cue(name, {soundSet, loud}) — nazwy: workStart, restStart, tick, finish
  function cue(name, opts) {
    if (!ctx || ctx.state !== 'running') return;
    opts = opts || {};
    var s = SETS[opts.soundSet] || SETS.beep;
    var loud = !!opts.loud;
    var rep = loud ? 3 : 1;      // tryb głośnej siłowni: sygnały ×3
    var len = loud ? 0.35 : 0.22;
    var i;
    if (name === 'workStart') {
      for (i = 0; i < rep; i++) {
        tone(s.hi, len, i * 0.5, s.wave, 0.6);
        tone(s.hi, len, i * 0.5 + 0.26, s.wave, 0.6);
      }
    } else if (name === 'restStart') {
      for (i = 0; i < rep; i++) tone(s.lo, loud ? 0.6 : 0.45, i * 0.7, s.wave, 0.55);
    } else if (name === 'tick') {
      tone(s.hi, 0.1, 0, s.wave, loud ? 0.6 : 0.4);
    } else if (name === 'finish') {
      for (i = 0; i < 3; i++) tone(s.hi + i * 200, 0.4, i * 0.45, s.wave, 0.6);
    }
  }

  // ── Web Speech: polskie zapowiedzi ──
  var plVoice;
  function pickVoice() {
    try {
      var vs = root.speechSynthesis ? root.speechSynthesis.getVoices() : [];
      for (var i = 0; i < vs.length; i++) {
        if (/^pl/i.test(vs[i].lang)) { plVoice = vs[i]; break; }
      }
    } catch (e) {}
  }
  if (root.speechSynthesis) {
    pickVoice();
    root.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    try {
      if (!root.speechSynthesis) return false;
      root.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'pl-PL';
      if (plVoice) u.voice = plVoice;
      u.rate = 1.05;
      root.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  function hasPolishVoice() { return !!plVoice; }

  // ── Wibracje: feature-detect (iOS: brak API — po prostu nic się nie dzieje) ──
  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }
  var canVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate;

  // sekwencja testowa (przycisk "sprawdź dźwięk")
  function test(opts) {
    unlock();
    cue('workStart', opts);
    setTimeout(function () { cue('restStart', opts); }, 900);
    setTimeout(function () { cue('finish', opts); }, 2000);
    if (opts && opts.vibration) vibrate([200, 100, 200]);
  }

  root.Sound = {
    unlock: unlock, stop: stop, cue: cue, speak: speak, test: test,
    vibrate: vibrate, canVibrate: canVibrate, hasPolishVoice: hasPolishVoice,
    isUnlocked: function () { return unlocked && ctx && ctx.state === 'running'; }
  };
})(typeof self !== 'undefined' ? self : this);
