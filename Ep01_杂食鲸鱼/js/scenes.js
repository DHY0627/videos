/* ============================================================
   杂食鲸鱼 · 第一期 · 渲染器
   ------------------------------------------------------------
   设计约束：
   1. 不使用任何 CSS @keyframes / transition。全部动画由本文件在
      requestAnimationFrame 中按时间计算，逐帧写入行内 style。
      原因：合成软件 Chromaframe 会把 performance.now / Date.now /
      rAF 换成虚拟时钟，并自行暂停与 seek 文档动画；若再用 CSS 动画
      会和虚拟时钟叠加产生相位差。
   2. renderAt(t) 是纯函数：同一 t 必须得到同一画面，支持乱序 seek。
   3. 所有元素入场时刻都从 js/timeline.js 的字幕时间派生（cueStarts），
      渲染器内不再硬编码第二份时间表，避免两处不同步。
   ============================================================ */
(function () {
  'use strict';

  var TL = window.TIMELINE;
  var DURATION = TL.duration;
  var FPS = TL.fps;

  var sceneEls = {};
  var subtitleEl = null;
  var globalFill = null;
  var bgCanvas = null;
  var outroInst = null;
  var cues = {};   /* sceneId -> 该场景内每条字幕的起始时刻数组 */

  /* ---------------- 数值与缓动 ---------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function prog(t, s, d) {
    if (d <= 0) return t >= s ? 1 : 0;
    return clamp((t - s) / d, 0, 1);
  }

  function easeOutExpo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInCubic(x) { return x * x * x; }
  function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  /* 统一生命周期：入场（位移 + 缩放）与退场 */
  function lifecycle(t, inStart, inDur, outStart, outDur) {
    var enter = prog(t, inStart, inDur);
    var leave = prog(t, outStart, outDur);
    var e = easeOutExpo(enter);
    var l = easeInCubic(leave);
    return {
      enter: enter,
      leave: leave,
      alpha: clamp(e * (1 - l), 0, 1),
      dy: (1 - e) * 52 - l * 28,
      scale: 0.93 + 0.07 * e
    };
  }

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* 从 timeline 取某场景内所有字幕的起始时刻 */
  function buildCues() {
    for (var i = 0; i < TL.scenes.length; i++) {
      var sc = TL.scenes[i];
      var list = [];
      for (var j = 0; j < TL.subtitles.length; j++) {
        var t0 = TL.subtitles[j].start;
        if (t0 >= sc.start - 0.001 && t0 < sc.start + sc.duration - 0.001) list.push(t0);
      }
      cues[sc.id] = list;
    }
  }

  /* ============================================================
     背景：纯黑底 + 极淡网格 + 稀疏节点
     ============================================================ */
  var BG = {
    nodes: [],
    ctx: null,

    init: function (canvas) {
      bgCanvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.nodes = [];
      var N = 14;
      for (var i = 0; i < N; i++) {
        var a = (i / N) * Math.PI * 2 + 0.6;
        var r = 300 + ((i * 137) % 320);
        this.nodes.push({
          x: 960 + Math.cos(a) * r * 1.55,
          y: 540 + Math.sin(a) * r * 0.92,
          r: 1.4 + ((i * 7) % 5) * 0.5,
          sp: 0.10 + ((i * 13) % 7) * 0.012,
          ph: (i * 1.7) % (Math.PI * 2),
          ax: 14 + ((i * 11) % 22),
          ay: 10 + ((i * 17) % 18)
        });
      }
    },

    draw: function (t) {
      var ctx = this.ctx;
      if (!ctx) return;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1920, 1080);

      var step = 120;
      var offY = (t * 5) % step;
      var offX = (t * 3) % step;
      ctx.strokeStyle = 'rgba(255,255,255,0.016)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      var x, y;
      for (x = -step + offX; x <= 1920 + step; x += step) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, 1080);
      }
      for (y = -step + offY; y <= 1080 + step; y += step) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(1920, Math.round(y) + 0.5);
      }
      ctx.stroke();

      var g = ctx.createRadialGradient(960, 520, 60, 960, 520, 780);
      var pulse = 0.5 + 0.5 * Math.sin(t * 0.42);
      g.addColorStop(0, 'rgba(91,157,217,' + (0.020 + 0.008 * pulse).toFixed(4) + ')');
      g.addColorStop(0.55, 'rgba(91,157,217,0.008)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1920, 1080);

      var pos = [];
      for (var i = 0; i < this.nodes.length; i++) {
        var n = this.nodes[i];
        pos.push({
          x: n.x + Math.cos(t * n.sp + n.ph) * n.ax,
          y: n.y + Math.sin(t * n.sp * 0.82 + n.ph) * n.ay,
          r: n.r
        });
      }

      ctx.strokeStyle = 'rgba(91,157,217,0.10)';
      ctx.lineWidth = 1;
      for (var a = 0; a < pos.length; a++) {
        for (var b = a + 1; b < pos.length; b++) {
          var dx = pos[a].x - pos[b].x;
          var dy = pos[a].y - pos[b].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 300 * 300) {
            ctx.globalAlpha = (1 - Math.sqrt(d2) / 300) * 0.55;
            ctx.beginPath();
            ctx.moveTo(pos[a].x, pos[a].y);
            ctx.lineTo(pos[b].x, pos[b].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      for (var k = 0; k < pos.length; k++) {
        ctx.beginPath();
        ctx.arc(pos[k].x, pos[k].y, pos[k].r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(91,157,217,0.42)';
        ctx.fill();
      }
    }
  };

  /* ============================================================
     片头
     ============================================================ */
  var intro = {
    line: null, kicker: null, chars: [], sub: null,

    init: function () {
      var root = sceneEls.intro;
      this.line = q('.intro-kicker-line', root);
      this.kicker = q('.intro-kicker', root);
      this.chars = qa('.intro-title .ch', root);
      this.sub = q('.intro-sub', root);
    },

    render: function (t, s, d) {
      var outStart = s + d - 0.8;

      var lp = prog(t, s + 0.4, 0.7);
      this.line.style.width = (easeOutExpo(lp) * 88).toFixed(2) + 'px';
      this.line.style.opacity = (1 - prog(t, outStart, 0.5)).toFixed(3);

      var kc = lifecycle(t, s + 0.8, 0.6, outStart + 0.05, 0.5);
      this.kicker.style.opacity = kc.alpha.toFixed(3);
      this.kicker.style.letterSpacing = (0.44 - 0.10 * easeOutExpo(kc.enter)).toFixed(3) + 'em';

      for (var i = 0; i < this.chars.length; i++) {
        var lc = lifecycle(t, s + 1.0 + i * 0.1, 0.65, outStart + 0.1 + i * 0.03, 0.5);
        var c = this.chars[i];
        c.style.opacity = lc.alpha.toFixed(3);
        c.style.transform =
          'translate3d(0,' + lc.dy.toFixed(2) + 'px,0) scale(' + lc.scale.toFixed(3) + ')';
      }

      var sc = lifecycle(t, s + 2.2, 0.6, outStart + 0.15, 0.5);
      this.sub.style.opacity = sc.alpha.toFixed(3);
      this.sub.style.transform =
        'translate3d(0,' + sc.dy.toFixed(2) + 'px,0) scale(' + sc.scale.toFixed(3) + ')';
    }
  };

  /* ============================================================
     01 我是谁（8 句，分两组各 4 行）
     ============================================================ */
  var who = {
    rows: [],

    init: function () {
      this.rows = qa('.scene-who .who-row');
    },

    render: function (t, s, d) {
      var c = cues.who || [];
      var sceneOut = s + d - 0.45;

      for (var i = 0; i < this.rows.length; i++) {
        var it = this.rows[i];
        var base = (c[i] === undefined) ? s + 0.8 + i * 1.5 : c[i];
        var lc = lifecycle(t, base - 0.3, 0.55, sceneOut + (this.rows.length - 1 - i) * 0.02, 0.4);
        it.style.opacity = lc.alpha.toFixed(3);
        it.style.transform =
          'translate3d(0,' + lc.dy.toFixed(2) + 'px,0) scale(' + lc.scale.toFixed(3) + ')';
        this.paintMark(it, lc);
      }
    },

    paintMark: function (row, lc) {
      var mark = q('.who-mark', row);
      if (!mark) return;
      var e = easeOutExpo(lc.enter);
      mark.style.transform = 'scaleY(' + (0.25 + 0.75 * e).toFixed(3) + ')';
      mark.style.opacity = (0.35 + 0.65 * e).toFixed(3);
    }
  };

  /* ============================================================
     02 这个账号干什么（7 句：三张卡各占两句，末句落版）
     ============================================================ */
  var doScene = {
    cards: [], final: null,

    init: function () {
      var root = sceneEls.do;
      this.cards = qa('.do-card', root);
      this.final = q('.do-final', root);
    },

    render: function (t, s, d) {
      var c = cues.do || [];
      var sceneOut = s + d - 0.5;
      var cardCue = [c[0], c[2], c[4]];

      for (var i = 0; i < this.cards.length; i++) {
        var el = this.cards[i];
        var base = (cardCue[i] === undefined) ? s + 0.8 : cardCue[i];
        var lc = lifecycle(t, base - 0.3, 0.6, sceneOut + (2 - i) * 0.04, 0.4);
        var sc = lc.scale * (0.97 + 0.03 * easeOutBack(lc.enter));
        el.style.opacity = lc.alpha.toFixed(3);
        el.style.transform =
          'translate3d(0,' + lc.dy.toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';

        var sub = q('.do-sub', el);
        if (sub) {
          var sp = prog(t, base + 1.2, 0.5);
          sub.style.opacity = (0.55 + 0.45 * easeOutCubic(sp)).toFixed(3);
        }
      }

      var finalCue = (c[6] === undefined) ? sceneOut - 0.5 : c[6];
      var fl = lifecycle(t, finalCue - 0.35, 0.6, sceneOut, 0.4);
      this.final.style.opacity = fl.alpha.toFixed(3);
      this.final.style.transform =
        'translate3d(0,' + fl.dy.toFixed(2) + 'px,0) scale(' + fl.scale.toFixed(3) + ')';
    }
  };

  /* ============================================================
     03 这个账号不干什么（8 句：六条、末句落版）
     六项的入场时刻对应第 1、3、5、6、7、8 句
     ============================================================ */
  var dont = {
    items: [], final: null,

    init: function () {
      var root = sceneEls.dont;
      this.items = qa('.dont-item', root);
      this.final = q('.dont-final', root);
    },

    render: function (t, s, d) {
      var c = cues.dont || [];
      var sceneOut = s + d - 0.45;
      var pick = [0, 2, 4, 5, 6, 7];

      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i];
        var base = c[pick[i]];
        if (base === undefined) base = s + 0.8 + i * 1.2;
        var lc = lifecycle(t, base - 0.3, 0.5, sceneOut + (5 - i) * 0.02, 0.36);
        it.style.opacity = lc.alpha.toFixed(3);
        it.style.transform =
          'translate3d(' + ((1 - easeOutExpo(lc.enter)) * -26).toFixed(2) + 'px,0,0) scale(' +
          lc.scale.toFixed(3) + ')';

        var x = q('.dont-x', it);
        if (x) x.style.opacity = (0.3 + 0.7 * easeOutExpo(lc.enter)).toFixed(3);
      }

      /* 落版句紧跟最后一句字幕出现，留足阅读时间 */
      var finalCue = c.length ? c[c.length - 1] + 0.3 : sceneOut - 0.5;
      var fl = lifecycle(t, finalCue - 0.3, 0.55, sceneOut, 0.36);
      this.final.style.opacity = fl.alpha.toFixed(3);
      this.final.style.transform =
        'translate3d(0,' + fl.dy.toFixed(2) + 'px,0) scale(' + fl.scale.toFixed(3) + ')';
    }
  };

  /* ============================================================
     04 一期视频是怎么来的（6 句：四个节点 + 三行说明）
     ============================================================ */
  var how = {
    steps: [], fill: null, lines: [],

    init: function () {
      var root = sceneEls.how;
      this.steps = qa('.how-step', root);
      this.fill = q('.how-fill', root);
      this.lines = qa('.how-line', root);
    },

    render: function (t, s, d) {
      var c = cues.how || [];
      var sceneOut = s + d - 0.5;
      var at = function (i, dflt) { return (c[i] === undefined) ? dflt : c[i]; };

      /* 流程条自左向右推进 */
      var fp = prog(t, at(0, s + 0.6) - 0.2, Math.max(1, at(3, s + d * 0.5) - at(0, s + 0.6) + 1.0));
      this.fill.style.transform = 'scaleX(' + easeInOutSine(fp).toFixed(4) + ')';

      /* 四个节点：问题 / 资料 / 动手 / 记录 */
      var dotCues = [at(0, s + 0.6), at(1, s + 3), at(2, s + 6), at(3, s + 9)];
      for (var i = 0; i < this.steps.length; i++) {
        var st = this.steps[i];
        var lc = lifecycle(t, dotCues[i] - 0.25, 0.5, sceneOut + (3 - i) * 0.03, 0.4);
        var lit = easeOutExpo(prog(t, dotCues[i] - 0.05, 0.45));
        st.style.opacity = lc.alpha.toFixed(3);
        st.style.transform =
          'translate3d(0,' + lc.dy.toFixed(2) + 'px,0) scale(' + lc.scale.toFixed(3) + ')';

        var dot = q('.how-dot', st);
        var label = q('.how-label', st);
        if (dot) {
          dot.style.borderColor = lit > 0.5 ? 'rgba(91,157,217,0.95)' : 'rgba(36,44,56,1)';
          dot.style.backgroundColor = 'rgba(91,157,217,' + (0.85 * lit).toFixed(3) + ')';
          dot.style.transform = 'scale(' + (0.8 + 0.45 * lit).toFixed(3) + ')';
        }
        if (label) {
          label.style.color = lit > 0.5 ? '#e8eaed' : '#6b7482';
        }
      }

      /* 三行说明，对应最后三句 */
      for (var k = 0; k < this.lines.length; k++) {
        var base = at(3 + k, s + d - 3 + k);
        var lc2 = lifecycle(t, base - 0.3, 0.55, sceneOut, 0.4);
        this.lines[k].style.opacity = lc2.alpha.toFixed(3);
        this.lines[k].style.transform =
          'translate3d(0,' + lc2.dy.toFixed(2) + 'px,0) scale(' + lc2.scale.toFixed(3) + ')';
      }
    }
  };

  /* ============================================================
     05 欢迎来观看（5 句）
     ============================================================ */
  var welcome = {
    cond: [], main: null, tail: [],

    init: function () {
      var root = sceneEls.welcome;
      this.cond = qa('.welcome-cond .welcome-line', root);
      this.main = q('.welcome-main', root);
      this.tail = qa('.welcome-tail .welcome-line', root);
    },

    render: function (t, s, d) {
      var c = cues.welcome || [];
      var sceneOut = s + d - 0.5;
      var at = function (i, dflt) { return (c[i] === undefined) ? dflt : c[i]; };

      var i, lc;

      for (i = 0; i < this.cond.length; i++) {
        lc = lifecycle(t, at(i, s + 0.8 + i * 2) - 0.3, 0.55,
          at(2, s + 6) - 0.45, 0.4);
        this.cond[i].style.opacity = (lc.alpha * 0.9).toFixed(3);
        this.cond[i].style.transform =
          'translate3d(0,' + lc.dy.toFixed(2) + 'px,0) scale(' + lc.scale.toFixed(3) + ')';
      }

      var mlc = lifecycle(t, at(2, s + 6) - 0.3, 0.75, sceneOut, 0.45);
      var breathe = 1 + 0.006 * Math.sin((t - s) * 1.6);
      this.main.style.opacity = mlc.alpha.toFixed(3);
      this.main.style.transform =
        'translate3d(0,' + mlc.dy.toFixed(2) + 'px,0) scale(' +
        (mlc.scale * breathe).toFixed(4) + ')';

      for (i = 0; i < this.tail.length; i++) {
        lc = lifecycle(t, at(3 + i, s + d - 4 + i) - 0.3, 0.55, sceneOut, 0.4);
        this.tail[i].style.opacity = (lc.alpha * 0.92).toFixed(3);
        this.tail[i].style.transform =
          'translate3d(0,' + lc.dy.toFixed(2) + 'px,0) scale(' + lc.scale.toFixed(3) + ')';
      }
    }
  };

  /* ============================================================
     结尾（委托公用组件）
     ============================================================ */
  var outro = {
    init: function () {
      var root = sceneEls.outro;
      if (!window.OUTRO) {
        /* 组件没加载时不要静默留白：合成软件以视频目录为站点根，
           ../resource/ 在它那里取不到，必须用同目录的 js/outro.js */
        console.error('[scenes] window.OUTRO 未加载，结尾场景会是空白');
        return;
      }
      if (root) outroInst = window.OUTRO.mount(root);
    },
    render: function (t, s, d) {
      if (outroInst) window.OUTRO.render(outroInst, t, s, d);
    }
  };

  var RENDERERS = {
    intro: intro, who: who, do: doScene, dont: dont,
    how: how, welcome: welcome, outro: outro
  };

  /* ============================================================
     字幕
     ============================================================ */
  var subCache = { text: null };

  function renderSubtitles(t) {
    var subs = TL.subtitles;
    var active = null;

    for (var i = 0; i < subs.length; i++) {
      if (t >= subs[i].start && t <= subs[i].end) { active = subs[i]; break; }
    }

    if (!active) {
      subtitleEl.style.opacity = '0';
      subCache.text = null;
      return;
    }

    if (subCache.text !== active.text) {
      subtitleEl.textContent = active.text;
      subCache.text = active.text;
    }

    var fin = clamp((t - active.start) / 0.16, 0, 1);
    var fout = clamp((active.end - t) / 0.16, 0, 1);
    subtitleEl.style.opacity = Math.min(fin, fout).toFixed(3);
  }

  /* ============================================================
     逐帧渲染（纯函数）
     ============================================================ */
  function renderAt(t) {
    t = clamp(t, 0, DURATION);

    BG.draw(t);

    for (var i = 0; i < TL.scenes.length; i++) {
      var sc = TL.scenes[i];
      var node = sceneEls[sc.id];
      if (!node) continue;
      var s = sc.start, d = sc.duration, e = s + d;

      if (t < s - 0.001 || t > e + 0.001) {
        node.style.opacity = '0';
        node.style.visibility = 'hidden';
        continue;
      }
      node.style.visibility = 'visible';

      var fin = easeOutExpo(prog(t, s, 0.6));
      var fout = easeInCubic(prog(t, e - 0.55, 0.55));
      node.style.opacity = clamp(fin * (1 - fout), 0, 1).toFixed(3);
      node.style.transform = 'translate3d(0,' + ((1 - fin) * 28).toFixed(2) + 'px,0)';

      var r = RENDERERS[sc.id];
      if (r) r.render(t, s, d);
    }

    renderSubtitles(t);

    var gp = clamp(t / DURATION, 0, 1);
    globalFill.style.transform = 'scaleX(' + gp.toFixed(5) + ')';
    globalFill.style.opacity = (0.2 + 0.5 * gp).toFixed(3);
  }

  /* ============================================================
     初始化
     ============================================================ */
  function init() {
    subtitleEl = document.getElementById('subtitle');
    globalFill = document.getElementById('globalFill');

    var scenes = qa('.scene');
    for (var i = 0; i < scenes.length; i++) {
      sceneEls[scenes[i].getAttribute('data-scene')] = scenes[i];
    }

    buildCues();
    BG.init(q('.bg-canvas'));

    for (var id in RENDERERS) {
      if (RENDERERS.hasOwnProperty(id) && RENDERERS[id].init) RENDERERS[id].init();
    }
  }

  /* ============================================================
     播放控制
     ============================================================ */
  var running = false;
  var anchor = 0;
  var lastSeek = 0;
  var loopPlayback = true;
  var embedded = (typeof window.__cf !== 'undefined');

  function seek(t) {
    t = clamp(t, 0, DURATION);
    lastSeek = t;
    renderAt(t);
    if (running) anchor = performance.now() - t * 1000;
  }

  function play(from) {
    var start = (from === undefined) ? lastSeek : clamp(from, 0, DURATION);
    anchor = performance.now() - start * 1000;
    if (start >= DURATION) anchor = performance.now();
    running = true;
  }

  function pause() {
    lastSeek = clamp((performance.now() - anchor) / 1000, 0, DURATION);
    running = false;
    renderAt(lastSeek);
  }

  function restart() { seek(0); play(0); }
  function isPlaying() { return running; }

  function loop() {
    /* 暂停时必须停在 lastSeek，不能被流逝的真实时间推着走 */
    if (!running) {
      renderAt(lastSeek);
      requestAnimationFrame(loop);
      return;
    }

    var t = (performance.now() - anchor) / 1000;

    if (t >= DURATION) {
      if (embedded) {
        /* 逐帧渲染时停在末帧，但仍要每帧排一次回调，
           否则宿主下一次 runFrameCallbacks 没有回调可执行 */
        renderAt(DURATION);
        requestAnimationFrame(loop);
        return;
      }
      if (loopPlayback) {
        t = 0;
        anchor = performance.now();
      } else {
        t = DURATION;
        running = false;
        lastSeek = DURATION;
      }
    }
    renderAt(t);
    requestAnimationFrame(loop);
  }

  function bindInteractions() {
    document.addEventListener('keydown', function (ev) {
      if (ev.code === 'Space' || ev.key === ' ') {
        ev.preventDefault();
        if (running) pause(); else play();
      } else if (ev.key === 'r' || ev.key === 'R') {
        restart();
      }
    });
    document.addEventListener('click', function () {
      if (running) pause(); else play();
    });
  }

  function boot() {
    init();

    window.VIDEO = {
      duration: DURATION,
      fps: FPS,
      totalFrames: TL.totalFrames,
      ready: Promise.resolve(true),
      seek: seek,
      play: play,
      pause: pause,
      restart: restart,
      isPlaying: isPlaying
    };

    function start() {
      if (embedded) {
        /* 逐帧渲染模式：宿主每帧先 __cf.setTime(t) 把虚拟时钟拨到 t，
           再执行上一帧登记的回调，因此这里必须让 loop 处于「读时钟」状态
           （running = true、anchor = 0），否则画面会永远停在第一帧。 */
        anchor = 0;
        running = true;
        renderAt(0);
        requestAnimationFrame(loop);
        return;
      }

      var qs = location.search || '';
      var m = /[?&]t=([\d.]+)/.exec(qs);
      var startAt = m ? parseFloat(m[1]) : 0;
      if (/[?&]once=1/.test(qs)) loopPlayback = false;

      bindInteractions();
      play(startAt);
      requestAnimationFrame(loop);
    }

    if (document.fonts && document.fonts.ready) {
      var done = false;
      var fire = function () { if (!done) { done = true; start(); } };
      document.fonts.ready.then(fire);
      setTimeout(fire, 3000);
    } else {
      start();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
