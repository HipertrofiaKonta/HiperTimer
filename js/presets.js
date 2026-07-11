/* Wbudowane presety. Każdy zwraca świeżą kopię konfiguracji. */
(function (root) {
  'use strict';
  root.Presets = [
    {
      id: 'tabata', name: 'Tabata', desc: '20 s pracy / 10 s przerwy × 8',
      cfg: { prep: 10, rounds: 8, stations: [{ name: 'Tabata', type: 'time', work: 20, rest: 10 }] }
    },
    {
      id: 'emom', name: 'EMOM 10', desc: 'Co minutę nowa runda × 10 (odpoczynek = reszta minuty)',
      cfg: { prep: 10, rounds: 10, stations: [{ name: 'EMOM', type: 'time', work: 60, rest: 0 }] }
    },
    {
      id: 'amrap', name: 'AMRAP 15', desc: 'Jak najwięcej rund w 15 minut',
      cfg: { prep: 10, rounds: 1, stations: [{ name: 'AMRAP', type: 'time', work: 900, rest: 0 }] }
    },
    {
      id: 'obwod', name: 'Obwód klasyczny', desc: '4 stacje × 3 rundy, 40/20',
      cfg: {
        prep: 10, rounds: 3, stations: [
          { name: 'Przysiady', type: 'time', work: 40, rest: 20 },
          { name: 'Pompki', type: 'time', work: 40, rest: 20 },
          { name: 'Wiosłowanie', type: 'time', work: 40, rest: 20 },
          { name: 'Deska', type: 'time', work: 40, rest: 20 }
        ]
      }
    }
  ];
  root.cloneCfg = function (cfg) { return JSON.parse(JSON.stringify(cfg)); };
})(typeof self !== 'undefined' ? self : this);
