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

  // Vẽ con vịt đơn giản
  function drawDuck(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.7, 0, 0, 6.2832); ctx.fill();            // thân
    ctx.beginPath(); ctx.arc(s * 0.7, -s * 0.5, s * 0.5, 0, 6.2832); ctx.fill();                               // đầu
    ctx.fillStyle = "#e8912b"; ctx.beginPath(); ctx.moveTo(s * 1.1, -s * 0.55); ctx.lineTo(s * 1.6, -s * 0.4); ctx.lineTo(s * 1.1, -s * 0.25); ctx.closePath(); ctx.fill(); // mỏ
    ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(s * 0.85, -s * 0.6, s * 0.09, 0, 6.2832); ctx.fill();     // mắt
    ctx.restore();
  }
  // ----- Đua vịt (đua ngẫu nhiên, con về đích đầu thắng) -----
  function gameDuck(arena, getNames, pickName, announce, btn) {
    var cv = el("canvas", "pk-cv"); cv.width = 460; cv.height = 240; arena.appendChild(cv);
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height, finish = W - 40;
    var COL = ["#F4C430", "#7FB2F0", "#8FD08F", "#E78FA6", "#B79BE0", "#F0A868"];
    var ducks = [], raf = 0, racing = false;
    function layout() {
      var ns = getNames(); if (ns.length > 6) { shuffle(ns); ns = ns.slice(0, 6); }
      ducks = ns.map(function (nm, i) { return { nm: nm, x: 30, y: 30 + i * (H - 44) / Math.max(ns.length, 1), col: COL[i % COL.length] }; });
      draw();
    }
    function draw() {
      ctx.fillStyle = "#cdeaf7"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(120,180,220,.45)"; ctx.lineWidth = 1;
      for (var w = 1; w < 5; w++) { ctx.beginPath(); for (var xx = 0; xx <= W; xx += 16) ctx.lineTo(xx, w * (H / 5) + Math.sin(xx / 13) * 2.5); ctx.stroke(); }
      for (var y = 0; y < H; y += 13) { ctx.fillStyle = (Math.floor(y / 13) % 2) ? "#fff" : "#222"; ctx.fillRect(finish, y, 9, 13); }
      ducks.forEach(function (d) { drawDuck(ctx, d.x, d.y, 14, d.col); ctx.fillStyle = "#1f2733"; ctx.font = "bold 12px 'Segoe UI'"; ctx.fillText(d.nm, d.x - 14, d.y + 24); });
    }
    function frame() {
      var winner = null;
      ducks.forEach(function (d) { d.x += 1.1 + Math.random() * 2.6; if (d.x >= finish - 16 && !winner) winner = d; });
      draw();
      if (winner) { racing = false; cancelAnimationFrame(raf); announce("🏆 " + winner.nm); btn.disabled = false; btn.textContent = "🦆 Đua lại"; return; }
      raf = requestAnimationFrame(frame);
    }
    btn.textContent = "🦆 Bắt đầu đua";
    btn.onclick = function () {
      if (racing) return; var ns = getNames(); if (!ns.length) { announce("(chưa có tên)"); return; }
      layout(); racing = true; btn.disabled = true; btn.textContent = "Đang đua…"; frame();
    };
    layout();
  }
  // ----- UFO bắt tên -----
  function gameUFO(arena, getNames, pickName, announce, btn) {
    var cv = el("canvas", "pk-cv"); cv.width = 460; cv.height = 240; arena.appendChild(cv);
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    var labels = [], ufox = W / 2, target = null, phase = 0, raf = 0, beamY = 0;
    function layout() {
      var ns = getNames(); if (ns.length > 12) { shuffle(ns); ns = ns.slice(0, 12); }
      labels = ns.map(function (nm, i) { return { nm: nm, x: 40 + (i % 6) * 68 + (Math.random() * 20 - 10), y: 150 + Math.floor(i / 6) * 40, taken: false }; });
      draw();
    }
    function drawUFO(x, y) {
      ctx.fillStyle = "#9aa7b4"; ctx.beginPath(); ctx.ellipse(x, y, 34, 11, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#cfe6f5"; ctx.beginPath(); ctx.ellipse(x, y - 7, 16, 10, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#7ce0b0"; [-18, 0, 18].forEach(function (dx) { ctx.beginPath(); ctx.arc(x + dx, y + 3, 3, 0, 6.2832); ctx.fill(); });
    }
    function draw() {
      ctx.fillStyle = "#1a2b3a"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#24455a"; ctx.fillRect(0, H - 40, W, 40);
      if (target && phase > 0) { var g = ctx.createLinearGradient(0, 30, 0, target.y); g.addColorStop(0, "rgba(124,224,176,.5)"); g.addColorStop(1, "rgba(124,224,176,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ufox - 8, 34); ctx.lineTo(ufox + 8, 34); ctx.lineTo(target.x + 34, target.y + 8); ctx.lineTo(target.x - 6, target.y + 8); ctx.closePath(); ctx.fill(); }
      labels.forEach(function (l) { if (l.taken) return; ctx.fillStyle = "#fff"; ctx.font = "13px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText(l.nm, l.x + 14, l.y); });
      ctx.textAlign = "left";
      drawUFO(ufox, 24);
    }
    function frame() {
      if (phase === 1) { if (Math.abs(ufox - (target.x + 14)) > 3) ufox += Math.sign((target.x + 14) - ufox) * 5; else { phase = 2; } }
      else if (phase === 2) { target.y -= 4; if (target.y <= 40) { target.taken = true; phase = 0; announce("🛸 " + target.nm); btn.disabled = false; btn.textContent = "🛸 Bắt tiếp"; draw(); return; } }
      draw(); raf = requestAnimationFrame(frame);
    }
    btn.textContent = "🛸 Thả UFO";
    btn.onclick = function () {
      var nm = pickName(); if (!nm) { announce("(chưa có tên)"); return; }
      var cand = labels.filter(function (l) { return !l.taken && l.nm === nm; }); if (!cand.length) { layout(); cand = labels.filter(function (l) { return l.nm === nm; }); }
      target = cand[0]; phase = 1; btn.disabled = true; btn.textContent = "Đang bắt…"; cancelAnimationFrame(raf); frame();
    };
    layout();
  }
  // ----- Xé túi mù -----
  function gameBag(arena, getNames, pickName, announce, btn) {
    var grid = el("div", "pk-bags"); arena.appendChild(grid);
    var COL = ["#F0894E", "#49C3E0", "#8E5BB5", "#E65C8A", "#49C3E0", "#F0894E", "#5BBE7C", "#E0B33A"];
    function layout() {
      grid.innerHTML = ""; var ns = getNames(); var n = Math.min(Math.max(ns.length, 1), 8);
      for (var i = 0; i < n; i++) {
        (function (idx) {
          var bag = el("button", "pk-bag"); bag.style.background = COL[idx % COL.length];
          bag.innerHTML = '<span class="pk-bag-q">?</span>';
          bag.onclick = function () {
            if (bag.classList.contains("open")) return;
            var nm = pickName(); if (!nm) { announce("(chưa có tên)"); return; }
            bag.classList.add("open"); bag.innerHTML = '<span class="pk-bag-nm"></span>'; bag.querySelector(".pk-bag-nm").textContent = nm;
            announce("🎁 " + nm);
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
