// VPVie – Bảng dạy học. Vẽ tay, làm đẹp nét, công thức, đồ thị, nhận dạng AI.
(function () {
  "use strict";

  var board = document.getElementById("board");
  var canvas = document.getElementById("paper");
  var overlay = document.getElementById("overlay");
  var ctx = canvas.getContext("2d");

  var state = {
    tool: "pen",
    color: "#7a1020",
    size: 3,
    beautify: true,
    items: [],        // nét & hình trên canvas
    overlays: [],     // lớp phủ (công thức, đồ thị, máy tính, câu hỏi, chữ) – dạng dữ liệu
    drawing: false,
    cur: null,
  };

  // ----- Kích thước canvas theo khung
  function resize() {
    var r = board.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(r.height * dpr);
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  window.addEventListener("resize", resize);

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, pr: (e.pressure && e.pressure > 0) ? e.pressure : 0.5 };
  }

  // ----- Vẽ
  function drawItem(it) {
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = it.color || state.color;
    ctx.lineWidth = it.size || state.size;
    ctx.beginPath();
    if (it.type === "stroke") {
      var p = it.points, base = it.size || state.size;
      if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0].x, p[0].y, base / 2, 0, 6.2832); ctx.fillStyle = it.color; ctx.fill(); return; }
      for (var i = 1; i < p.length; i++) {                // nét theo lực nhấn của bút (stylus)
        var pr = p[i].pr != null ? p[i].pr : 0.5;
        ctx.beginPath(); ctx.lineWidth = base * (0.55 + pr * 0.9);
        ctx.moveTo(p[i - 1].x, p[i - 1].y); ctx.lineTo(p[i].x, p[i].y); ctx.stroke();
      }
      return;
    } else if (it.type === "line") {
      ctx.moveTo(it.x1, it.y1); ctx.lineTo(it.x2, it.y2); ctx.stroke();
    } else if (it.type === "rect") {
      ctx.strokeRect(it.x, it.y, it.w, it.h);
    } else if (it.type === "triangle") {
      var t = it.pts; ctx.moveTo(t[0].x, t[0].y); ctx.lineTo(t[1].x, t[1].y); ctx.lineTo(t[2].x, t[2].y); ctx.closePath(); ctx.stroke();
    } else if (it.type === "circle") {
      ctx.arc(it.cx, it.cy, it.r, 0, Math.PI * 2); ctx.stroke();
    } else if (it.type === "ellipse") {
      ctx.ellipse(it.cx, it.cy, it.rx, it.ry, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (it.type === "solid") {
      var sc = it.color || state.color, lw = it.size || 2;
      ctx.strokeStyle = sc; ctx.lineWidth = lw;
      (it.segs || []).forEach(function (s) { ctx.setLineDash(s.dashed ? [6, 5] : []); ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); });
      (it.ellipses || []).forEach(function (e) { ctx.setLineDash(e.dashed ? [6, 5] : []); ctx.beginPath(); ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, e.a0 || 0, (e.a1 != null ? e.a1 : Math.PI * 2)); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.fillStyle = sc; ctx.font = "13px 'Segoe UI'";
      (it.labels || []).forEach(function (l) { ctx.fillText(l.t, l.x, l.y); });
    }
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < state.items.length; i++) drawItem(state.items[i]);
    if (state.cur) drawItem(state.cur);
    if (window.VPGeo) window.VPGeo.render(ctx, canvas.clientWidth, canvas.clientHeight);
    if (typeof scheduleSave === "function") scheduleSave();
  }

  // ----- Tẩy: xóa item gần con trỏ
  function eraseAt(pt) {
    var kept = [];
    for (var i = 0; i < state.items.length; i++) {
      if (!nearItem(state.items[i], pt, 12)) kept.push(state.items[i]);
    }
    if (kept.length !== state.items.length) { state.items = kept; redraw(); }
  }
  function nearItem(it, pt, tol) {
    if (it.type === "stroke") {
      for (var i = 0; i < it.points.length; i++) if (Math.hypot(it.points[i].x - pt.x, it.points[i].y - pt.y) < tol) return true;
      return false;
    }
    var b = itemBox(it);
    return pt.x > b.minx - tol && pt.x < b.maxx + tol && pt.y > b.miny - tol && pt.y < b.maxy + tol;
  }
  function itemBox(it) {
    if (it.type === "line") return { minx: Math.min(it.x1, it.x2), maxx: Math.max(it.x1, it.x2), miny: Math.min(it.y1, it.y2), maxy: Math.max(it.y1, it.y2) };
    if (it.type === "rect") return { minx: it.x, maxx: it.x + it.w, miny: it.y, maxy: it.y + it.h };
    if (it.type === "circle") return { minx: it.cx - it.r, maxx: it.cx + it.r, miny: it.cy - it.r, maxy: it.cy + it.r };
    if (it.type === "ellipse") return { minx: it.cx - it.rx, maxx: it.cx + it.rx, miny: it.cy - it.ry, maxy: it.cy + it.ry };
    if (it.type === "triangle") { var xs = it.pts.map(function (p) { return p.x; }), ys = it.pts.map(function (p) { return p.y; }); return { minx: Math.min.apply(0, xs), maxx: Math.max.apply(0, xs), miny: Math.min.apply(0, ys), maxy: Math.max.apply(0, ys) }; }
    return { minx: 0, maxx: 0, miny: 0, maxy: 0 };
  }

  // ----- Sự kiện vẽ
  canvas.addEventListener("pointerdown", function (e) {
    // Chống chạm nhầm lòng bàn tay: khi đang dùng bút thì bỏ qua ngón tay (touch)
    if (e.pointerType === "touch" && (state.penDown || (Date.now() - (state.lastPen || 0) < 700))) return;
    if (e.pointerType === "pen") { state.penDown = true; state.lastPen = Date.now(); }
    var pt = pos(e);
    if (state.tool === "geo") {
      if (window.VPGeo.tool === "move") canvas.setPointerCapture(e.pointerId);
      window.VPGeo.onDown(pt); state.geoDown = true; redraw(); return;
    }
    canvas.setPointerCapture(e.pointerId);
    if (state.tool === "eraser") { state.drawing = true; eraseAt(pt); return; }
    state.drawing = true;
    state.cur = { type: "stroke", points: [pt], color: state.color, size: state.size };
  });
  canvas.addEventListener("pointermove", function (e) {
    if (state.tool === "geo") { if (state.geoDown && window.VPGeo.onMove(pos(e))) redraw(); return; }
    if (!state.drawing) return;
    var pt = pos(e);
    if (state.tool === "eraser") { eraseAt(pt); return; }
    state.cur.points.push(pt);
    redraw();
  });
  function endStroke() {
    if (state.tool === "geo") { if (window.VPGeo) window.VPGeo.onUp(); state.geoDown = false; return; }
    if (!state.drawing) return;
    state.drawing = false;
    if (state.tool === "eraser") return;
    var s = state.cur; state.cur = null;
    if (!s) return;
    if (state.beautify && window.VPBeautify) {
      var shp = window.VPBeautify.beautify(s.points);
      if (shp) { shp.color = s.color; shp.size = s.size; state.items.push(shp); redraw(); return; }
    }
    state.items.push(s); redraw();
  }
  canvas.addEventListener("pointerup", function (e) { if (e.pointerType === "pen") { state.penDown = false; state.lastPen = Date.now(); } endStroke(); });
  canvas.addEventListener("pointercancel", function (e) { if (e.pointerType === "pen") { state.penDown = false; state.lastPen = Date.now(); } endStroke(); });
  canvas.addEventListener("pointerleave", function (e) { if (state.drawing && state.tool !== "eraser") endStroke(); });

  // ----- Lớp phủ dạng DỮ LIỆU (lưu/mở theo trang được)
  function overlayBody(kind, body, data) {
    if (kind === "math") window.VPMathPlot.renderMath(body, data.latex, true);
    else if (kind === "text") { body.textContent = data.text; if (data.font) body.style.fontFamily = data.font; if (data.size) body.style.fontSize = data.size + "px"; }
    else if (kind === "plot") window.VPCalc.buildGraph(body, data.expr);
    else if (kind === "calc") window.VPSci.build(body);
    else if (kind === "quiz") data.sub === "tf" ? window.VPQuiz.buildTF(body, data) : window.VPQuiz.buildMCQ(body, data);
    else if (kind === "var") window.VPVar.build(body, data);
    else if (kind === "timer") window.VPClass.buildTimer(body, data);
    else if (kind === "picker") window.VPClass.buildPicker(body, data);
    else if (kind === "note") {
      var host = body.closest(".ov"); host.classList.add("ov-note");
      function applyColor(c) { data.color = c; host.style.background = c; }
      applyColor(data.color || "#FFF1A6");
      var grip = document.createElement("div"); grip.className = "note-grip"; grip.title = "Kéo để di chuyển";
      var ed = document.createElement("div"); ed.className = "note-edit"; ed.contentEditable = "true"; ed.spellcheck = false;
      ed.setAttribute("data-ph", "Ghi chú…"); ed.textContent = data.text || "";
      ed.addEventListener("input", function () { data.text = ed.textContent; scheduleSave(); });
      var bar = document.createElement("div"); bar.className = "note-colors";
      ["#FFF1A6", "#FFD2E0", "#CDEFC6", "#CFE3FF"].forEach(function (c) { var d = document.createElement("button"); d.className = "note-dot"; d.style.background = c; d.onclick = function () { applyColor(c); scheduleSave(); }; bar.appendChild(d); });
      body.appendChild(grip); body.appendChild(ed); body.appendChild(bar);
    }
  }
  function makeOverlayEl(ov) {
    var el = document.createElement("div");
    el.className = "ov ov-" + ov.kind; el.style.left = ov.x + "px"; el.style.top = ov.y + "px"; el.dataset.id = ov.id;
    var body = document.createElement("div"); body.className = "ov-body"; el.appendChild(body);
    var del = document.createElement("button"); del.className = "ov-del"; del.textContent = "✕"; del.title = "Xóa";
    del.onclick = function () { removeOverlay(ov.id); };
    el.appendChild(del);
    overlayBody(ov.kind, body, ov.data);
    makeDraggable(el, ov);
    return el;
  }
  function renderOverlays() { overlay.innerHTML = ""; state.overlays.forEach(function (ov) { overlay.appendChild(makeOverlayEl(ov)); }); }
  function addOverlayData(kind, data, x, y) {
    var n = state.overlays.length;
    var ov = { id: "o" + Date.now() + Math.floor(Math.random() * 1000), kind: kind, x: x != null ? x : 80 + (n * 12) % 240, y: y != null ? y : 80 + (n * 12) % 180, data: data || {} };
    state.overlays.push(ov); overlay.appendChild(makeOverlayEl(ov)); scheduleSave(); return ov;
  }
  function removeOverlay(id) { state.overlays = state.overlays.filter(function (o) { return o.id !== id; }); renderOverlays(); scheduleSave(); }
  function makeDraggable(el, ov) {
    var sx, sy, ox, oy, moving = false;
    el.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button, input, textarea, select, label, .tf-cell, .note-edit, .note-colors")) return;
      moving = true; sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.style.left); oy = parseFloat(el.style.top);
      el.setPointerCapture(e.pointerId); el.classList.add("dragging");
    });
    el.addEventListener("pointermove", function (e) {
      if (!moving) return;
      var nx = ox + e.clientX - sx, ny = oy + e.clientY - sy;
      el.style.left = nx + "px"; el.style.top = ny + "px"; if (ov) { ov.x = nx; ov.y = ny; }
    });
    el.addEventListener("pointerup", function () { moving = false; el.classList.remove("dragging"); scheduleSave(); });
  }

  function insertMath(latex, x, y) { if (latex) addOverlayData("math", { latex: latex }, x, y); }
  function insertText(text, x, y, opts) {
    if (!text) return; opts = opts || {};
    addOverlayData("text", { text: text, font: opts.font, size: opts.size }, x, y);
  }
  function inkBBox() {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, found = false;
    state.items.forEach(function (it) {
      if (it.type === "stroke") it.points.forEach(function (p) { found = true; if (p.x < minx) minx = p.x; if (p.y < miny) miny = p.y; if (p.x > maxx) maxx = p.x; if (p.y > maxy) maxy = p.y; });
    });
    return found ? { x: minx, y: miny, w: maxx - minx, h: maxy - miny } : null;
  }
  function clearStrokes() { state.items = state.items.filter(function (it) { return it.type !== "stroke"; }); }
  // Cắt đúng vùng có nét viết tay (phóng to) để nhận dạng chính xác hơn
  function cropForOCR() {
    var bb = inkBBox();
    if (!bb || bb.w < 6 || bb.h < 6) return canvas;
    var dpr = window.devicePixelRatio || 1, pad = 18, scale = 2;
    var x = Math.max(0, bb.x - pad), y = Math.max(0, bb.y - pad), w = bb.w + 2 * pad, h = bb.h + 2 * pad;
    var oc = document.createElement("canvas"); oc.width = Math.round(w * scale); oc.height = Math.round(h * scale);
    var o = oc.getContext("2d"); o.fillStyle = "#fff"; o.fillRect(0, 0, oc.width, oc.height);
    o.drawImage(canvas, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, oc.width, oc.height);
    return oc;
  }
  function insertPlot(expr, x, y) { if (expr) addOverlayData("plot", { expr: expr }, x, y); }
  function insertCalc(x, y) { addOverlayData("calc", {}, x, y); }
  function insertNote(x, y) { addOverlayData("note", { text: "", color: "#FFF1A6" }, x, y); }
  function insertVar(data, x, y) { addOverlayData("var", data, x, y); }
  function insertTimer(x, y) { addOverlayData("timer", { total: 300 }, x, y); }
  function insertPicker(x, y) { addOverlayData("picker", { names: "" }, x, y); }
  var quizNo = 0;
  function insertQuiz(data, kind, x, y) {
    quizNo += 1; data.no = quizNo; data.sub = kind;
    addOverlayData("quiz", data, x, y);
  }

  // ----- Thanh công cụ
  function $(id) { return document.getElementById(id); }
  var tools = document.querySelectorAll("[data-tool]");
  var geoBtns = document.querySelectorAll("[data-geo]");
  function clearActive() { tools.forEach(function (x) { x.classList.remove("active"); }); geoBtns.forEach(function (x) { x.classList.remove("active"); }); }
  tools.forEach(function (b) {
    b.onclick = function () {
      state.tool = b.dataset.tool;
      if (window.VPGeo) window.VPGeo.setTool(null);
      clearActive(); b.classList.add("active");
    };
  });
  geoBtns.forEach(function (b) {
    b.onclick = function () {
      state.tool = "geo";
      window.VPGeo.setTool(b.dataset.geo);
      clearActive(); b.classList.add("active");
    };
  });
  document.querySelectorAll("[data-color]").forEach(function (b) {
    b.style.background = b.dataset.color;
    b.onclick = function () {
      state.color = b.dataset.color;
      document.querySelectorAll("[data-color]").forEach(function (x) { x.classList.remove("sel"); });
      b.classList.add("sel");
    };
  });
  // Ribbon: chuyển nhóm công cụ theo thẻ
  document.querySelectorAll(".rb-tab").forEach(function (t) {
    t.onclick = function () {
      document.querySelectorAll(".rb-tab").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      document.querySelectorAll(".rb-pane").forEach(function (pn) { pn.classList.toggle("hidden", pn.dataset.pane !== t.dataset.rb); });
    };
  });
  $("size").oninput = function () { state.size = parseInt(this.value, 10); };
  var bt = $("beautify");
  bt.onclick = function () { state.beautify = !state.beautify; bt.classList.toggle("on", state.beautify); bt.textContent = state.beautify ? "✨ Làm đẹp nét: BẬT" : "✨ Làm đẹp nét: TẮT"; };
  $("undo").onclick = function () { state.items.pop(); redraw(); };
  $("clear").onclick = function () { if (confirm("Xóa toàn bộ trang?")) { state.items = []; state.overlays = []; overlay.innerHTML = ""; if (window.VPGeo) window.VPGeo.clear(); redraw(); scheduleSave(); } };
  $("btn-calc").onclick = function () { insertCalc(100, 90); };
  $("btn-note").onclick = function () { insertNote(130, 100); };
  if ($("btn-timer")) $("btn-timer").onclick = function () { insertTimer(120, 90); };
  if ($("btn-picker")) $("btn-picker").onclick = function () { insertPicker(160, 90); };
  $("btn-var").onclick = function () { showDialog("dlg-var"); $("var-input").focus(); };
  $("var-ok").onclick = function () {
    var expr = $("var-input").value.trim(); if (!expr) return;
    insertVar({ expr: expr, mode: $("var-mode").value, xmin: parseFloat($("var-min").value) || -10, xmax: parseFloat($("var-max").value) || 10 }, 90, 90);
    hideDialog("dlg-var");
  };
  $("btn-png").onclick = async function () { try { toast("Đang tạo ảnh…"); await window.VPExport.png(board); } catch (e) { toast("Lỗi xuất ảnh."); } };
  $("btn-pdf").onclick = async function () { try { toast("Đang tạo PDF…"); await window.VPExport.pdf(board); } catch (e) { toast("Lỗi xuất PDF."); } };

  // Hộp thoại công thức
  $("btn-math").onclick = function () { showDialog("dlg-math"); $("math-input").focus(); };
  $("math-ok").onclick = function () { insertMath($("math-input").value, 80, 80); $("math-input").value = ""; hideDialog("dlg-math"); };
  $("math-input").oninput = function () { window.VPMathPlot.renderMath($("math-preview"), this.value, true); };

  // Hộp thoại đồ thị
  $("btn-plot").onclick = function () { showDialog("dlg-plot"); $("plot-input").focus(); };
  $("plot-ok").onclick = function () { insertPlot($("plot-input").value, 80, 80); hideDialog("dlg-plot"); };

  // Mẫu hình học
  $("btn-shapes").onclick = function () { showDialog("dlg-shapes"); };
  $("btn-solid").onclick = function () { showDialog("dlg-solid"); };
  document.querySelectorAll("[data-solid]").forEach(function (b) {
    b.onclick = function () {
      state.items.push(window.VPSolid.make(b.dataset.solid, canvas.clientWidth / 2, canvas.clientHeight / 2, 100, state.color, state.size || 2));
      redraw(); hideDialog("dlg-solid");
    };
  });
  document.querySelectorAll("[data-shape]").forEach(function (b) {
    b.onclick = function () { addShapeTemplate(b.dataset.shape); hideDialog("dlg-shapes"); };
  });
  function addShapeTemplate(kind) {
    var cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2, s = 90, c = state.color, w = state.size;
    if (kind === "triangle") state.items.push({ type: "triangle", pts: [{ x: cx, y: cy - s }, { x: cx - s, y: cy + s }, { x: cx + s, y: cy + s }], color: c, size: w });
    else if (kind === "rect") state.items.push({ type: "rect", x: cx - s, y: cy - s * 0.7, w: 2 * s, h: 1.4 * s, color: c, size: w });
    else if (kind === "circle") state.items.push({ type: "circle", cx: cx, cy: cy, r: s, color: c, size: w });
    else if (kind === "axes") { state.items.push({ type: "line", x1: cx - 180, y1: cy, x2: cx + 180, y2: cy, color: c, size: w }); state.items.push({ type: "line", x1: cx, y1: cy - 140, x2: cx, y2: cy + 140, color: c, size: w }); }
    redraw();
  }

  // Nhận dạng (Tesseract miễn phí hoặc máy chủ Ollama/Claude). Kết quả công thức mở ra để sửa trước khi chèn.
  $("btn-ai").onclick = async function () {
    var btn = this; var old = btn.textContent; var statusEl = $("ai-status");
    btn.disabled = true; btn.textContent = "Đang nhận dạng…";
    try {
      var engine = $("ai-engine").value, data, src = cropForOCR();
      if (engine === "tesseract") {
        statusEl.textContent = "Đang tải mô hình…";
        data = await window.VPRecognize.recognizeTesseract(src, function (st) { statusEl.textContent = st; });
      } else {
        data = await window.VPRecognize.recognizeServer(src.toDataURL("image/png"), $("ai-mode").value);
      }
      statusEl.textContent = "";
      var bb = inkBBox();
      if ((data.kind === "math" || data.kind === "mixed") && data.latex) {
        $("math-input").value = data.latex;
        window.VPMathPlot.renderMath($("math-preview"), data.latex, true);
        showDialog("dlg-math");             // mở ra để sửa LaTeX rồi chèn
      }
      if (data.text) {
        var fs = bb ? Math.min(Math.max(Math.round(bb.h), 18), 46) : 22;
        insertText(data.text, bb ? bb.x : 100, bb ? bb.y : 100, { font: $("text-font").value, size: fs });
      }
      // Thay nét viết tay bằng chữ (nếu bật) – đổi chữ tay thành phông chữ tại chỗ
      if ($("ai-replace").checked && bb && (data.text || data.latex)) { clearStrokes(); redraw(); }
      if (!data.latex && !data.text) toast("Không nhận ra nội dung. Hãy viết rõ hơn.");
      else toast("Đã chuyển chữ viết tay thành chữ đánh máy.");
    } catch (e) {
      statusEl.textContent = "";
      toast(e.message || "Lỗi nhận dạng.");
    } finally { btn.disabled = false; btn.textContent = old; }
  };

  // Câu hỏi
  var qTab = "mcq";
  $("btn-quiz").onclick = function () { showDialog("dlg-quiz"); };
  document.querySelectorAll("[data-qtab]").forEach(function (b) {
    b.onclick = function () {
      qTab = b.dataset.qtab;
      document.querySelectorAll("[data-qtab]").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      $("q-mcq").style.display = qTab === "mcq" ? "block" : "none";
      $("q-tf").style.display = qTab === "tf" ? "block" : "none";
    };
  });
  $("quiz-ok").onclick = function () {
    var q = $("q-text").value.trim();
    if (qTab === "mcq") {
      var correct = parseInt((document.querySelector('input[name="q-correct"]:checked') || {}).value || "0", 10);
      insertQuiz({ q: q, opts: [$("q-a").value, $("q-b").value, $("q-c").value, $("q-d").value], correct: correct, sol: $("q-sol").value.trim() }, "mcq", 90, 90);
    } else {
      var rows = [0, 1, 2, 3].map(function (i) {
        var t = $("tf-" + "abcd"[i]).value;
        var sel = document.querySelector('input[name="tf' + i + '"]:checked');
        return { t: t, ans: sel && sel.value === "true" };
      });
      insertQuiz({ q: q, rows: rows }, "tf", 90, 90);
    }
    hideDialog("dlg-quiz");
  };

  // ----- Hộp thoại & toast
  function showDialog(id) { $(id).classList.add("show"); }
  function hideDialog(id) { $(id).classList.remove("show"); }
  document.querySelectorAll("[data-close]").forEach(function (b) { b.onclick = function () { hideDialog(b.dataset.close); }; });
  var toastEl = $("toast"), toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2600); }

  // Trạng thái AI
  fetch("/api/health").then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ai) { $("ai-note").style.display = "inline"; }
  }).catch(function () {});

  // ----- Trang & sổ bài giảng (lưu/mở)
  var pages = [blankPage()], cur = 0, saveTimer = null;
  function blankPage() { return { items: [], geo: { points: [], shapes: [] }, overlays: [] }; }
  function capture() { pages[cur] = { items: state.items, geo: { points: window.VPGeo.points, shapes: window.VPGeo.shapes }, overlays: state.overlays }; }
  function restore() {
    var pg = pages[cur] || blankPage();
    state.items = pg.items; state.overlays = pg.overlays;
    window.VPGeo.points = pg.geo.points; window.VPGeo.shapes = pg.geo.shapes; window.VPGeo.sel = [];
    renderOverlays(); redraw(); updatePageLabel();
  }
  function updatePageLabel() { var el = $("page-label"); if (el) el.textContent = "Trang " + (cur + 1) + "/" + pages.length; }
  function gotoPage(i) { capture(); cur = Math.max(0, Math.min(pages.length - 1, i)); restore(); scheduleSave(); }
  function addPage() { capture(); pages.splice(cur + 1, 0, blankPage()); cur++; restore(); scheduleSave(); }
  function delPage() { if (!confirm("Xóa trang hiện tại?")) return; if (pages.length <= 1) pages[0] = blankPage(); else { pages.splice(cur, 1); if (cur >= pages.length) cur = pages.length - 1; } restore(); scheduleSave(); }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveLocal, 400); }
  function serialize() { capture(); return JSON.stringify({ v: 1, cur: cur, pages: pages }); }
  function saveLocal() { try { localStorage.setItem("vpvie.book", serialize()); } catch (e) {} }
  function loadBook(obj) {
    if (!obj || !obj.pages || !obj.pages.length) return;
    pages = obj.pages.map(function (pg) { return { items: pg.items || [], geo: { points: (pg.geo && pg.geo.points) || [], shapes: (pg.geo && pg.geo.shapes) || [] }, overlays: pg.overlays || [] }; });
    cur = Math.min(obj.cur || 0, pages.length - 1); restore();
  }
  function loadLocal() { try { var s = localStorage.getItem("vpvie.book"); if (s) loadBook(JSON.parse(s)); } catch (e) {} }
  function downloadBook() { var b = new Blob([serialize()], { type: "application/json" }); var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "so-bai-giang.vpvie.json"; a.click(); }
  function openBookFile() {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { try { loadBook(JSON.parse(rd.result)); scheduleSave(); toast("Đã mở sổ bài giảng."); } catch (e) { toast("Tệp không hợp lệ."); } }; rd.readAsText(f); };
    inp.click();
  }
  $("page-prev").onclick = function () { gotoPage(cur - 1); };
  $("page-next").onclick = function () { gotoPage(cur + 1); };
  $("page-add").onclick = addPage;
  $("page-del").onclick = delPage;
  $("book-save").onclick = downloadBook;
  $("book-open").onclick = openBookFile;

  resize();
  loadLocal();
  updatePageLabel();
  // expose cho kiểm thử
  window.__vp = { state: state, insertMath: insertMath, insertPlot: insertPlot, redraw: redraw, resize: resize, gotoPage: gotoPage, addPage: addPage, pages: function () { return pages; }, cur: function () { return cur; } };
})();
