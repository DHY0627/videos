/* ============================================================
   杂食鲸鱼 · 公用结尾动画（可复用组件）
   ------------------------------------------------------------
   用法：
     <script src="../../resource/outro/outro.js"></script>

     var outro = window.OUTRO.mount(sectionElement);
     // 在逐帧渲染函数里调用：
     window.OUTRO.render(outro, globalTime, sceneStart, sceneDuration);

   说明：
   - 本组件自行创建 DOM 与样式，宿主只需提供一个容器元素
   - 全部动画由传入时间计算，不依赖 CSS @keyframes / transition
   - 纯黑背景，不含背景装饰，便于叠加到任意底色上
   - 时长固定 9.0 秒，如需改变请同时改 DURATION 常量
   ============================================================ */
(function (global) {
  'use strict';

  var DURATION = 9.0;

  var ACCOUNT = '杂食鲸鱼';
  var MODEL = 'DeepSeek V4.1 Flash 1017';
  var CLOSING = '谢谢观看';

  /* 缓动 */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function prog(t, s, d) {
    if (d <= 0) return t >= s ? 1 : 0;
    return clamp((t - s) / d, 0, 1);
  }
  function easeOutExpo(x) {
    return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
  }
  function easeInCubic(x) { return x * x * x; }
  function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }

  /* 通用生命周期：入场位移 + 缩放 + 退场 */
  function lifecycle(t, inStart, inDur, outStart, outDur) {
    var enter = prog(t, inStart, inDur);
    var leave = prog(t, outStart, outDur);
    var e = easeOutExpo(enter);
    var l = easeInCubic(leave);
    return {
      enter: enter,
      leave: leave,
      alpha: clamp(e * (1 - l), 0, 1),
      dy: (1 - e) * 44 - l * 24,
      scale: 0.94 + 0.06 * e
    };
  }

  var CSS = [
    '.outro-root{position:absolute;inset:0;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;background:transparent;overflow:hidden;',
    'font-family:"HarmonyOS Sans SC","PingFang SC","Microsoft YaHei","Source Han Sans SC",system-ui,sans-serif;}',
    '.outro-root *{box-sizing:border-box;margin:0;padding:0;}',

    /* 第一行：账号名 × 模型名 */
    '.outro-sign{display:flex;align-items:center;justify-content:center;gap:44px;white-space:nowrap;}',
    '.outro-account{font-size:72px;font-weight:700;letter-spacing:.06em;color:#e8eaed;',
    'line-height:1;will-change:transform,opacity;}',
    '.outro-cross{font-size:44px;font-weight:300;color:#6b7482;line-height:1;',
    'will-change:transform,opacity;}',
    '.outro-model{font-family:"JetBrains Mono",Consolas,"Courier New",monospace;',
    'font-size:44px;font-weight:400;letter-spacing:.02em;color:#5b9dd9;line-height:1;',
    'will-change:transform,opacity;}',

    /* 分隔线 */
    '.outro-rule{width:920px;height:1px;background:#2a323f;margin:52px 0 0;',
    'transform-origin:center center;will-change:transform,opacity;}',

    /* 结语 */
    '.outro-closing{font-size:64px;font-weight:600;letter-spacing:.22em;color:#e8eaed;',
    'margin-top:56px;line-height:1;text-indent:.22em;will-change:transform,opacity;}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('outro-shared-style')) return;
    var st = document.createElement('style');
    st.id = 'outro-shared-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function mount(root) {
    injectStyle();

    root.classList.add('outro-root');

    var sign = document.createElement('div');
    sign.className = 'outro-sign';

    var account = document.createElement('div');
    account.className = 'outro-account';
    account.textContent = ACCOUNT;

    var cross = document.createElement('div');
    cross.className = 'outro-cross';
    cross.textContent = '\u00D7';

    var model = document.createElement('div');
    model.className = 'outro-model';
    model.textContent = MODEL;

    sign.appendChild(account);
    sign.appendChild(cross);
    sign.appendChild(model);

    var rule = document.createElement('div');
    rule.className = 'outro-rule';

    var closing = document.createElement('div');
    closing.className = 'outro-closing';
    closing.textContent = CLOSING;

    root.appendChild(sign);
    root.appendChild(rule);
    root.appendChild(closing);

    return {
      root: root,
      account: account,
      cross: cross,
      model: model,
      rule: rule,
      closing: closing
    };
  }

  /* t: 全局秒；s: 本场景起始；d: 本场景时长 */
  function render(inst, t, s, d) {
    if (!inst) return;
    var dur = d || DURATION;
    var outStart = s + dur - 1.2;
    var FADE = 1.0;

    /* 账号名：自左淡入 */
    var a = lifecycle(t, s + 0.5, 0.85, outStart, FADE);
    inst.account.style.opacity = a.alpha.toFixed(3);
    inst.account.style.transform =
      'translate3d(' + ((1 - a.enter) * -46).toFixed(2) + 'px,0,0) scale(' + a.scale.toFixed(3) + ')';

    /* 连接符：居中缩放弹出 */
    var c = lifecycle(t, s + 1.05, 0.6, outStart + 0.05, FADE);
    inst.cross.style.opacity = (c.alpha * 0.9).toFixed(3);
    inst.cross.style.transform = 'scale(' + (0.55 + 0.45 * c.enter).toFixed(3) + ')';

    /* 模型名：自右淡入 */
    var m = lifecycle(t, s + 1.35, 0.85, outStart + 0.1, FADE);
    inst.model.style.opacity = m.alpha.toFixed(3);
    inst.model.style.transform =
      'translate3d(' + ((1 - m.enter) * 46).toFixed(2) + 'px,0,0) scale(' + m.scale.toFixed(3) + ')';

    /* 分隔线：自中心横向展开 */
    var rp = prog(t, s + 1.9, 0.8);
    var rl = prog(t, outStart, FADE);
    inst.rule.style.transform = 'scaleX(' + easeInOutSine(rp).toFixed(4) + ')';
    inst.rule.style.opacity = (0.9 * (1 - rl)).toFixed(3);

    /* 结语：上浮淡入，之后轻微呼吸 */
    var k = lifecycle(t, s + 2.35, 0.75, outStart + 0.15, FADE);
    var breathe = 1 + 0.004 * Math.sin((t - s) * 1.9);
    inst.closing.style.opacity = (k.alpha * (0.96 + 0.04 * breathe)).toFixed(3);
    inst.closing.style.transform =
      'translate3d(0,' + k.dy.toFixed(2) + 'px,0) scale(' + (k.scale * breathe).toFixed(4) + ')';
  }

  global.OUTRO = {
    duration: DURATION,
    account: ACCOUNT,
    model: MODEL,
    closing: CLOSING,
    mount: mount,
    render: render
  };
})(window);
