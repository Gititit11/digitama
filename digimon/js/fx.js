/* 필살기 연출 52가지. data.js 의 SPECIAL_FX 가 디지몬마다 하나를 고른다.
 *
 * 모든 연출은 "왼쪽 디지몬이 오른쪽 디지몬에게 쓴다"고 보고 그린다. 상대가 쓸 때는 화면을 좌우로 뒤집어 그린다.
 * 시각 t 는 그 디지몬이 필살기를 시작한 뒤의 ms. hit 은 맞는 순간, end 는 연출이 끝나고 제자리로 돌아온 순간.
 * 좌표는 배틀 화면(320x140) 기준이고, 고해상도 캔버스라도 논리 좌표로 그린다.
 *
 * S (무대): W·H 화면 크기, floor 바닥 줄, ax0 내 디지몬 제자리 x, aw·ah 내 크기, ex·ew·eh 상대 자리와 크기,
 *   tint 그 디지몬만의 색 (data.js 의 SPECIAL_TINT. 지금은 포격 레이저의 'blue' 하나).
 *   stage() 가 여기에 돌진 거리(off)와 지금 자리(axp), 입 위치(sx·sy), 상대 가운데(tx·ty)를 채운다.
 */
var Fx = (function () {
  var g, W = 320, H = 140, FLOOR = 134;
  function hash(n) { n = n | 0; n = (n << 13) ^ n; return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function disc(cx, cy, r, c) { r = Math.max(0, Math.round(r)); for (var y = -r; y <= r; y++) { var hw = Math.round(Math.sqrt(r * r - y * y)); R(cx - hw, cy + y, hw * 2 || 1, 1, c); } }
  function ring(cx, cy, r, c, th, a0, a1, sy) { a0 = a0 == null ? 0 : a0; a1 = a1 == null ? Math.PI * 2 : a1; sy = sy || 1; var n = Math.max(12, Math.round(r * 3)); for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; R(cx + Math.cos(a) * r - th / 2, cy + Math.sin(a) * r * sy - th / 2, th, th, c); } }
  function lineP(x1, y1, x2, y2, th, c) { var n = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))); for (var i = 0; i <= n; i++) { var u = n ? i / n : 0; R(x1 + (x2 - x1) * u - th / 2, y1 + (y2 - y1) * u - th / 2, th, th, c); } }
  function seg(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }
  function ease(a) { return 1 - Math.pow(1 - a, 3); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function alpha(a, f) { var o = g.globalAlpha; g.globalAlpha = Math.max(0, Math.min(1, a)) * o; f(); g.globalAlpha = o; }
  function star(x, y, r, c) { R(x - r, y, r * 2 + 1, 1, c); R(x, y - r, 1, r * 2 + 1, c); }
  function star2(x, y, r, c) { star(x, y, r, c); for (var i = 1; i <= r / 2; i++) { R(x - i, y - i, 1, 1, c); R(x + i, y - i, 1, 1, c); R(x - i, y + i, 1, 1, c); R(x + i, y + i, 1, 1, c); } }
  function flash(t, a, b, c, op) { if (t >= a && t < b) alpha(op || .6, function () { R(-10, -10, W + 20, H + 20, c || '#ffffff'); }); }
  function boom(x, y, v, cols, size) {
    size = size || 1; if (v <= 0 || v >= 1) return;
    alpha(1 - v, function () { disc(x, y, (3 + v * 10) * size, cols[2]); disc(x, y, (2 + v * 7) * size, cols[1]); disc(x, y, (1 + v * 3) * size * (1 - v), cols[0]); });
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + .3, d = (4 + v * 16) * size; R(x + Math.cos(a) * d - 1, y + Math.sin(a) * d - 1, 2, 2, cols[i % 2]); }
  }
  function smoke(x, y, v, n, sz) { if (v <= 0 || v >= 1) return; for (var i = 0; i < n; i++) alpha(1 - v, function () { disc(x + (hash(i * 3) - .5) * 30 * (1 + v), y - v * 14 - hash(i) * 8, (sz || 3) + v * 3, '#cfd3da'); }); }
  function bez(x0, y0, cx, cy, x2, y2, u) { return [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x2, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y2]; }
  function dashTo(a, b, back) { return function (t, S) { var to = S.ex - S.aw - 4 - S.ax0; return t < a ? 0 : t < b ? to * ease(seg(t, a, b)) : t < back ? to : to * (1 - seg(t, back, back + 300)); }; }
  var FIRE = ['#fff4b0', '#ffa62a', '#e0402a'], BLUE = ['#e6f6ff', '#5ab4ff', '#2a5fd0'], GOLD = ['#fffbe0', '#ffe07a', '#e0a020'], PURP = ['#f0d8ff', '#b56ae0', '#4a1f6e'];
  function shooter(t, S, a, b, draw) { var u = seg(t, a, b); if (t >= a && u < 1) draw(lerp(S.sx, S.tx, u), lerp(S.sy, S.ty, u), u); }
  function freezeBlock(S, v) {
    if (v <= 0 || v >= 1) return;
    if (v < .75) { alpha(.55, function () { R(S.ex - 2, FLOOR - S.eh - 2, S.ew + 4, S.eh + 2, '#c8ecff'); });
      lineP(S.ex - 2, FLOOR - S.eh - 2, S.ex + S.ew + 2, FLOOR - S.eh - 2, 2, '#ffffff'); lineP(S.ex - 2, FLOOR - S.eh - 2, S.ex - 2, FLOOR, 2, '#ffffff'); lineP(S.ex + S.ew + 2, FLOOR - S.eh - 2, S.ex + S.ew + 2, FLOOR, 2, '#e6f6ff');
      for (var k = 0; k < 4; k++) star(S.ex + hash(k * 5) * S.ew, FLOOR - hash(k * 9) * S.eh, 2, '#ffffff'); }
    else { var w = (v - .75) / .25; for (k = 0; k < 12; k++) { var a = hash(k) * 6.28; R(S.tx + Math.cos(a) * w * 34, S.ty + Math.sin(a) * w * 26 + w * w * 12, 3, 3, k % 2 ? '#c8ecff' : '#ffffff'); } }
  }

  var T = {
    /* ---------- 불 ---------- */
    fireball: { hit: 650, draw: function (t, S) {
      if (t < 250) disc(S.sx, S.sy, 1 + t / 60, FIRE[1]);
      shooter(t, S, 250, 650, function (x, y, u) { var f = Math.floor(t / 60) % 2;
        for (var k = 5; k >= 1; k--) { var uu = Math.max(0, u - k * .05); R(lerp(S.sx, S.tx, uu) - 1, lerp(S.sy, S.ty, uu) + (hash(k + Math.floor(t / 60)) - .5) * 8, 5 - k / 2, 5 - k / 2, FIRE[k % 3]); }
        disc(x, y, 7 + f, FIRE[2]); disc(x, y, 5, FIRE[1]); disc(x + 1, y - 1, 2, FIRE[0]); });
      boom(S.tx, S.ty, seg(t, 650, 950), FIRE, 1.3);
    } },
    flame: { hit: 450, draw: function (t, S) {
      for (var k = 0; k < 34; k++) { var t0 = 230 + k * 14, u = (t - t0) / 240; if (u < 0 || u >= 1) continue;
        var x = lerp(S.sx, S.tx + 8, u), y = lerp(S.sy, S.ty, u) + (hash(k * 7) - .5) * u * 18, r = 2 + u * 6;
        alpha(u > .8 ? (1 - u) * 5 : 1, function () { disc(x, y, r, u < .25 ? FIRE[0] : u < .55 ? FIRE[1] : FIRE[2]); }); }
      if (t >= 450 && t < 950) for (var i = 0; i < 6; i++) { var h = 6 + hash(i + Math.floor(t / 60)) * 10; R(S.ex + 6 + i * (S.ew - 12) / 5, FLOOR - h, 4, h, i % 2 ? FIRE[1] : FIRE[2]); R(S.ex + 7 + i * (S.ew - 12) / 5, FLOOR - h * .6, 2, h * .6, FIRE[0]); }
    } },
    bluefire: { hit: 700, draw: function (t, S) {
      for (var i = 0; i < 3; i++) { var t0 = 220 + i * 90, u = seg(t, t0, t0 + 420);
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty + (i - 1) * 10, u) + Math.sin(u * Math.PI * 4 + i) * 6, f = Math.floor(t / 50 + i) % 3;
          disc(x, y, 6, BLUE[2]); R(x - 3 - f, y - 12, 6, 8, BLUE[2]); R(x - 1 - f, y - 16, 3, 5, BLUE[1]); disc(x, y, 4, BLUE[1]); disc(x, y + 1, 2, BLUE[0]); }
        boom(S.tx, S.ty + (i - 1) * 10, seg(t, t0 + 420, t0 + 700), BLUE, 1); }
    } },
    firebird: { hit: 680, draw: function (t, S) {
      shooter(t, S, 250, 680, function (x, y, u) { var f = Math.floor(t / 70) % 2, s = 1 + u * .4;
        for (var k = 1; k <= 6; k++) alpha(1 - k / 7, function () { disc(x - k * 7, y + (hash(k + Math.floor(t / 50)) - .5) * 6, 4 - k / 2, FIRE[k % 2 ? 1 : 2]); });
        var wy = f ? -14 : 6;
        lineP(x, y, x - 12 * s, y + wy * s, 4, FIRE[2]); lineP(x - 2, y, x - 10 * s, y + wy * .7 * s, 2, FIRE[1]);
        lineP(x, y, x - 12 * s, y - wy * .4 * s - 4, 3, FIRE[2]);
        disc(x + 2, y, 5 * s, FIRE[2]); disc(x + 2, y, 3 * s, FIRE[1]); R(x + 6 * s, y - 2, 4 * s, 2, FIRE[0]); R(x + 4, y - 3, 1, 1, '#2a1a10'); });
      boom(S.tx, S.ty, seg(t, 680, 1000), FIRE, 1.5);
    } },
    meteor: { hit: 560, shake: [560, 1000, 2], draw: function (t, S) {
      if (t < 1000) { var sk = Math.min(1, t / 300) * (1 - seg(t, 800, 1000)); for (var b = 0; b < 6; b++) alpha(sk * (.3 - b * .05), function () { R(0, b * 10, W, 10, '#ff6a3a'); }); }
      for (var i = 0; i < 5; i++) { var t0 = 220 + i * 90, u = seg(t, t0, t0 + 340), x2 = S.ex + 6 + i * (S.ew - 12) / 4, y2 = FLOOR - 6 - hash(i) * S.eh * .6, x0 = x2 + 70, y0 = -16;
        if (t >= t0 && u < 1) { var x = lerp(x0, x2, u), y = lerp(y0, y2, u);
          for (var k = 1; k <= 4; k++) R(x + k * 5, y - k * 6, 5 - k, 5 - k, FIRE[k % 2 ? 1 : 2]);
          disc(x, y, 6, FIRE[2]); disc(x, y, 4, FIRE[1]); disc(x - 1, y + 1, 2, FIRE[0]); }
        boom(x2, y2, seg(t, t0 + 340, t0 + 600), FIRE, 1); }
    } },
    firedash: { hit: 520, dash: dashTo(250, 520, 800), shake: [520, 760, 3], draw: function (t, S) {
      if (t >= 150 && t < 800) for (var k = 0; k < 10; k++) { var a = hash(k + Math.floor(t / 50) * 3), x = S.axp + a * S.aw, h = 6 + hash(k * 3 + Math.floor(t / 50)) * 14;
        R(x - (t > 250 && t < 520 ? 10 : 0), FLOOR - S.ah * hash(k * 9) - h, 4, h, k % 3 ? FIRE[1] : FIRE[2]); R(x + 1, FLOOR - S.ah * hash(k * 9) - h * .6, 2, h * .5, FIRE[0]); }
      boom(S.ex + 6, S.ty, seg(t, 520, 850), FIRE, 2);
    } },
    /* ---------- 에너지 ---------- */
    cannon: { hit: 420, recoil: [380, 800, 4], shake: [380, 820, 3], draw: function (t, S) {
      var cols = S.tint === 'blue' ? ['#ffffff', '#c8f0ff', '#5ab4ff', '#2a5fd0'] : ['#ffffff', '#ffe07a', '#ff7a2a', '#c43a1a']; // 푸른 포 (오메가몬 가루루 캐논)
      if (t < 380) { var c = t / 380; disc(S.sx + 4, S.sy, 2 + c * 7, cols[2]); disc(S.sx + 4, S.sy, 1 + c * 4, cols[1]); disc(S.sx + 4, S.sy, c * 2, cols[0]);
        for (var i = 0; i < 6; i++) { var a = i * 1.05 + t / 70, d = 26 * (1 - c) + 6; R(S.sx + 4 + Math.cos(a) * d, S.sy + Math.sin(a) * d, 2, 2, cols[1]); } }
      if (t >= 380 && t < 900) {
        var front = lerp(S.sx, W + 10, ease(seg(t, 380, 470))), th = t < 760 ? 22 + (Math.floor(t / 40) % 2) * 4 : 22 * (1 - seg(t, 760, 900));
        R(S.sx, S.sy - th / 2, front - S.sx, th, cols[3]); R(S.sx, S.sy - th * .38, front - S.sx, th * .76, cols[2]); R(S.sx, S.sy - th * .24, front - S.sx, th * .48, cols[1]); R(S.sx, S.sy - th * .1, front - S.sx, th * .2, cols[0]);
        disc(S.sx + 2, S.sy, th / 2 + 4, cols[1]); disc(S.sx + 2, S.sy, th / 3, cols[0]);
        if (t < 600) for (var k = 0; k < 3; k++) ring(S.sx + 6 + k * 10, S.sy, 8 + k * 3 + (t - 380) / 40, cols[1], 2, -1.4, 1.4, 1.4);
        for (k = 0; k < 6; k++) R(lerp(S.sx, front, hash(k + Math.floor(t / 40))), S.sy + (hash(k * 5 + Math.floor(t / 40)) - .5) * th * 1.6, 6, 1, cols[0]);
      }
      flash(t, 380, 440, '#ffffff', .7);
    } },
    mbeam: { hit: 330, draw: function (t, S) {
      var cols = ['#ffffff', '#ff9ac0', '#e0306a'];
      if (t < 250) { disc(S.sx, S.sy, 1 + (Math.floor(t / 60) % 2) * 2, cols[1]); }
      if (t >= 250 && t < 750) {
        var front = lerp(S.sx, S.tx, seg(t, 250, 330)), th = t < 650 ? 4 + (Math.floor(t / 40) % 2) * 2 : 4 * (1 - seg(t, 650, 750));
        R(S.sx, S.sy - th / 2, front - S.sx, th, cols[2]); R(S.sx, S.sy - th / 4, front - S.sx, Math.max(1, th / 2), cols[0]);
        if (t >= 330) { for (var k = 0; k < 5; k++) { var a = hash(k + Math.floor(t / 40)) * 6.28; R(S.tx + Math.cos(a) * 8, S.sy + Math.sin(a) * 8, 2, 2, k % 2 ? cols[1] : cols[0]); } disc(S.tx, S.sy, 4, cols[0]); }
      }
    } },
    xv: { hit: 600, draw: function (t, S) {
      var cols = ['#ffffff', '#7fd3ff', '#2a8adf'];
      if (t < 250) { var c = t / 250; lineP(S.sx - 6 * c, S.sy - 6 * c, S.sx + 6 * c, S.sy + 6 * c, 2, cols[1]); lineP(S.sx - 6 * c, S.sy + 6 * c, S.sx + 6 * c, S.sy - 6 * c, 2, cols[1]); }
      shooter(t, S, 250, 600, function (x, y, u) { var s = 10 + u * 6;
        for (var k = 2; k >= 0; k--) alpha(k ? .3 : 1, function () { var xx = x - k * 14; lineP(xx - s, y - s, xx + s, y + s, 5, k ? cols[1] : cols[2]); lineP(xx - s, y + s, xx + s, y - s, 5, k ? cols[1] : cols[2]); });
        lineP(x - s, y - s, x + s, y + s, 2, cols[0]); lineP(x - s, y + s, x + s, y - s, 2, cols[0]); disc(x, y, 3, cols[0]); });
      var v = seg(t, 600, 900); if (v > 0 && v < 1) alpha(1 - v, function () { var s = 16 + v * 20; lineP(S.tx - s, S.ty - s, S.tx + s, S.ty + s, 3, cols[0]); lineP(S.tx - s, S.ty + s, S.tx + s, S.ty - s, 3, cols[0]); });
    } },
    gorb: { hit: 760, shake: [760, 1050, 4], draw: function (t, S) {
      var hx = S.ax, hy = FLOOR - S.ah - 20, cols = ['#fffbe0', '#ffb43a', '#e0602a'];
      if (t < 450) { var c = ease(t / 450), r = 3 + c * 13;
        for (var i = 0; i < 6; i++) { var a = i * 1.05 + t / 90, d = 26 * (1 - c) + r; R(hx + Math.cos(a) * d, hy + Math.sin(a) * d, 2, 2, cols[1]); }
        disc(hx, hy, r, cols[2]); disc(hx, hy, r * .75, cols[1]); disc(hx - r * .2, hy - r * .2, r * .35, cols[0]); }
      var u = seg(t, 450, 760);
      if (t >= 450 && u < 1) { var x = lerp(hx, S.tx, u), y = lerp(hy, S.ty, u) - Math.sin(u * Math.PI) * 18; disc(x, y, 16, cols[2]); disc(x, y, 12, cols[1]); disc(x - 3, y - 3, 6, cols[0]); }
      var v = seg(t, 760, 1150);
      if (v > 0 && v < 1) { alpha(1 - v, function () { disc(S.tx, S.ty, 8 + v * 34, cols[1]); disc(S.tx, S.ty, 4 + v * 24, cols[0]); }); ring(S.tx, S.ty, 10 + v * 44, cols[2], 3); }
      flash(t, 760, 820, '#ffffff', .6);
    } },
    eshot: { hit: 470, draw: function (t, S) {
      for (var i = 0; i < 6; i++) { var t0 = 230 + i * 60, u = seg(t, t0, t0 + 240), dy = (hash(i * 5) - .5) * 20;
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty + dy, u) + Math.sin(u * 10) * 3; alpha(.5, function () { disc(x, y, 5, GOLD[1]); }); disc(x, y, 3, GOLD[1]); disc(x, y, 1, GOLD[0]); }
        var v = seg(t, t0 + 240, t0 + 400); if (v > 0 && v < 1) alpha(1 - v, function () { ring(S.tx, S.ty + dy, 3 + v * 8, GOLD[1], 2); }); }
    } },
    airpuff: { hit: 620, push: 6, draw: function (t, S) {
      // 공기팡: 볼에 공기를 모았다가 반투명한 공기 덩어리 한 방을 뱉고, 맞으면 '팡' 터진다
      var AIR = ['#ffffff', '#d8f0ff', '#9fd0f0'];
      if (t < 300) { var c = t / 300;
        for (var k = 0; k < 3; k++) { var r = (1 - ((c + k / 3) % 1)) * 18 + 3; alpha(.5 * (1 - r / 21), function () { ring(S.sx + 4, S.sy, r, AIR[2], 1); }); }
        alpha(.55, function () { disc(S.sx, S.sy, 2 + c * 5, AIR[1]); }); ring(S.sx, S.sy, 2 + c * 5, AIR[0], 1); }
      var u = seg(t, 300, 620);
      if (t >= 300 && u < 1) { var x = lerp(S.sx + 4, S.tx, u), y = lerp(S.sy, S.ty, u), r2 = 8 + u * 3, sq = Math.floor(t / 70) % 2 ? .85 : 1.12;
        for (var j = 0; j < 3; j++) R(x - r2 - 8 - j * 5, y - 4 + j * 4, 6 + j * 2, 1, AIR[0]);
        alpha(.45, function () { for (var yy = -r2; yy <= r2; yy++) { var hw = Math.round(Math.sqrt(r2 * r2 - yy * yy) / sq); R(x - hw, y + yy * sq, hw * 2 || 1, 1, AIR[1]); } });
        ring(x, y, r2 + 1.5, '#5f9fcc', 1, 0, 6.29, sq); ring(x, y, r2, AIR[0], 2, 0, 6.29, sq); ring(x, y, r2 * .55, '#6fb0dc', 1, t / 60, t / 60 + 3.6, sq);
        R(x - r2 * .45, y - r2 * .5 * sq, 3, 2, AIR[0]); }
      var v = seg(t, 620, 900);
      if (v > 0 && v < 1) { alpha(1 - v, function () { ring(S.tx, S.ty, 11.5 + ease(v) * 24, '#5f9fcc', 1); ring(S.tx, S.ty, 10 + ease(v) * 24, AIR[0], 3); ring(S.tx, S.ty, 6 + ease(v) * 14, '#6fb0dc', 2);
          for (var k2 = 0; k2 < 8; k2++) { var a = k2 * .785 + .4, d = 8 + ease(v) * 22; disc(S.tx + Math.cos(a) * d, S.ty + Math.sin(a) * d, 3 - v * 2, AIR[1]); } });
        if (v < .15) star2(S.tx, S.ty, 6, AIR[0]); }
    } },
    beast: { hit: 700, shake: [700, 950, 3], draw: function (t, S) {
      // 짐승 기운 (레오몬 수왕권): 갈기처럼 둘러싼 고리가 일렁이는 큰 기운 덩어리
      var cols = ['#fff6c8', '#ffc94a', '#e08a1a'];
      if (t < 250) alpha(t / 250 * .5, function () { disc(S.ax, FLOOR - S.ah / 2, S.ah / 2 + 4, cols[1]); });
      shooter(t, S, 250, 700, function (x, y, u) { var s = .8 + u * .6, f = Math.floor(t / 60) % 2;
        alpha(.85, function () {
          for (var k = 0; k < 10; k++) { var a = k * .628 + f * .3; disc(x + Math.cos(a) * 14 * s, y + Math.sin(a) * 14 * s, 5 * s, cols[2]); }
          disc(x, y, 12 * s, cols[1]); disc(x + 4 * s, y + 4 * s, 6 * s, cols[0]); });
        for (k = 1; k <= 4; k++) alpha(.4 - k * .08, function () { disc(x - k * 10, y, (12 - k * 2) * s, cols[1]); }); });
      boom(S.tx, S.ty, seg(t, 700, 1050), cols, 2);
    } },
    /* ---------- 무기 ---------- */
    missile: { hit: 600, shake: [600, 950, 3], draw: function (t, S) {
      for (var i = 0; i < 2; i++) { var t0 = 250 + i * 120, u = seg(t, t0, t0 + 350), y0 = S.sy + 6 - i * 10, y2 = S.ty + (i ? -8 : 8);
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u * u), y = lerp(y0, y2, u) + Math.sin(u * 8 + i) * 2;
          for (var k = 1; k <= 7; k++) { var uu = Math.max(0, u - k * .035); alpha(1 - k / 8, function () { disc(lerp(S.sx, S.tx, uu * uu) - 8, lerp(y0, y2, uu), 2 + k / 2, '#d9dde4'); }); }
          R(x - 10, y - 3, 18, 7, '#8d96a6'); R(x - 10, y - 3, 18, 2, '#c3cad6'); R(x + 7, y - 2, 4, 5, '#e0402a'); R(x + 10, y - 1, 2, 3, '#e0402a'); R(x - 11, y - 6, 4, 3, '#5d6470'); R(x - 11, y + 4, 4, 3, '#5d6470'); R(x - 15, y - 1, 5, 3, FIRE[1]); }
        boom(S.tx, y2, seg(t, t0 + 350, t0 + 650), FIRE, 1.8); smoke(S.tx, y2, seg(t, t0 + 500, t0 + 900), 4, 4); }
    } },
    barrage: { hit: 560, shake: [560, 1000, 2], draw: function (t, S) {
      for (var i = 0; i < 9; i++) { var t0 = 200 + i * 40, u = seg(t, t0, t0 + 340), x0 = S.sx - 8, y0 = FLOOR - S.ah + 4, x2 = S.ex + 4 + hash(i * 3) * (S.ew - 8), y2 = FLOOR - 8 - hash(i * 7) * S.eh * .8, cx = lerp(x0, x2, .4), cy = -20 + hash(i) * 30;
        if (t >= t0 && u < 1) { var p = bez(x0, y0, cx, cy, x2, y2, u), q = bez(x0, y0, cx, cy, x2, y2, Math.max(0, u - .05));
          for (var k = 1; k <= 3; k++) { var pp = bez(x0, y0, cx, cy, x2, y2, Math.max(0, u - k * .05)); alpha(1 - k / 4, function () { disc(pp[0], pp[1], 1 + k / 2, '#d9dde4'); }); }
          lineP(q[0], q[1], p[0], p[1], 3, '#8d96a6'); R(p[0] - 1, p[1] - 1, 3, 3, '#e0402a'); }
        boom(x2, y2, seg(t, t0 + 340, t0 + 560), FIRE, .9); }
    } },
    bullet: { hit: 410, draw: function (t, S) {
      for (var i = 0; i < 12; i++) { var t0 = 250 + i * 40, u = seg(t, t0, t0 + 160), dy = (hash(i * 7) - .5) * 16;
        if (t >= t0 && t < t0 + 40) { star(S.sx + 2, S.sy, 5, '#fff4b0'); disc(S.sx + 2, S.sy, 2, '#ffffff'); }
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty + dy, u); R(x - 12, y, 12, 2, '#ffe9a0'); R(x, y - 1, 6, 4, '#ffd23f'); R(x + 4, y, 2, 2, '#ffffff'); }
        if (t >= t0 + 160 && t < t0 + 230) star(S.tx - 4, S.ty + dy, 4 + (hash(i) * 2 | 0), '#ffffff'); }
    } },
    shell: { hit: 700, recoil: [300, 500, 5], shake: [700, 1050, 4], draw: function (t, S) {
      if (t >= 300 && t < 380) { disc(S.sx + 6, S.sy, 8, FIRE[1]); disc(S.sx + 6, S.sy, 4, FIRE[0]); }
      smoke(S.sx + 6, S.sy, seg(t, 300, 700), 5, 3);
      var u = seg(t, 300, 700);
      if (t >= 300 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty, u) - Math.sin(u * Math.PI) * 40; disc(x, y, 7, '#3a3f4a'); disc(x - 2, y - 2, 3, '#8d96a6'); R(x - 3, y - 3, 1, 1, '#ffffff'); }
      boom(S.tx, S.ty, seg(t, 700, 1050), FIRE, 2.4); smoke(S.tx, S.ty, seg(t, 850, 1300), 7, 5);
      flash(t, 700, 750, '#fff4b0', .5);
    } },
    drill: { hit: 520, draw: function (t, S) {
      function drill(x, y, ph) { for (var c = 0; c < 26; c++) { var h = Math.round((26 - c) * .5); R(x + c, y - h, 1, h * 2 + 1, (Math.floor((c + ph) / 4) % 2) ? '#c3cad6' : '#6d7686'); } R(x - 6, y - 14, 6, 29, '#5d6470'); R(x - 6, y - 14, 6, 2, '#8d96a6'); }
      var ph = Math.floor(t / 30) % 8;
      if (t >= 200 && t < 520) { var u = seg(t, 200, 520); drill(lerp(S.sx, S.ex - 14, u), lerp(S.sy, S.ty, u), ph); }
      if (t >= 520 && t < 950) { drill(S.ex - 14 + (Math.floor(t / 30) % 2), S.ty, ph);
        for (var k = 0; k < 6; k++) { var a = hash(k + Math.floor(t / 40)) * 3.14 - 1.57; R(S.ex + 6 + Math.cos(a) * 12, S.ty + Math.sin(a) * 12, 2, 2, k % 2 ? '#fff4b0' : '#ffffff'); } }
    } },
    /* ---------- 전기 ---------- */
    bolt: { hit: 280, shake: [250, 500, 2], draw: function (t, S) {
      if (t < 250) for (var i = 0; i < 5; i++) { var a = hash(i + Math.floor(t / 50) * 9) * 6.28, d = 10 + hash(i * 3) * 10; R(S.ax + Math.cos(a) * d, S.sy + Math.sin(a) * d, 2, 2, '#ffe94a'); }
      if (t >= 250 && t < 620) { var fr = Math.floor(t / 50), pts = [[S.sx, S.sy]];
        for (var k = 1; k < 8; k++) pts.push([lerp(S.sx, S.tx, k / 8), lerp(S.sy, S.ty, k / 8) + (hash(k * 13 + fr) - .5) * 22]);
        pts.push([S.tx, S.ty]);
        for (var j = 0; j < pts.length - 1; j++) lineP(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 4, '#ffd23f');
        for (j = 0; j < pts.length - 1; j++) lineP(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 1.5, '#ffffff');
        var b = pts[4]; lineP(b[0], b[1], b[0] + 12, b[1] - 14 + (hash(fr) - .5) * 10, 2, '#ffd23f');
        alpha(.35, function () { disc(S.tx, S.ty, 14 + (fr % 2) * 4, '#fff6a0'); }); }
      flash(t, 250, 300, '#ffffff', .6);
    } },
    skybolt: { hit: 470, shake: [450, 700, 3], draw: function (t, S) {
      var cy = 14, ca = seg(t, 150, 400) * (1 - seg(t, 900, 1100));
      if (ca > 0) alpha(ca, function () { for (var k = 0; k < 7; k++) disc(S.tx - 30 + k * 10, cy + (k % 2) * 4, 9 + (k % 3) * 2, k % 2 ? '#5d6470' : '#4a505c'); });
      if (t < 300) for (var i = 0; i < 4; i++) R(S.ax + (hash(i + Math.floor(t / 50)) - .5) * 30, FLOOR - S.ah - 4 - hash(i * 3) * 10, 2, 2, '#ffe94a');
      if (t >= 450 && t < 750) { var fr = Math.floor(t / 50), x = S.tx, pts = [[x, cy + 8]];
        for (var k2 = 1; k2 < 6; k2++) pts.push([x + (hash(k2 * 7 + fr) - .5) * 18, lerp(cy + 8, S.ty, k2 / 6)]);
        pts.push([x, FLOOR - S.eh / 3]);
        for (var j = 0; j < pts.length - 1; j++) lineP(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 5, '#ffd23f');
        for (j = 0; j < pts.length - 1; j++) lineP(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 2, '#ffffff');
        alpha(.4, function () { disc(S.tx, FLOOR - S.eh / 3, 16, '#fff6a0'); }); }
      flash(t, 450, 500, '#ffffff', .7);
    } },
    spear: { hit: 480, dash: dashTo(250, 480, 850), shake: [480, 700, 3], draw: function (t, S) {
      // 창끝: 공격 자세에서 오른팔 아래로 내민 창 끝
      var tx = S.axp + S.aw + 2, ty = FLOOR - S.ah * .32, fr = Math.floor(t / 40);
      function spark(x, y, n, r) { for (var k = 0; k < n; k++) { var a = hash(k * 7 + fr) * 6.28, d = r * (.5 + hash(k * 3 + fr) * .5); lineP(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d, 1, k % 2 ? '#ffe94a' : '#ffffff'); } }
      if (t >= 60 && t < 480) { var c = seg(t, 60, 300); alpha(.6, function () { disc(tx, ty, 3 + c * 4, '#ffe94a'); }); disc(tx, ty, 2 + c * 2, '#ffffff'); spark(tx, ty, 4, 8 + c * 8); }
      if (t >= 250 && t < 480) { for (var k = 0; k < 5; k++) R(S.axp - 10 - hash(k + fr) * 24, FLOOR - S.ah * (.2 + k * .15), 14, 1, k % 2 ? '#fff6c8' : '#ffffff');
        alpha(.5, function () { lineP(tx, ty, tx - 30, ty, 3, '#ffe94a'); }); }
      if (t >= 480 && t < 900) { var v = seg(t, 480, 900), endX = Math.min(W + 4, tx + 30 + ease(seg(t, 480, 560)) * (S.ew + 60)), a = v < .6 ? 1 : 1 - (v - .6) / .4;
        alpha(a, function () {
          var pts = [[tx, ty]], n = 7;
          for (var q = 1; q < n; q++) pts.push([lerp(tx, endX, q / n), ty + (hash(q * 13 + fr) - .5) * 14]);
          pts.push([endX, ty]);
          for (var j = 0; j < pts.length - 1; j++) lineP(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 5, '#ffd23f');
          for (j = 0; j < pts.length - 1; j++) lineP(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 2, '#ffffff');
          var cx = S.ex + S.ew * .4, cy = ty, L = 10 + ease(Math.min(1, v * 3)) * 22;
          R(cx - L, cy - 1, L * 2, 3, '#ffffff'); R(cx - 1, cy - L, 3, L * 2, '#ffffff'); R(cx - L / 2, cy, L, 1, '#ffe94a'); R(cx, cy - L / 2, 1, L, '#ffe94a');
          ring(cx, cy, 6 + v * 20, '#ffe94a', 2); spark(cx, cy, 6, 18); });
      }
      flash(t, 480, 530, '#fffbe0', .55);
    } },
    /* ---------- 물 · 얼음 ---------- */
    ice: { hit: 540, shake: [540, 760, 2], draw: function (t, S) {
      var ICE = ['#ffffff', '#d8f2ff', '#8fd0f4', '#3f86c8'], cx = S.sx + 6, cy = S.sy, k;
      // 얼음 송곳: (x, y) 가 뾰족한 끝. 윗면은 밝고 아랫면은 어둡고 가운데 결이 하얗다
      function shard(x, y, ang, L) {
        var dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
        for (var q = 0; q <= L; q++) {
          var w = q < L * .2 ? .8 + q / (L * .2) * 1.7 : 2.5 * (1 - (q - L * .2) / (L * .8)), px = x - dx * (L - q), py = y - dy * (L - q), m = Math.round(w);
          for (var j = -m; j <= m; j++) R(px + nx * j, py + ny * j, 1.2, 1.2, j === 0 ? ICE[0] : j < 0 ? ICE[1] : j === m ? ICE[3] : ICE[2]);
        }
      }
      function flake(x, y, r, c) { star(x, y, r, c); for (var d = 1; d <= r * .7; d++) { R(x - d, y - d, 1, 1, c); R(x + d, y - d, 1, 1, c); R(x - d, y + d, 1, 1, c); R(x + d, y + d, 1, 1, c); } }
      // 냉기 모으기: 찬 기운이 소용돌이치며 빨려 들고 눈꽃 결정이 커진다
      if (t < 300) { var c = t / 300;
        for (k = 0; k < 10; k++) { var a = k * .628 + t / 70, d = 28 * (1 - c) * (.6 + hash(k) * .4) + 3; R(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8, 2, 2, k % 2 ? ICE[1] : ICE[0]); }
        alpha(.5, function () { disc(cx, cy, 2 + c * 6, ICE[1]); }); flake(cx, cy, 2 + Math.round(c * 5), Math.floor(t / 80) % 2 ? ICE[0] : ICE[2]); }
      // 얼음 송곳 7개가 차례로 부채꼴로
      for (var i = 0; i < 7; i++) {
        var t0 = 250 + i * 35, u = seg(t, t0, t0 + 260), x2 = S.tx + (hash(i * 5) - .5) * 12, y2 = S.ty + (i - 3) * Math.min(9, S.eh / 8), y0 = cy + (i - 3) * 4;
        var ang = Math.atan2(y2 - y0, x2 - cx);
        if (t >= t0 && u < 1) { var x = lerp(cx, x2, u), y = lerp(y0, y2, u);
          for (k = 1; k <= 4; k++) R(x - Math.cos(ang) * (18 + k * 6) + (hash(k + i * 9 + Math.floor(t / 40)) - .5) * 4, y - Math.sin(ang) * (18 + k * 6), 2, 2, k % 2 ? ICE[0] : ICE[1]);
          shard(x, y, ang, 22); }
        var v = seg(t, t0 + 260, t0 + 480);
        if (v > 0 && v < 1) { alpha(1 - v, function () { flake(x2, y2, 3 + Math.round(v * 5), ICE[0]);
            for (var f = 0; f < 5; f++) { var a2 = hash(f * 7 + i) * 6.28, d2 = 4 + v * 16; shard(x2 + Math.cos(a2) * d2, y2 + Math.sin(a2) * d2, a2, 6); } }); }
      }
      // 서리: 상대 앞쪽에 결정이 돋고 몸이 잠깐 푸르스름해진다
      var fz = seg(t, 540, 1050);
      if (fz > 0 && fz < 1) {
        alpha(.32 * (1 - fz), function () { disc(S.ex + S.ew / 2, FLOOR - S.eh / 2, Math.max(S.ew, S.eh) * .5, ICE[2]); });
        alpha(fz < .7 ? 1 : (1 - fz) / .3, function () {
          for (var y = FLOOR - S.eh * .9; y < FLOOR - 2; y += 6) { var hgt = 3 + hash(Math.round(y)) * 4, xx = S.ex + 2 + hash(Math.round(y) * 3) * 6;
            R(xx, y, 3, hgt, ICE[1]); R(xx - 2, y + 1, 2, hgt - 2, ICE[0]); R(xx + 3, y + 2, 1, hgt - 3, ICE[3]); } });
        for (k = 0; k < 6; k++) { var sx2 = S.ex + hash(k * 3) * S.ew, sy2 = FLOOR - S.eh - 6 + ((fz * 60 + k * 17) % (S.eh + 6)); flake(sx2, sy2, 2, k % 2 ? ICE[0] : ICE[1]); }
      }
    } },
    freeze: { hit: 450, draw: function (t, S) {
      for (var k = 0; k < 30; k++) { var t0 = 230 + k * 14, u = (t - t0) / 240; if (u < 0 || u >= 1) continue;
        var x = lerp(S.sx, S.tx + 8, u), y = lerp(S.sy, S.ty, u) + (hash(k * 7) - .5) * u * 20, r = 1 + u * 5;
        alpha(u > .8 ? (1 - u) * 5 : .85, function () { disc(x, y, r, u < .3 ? '#ffffff' : u < .6 ? '#c8ecff' : '#9ad8ff'); });
        if (k % 3 === 0) R(x + 3, y - 3, 2, 2, '#ffffff'); }
      freezeBlock(S, seg(t, 650, 1200));
    } },
    jet: { hit: 360, push: 8, draw: function (t, S) {
      if (t >= 250 && t < 800) { var front = lerp(S.sx, S.tx, seg(t, 250, 360)), th = t < 680 ? 8 : 8 * (1 - seg(t, 680, 800));
        R(S.sx, S.sy - th / 2, front - S.sx, th, '#2a7ad0'); R(S.sx, S.sy - th / 4, front - S.sx, th / 2, '#5ab4ff');
        for (var k = 0; k < 8; k++) { var x = S.sx + ((t * .6 + k * 30) % (front - S.sx + 1)); R(x, S.sy - th / 4, 6, 1, '#e6f6ff'); }
        if (t >= 360) for (var i = 0; i < 10; i++) { var a = -1.6 + hash(i + Math.floor(t / 40)) * 3.2, d = 4 + hash(i * 3 + Math.floor(t / 40)) * 14; R(S.tx + Math.cos(a) * d - 4, S.sy + Math.sin(a) * d, 3, 3, i % 2 ? '#5ab4ff' : '#c8ecff'); } }
    } },
    bubble: { hit: 650, draw: function (t, S) {
      for (var i = 0; i < 7; i++) { var t0 = 220 + i * 50, u = seg(t, t0, t0 + 430), r = 6 + hash(i) * 5;
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty + (hash(i * 5) - .5) * 30, u) + Math.sin(u * 8 + i) * 6; alpha(.3, function () { disc(x, y, r, '#c8ecff'); }); ring(x, y, r, '#5ab4ff', 2); R(x - r / 2, y - r / 2, 3, 3, '#ffffff'); }
        var v = seg(t, t0 + 430, t0 + 560); if (v > 0 && v < 1) { var yy = S.ty + (hash(i * 5) - .5) * 30; for (var k = 0; k < 6; k++) { var a = k * 1.05; R(S.tx + Math.cos(a) * (r + v * 10), yy + Math.sin(a) * (r + v * 10), 2, 2, '#c8ecff'); } } }
    } },
    wave: { hit: 520, push: 14, shake: [450, 900, 2], draw: function (t, S) {
      if (t < 250 || t > 1100) return;
      var front = lerp(-20, W + 60, seg(t, 250, 950)), a = t > 950 ? 1 - seg(t, 950, 1100) : 1;
      alpha(a, function () {
        for (var x = Math.max(0, front - 220); x < Math.min(W, front); x += 2) { var d = front - x, h = d < 30 ? 20 + d * 1.4 : Math.max(10, 62 - (d - 30) * .25) + Math.sin(x / 9 + t / 60) * 3;
          alpha(.8, function () { R(x, FLOOR - h, 2, h, '#2a7ad0'); }); R(x, FLOOR - h, 2, 3, d < 30 ? '#ffffff' : '#c8ecff'); if (d < 30 && hash(x + Math.floor(t / 50)) > .7) R(x, FLOOR - h - 4, 2, 2, '#ffffff'); } });
    } },
    /* ---------- 자연 ---------- */
    tornado: { hit: 650, push: 10, draw: function (t, S) {
      var u = seg(t, 200, 650), x = t < 650 ? lerp(S.sx + 10, S.tx, ease(u)) : S.tx;
      if (t < 200 || t >= 900) return;
      alpha(t < 650 ? 1 : 1 - seg(t, 650, 900), function () {
        for (var r = 0; r < 10; r++) { var w = 5 + r * 3.5, y = FLOOR - 4 - r * 5, off = Math.sin(t / 40 + r) * 4; R(x - w / 2 + off, y, w, 2, r % 2 ? '#e8f5ff' : '#bfe3ef'); }
        for (var k = 0; k < 5; k++) { var aa = t / 60 + k * 1.3; R(x + Math.cos(aa) * 16, FLOOR - 20 - k * 7 + Math.sin(aa) * 3, 3, 2, '#7ad05a'); } });
    } },
    rock: { hit: 600, shake: [600, 900, 4], draw: function (t, S) {
      for (var i = 0; i < 3; i++) { var t0 = 220 + i * 80, u = seg(t, t0, t0 + 380), x2 = S.tx + (i - 1) * 12, y2 = S.ty + (i - 1) * 8;
        if (t >= t0 && u < 1) { var x = lerp(S.sx, x2, u), y = lerp(S.sy - 10, y2, u) - Math.sin(u * Math.PI) * 34;
          disc(x, y, 6, '#6d6458'); disc(x - 1, y - 2, 4, '#8f8576'); R(x - 3, y - 4, 2, 2, '#b3a995'); R(x + 2, y + 2, 2, 2, '#4a443b'); }
        var v = seg(t, t0 + 380, t0 + 600); if (v > 0 && v < 1) for (var k = 0; k < 6; k++) { var a = hash(k + i * 9) * 6.28; R(x2 + Math.cos(a) * v * 18, y2 + Math.sin(a) * v * 14 + v * v * 10, 3, 3, '#8f8576'); } }
      var c = seg(t, 600, 1100); if (c > 0 && c < 1) alpha(1 - c, function () { lineP(S.tx - 30, FLOOR, S.tx - 20, FLOOR - 3, 2, '#4a443b'); lineP(S.tx - 20, FLOOR - 3, S.tx - 6, FLOOR + 1, 2, '#4a443b'); lineP(S.tx - 6, FLOOR, S.tx + 10, FLOOR - 4, 2, '#4a443b'); smoke(S.tx, FLOOR - 4, c, 6, 4); });
    } },
    vine: { hit: 560, draw: function (t, S) {
      var gx = S.sx - 6, L = S.ex + 10 - gx, grow = seg(t, 220, 520), v = seg(t, 520, 1100);
      if (t >= 220 && t < 1150) { var n = Math.floor(L * grow);
        for (var i = 0; i < n; i += 2) { var x = gx + i, y = FLOOR - 3 - Math.sin(i / 8) * 3; R(x, y, 3, 3, '#3f8a2a'); if (i % 16 === 0) { R(x, y - 4, 4, 3, '#7ad05a'); } }
        if (v > 0) { var turns = Math.min(1, v * 3);
          for (var k = 0; k < 3; k++) ring(S.tx + 6, FLOOR - S.eh * (.3 + k * .22), S.ew * .45, k % 2 ? '#3f8a2a' : '#5aa83a', 3, Math.PI * .1, Math.PI * (.1 + 2 * turns), .35);
          if (v > .3 && v < .8) for (k = 0; k < 4; k++) star(S.ex + hash(k + Math.floor(t / 60)) * S.ew, FLOOR - hash(k * 3) * S.eh, 2, '#ffffff'); } }
    } },
    petal: { hit: 560, draw: function (t, S) {
      for (var k = 0; k < 16; k++) { var t0 = 220 + k * 25, u = seg(t, t0, t0 + 340), c = k % 4 === 3 ? '#7ad05a' : k % 2 ? '#ff8fb8' : '#ffd1e3';
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty, u) + Math.sin(u * 7 + k) * 12, f = Math.floor(t / 60 + k) % 2; R(x, y, f ? 6 : 3, f ? 3 : 6, c); R(x + 1, y + 1, 2, 1, '#ffffff'); }
        var v = seg(t, t0 + 340, t0 + 700); if (v > 0 && v < 1) { var a = k * .8 + v * 6, r = 10 + v * 12; R(S.tx + Math.cos(a) * r, S.ty + Math.sin(a) * r * .7, 5, 3, c); } }
    } },
    needle: { hit: 500, draw: function (t, S) {
      for (var i = 0; i < 7; i++) { var ang = Math.atan2(S.ty - S.sy, S.tx - 6 - S.sx) + (i - 3) * .035, t0 = 250 + (i % 2) * 40, u = seg(t, t0, t0 + 250), L = Math.hypot(S.tx - 6 - S.sx, S.ty - S.sy), m = t >= t0 + 250 ? 1 : u;
        var hx = S.sx + Math.cos(ang) * L * m, hy = S.sy + Math.sin(ang) * L * m;
        if (t >= t0 && t < 1000) { var dx = Math.cos(ang), dy = Math.sin(ang); lineP(hx - dx * 14, hy - dy * 14, hx, hy, 2, '#5d6470'); R(hx, hy - 1, 3, 2, '#e6e9f0'); R(hx - dx * 14 - 2, hy - dy * 14 - 2, 4, 4, '#c46aff'); } }
      var v = seg(t, 520, 1000); if (v > 0 && v < 1) for (var k = 0; k < 5; k++) alpha(1 - v, function () { disc(S.tx - 8 + (hash(k) - .5) * 20, S.ty - v * 20 + (hash(k * 3) - .5) * 20, 2 + v * 3, '#b56ae0'); });
    } },
    web: { hit: 450, draw: function (t, S) {
      if (t >= 250 && t < 450) { var x = lerp(S.sx, S.tx, seg(t, 250, 450)); lineP(S.sx, S.sy, x, lerp(S.sy, S.ty, seg(t, 250, 450)), 1, '#ffffff'); disc(x, lerp(S.sy, S.ty, seg(t, 250, 450)), 3, '#e6e9f0'); }
      var v = seg(t, 450, 1150); if (v > 0 && v < 1) { var s = Math.min(1, v * 4), r = S.eh * .55 * s;
        alpha(v > .8 ? (1 - v) * 5 : 1, function () { for (var k = 0; k < 8; k++) { var a = k * .785; lineP(S.tx, S.ty, S.tx + Math.cos(a) * r, S.ty + Math.sin(a) * r, 1, '#ffffff'); }
          for (var j = 1; j <= 3; j++) ring(S.tx, S.ty, r * j / 3, '#e6e9f0', 1); }); }
    } },
    gas: { hit: 600, draw: function (t, S) {
      for (var i = 0; i < 9; i++) { var t0 = 220 + i * 45, u = seg(t, t0, t0 + 420), x = lerp(S.sx, S.tx + (hash(i) - .5) * 30, ease(u)), y = lerp(S.sy, S.ty + (hash(i * 3) - .5) * 30, ease(u)) - u * 6, r = 4 + u * 10;
        var life = seg(t, t0, t0 + 900); if (t >= t0 && life < 1) alpha((1 - life) * .7, function () { disc(x, y, r, i % 3 ? '#9b6ac0' : '#7aa83a'); disc(x - r / 3, y - r / 3, r / 3, '#c8a8e0'); }); }
      if (t > 600 && t < 1100) for (var k = 0; k < 4; k++) R(S.ex + hash(k + Math.floor(t / 80)) * S.ew, S.ty - 10 - ((t / 6 + k * 10) % 30), 3, 3, '#c8a8e0');
    } },
    /* ---------- 근접 ---------- */
    slash: { hit: 560, draw: function (t, S) {
      if (t < 250) { var c = t / 250; lineP(S.sx - 2, S.sy - 10 * c, S.sx + 4, S.sy + 10 * c, 2, '#ffffff'); }
      var u = seg(t, 250, 560);
      if (t >= 250 && u < 1) { // 다른 탄처럼 내 입 높이에서 나가 상대 가운데로 (큰 상대면 비스듬히 위로)
        for (var k = 2; k >= 0; k--) { var uk = Math.max(0, u - k * .07), xk = lerp(S.sx, S.tx, uk), yk = lerp(S.sy, S.ty, uk);
          alpha(k ? .35 / k : 1, function () { ring(xk, yk, 18, k ? '#7fd3ff' : '#ffffff', 3, -1.1, 1.1); }); }
        ring(lerp(S.sx, S.tx, u) - 2, lerp(S.sy, S.ty, u), 15, '#c8f0ff', 2, -.9, .9); }
      var v = seg(t, 560, 860);
      if (v > 0 && v < 1) alpha(1 - v, function () { var L = 30 * Math.min(1, v * 4); lineP(S.tx + 18, S.ty - 22, S.tx + 18 - L * 1.2, S.ty - 22 + L * 1.5, 3, '#ffffff'); lineP(S.tx + 18, S.ty - 22, S.tx + 18 - L * 1.2, S.ty - 22 + L * 1.5, 1, '#7fd3ff'); });
    } },
    sword: { hit: 560, shake: [560, 800, 4], draw: function (t, S) {
      var x = S.tx + 4, bladeL = 74, top;
      if (t < 380) { var c = seg(t, 100, 380); top = -bladeL - 20; for (var k = 0; k < 6; k++) star(x + (hash(k + Math.floor(t / 60)) - .5) * 24, 10 + hash(k * 3) * 40, 2, '#ffffff');
        alpha(c * .6, function () { R(x - 6, 0, 12, 60, '#c8f0ff'); }); }
      if (t >= 380 && t < 900) { var u = ease(seg(t, 380, 560)), tipY = lerp(-10, FLOOR - 4, u), y0 = tipY - bladeL;
        for (var k2 = 1; k2 <= 3; k2++) if (t < 560) alpha(.25, function () { R(x - 5, y0 - k2 * 14, 10, bladeL, '#c8f0ff'); });
        R(x - 5, y0, 10, bladeL - 8, '#d8e0ea'); R(x - 1, y0, 2, bladeL - 8, '#ffffff'); for (var j = 0; j < 8; j++) R(x - 5 + j * .6, tipY - 8 + j, 10 - j * 1.2, 1, '#d8e0ea');
        R(x - 14, y0 - 4, 28, 5, '#e0a020'); R(x - 3, y0 - 18, 6, 14, '#7a4a1e'); disc(x, y0 - 20, 3, '#e0a020'); }
      var v = seg(t, 560, 900); if (v > 0 && v < 1) alpha(1 - v, function () { R(S.tx - 30 * v, FLOOR - 2, 60 * v + 8, 2, '#ffffff'); ring(x, FLOOR - 6, 8 + v * 30, '#ffffff', 2, Math.PI, Math.PI * 2, .4); });
      flash(t, 560, 610, '#ffffff', .6);
    } },
    claw: { hit: 420, dash: function (t, S) { return t < 250 ? 0 : t < 400 ? 40 * ease(seg(t, 250, 400)) : 40 * (1 - seg(t, 600, 900)); }, draw: function (t, S) {
      for (var i = 0; i < 3; i++) { var t0 = 420 + i * 60, v = seg(t, t0, t0 + 380);
        if (v > 0 && v < 1) { var L = Math.min(1, v * 5) * 40, x0 = S.tx + 14 + i * 8, y0 = S.ty - 24;
          alpha(v > .6 ? (1 - v) * 2.5 : 1, function () { lineP(x0, y0, x0 - L * .6, y0 + L, 4, '#e0304a'); lineP(x0, y0, x0 - L * .6, y0 + L, 2, '#ffffff'); }); } }
    } },
    charge: { hit: 520, shake: [520, 780, 3], dash: dashTo(250, 520, 800), draw: function (t, S) {
      if (t >= 300 && t < 520) for (var k = 0; k < 4; k++) R(S.axp - 12 - hash(k + Math.floor(t / 40)) * 20, FLOOR - 10 - k * 10, 10, 1, '#ffffff');
      var v = seg(t, 520, 900), cx = S.ex + 4, cy = S.ty;
      if (v > 0 && v < 1) { ring(cx, cy, 6 + v * 30, '#ffffff', 3); alpha(1 - v, function () { ring(cx, cy, 3 + v * 18, '#ffe9a0', 2); });
        for (var i = 0; i < 6; i++) alpha(1 - v, function () { disc(cx + (i - 2.5) * 8 * (1 + v), FLOOR - 3 - v * 6, 3 + v * 2, '#d8cbb0'); }); }
    } },
    flurry: { hit: 420, dash: dashTo(250, 420, 950), draw: function (t, S) {
      if (t >= 420 && t < 950) { var fr = Math.floor(t / 45);
        for (var k = 0; k < 2; k++) { var x = S.ex + 4 + hash(fr * 3 + k) * S.ew * .7, y = FLOOR - S.eh * (.2 + hash(fr * 5 + k) * .7); star2(x, y, 4 + (fr + k) % 3 * 2, '#ffffff'); ring(x, y, 6, '#ffe07a', 2); } }
      if (t >= 900 && t < 1150) { var v = seg(t, 900, 1150); ring(S.tx, S.ty, 8 + v * 30, '#ffffff', 3); }
    } },
    /* ---------- 어둠 · 빛 ---------- */
    dark: { hit: 560, draw: function (t, S) {
      if (t < 250) alpha(t / 250 * .4, function () { disc(S.ax, FLOOR - S.ah / 2, S.ah / 2 + 8, PURP[2]); });
      var u = seg(t, 250, 700);
      if (t >= 250 && u < 1) { var x = lerp(S.sx, S.tx + 20, u);
        alpha(.75, function () { for (var y = 20; y < FLOOR; y += 2) { var w = 10 + Math.sin(y / 6 + t / 50) * 5; R(x - w, y, w, 2, PURP[2]); R(x - 3, y, 3, 2, PURP[1]); } });
        for (var k = 0; k < 8; k++) R(x - 20 - hash(k + Math.floor(t / 50)) * 30, 20 + hash(k * 3) * 100, 2, 2, PURP[1]); }
      var v = seg(t, 560, 1100); if (v > 0 && v < 1) { alpha(.5 * (1 - v), function () { disc(S.tx, S.ty, S.eh * .55 + v * 8, '#2a0f3d'); }); ring(S.tx, S.ty, 8 + v * 30, PURP[1], 2); ring(S.tx, S.ty, 4 + v * 18, PURP[2], 2); }
    } },
    bats: { hit: 640, draw: function (t, S) {
      if (t < 250) alpha(t / 250 * .35, function () { disc(S.ax, FLOOR - S.ah / 2, S.ah / 2 + 6, '#4a1f6e'); });
      for (var i = 0; i < 6; i++) { var t0 = 220 + i * 50, u = seg(t, t0, t0 + 380);
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty, u) + Math.sin(u * 9 + i) * 10 + (i - 3) * 4, f = Math.floor(t / 70 + i) % 2;
          R(x - 2, y - 2, 5, 4, '#2a0f3d'); if (f) { R(x - 8, y - 5, 6, 3, '#5b2a86'); R(x + 3, y - 5, 6, 3, '#5b2a86'); R(x - 5, y - 2, 3, 2, '#5b2a86'); R(x + 3, y - 2, 3, 2, '#5b2a86'); } else { R(x - 8, y + 1, 6, 3, '#5b2a86'); R(x + 3, y + 1, 6, 3, '#5b2a86'); }
          R(x - 1, y - 1, 1, 1, '#ff4d5e'); R(x + 1, y - 1, 1, 1, '#ff4d5e'); } }
      var v = seg(t, 640, 1050); if (v > 0 && v < 1) { alpha(.5 * (1 - v), function () { disc(S.tx, S.ty, 12 + v * 22, '#3a1258'); }); ring(S.tx, S.ty, 8 + v * 30, '#9b5cd6', 2); }
    } },
    dhand: { hit: 520, draw: function (t, S) {
      var reach = t < 250 ? 0 : t < 520 ? ease(seg(t, 250, 520)) : t < 900 ? 1 : 1 - seg(t, 900, 1100);
      if (reach > 0) { var x0 = S.sx - 4, y0 = S.sy, hx = lerp(x0, S.tx - 6, reach), hy = lerp(y0, S.ty, reach) - Math.sin(reach * Math.PI) * 16, grab = t >= 520 && t < 900;
        for (var i = 0; i <= 20; i++) { var u = i / 20, x = lerp(x0, hx, u), y = lerp(y0, hy, u) - Math.sin(u * Math.PI) * 10 * reach + Math.sin(u * 8 + t / 60) * 2; disc(x, y, 3, '#2a0f3d'); R(x - 1, y - 2, 2, 1, '#5b2a86'); }
        disc(hx, hy, 7, '#2a0f3d'); var f = grab ? 6 : 12;
        for (var k = 0; k < 4; k++) { var a = -.9 + k * .6; lineP(hx, hy, hx + Math.cos(a) * f, hy + Math.sin(a) * f * 1.4, 3, '#2a0f3d'); R(hx + Math.cos(a) * f - 1, hy + Math.sin(a) * f * 1.4 - 1, 2, 2, '#ff4d5e'); }
        if (grab) { alpha(.35, function () { disc(S.tx, S.ty, S.eh * .5, '#4a1f6e'); }); for (k = 0; k < 4; k++) R(S.ex + hash(k + Math.floor(t / 60)) * S.ew, S.ty - 20 - ((t / 5 + k * 9) % 24), 2, 2, '#b56ae0'); } }
    } },
    pillar: { hit: 450, draw: function (t, S) {
      if (t < 450) { alpha(Math.min(1, t / 200), function () { ring(S.ax, FLOOR - S.ah - 6, 9, '#ffe9a0', 2, Math.PI, Math.PI * 2); });
        for (var i = 0; i < 4; i++) star(S.ax + (hash(i + Math.floor(t / 80)) - .5) * 40, FLOOR - hash(i * 3 + Math.floor(t / 80)) * S.ah, 2, '#fff6c8'); }
      var v = seg(t, 380, 900);
      if (v > 0 && v < 1) { var w = v < .3 ? v / .3 * 24 : 24 * (1 - (v - .3) / .7);
        alpha(.85, function () { R(S.tx - w / 2 - 3, 0, w + 6, FLOOR, '#ffe9a0'); }); R(S.tx - w / 2, 0, w, FLOOR, '#fffbe8'); R(S.tx - w / 6, 0, w / 3, FLOOR, '#ffffff');
        for (var k = 0; k < 8; k++) { var y = FLOOR - ((hash(k * 5) * 100 + v * 160) % 110); star(S.tx + (hash(k * 11) - .5) * 44, y, 2, '#fff6c8'); } }
      flash(t, 450, 510, '#fffbe8', .5);
    } },
    arrow: { hit: 430, draw: function (t, S) {
      if (t < 280) { var c = Math.min(1, t / 200); ring(S.sx - 4, S.sy, 12, '#fff6c8', 2, -1.2 * c, 1.2 * c); lineP(S.sx - 8, S.sy, S.sx + 4, S.sy, 1, '#ffffff'); }
      var u = seg(t, 280, 430);
      if (t >= 280 && t < 700) { var x = t < 430 ? lerp(S.sx, S.tx - 4, u) : S.tx - 4, a = t < 430 ? 1 : 1 - seg(t, 430, 700);
        alpha(a * .6, function () { R(S.sx, S.sy - 1, x - S.sx, 3, '#fff6c8'); });
        if (t < 430) { R(x - 14, S.sy, 14, 1, '#ffffff'); R(x, S.sy - 2, 2, 5, '#ffffff'); R(x + 2, S.sy - 1, 2, 3, '#ffffff'); R(x - 15, S.sy - 2, 3, 2, '#ffe9a0'); R(x - 15, S.sy + 1, 3, 2, '#ffe9a0'); } }
      var v = seg(t, 430, 750); if (v > 0 && v < 1) { star(S.tx - 4, S.sy, 3 + v * 6, '#ffffff'); ring(S.tx - 4, S.sy, 4 + v * 14, '#ffe9a0', 2); }
    } },
    stars: { hit: 560, draw: function (t, S) {
      for (var i = 0; i < 8; i++) { var t0 = 230 + i * 45, u = seg(t, t0, t0 + 320), x2 = S.ex + hash(i * 3) * S.ew, y2 = FLOOR - 8 - hash(i * 7) * S.eh * .8, x0 = x2 - 60 + hash(i) * 20, y0 = -10;
        if (t >= t0 && u < 1) { var x = lerp(x0, x2, u), y = lerp(y0, y2, u); for (var k = 1; k <= 4; k++) R(x - k * 4, y - k * 5, 2, 2, k % 2 ? '#ffe07a' : '#fffbe0'); star2(x, y, 4, '#ffe07a'); R(x, y, 1, 1, '#ffffff'); }
        var v = seg(t, t0 + 320, t0 + 520); if (v > 0 && v < 1) alpha(1 - v, function () { star2(x2, y2, 3 + v * 6, '#fffbe0'); }); }
    } },
    hearts: { hit: 620, draw: function (t, S) {
      function heart(x, y, s, c) { var rows = [[1, 2, 4, 5], [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [2, 3, 4], [3]];
        rows.forEach(function (r, j) { r.forEach(function (i) { R(x + (i - 3) * s, y + (j - 2) * s, s, s, c); }); }); }
      for (var i = 0; i < 5; i++) { var t0 = 220 + i * 70, u = seg(t, t0, t0 + 400);
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty + (i - 2) * 8, u) + Math.sin(u * 7 + i) * 6, s = Math.floor(t / 120 + i) % 2 ? 2 : 3; heart(x, y, s, '#e0306a'); R(x - s * 2, y - s, s, s, '#ffb0c8'); }
        var v = seg(t, t0 + 400, t0 + 600); if (v > 0 && v < 1) alpha(1 - v, function () { for (var k = 0; k < 6; k++) { var a = k * 1.05; heart(S.tx + Math.cos(a) * v * 18, S.ty + (i - 2) * 8 + Math.sin(a) * v * 14, 1, '#ff8fb8'); } }); }
    } },
    /* ---------- 술법 ---------- */
    talisman: { hit: 620, draw: function (t, S) {
      for (var i = 0; i < 5; i++) { var t0 = 250 + i * 70, u = seg(t, t0, t0 + 300), x, y;
        if (t < t0) { var a = i * 1.256 + t / 120; x = S.ax + Math.cos(a) * (S.aw / 2 + 6); y = FLOOR - S.ah / 2 + Math.sin(a) * 18; }
        else if (u < 1) { x = lerp(S.sx, S.tx, u); y = lerp(FLOOR - S.ah / 2, S.ty + (i - 2) * 6, u); }
        else { var v = seg(t, t0 + 300, t0 + 550); if (v < 1) { var p = S.ty + (i - 2) * 6; alpha(1 - v, function () { disc(S.tx - 6, p, 3 + v * 6, '#7fd3ff'); disc(S.tx - 6, p, 2 + v * 3, '#e6f6ff'); }); } continue; }
        var spin = Math.floor(t / 60 + i) % 3, w2 = spin === 1 ? 3 : 8; R(x - w2 / 2, y - 6, w2, 12, '#fff6d8'); if (w2 > 3) { R(x - 2, y - 4, 4, 2, '#d6332f'); R(x - 1, y - 1, 2, 4, '#d6332f'); } }
    } },
    circle: { hit: 500, draw: function (t, S) {
      var cx = S.sx + 12, cy = S.sy, op = seg(t, 80, 300) * (1 - seg(t, 850, 1050));
      if (op > 0) alpha(op, function () { var rot = t / 300; ring(cx, cy, 20, '#e0a0ff', 2, 0, 6.29, 1); ring(cx, cy, 14, '#ffe07a', 1);
        for (var k = 0; k < 6; k++) { var a = rot + k * 1.047; R(cx + Math.cos(a) * 17 - 1, cy + Math.sin(a) * 17 - 1, 3, 3, '#ffffff'); }
        for (k = 0; k < 3; k++) { var a1 = -rot + k * 2.094, a2 = a1 + 2.094; lineP(cx + Math.cos(a1) * 14, cy + Math.sin(a1) * 14, cx + Math.cos(a2) * 14, cy + Math.sin(a2) * 14, 1, '#ffe07a'); } });
      if (t >= 380 && t < 850) { var front = lerp(cx, S.tx, seg(t, 380, 500)), th = t < 750 ? 14 : 14 * (1 - seg(t, 750, 850));
        alpha(.7, function () { R(cx, cy - th / 2, front - cx, th, '#c46aff'); }); R(cx, cy - th / 4, front - cx, th / 2, '#ffe9ff');
        if (t >= 500) alpha(.8, function () { ring(S.tx, S.ty, 12, '#e0a0ff', 2, 0, 6.29, .4); }); }
    } },
    cards: { hit: 500, shake: [500, 800, 2], draw: function (t, S) {
      // 칼: 위에서부터 손잡이 머리 · 손잡이 · 코등이 · 칼날 · 칼끝(아래). (x, y)는 칼끝 위치
      function sword(x, y) {
        for (var k = 0; k < 4; k++) R(x - (k + 1) / 2, y - k, k + 1, 1, '#ffffff');       // 칼끝
        R(x - 2, y - 26, 5, 23, '#d8e0ea'); R(x, y - 26, 1, 23, '#ffffff');              // 칼날
        R(x - 6, y - 29, 13, 3, '#e0a020'); R(x - 6, y - 29, 13, 1, '#ffe07a');           // 코등이
        R(x - 1, y - 36, 3, 7, '#7a4a1e');                                                // 손잡이
        disc(x, y - 38, 2, '#e0a020');                                                    // 손잡이 머리
      }
      for (var i = 0; i < 6; i++) {
        var x = S.ex + 6 + i * (S.ew - 12) / 5, land = FLOOR - S.eh * .35 - (i % 2) * 10, t0 = 300 + i * 50, appear = seg(t, 120 + i * 30, 300);
        if (t < t0 && appear > 0) alpha(appear, function () { sword(x, 44); });
        if (t >= t0 && t < 1000) {
          var u = ease(seg(t, t0, t0 + 160)), y = lerp(44, land, u);
          if (u < 1) for (var k2 = 1; k2 <= 3; k2++) alpha(.2, function () { R(x - 2, y - 26 - k2 * 10, 5, 20, '#c8f0ff'); });
          alpha(t > 850 ? 1 - seg(t, 850, 1000) : 1, function () { sword(x, y); });
          if (u >= 1 && t < t0 + 260) { star2(x, land, 4, '#ffffff'); R(x - 4, land + 1, 9, 1, '#ff4d5e'); }
        }
      }
    } },
    /* ---------- 기타 ---------- */
    sound: { hit: 450, draw: function (t, S) {
      for (var i = 0; i < 6; i++) { var t0 = 220 + i * 80, r = (t - t0) * .3;
        if (t >= t0 && r < S.tx - S.sx + 20) alpha(1 - r / (S.tx - S.sx + 30), function () { ring(S.sx, S.sy, r + 4, i % 2 ? '#c46aff' : '#ffffff', 2, -.6, .6); }); }
      if (t > 200 && t < 900) for (var k = 0; k < 3; k++) { var nx = S.sx + 10 + ((t - 200) * .15 + k * 40) % 120, ny = S.sy - 16 - Math.sin(nx / 10) * 6; R(nx, ny, 2, 7, '#2a3040'); R(nx - 3, ny + 5, 4, 3, '#2a3040'); R(nx + 2, ny, 3, 2, '#2a3040'); }
    } },
    rings: { hit: 540, draw: function (t, S) {
      for (var i = 0; i < 3; i++) { var t0 = 250 + i * 90, u = seg(t, t0, t0 + 290);
        if (t >= t0 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy, S.ty, u); ring(x, y, 12, '#ffe07a', 3, 0, 6.29, 1.3); ring(x, y, 12, '#fffbe0', 1, 0, 6.29, 1.3);
          for (var k = 1; k <= 3; k++) alpha(.3, function () { ring(x - k * 6, y, 12, '#ffe07a', 1, 0, 6.29, 1.3); }); }
        var v = seg(t, t0 + 290, t0 + 450); if (v > 0 && v < 1) alpha(1 - v, function () { ring(S.tx, S.ty, 12 + v * 12, '#ffffff', 2, 0, 6.29, 1.3); }); }
    } },
    filth: { hit: 660, draw: function (t, S) {
      var u = seg(t, 250, 660);
      if (t >= 250 && u < 1) { var x = lerp(S.sx, S.tx, u), y = lerp(S.sy - 6, S.ty, u) - Math.sin(u * Math.PI) * 40;
        disc(x, y + 5, 8, '#6b3f17'); disc(x, y - 2, 6, '#8f5a26'); disc(x, y - 8, 4, '#a86d33'); R(x - 1, y - 14, 3, 3, '#a86d33'); R(x - 3, y - 1, 2, 2, '#ffffff'); R(x + 2, y - 1, 2, 2, '#ffffff'); }
      var v = seg(t, 660, 1150);
      if (v > 0 && v < 1) { for (var i = 0; i < 9; i++) { var a = hash(i * 7) * 6.28, d = 6 + v * 16 * hash(i * 3); R(S.tx + Math.cos(a) * d, S.ty + Math.sin(a) * d * .8, 5, 4, i % 2 ? '#6b3f17' : '#8f5a26'); }
        for (var k = 0; k < 3; k++) for (var j = 0; j < 4; j++) R(S.tx - 10 + k * 10 + Math.sin(t / 60 + j + k) * 2, S.ty - 16 - j * 4 - v * 8, 2, 2, '#6fae3a'); }
    } },
    annihilate: { hit: 620, shake: [560, 1100, 5], draw: function (t, S) {
      var d = seg(t, 0, 450) * (1 - seg(t, 1000, 1300));
      alpha(d * .65, function () { R(-10, -10, W + 20, H + 20, '#0a0612'); });
      if (t < 560) { var c = seg(t, 100, 560); for (var k = 0; k < 10; k++) { var a = k * .628 + t / 100, r = 60 * (1 - c) + 6; R(S.ax + Math.cos(a) * r, FLOOR - S.ah / 2 + Math.sin(a) * r * .6, 3, 3, k % 2 ? '#ff4d5e' : '#ffffff'); } disc(S.ax, FLOOR - S.ah / 2, 2 + c * 8, '#ffffff'); }
      var v = seg(t, 560, 1000);
      if (v > 0 && v < 1) { var r2 = v * 260; alpha(1 - v * .3, function () { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(S.tx, S.ty, r2, 0, 6.3); g.fill(); }); g.strokeStyle = '#ff4d5e'; g.lineWidth = 4; g.beginPath(); g.arc(S.tx, S.ty, r2 + 3, 0, 6.3); g.stroke(); g.strokeStyle = '#ffe07a'; g.lineWidth = 3; g.beginPath(); g.arc(S.tx, S.ty, r2 * .7, 0, 6.3); g.stroke(); }
      if (t >= 1000 && t < 1250) alpha(1 - seg(t, 1000, 1250), function () { R(-10, -10, W + 20, H + 20, '#ffffff'); });
    } }
  };

  var END = {
    fireball: 950,
    flame: 950,
    bluefire: 1000,
    firebird: 1000,
    meteor: 1000,
    firedash: 1100,
    cannon: 900,
    mbeam: 750,
    xv: 900,
    gorb: 1150,
    eshot: 850,
    airpuff: 950,
    beast: 1050,
    missile: 1000,
    barrage: 1000,
    bullet: 750,
    shell: 1100,
    drill: 950,
    bolt: 650,
    skybolt: 1100,
    spear: 1150,
    ice: 1050,
    freeze: 1200,
    jet: 800,
    bubble: 1000,
    wave: 1100,
    tornado: 900,
    rock: 1100,
    vine: 1150,
    petal: 1100,
    needle: 1000,
    web: 1150,
    gas: 1100,
    slash: 860,
    sword: 900,
    claw: 950,
    charge: 1100,
    flurry: 1250,
    dark: 1100,
    bats: 1050,
    dhand: 1100,
    pillar: 900,
    arrow: 750,
    stars: 950,
    hearts: 1000,
    talisman: 1000,
    circle: 1050,
    cards: 1000,
    sound: 900,
    rings: 850,
    filth: 1150,
    annihilate: 1300,
  };
  var NAMES = {
    fireball: '불덩이',
    flame: '화염 방사',
    bluefire: '푸른 불꽃',
    firebird: '불새',
    meteor: '운석 낙하',
    firedash: '화염 돌진',
    cannon: '포격 레이저',
    mbeam: '입 광선',
    xv: 'X·V 광선',
    gorb: '거대 에너지구',
    eshot: '에너지탄',
    airpuff: '공기탄',
    beast: '짐승 기운',
    missile: '미사일',
    barrage: '미사일 일제 사격',
    bullet: '총탄 연사',
    shell: '대포알',
    drill: '드릴',
    bolt: '번개',
    skybolt: '낙뢰',
    spear: '번개 창',
    ice: '얼음 조각',
    freeze: '냉기',
    jet: '물대포',
    bubble: '거품',
    wave: '해일',
    tornado: '회오리',
    rock: '바위',
    vine: '덩굴',
    petal: '꽃잎',
    needle: '가시',
    web: '거미줄',
    gas: '독가스',
    slash: '참격',
    sword: '거대 검',
    claw: '발톱',
    charge: '돌진',
    flurry: '연타',
    dark: '어둠 파동',
    bats: '박쥐 떼',
    dhand: '어둠의 손',
    pillar: '빛기둥',
    arrow: '빛 화살',
    stars: '별똥별',
    hearts: '하트',
    talisman: '부적',
    circle: '마법진',
    cards: '칼 비',
    sound: '음파',
    rings: '고리',
    filth: '오물',
    annihilate: '전멸기',
  };
  Object.keys(T).forEach(function (k) { T[k].end = END[k]; });
  function get(type) { return T[type] || T.fireball; }
  function info(type) { var f = get(type); return { hit: f.hit, end: f.end }; }
  // 돌진·반동을 반영한 무대
  function stage(type, t, base) {
    var f = get(type), S = {};
    for (var k in base) S[k] = base[k];
    S.dx = f.dash ? f.dash(t, S) : 0;
    var rc = f.recoil && t >= f.recoil[0] && t < f.recoil[1] ? -f.recoil[2] * (1 - seg(t, f.recoil[0], f.recoil[1])) : 0;
    S.off = S.dx + rc; S.axp = S.ax0 + S.off; S.ax = S.axp + S.aw / 2; S.sx = S.axp + S.aw - 2; S.sy = S.floor - S.ah * .6;
    S.tx = S.ex + S.ew / 2 - 6; S.ty = S.floor - S.eh / 2;
    return S;
  }
  function shake(type, t) { var f = get(type); return f.shake && t >= f.shake[0] && t < f.shake[1] ? f.shake[2] : 0; }
  function push(type, t) { var f = get(type); return f.push && t >= f.hit ? f.push * (1 - seg(t, f.hit + 200, f.end)) : 0; }
  // dir < 0 이면 오른쪽 디지몬이 쓰는 것: 좌우를 뒤집어 그린다
  function draw(ctx, type, t, S, dir) {
    g = ctx; W = S.W; H = S.H; FLOOR = S.floor;
    ctx.save();
    if (dir < 0) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    get(type).draw(t, S);
    ctx.restore();
  }
  // 돌진하는 연출은 시작해서 맞기 전까지 달리는 그림을 쓴다
  function runs(type) { return !!get(type).dash; }
  return { TYPES: Object.keys(T), NAMES: NAMES, info: info, stage: stage, shake: shake, push: push, draw: draw, runs: runs };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Fx;
