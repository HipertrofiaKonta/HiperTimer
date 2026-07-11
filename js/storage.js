/* Cienka warstwa nad localStorage — odporna na tryb prywatny / brak miejsca. */
(function (root) {
  'use strict';
  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  root.Store = {
    getSettings: function () {
      return Object.assign({
        fillDir: 'down',      // 'down' = praca opróżnia się z góry / 'up' odwrotnie
        loud: false,          // tryb głośnej siłowni
        voice: false,         // polskie zapowiedzi głosowe
        soundSet: 'beep',     // beep | whistle | gong
        vibration: true,      // tylko Android (iOS: brak API)
        brandName: '',        // branding grafiki udostępniania
        brandInsta: ''
      }, get('gt_settings', {}));
    },
    setSettings: function (s) { return set('gt_settings', s); },
    getTemplates: function () { return get('gt_templates', []); },
    setTemplates: function (t) { return set('gt_templates', t); },
    getLast: function () { return get('gt_last', null); },   // {cfg, screen}
    setLast: function (l) { return set('gt_last', l); },
    onboarded: function () { return get('gt_onboarded', false); },
    setOnboarded: function () { return set('gt_onboarded', true); }
  };
})(typeof self !== 'undefined' ? self : this);
