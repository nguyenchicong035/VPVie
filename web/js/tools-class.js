// Tiện ích lớp học: đồng hồ đếm ngược + gọi tên ngẫu nhiên.
(function (global) {
  "use strict";
  function el(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function buildTimer(body, data) {
    body.innerHTML = "";
    var total = data.total || 300, remain = total, running = false, iv = null;
    var cap = el("div", "ov-cap"); cap.textContent = "⏱ Đồng hồ đếm ngược";
    var disp = el("div", "cl-time");
    var presets = el("div", "cl-presets");
    [1, 3, 5, 10, 15].forEach(function (m) { var b = el("button"); b.textContent = m + " phút"; b.onclick = function () { total = m * 60; remain = total; data.total = total; stop(); upd(); }; presets.appendChild(b); });
    var custom = el("input"); custom.type = "number"; custom.min = 1; custom.placeholder = "phút"; custom.style.width = "70px";
    custom.onchange = function () { var m = parseInt(this.value, 10); if (m > 0) { total = m * 60; remain = total; data.total = total; stop(); upd(); } };
    var ctrl = el("div", "cl-ctrl");
    var startBtn = el("button", "cl-start"); startBtn.textContent = "Bắt đầu";
    var resetBtn = el("button"); resetBtn.textContent = "Đặt lại";
    ctrl.appendChild(startBtn); ctrl.appendChild(resetBtn);
    [cap, disp, presets, custom, ctrl].forEach(function (x) { body.appendChild(x); });
    function upd() { disp.textContent = pad(Math.floor(remain / 60)) + ":" + pad(remain % 60); disp.classList.toggle("done", remain <= 0); }
    function tick() { remain--; if (remain <= 0) { remain = 0; upd(); stop(); disp.classList.add("flash"); return; } upd(); }
    function start() { if (running || remain <= 0) return; running = true; startBtn.textContent = "Tạm dừng"; iv = setInterval(tick, 1000); }
    function stop() { running = false; startBtn.textContent = "Bắt đầu"; if (iv) { clearInterval(iv); iv = null; } }
    startBtn.onclick = function () { running ? stop() : start(); };
    resetBtn.onclick = function () { remain = total; stop(); disp.classList.remove("flash"); upd(); };
    upd();
  }

  function buildPicker(body, data) {
    body.innerHTML = "";
    data.style = data.style || "simple";
    var cap = el("div", "ov-cap"); cap.textContent = "🎲 Gọi tên ngẫu nhiên";
    var tabs = el("div", "pk-tabs");
    var STYLES = [["simple", "🎲 Đơn giản"], ["duck", "🦆 Đua vịt"], ["ufo", "🛸 UFO"], ["bag", "🎁 Xé túi mù"]];
    var arena = el("div", "pk-arena");
    var result = el("div", "cl-name"); result.textContent = "—";
    var btn = el("button", "cl-pick");
    var ta = el("textarea", "cl-names"); ta.placeholder = "Mỗi dòng một tên…"; ta.value = roster();
    ta.oninput = function () { setRoster(ta.value); };
    var used = [];
    function names() { return (ta.value || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean); }
    function pickName() { var ns = names(); if (!ns.length) return null; var pool = ns.filter(function (n) { return used.indexOf(n) < 0; }); if (!pool.length) { used = []; pool = ns; } var p = pool[Math.floor(Math.random() * pool.length)]; used.push(p); return p; }
    function announce(nm) { result.textContent = nm; result.classList.remove("pop"); void result.offsetWidth; result.classList.add("pop"); }
    function setStyle(s) { data.style = s; tabs.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.s === s); }); render(); }
    STYLES.forEach(function (s) { var b = el("button"); b.dataset.s = s[0]; b.textContent = s[1]; b.onclick = function () { setStyle(s[0]); }; if (s[0] === data.style) b.classList.add("on"); tabs.appendChild(b); });
    function render() {
      arena.innerHTML = ""; result.textContent = "—"; btn.disabled = false;
      if (data.style === "simple") { arena.style.display = "none"; btn.textContent = "🎲 Gọi tên"; btn.onclick = function () { var p = pickName(); announce(p || "(chưa có tên)"); }; }
      else { arena.style.display = "block"; if (data.style === "duck") gameDuck(arena, names, pickName, announce, btn); else if (data.style === "ufo") gameUFO(arena, names, pickName, announce, btn); else gameBag(arena, names, pickName, announce, btn); }
    }
    [cap, tabs, arena, result, btn, ta].forEach(function (x) { body.appendChild(x); });
    render();
  }

  // Pháo giấy ăn mừng (phủ lên khu vực chơi)
  function confetti(container) {
    if (!container) return;
    var c = el("canvas", "pk-confetti");
    c.width = container.clientWidth || 460; c.height = container.clientHeight || 240;
    c.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5";
    if (getComputedStyle(container).position === "static") container.style.position = "relative";
    container.appendChild(c);
    var cx = c.getContext("2d"), COL = ["#ff5a5a", "#ffd93b", "#4fd77a", "#4fb8ff", "#b06cff", "#ff8fc7", "#ffa94d"], parts = [];
    for (var i = 0; i < 110; i++) parts.push({ x: c.width / 2 + (Math.random() * 160 - 80), y: c.height * 0.42, vx: Math.random() * 9 - 4.5, vy: Math.random() * -10 - 3, g: 0.22 + Math.random() * 0.14, r: Math.random() * 6 + 3, a: Math.random() * 6.28, va: Math.random() * 0.35 - 0.17, col: COL[i % COL.length] });
    var t = 0;
    (function f() {
      t++; cx.clearRect(0, 0, c.width, c.height); var alive = false;
      parts.forEach(function (p) { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.a += p.va; if (p.y < c.height + 24) alive = true; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.globalAlpha = Math.max(0, 1 - t / 95); cx.fillStyle = p.col; cx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.62); cx.restore(); });
      if (alive && t < 105) requestAnimationFrame(f); else c.remove();
    })();
  }
  // Vẽ con vịt (có vỗ cánh, nhấp nhô, vệt nước, vương miện)
  function drawDuck(ctx, x, y, s, col, t, crown) {
    t = t || 0;
    ctx.save(); ctx.translate(x, y + Math.sin(t / 7 + x) * 1.8);
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(-s * 1.3, s * 0.55, s * (0.9 + Math.sin(t / 5) * 0.1), s * 0.28, 0, 0, 6.2832); ctx.fill(); // vệt nước
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.72, 0, 0, 6.2832); ctx.fill();            // thân
    ctx.fillStyle = "rgba(0,0,0,.09)"; var fl = 0.34 + Math.abs(Math.sin(t / 4)) * 0.16; ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.6, s * fl, -0.3, 0, 6.2832); ctx.fill(); // cánh vỗ
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s * 0.72, -s * 0.52, s * 0.5, 0, 6.2832); ctx.fill();         // đầu
    ctx.fillStyle = "#f0931d"; ctx.beginPath(); ctx.moveTo(s * 1.12, -s * 0.58); ctx.lineTo(s * 1.65, -s * 0.44); ctx.lineTo(s * 1.12, -s * 0.28); ctx.closePath(); ctx.fill(); // mỏ
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(s * 0.88, -s * 0.64, s * 0.1, 0, 6.2832); ctx.fill();      // mắt
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * 0.91, -s * 0.67, s * 0.035, 0, 6.2832); ctx.fill();
    if (crown) { ctx.fillStyle = "#ffd23b"; ctx.beginPath(); var cxx = s * 0.72, cyy = -s * 1.08; ctx.moveTo(cxx - s * 0.4, cyy + s * 0.3); ctx.lineTo(cxx - s * 0.4, cyy); ctx.lineTo(cxx - s * 0.15, cyy + s * 0.2); ctx.lineTo(cxx, cyy - s * 0.08); ctx.lineTo(cxx + s * 0.15, cyy + s * 0.2); ctx.lineTo(cxx + s * 0.4, cyy); ctx.lineTo(cxx + s * 0.4, cyy + s * 0.3); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // ----- Đua vịt (đua ngẫu nhiên, con về đích đầu thắng) -----
  function gameDuck(arena, getNames, pickName, announce, btn) {
    var cv = el("canvas", "pk-cv"); cv.width = 520; cv.height = 300; arena.appendChild(cv);
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height, BANK = 40, finish = W - 70;
    var COL = ["#FFD21E", "#FFC400", "#F6B800", "#FFDA47", "#FFCE2E", "#F4B000"];
    var SPECIAL = { 1: "#E0544E", 3: "#C86BD6", 5: "#6FBF73" }; // vài con vịt màu đặc biệt
    var ducks = [], raf = 0, raceFrames = 0;
    function layout() {
      var ns = getNames(); if (ns.length > 7) { shuffle(ns); ns = ns.slice(0, 7); }
      var lanes = ns.length; var usableTop = BANK + 6, usableBot = H - BANK - 10;
      ducks = ns.map(function (nm, i) { return { nm: nm, x: 44, y: usableTop + (i + 0.5) * (usableBot - usableTop) / lanes, col: SPECIAL[i + 1] || COL[i % COL.length] }; });
      scene();
    }
    var t = 0, mode = "idle", countTxt = "", winner = null;
    function bush(x, y, r) { ctx.beginPath(); ctx.arc(x - r * 0.7, y, r * 0.7, 0, 6.2832); ctx.arc(x, y - r * 0.4, r * 0.85, 0, 6.2832); ctx.arc(x + r * 0.7, y, r * 0.7, 0, 6.2832); ctx.fill(); }
    function scene() {
      // bờ cỏ trên + dưới
      ctx.fillStyle = "#5fb33f"; ctx.fillRect(0, 0, W, BANK); ctx.fillRect(0, H - BANK, W, BANK);
      ctx.fillStyle = "#4e9e34"; for (var bx = 16; bx < W; bx += 58) { bush(bx, BANK - 6, 13); bush(bx + 28, H - BANK + 6, 12); }
      // cây trên bờ
      ctx.fillStyle = "#3f8f2c"; [60, 200, 360, 470].forEach(function (tx) { ctx.beginPath(); ctx.arc(tx, 14, 16, 0, 6.2832); ctx.fill(); });
      // nước + dải sóng xen kẽ
      for (var y = BANK; y < H - BANK; y += 2) { var k = (y - BANK) / (H - 2 * BANK); ctx.fillStyle = (Math.floor((y - BANK) / 20) % 2) ? "#4aa9dc" : "#56b4e4"; ctx.fillRect(0, y, W, 2); }
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
      for (var w = 1; w < 7; w++) { ctx.beginPath(); for (var xx = 0; xx <= W; xx += 14) ctx.lineTo(xx, BANK + w * ((H - 2 * BANK) / 7) + Math.sin((xx + t * 2) / 13) * 2.6); ctx.stroke(); }
      // vạch đích kẻ caro CHÉO
      ctx.save(); ctx.translate(finish, H / 2); ctx.rotate(-0.34);
      for (var yy = -H * 0.72; yy < H * 0.72; yy += 12) for (var cc = 0; cc < 2; cc++) { ctx.fillStyle = ((Math.floor(yy / 12) + cc) % 2) ? "#fff" : "#1b1b1b"; ctx.fillRect(cc * 12 - 12, yy, 12, 12); }
      ctx.restore();
      // vịt + tên
      ducks.forEach(function (d) {
        drawDuck(ctx, d.x, d.y, 15, d.col, t, winner === d);
        var bw = Math.max(32, d.nm.length * 7 + 10);
        ctx.fillStyle = "rgba(255,255,255,.92)"; roundRect(ctx, d.x - bw / 2, d.y + 16, bw, 16, 8); ctx.fill();
        ctx.fillStyle = "#1f2733"; ctx.font = "bold 11px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText(d.nm, d.x, d.y + 27); ctx.textAlign = "left";
      });
      // đồng hồ trên đầu
      var secs = (raceFrames / 60), ts = "0:" + (secs < 10 ? "0" : "") + secs.toFixed(0);
      ctx.fillStyle = "#fff"; roundRect(ctx, W / 2 - 42, 6, 84, 26, 7); ctx.fill();
      ctx.strokeStyle = "#cdd3dc"; ctx.lineWidth = 1.5; roundRect(ctx, W / 2 - 42, 6, 84, 26, 7); ctx.stroke();
      ctx.fillStyle = "#1f2733"; ctx.font = "bold 18px Consolas,monospace"; ctx.textAlign = "center"; ctx.fillText(ts, W / 2, 25); ctx.textAlign = "left";
      if (mode === "count") { ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "bold 72px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText(countTxt, W / 2, H / 2 + 24); ctx.textAlign = "left"; }
    }
    function loop() {
      t++;
      if (mode === "race") { raceFrames++; ducks.forEach(function (d) { d.x += 0.9 + Math.random() * 2.8; if (d.x >= finish - 18 && !winner) { winner = d; } }); if (winner) { mode = "win"; scene(); confetti(arena); announce("🏆 " + winner.nm); btn.disabled = false; btn.textContent = "🦆 Đua lại"; cancelAnimationFrame(raf); return; } }
      scene();
      if (mode === "count" || mode === "race" || mode === "win") raf = requestAnimationFrame(loop);
    }
    btn.textContent = "🦆 Bắt đầu đua";
    btn.onclick = function () {
      if (mode === "count" || mode === "race") return; var ns = getNames(); if (!ns.length) { announce("(chưa có tên)"); return; }
      layout(); winner = null; raceFrames = 0; btn.disabled = true; btn.textContent = "Chuẩn bị…"; mode = "count";
      var seq = ["3", "2", "1", "GO!"], i = 0; countTxt = seq[0]; cancelAnimationFrame(raf); loop();
      var iv = setInterval(function () { i++; if (i < seq.length) countTxt = seq[i]; else { clearInterval(iv); mode = "race"; btn.textContent = "Đang đua…"; } }, 600);
    };
    layout();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // ----- UFO bắt tên (có quét hồi hộp + hút lên + pháo giấy) -----
  function gameUFO(arena, getNames, pickName, announce, btn) {
    var cv = el("canvas", "pk-cv"); cv.width = 520; cv.height = 300; arena.appendChild(cv);
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height, GROUND = H - 48;
    var labels = [], ufox = W / 2, target = null, phase = 0, raf = 0, t = 0, scanEnd = 0, taken = 0, stars = [], bldg = [], lamps = [];
    for (var i = 0; i < 48; i++) stars.push({ x: Math.random() * W, y: Math.random() * (GROUND - 70), r: Math.random() * 1.3 + 0.4, p: Math.random() * 6.28 });
    var AWN = ["#d9654e", "#4e9bd9", "#5bbf72", "#d9a84e", "#9b6fd0"];
    for (var k = 0, bx = 0; bx < W; k++) { var bw = 46 + Math.random() * 20; bldg.push({ x: bx, w: bw, h: 50 + Math.random() * 70, awn: AWN[k % AWN.length] }); bx += bw + 2; }
    for (var lp = 40; lp < W; lp += 120) lamps.push(lp);
    function layout() {
      var ns = getNames(); if (ns.length > 14) { shuffle(ns); ns = ns.slice(0, 14); }
      labels = ns.map(function (nm, i) { var col = i % 7, row = Math.floor(i / 7); return { nm: nm, x: 46 + col * 66 + (row % 2) * 28, y: GROUND + 14 + row * 18, taken: false }; });
    }
    function drawUFO(x, y) {
      ctx.fillStyle = "#7b8aa0"; ctx.beginPath(); ctx.ellipse(x, y, 40, 13, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#9fb0c6"; ctx.beginPath(); ctx.ellipse(x, y - 2, 40, 9, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#bfe6f5"; ctx.beginPath(); ctx.ellipse(x, y - 9, 18, 13, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.ellipse(x - 5, y - 11, 6, 5, 0, 0, 6.2832); ctx.fill();
      var cols = ["#ff5a5a", "#ffd93b", "#7ce0b0", "#4fb8ff"]; for (var d = -24; d <= 24; d += 12) { ctx.fillStyle = cols[Math.abs(Math.floor(t / 6 + d)) % cols.length]; ctx.beginPath(); ctx.arc(x + d, y + 5, 3.2, 0, 6.2832); ctx.fill(); }
      // bảng đếm đã bắt
      ctx.fillStyle = "#143d2a"; roundRect(ctx, x - 20, y - 6, 40, 15, 7); ctx.fill();
      ctx.fillStyle = "#7ce0b0"; ctx.font = "bold 11px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText("🛸 " + taken, x, y + 5); ctx.textAlign = "left";
    }
    function draw() {
      var sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, "#2a1f58"); sky.addColorStop(1, "#141a3c"); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
      ctx.fillStyle = "#f3e9a8"; ctx.beginPath(); ctx.arc(W - 52, 40, 20, 0, 6.2832); ctx.fill();
      stars.forEach(function (s) { ctx.globalAlpha = 0.5 + Math.sin(t / 10 + s.p) * 0.4; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill(); }); ctx.globalAlpha = 1;
      // nhà phố + mái hiên + cửa sổ
      bldg.forEach(function (b) {
        ctx.fillStyle = "#1c2448"; ctx.fillRect(b.x, GROUND - b.h, b.w, b.h);
        ctx.fillStyle = b.awn; for (var ax = b.x; ax < b.x + b.w - 6; ax += 12) { ctx.beginPath(); ctx.moveTo(ax, GROUND - b.h + 14); ctx.lineTo(ax + 12, GROUND - b.h + 14); ctx.lineTo(ax + 9, GROUND - b.h + 22); ctx.lineTo(ax + 3, GROUND - b.h + 22); ctx.closePath(); ctx.fill(); }
        for (var wy = GROUND - b.h + 28; wy < GROUND - 8; wy += 14) for (var wx = b.x + 6; wx < b.x + b.w - 8; wx += 13) { ctx.fillStyle = ((wx + wy) % 3) ? "rgba(255,221,130,.85)" : "rgba(255,221,130,.25)"; ctx.fillRect(wx, wy, 6, 8); }
      });
      // mặt đất + đèn đường
      ctx.fillStyle = "#20305a"; ctx.fillRect(0, GROUND, W, H - GROUND);
      lamps.forEach(function (lx) {
        var g = ctx.createRadialGradient(lx, GROUND + 4, 2, lx, GROUND + 4, 44); g.addColorStop(0, "rgba(255,226,140,.5)"); g.addColorStop(1, "rgba(255,226,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 36, H); ctx.lineTo(lx, GROUND + 2); ctx.lineTo(lx + 36, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#39456e"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, GROUND + 2); ctx.lineTo(lx, H); ctx.stroke();
        ctx.fillStyle = "#ffe28c"; ctx.beginPath(); ctx.arc(lx, GROUND + 2, 4, 0, 6.2832); ctx.fill();
      });
      // tia hút
      if (phase >= 1 && target) { var tx0 = target.x, ty0 = target.y; var bg = ctx.createLinearGradient(0, 34, 0, ty0 + 6); bg.addColorStop(0, "rgba(124,224,176,.6)"); bg.addColorStop(1, "rgba(124,224,176,.05)"); ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(ufox - 12, 36); ctx.lineTo(ufox + 12, 36); ctx.lineTo(tx0 + 34, ty0 + 4); ctx.lineTo(tx0 - 10, ty0 + 4); ctx.closePath(); ctx.fill(); }
      // thẻ tên
      labels.forEach(function (l) {
        if (l.taken) return; var hot = (phase === 1 && Math.abs(ufox - (l.x + 14)) < 26);
        var bw = Math.max(34, l.nm.length * 7 + 10); ctx.font = "11px 'Segoe UI'";
        ctx.fillStyle = hot ? "rgba(127,231,170,.95)" : "rgba(255,255,255,.88)"; roundRect(ctx, l.x - 4, l.y - 11, bw, 16, 8); ctx.fill();
        ctx.fillStyle = hot ? "#0d3a22" : "#1f2733"; ctx.font = (hot ? "bold " : "") + "11px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText(l.nm, l.x - 4 + bw / 2, l.y); ctx.textAlign = "left";
      });
      drawUFO(ufox, 28 + Math.sin(t / 12) * 3);
    }
    function frame() {
      t++;
      if (phase === 1) { ufox = W / 2 + Math.sin(t / 7) * (W / 2 - 40); if (t >= scanEnd) { phase = 2; } }
      else if (phase === 2) { var tx = target.x + 14; if (Math.abs(ufox - tx) > 4) ufox += Math.sign(tx - ufox) * 6; else phase = 3; }
      else if (phase === 3) { target.y -= 4.5; target.x += ((ufox) - target.x) * 0.12; if (target.y <= 42) { target.taken = true; taken++; phase = 0; draw(); confetti(arena); announce("🛸 " + target.nm); btn.disabled = false; btn.textContent = "🛸 Bắt tiếp"; cancelAnimationFrame(raf); return; } }
      draw(); raf = requestAnimationFrame(frame);
    }
    btn.textContent = "🛸 Thả UFO";
    btn.onclick = function () {
      var nm = pickName(); if (!nm) { announce("(chưa có tên)"); return; }
      layout(); var cand = labels.filter(function (l) { return l.nm === nm; }); if (!cand.length) return;
      target = cand[0]; phase = 1; t = 0; scanEnd = 90 + Math.floor(Math.random() * 40); btn.disabled = true; btn.textContent = "Đang quét…"; cancelAnimationFrame(raf); frame();
    };
    layout(); draw();
  }
  // ----- Xé túi mù (rung hồi hộp rồi bung ra + pháo giấy) -----
  function gameBag(arena, getNames, pickName, announce, btn) {
    var board = el("div", "pk-bagboard"); arena.appendChild(board);
    var title = el("div", "pk-bag-title"); title.textContent = "XÉ TÚI MÙ"; board.appendChild(title);
    var grid = el("div", "pk-bags"); board.appendChild(grid);
    var COL = ["#F0894E", "#49C3E0", "#8E5BB5", "#E65C8A", "#4FB06A", "#E0B33A", "#5B8BE0", "#E05B8B"];
    function layout() {
      grid.innerHTML = ""; var ns = getNames(); var n = Math.min(Math.max(ns.length, 1), 9);
      for (var i = 0; i < n; i++) {
        (function (idx) {
          var bag = el("button", "pk-bag"); bag.style.background = "linear-gradient(135deg," + COL[idx % COL.length] + "," + COL[(idx + 3) % COL.length] + ")";
          bag.innerHTML = '<span class="pk-bag-shine"></span><span class="pk-bag-crimp l"></span><span class="pk-bag-crimp r"></span><span class="pk-bag-heart">♥</span><span class="pk-bag-q">?</span>';
          bag.onclick = function () {
            if (bag.classList.contains("open") || bag.classList.contains("shaking")) return;
            var nm = pickName(); if (!nm) { announce("(chưa có tên)"); return; }
            bag.classList.add("shaking");
            setTimeout(function () {
              bag.classList.remove("shaking"); bag.classList.add("open");
              bag.innerHTML = '<span class="pk-bag-burst">✦</span><span class="pk-bag-nm"></span>';
              bag.querySelector(".pk-bag-nm").textContent = nm;
              announce("🎁 " + nm); confetti(arena);
            }, 620);
          };
          grid.appendChild(bag);
        })(i);
      }
    }
    btn.textContent = "🎁 Túi mới"; btn.onclick = function () { layout(); };
    layout();
  }

  // ----- Nhiều lớp, mỗi lớp một danh sách (lưu cục bộ) -----
  function loadClasses() {
    try { var c = JSON.parse(localStorage.getItem("vpvie.classes") || "null"); if (c && c.list) return c; } catch (e) {}
    var old = ""; try { old = localStorage.getItem("vpvie.class") || ""; } catch (e) {}
    var nm = "Lớp của tôi", o = { current: nm, list: {} }; o.list[nm] = old; return o;
  }
  var CL = loadClasses();
  function saveClasses() { try { localStorage.setItem("vpvie.classes", JSON.stringify(CL)); } catch (e) {} }
  var changeCb = null;
  function onChange(fn) { changeCb = fn; }
  function emit() { saveClasses(); if (changeCb) changeCb(); }
  function roster() { return CL.list[CL.current] || ""; }
  function setRoster(v) { CL.list[CL.current] = v; saveClasses(); }
  function classNames() { return Object.keys(CL.list); }
  function currentClass() { return CL.current; }
  function getClass(nm) { return CL.list[nm] || ""; }
  function selectClass(nm) { if (CL.list[nm] != null) { CL.current = nm; emit(); } }
  function addClass(nm, content) { nm = (nm || "").trim(); if (!nm) return false; CL.list[nm] = content || ""; CL.current = nm; emit(); return true; }
  function renameClass(oldn, newn) { newn = (newn || "").trim(); if (CL.list[oldn] == null || !newn) return false; if (newn !== oldn && CL.list[newn] != null) return false; CL.list[newn] = CL.list[oldn]; if (newn !== oldn) delete CL.list[oldn]; if (CL.current === oldn) CL.current = newn; emit(); return true; }
  function deleteClass(nm) { if (CL.list[nm] == null) return; delete CL.list[nm]; var ks = Object.keys(CL.list); if (!ks.length) { CL.list["Lớp của tôi"] = ""; ks = ["Lớp của tôi"]; } if (CL.current === nm) CL.current = ks[0]; emit(); }
  function namesOf() {
    return (roster() || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ----- Vòng quay may mắn -----
  function buildWheel(body, data) {
    body.innerHTML = "";
    var cap = el("div", "ov-cap"); cap.textContent = "🎡 Vòng quay may mắn";
    var wrap = el("div", "cl-wheel-wrap");
    var cv = el("canvas", "cl-wheel"); cv.width = 260; cv.height = 260;
    var ptr = el("div", "cl-wheel-ptr"); ptr.textContent = "▼";
    var res = el("div", "cl-name"); res.textContent = "—";
    var spin = el("button", "cl-pick"); spin.textContent = "Quay 🎡";
    var ta = el("textarea", "cl-names"); ta.placeholder = "Mỗi dòng một tên…"; ta.value = roster();
    ta.oninput = function () { setRoster(ta.value); draw(0); };
    wrap.appendChild(cv); wrap.appendChild(ptr);
    [cap, wrap, res, spin, ta].forEach(function (x) { body.appendChild(x); });
    var COL = ["#C21807", "#1F6FEB", "#1A7F37", "#E3A008", "#7A3FB3", "#0E7490", "#D6336C", "#5C7CFA"];
    var ang = 0;
    function draw(a) {
      var ctx = cv.getContext("2d"), n = Math.max(namesOf(data).length, 1), names = namesOf(data);
      var cx = 130, cy = 130, r = 120; ctx.clearRect(0, 0, 260, 260);
      for (var i = 0; i < n; i++) {
        var a0 = a + i / n * 6.2832, a1 = a + (i + 1) / n * 6.2832;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
        ctx.fillStyle = COL[i % COL.length]; ctx.fill();
        if (names[i]) { ctx.save(); ctx.translate(cx, cy); ctx.rotate((a0 + a1) / 2); ctx.fillStyle = "#fff"; ctx.font = "13px 'Segoe UI'"; ctx.textAlign = "right"; ctx.fillText(names[i].slice(0, 12), r - 10, 5); ctx.restore(); }
      }
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 6.2832); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#7a1020"; ctx.lineWidth = 2; ctx.stroke();
    }
    var spinning = false;
    spin.onclick = function () {
      var names = namesOf(data); if (names.length < 2) { res.textContent = "(cần ≥2 tên)"; return; }
      if (spinning) return; spinning = true;
      var target = Math.floor(Math.random() * names.length);
      var turns = 6.2832 * (4 + Math.random() * 2);
      var seg = 6.2832 / names.length;
      var finalAng = turns + (6.2832 - (target + 0.5) * seg) - 1.5708; // mũi tên ở trên (−90°)
      var t0 = performance.now(), dur = 3200, start = ang;
      (function anim(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        ang = start + finalAng * e; draw(ang);
        if (k < 1) requestAnimationFrame(anim);
        else { spinning = false; res.textContent = names[target]; res.classList.remove("pop"); void res.offsetWidth; res.classList.add("pop"); }
      })(t0);
    };
    draw(0);
  }

  // ----- Chia nhóm ngẫu nhiên -----
  function buildGroups(body, data) {
    body.innerHTML = "";
    var cap = el("div", "ov-cap"); cap.textContent = "👥 Chia nhóm ngẫu nhiên";
    var row = el("div", "cl-row");
    var lbl = el("span"); lbl.textContent = "Số nhóm:";
    var num = el("input"); num.type = "number"; num.min = 2; num.value = data.groups || 4; num.style.width = "64px";
    var btn = el("button", "cl-start"); btn.textContent = "Chia nhóm";
    row.appendChild(lbl); row.appendChild(num); row.appendChild(btn);
    var out = el("div", "cl-groups");
    var ta = el("textarea", "cl-names"); ta.placeholder = "Mỗi dòng một tên…"; ta.value = roster();
    ta.oninput = function () { setRoster(ta.value); };
    [cap, row, out, ta].forEach(function (x) { body.appendChild(x); });
    function go() {
      var names = shuffle(namesOf(data).slice()), g = Math.max(2, parseInt(num.value, 10) || 2);
      data.groups = g; out.innerHTML = "";
      if (!names.length) { out.textContent = "(chưa có tên)"; return; }
      var cols = []; for (var i = 0; i < g; i++) cols.push([]);
      names.forEach(function (nm, i) { cols[i % g].push(nm); });
      cols.forEach(function (list, gi) {
        var c = el("div", "cl-group"); var h = el("div", "cl-group-h"); h.textContent = "Nhóm " + (gi + 1); c.appendChild(h);
        list.forEach(function (nm) { var d = el("div"); d.textContent = nm; c.appendChild(d); }); out.appendChild(c);
      });
    }
    btn.onclick = go;
  }

  // ----- Điểm danh -----
  function buildAttend(body, data) {
    body.innerHTML = "";
    data.absent = data.absent || {};
    var cap = el("div", "ov-cap"); cap.textContent = "✅ Điểm danh";
    var sum = el("div", "cl-sum");
    var list = el("div", "cl-attend");
    var ta = el("textarea", "cl-names"); ta.placeholder = "Mỗi dòng một tên…"; ta.value = roster();
    ta.oninput = function () { setRoster(ta.value); render(); };
    [cap, sum, list, ta].forEach(function (x) { body.appendChild(x); });
    function render() {
      var names = namesOf(data); list.innerHTML = ""; var present = 0;
      names.forEach(function (nm) {
        var absent = !!data.absent[nm]; if (!absent) present++;
        var r = el("div", "cl-attend-row" + (absent ? " absent" : ""));
        var n = el("span", "cl-attend-n"); n.textContent = nm;
        var b = el("button"); b.textContent = absent ? "Vắng" : "Có mặt"; b.className = absent ? "cl-abs" : "cl-pre";
        b.onclick = function () { data.absent[nm] = !data.absent[nm]; render(); };
        r.appendChild(n); r.appendChild(b); list.appendChild(r);
      });
      sum.textContent = "Sĩ số " + names.length + " · Có mặt " + present + " · Vắng " + (names.length - present);
    }
    render();
  }

  // ----- Thi đua (cộng điểm) -----
  function buildScore(body, data) {
    body.innerHTML = "";
    data.scores = data.scores || {};
    var cap = el("div", "ov-cap"); cap.textContent = "🏆 Bảng thi đua";
    var list = el("div", "cl-score");
    var ta = el("textarea", "cl-names"); ta.placeholder = "Mỗi dòng một tên/nhóm…"; ta.value = roster();
    ta.oninput = function () { setRoster(ta.value); render(); };
    [cap, list, ta].forEach(function (x) { body.appendChild(x); });
    function render() {
      var names = namesOf(data); list.innerHTML = "";
      names.map(function (nm) { return { nm: nm, s: data.scores[nm] || 0 }; })
        .sort(function (a, b) { return b.s - a.s; })
        .forEach(function (it, idx) {
          var r = el("div", "cl-score-row");
          var rk = el("span", "cl-rank"); rk.textContent = (idx + 1);
          var n = el("span", "cl-score-n"); n.textContent = it.nm;
          var sc = el("span", "cl-score-v"); sc.textContent = it.s;
          var minus = el("button"); minus.textContent = "−"; minus.onclick = function () { data.scores[it.nm] = (data.scores[it.nm] || 0) - 1; render(); };
          var plus = el("button", "cl-plus"); plus.textContent = "+"; plus.onclick = function () { data.scores[it.nm] = (data.scores[it.nm] || 0) + 1; render(); };
          r.appendChild(rk); r.appendChild(n); r.appendChild(minus); r.appendChild(sc); r.appendChild(plus); list.appendChild(r);
        });
      if (!names.length) list.textContent = "(chưa có tên)";
    }
    render();
  }

  global.VPClass = {
    buildTimer: buildTimer, buildPicker: buildPicker, buildWheel: buildWheel, buildGroups: buildGroups, buildAttend: buildAttend, buildScore: buildScore,
    roster: roster, setRoster: setRoster, classNames: classNames, currentClass: currentClass, getClass: getClass,
    selectClass: selectClass, addClass: addClass, renameClass: renameClass, deleteClass: deleteClass, onChange: onChange
  };
})(window);
