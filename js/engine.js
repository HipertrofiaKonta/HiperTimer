/* Silnik interwałowy — drift-proof, oparty na absolutnej osi czasu.
   Czysta logika, zero DOM — testowalny w Node. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.IntervalEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REP_NOMINAL = 30; // nominalna długość segmentu "na powtórzenia" do rysowania timeline

  // Buduje płaską listę segmentów z konfiguracji.
  // cfg: { prep, rounds, stations: [{name, type:'time'|'reps', work, rest}] }
  function buildSegments(cfg) {
    var segs = [];
    var prep = Math.max(0, (cfg.prep | 0));
    if (prep > 0) segs.push({ kind: 'prep', dur: prep, round: 0, stIdx: -1, name: '' });
    var rounds = Math.max(1, (cfg.rounds | 0));
    var stations = (cfg.stations && cfg.stations.length)
      ? cfg.stations
      : [{ name: '', type: 'time', work: (cfg.work | 0) || 30, rest: (cfg.rest | 0) || 0 }];
    for (var r = 1; r <= rounds; r++) {
      for (var s = 0; s < stations.length; s++) {
        var st = stations[s];
        var isReps = st.type === 'reps';
        segs.push({
          kind: 'work',
          dur: isReps ? null : Math.max(1, (st.work | 0)),
          round: r, stIdx: s, name: st.name || ''
        });
        var isLast = (r === rounds) && (s === stations.length - 1);
        var rest = Math.max(0, (st.rest | 0));
        if (rest > 0 && !isLast) {
          segs.push({ kind: 'rest', dur: rest, round: r, stIdx: s, name: st.name || '' });
        }
      }
    }
    return segs;
  }

  function plannedDur(seg) { return seg.dur === null ? REP_NOMINAL : seg.dur + (seg.extra || 0); }

  function totalPlanned(segs) {
    var t = 0;
    for (var i = 0; i < segs.length; i++) t += plannedDur(segs[i]);
    return t;
  }

  // opts.now — wstrzykiwany zegar (ms); domyślnie performance.now
  function Engine(cfg, opts) {
    opts = opts || {};
    this.now = opts.now || function () { return (typeof performance !== 'undefined' ? performance : Date).now(); };
    this.cfg = cfg;
    this.segments = buildSegments(cfg);
    this.idx = -1;
    this.segStart = 0;       // absolutny znacznik startu bieżącego segmentu
    this.paused = false;
    this.pausedAt = 0;
    this.startedAt = 0;
    this.finishedAt = 0;
    this.workMs = 0;
    this.restMs = 0;
    this.roundsDone = 0;
    this.stationsDone = 0;
    this.running = false;
  }

  Engine.prototype.start = function () {
    this.startedAt = this.segStart = this.now();
    this.idx = 0;
    this.running = true;
  };

  Engine.prototype.current = function () {
    return (this.idx >= 0 && this.idx < this.segments.length) ? this.segments[this.idx] : null;
  };

  Engine.prototype._effDurMs = function (seg) {
    return (seg.dur + (seg.extra || 0)) * 1000;
  };

  // Zamknięcie segmentu: statystyki. actualMs — ile realnie trwał.
  Engine.prototype._closeSeg = function (seg, actualMs) {
    if (seg.kind === 'work') {
      this.workMs += actualMs;
      this.stationsDone++;
      this.roundsDone = Math.max(this.roundsDone, seg.round);
    } else if (seg.kind === 'rest') {
      this.restMs += actualMs;
    }
  };

  // Główna pętla. Zwraca { events: [...], snap: {...} }.
  // events: {type:'segStart', seg, missed} | {type:'finished', missed}
  // missed=true gdy zdarzenie zaszło >1.5 s temu (catch-up po tle) — UI nie odtwarza wtedy dźwięków.
  Engine.prototype.tick = function () {
    var events = [];
    if (!this.running) return { events: events, snap: this._snap(null, 0) };
    var t = this.paused ? this.pausedAt : this.now();

    // fast-forward przez zakończone segmenty czasowe (catch-up po throttlingu)
    while (this.idx < this.segments.length) {
      var seg = this.segments[this.idx];
      if (seg.dur === null) break; // segment na powtórzenia — czeka na markDone()
      var effMs = this._effDurMs(seg);
      if (t - this.segStart >= effMs) {
        this._closeSeg(seg, effMs);
        this.segStart += effMs; // absolutna oś czasu — zero dryfu
        this.idx++;
        if (this.idx < this.segments.length) {
          events.push({ type: 'segStart', seg: this.segments[this.idx], missed: (t - this.segStart) > 1500 });
        } else {
          this.running = false;
          this.finishedAt = this.segStart;
          events.push({ type: 'finished', missed: (t - this.segStart) > 1500 });
        }
      } else break;
    }

    var cur = this.current();
    var elapsedMs = cur ? (t - this.segStart) : 0;
    return { events: events, snap: this._snap(cur, elapsedMs) };
  };

  Engine.prototype._snap = function (cur, elapsedMs) {
    var remainingMs = null, progress = 0;
    if (cur) {
      if (cur.dur === null) {
        progress = 0;
      } else {
        var effMs = this._effDurMs(cur);
        remainingMs = Math.max(0, effMs - elapsedMs);
        progress = effMs > 0 ? Math.min(1, elapsedMs / effMs) : 1;
      }
    }
    // następny segment pracy (etykieta NEXT)
    var nextWork = null;
    for (var i = this.idx + 1; i < this.segments.length; i++) {
      if (this.segments[i].kind === 'work') { nextWork = this.segments[i]; break; }
    }
    // pozycja na osi całości (do mini-timeline)
    var doneSec = 0;
    for (var j = 0; j < this.idx && j < this.segments.length; j++) doneSec += plannedDur(this.segments[j]);
    if (cur) doneSec += Math.min(plannedDur(cur), elapsedMs / 1000);
    return {
      seg: cur,
      idx: this.idx,
      remainingMs: remainingMs,
      elapsedMs: elapsedMs,
      progress: progress,
      nextWork: nextWork,
      paused: this.paused,
      done: !this.running && this.idx >= this.segments.length,
      overallSec: doneSec,
      totalSec: totalPlanned(this.segments),
      round: cur ? cur.round : this.roundsDone,
      roundsTotal: Math.max(1, this.cfg.rounds | 0)
    };
  };

  Engine.prototype.pause = function () {
    if (this.paused || !this.running) return;
    this.paused = true;
    this.pausedAt = this.now();
  };

  Engine.prototype.resume = function () {
    if (!this.paused) return;
    this.segStart += this.now() - this.pausedAt; // przesunięcie osi o czas pauzy
    this.paused = false;
  };

  // +N s do bieżącego segmentu (segmenty na powtórzenia nie mają czasu — ignoruj)
  Engine.prototype.addSeconds = function (n) {
    var seg = this.current();
    if (seg && seg.dur !== null) seg.extra = (seg.extra || 0) + n;
  };

  // "Zrobione" dla segmentu na powtórzenia
  Engine.prototype.markDone = function () {
    var seg = this.current();
    if (!seg || seg.dur !== null) return;
    this._advanceNow(seg);
  };

  // Pomiń bieżący segment
  Engine.prototype.skip = function () {
    var seg = this.current();
    if (!seg) return;
    this._advanceNow(seg);
  };

  Engine.prototype._advanceNow = function (seg) {
    var t = this.paused ? this.pausedAt : this.now();
    this._closeSeg(seg, t - this.segStart);
    this.segStart = t;
    this.idx++;
    if (this.idx >= this.segments.length) {
      this.running = false;
      this.finishedAt = t;
    }
  };

  Engine.prototype.summary = function () {
    return {
      workSec: Math.round(this.workMs / 1000),
      restSec: Math.round(this.restMs / 1000),
      roundsDone: this.roundsDone,
      roundsTotal: Math.max(1, this.cfg.rounds | 0),
      stationsDone: this.stationsDone,
      totalSec: Math.round(((this.finishedAt || this.now()) - this.startedAt) / 1000)
    };
  };

  return { Engine: Engine, buildSegments: buildSegments, totalPlanned: totalPlanned, plannedDur: plannedDur, REP_NOMINAL: REP_NOMINAL };
});
