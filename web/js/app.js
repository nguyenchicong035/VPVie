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
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // ----- Vẽ
  function drawItem(it) {
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = it.color || state.color;
    ctx.lineWidth = it.size || state.size;
    ctx.beginPath();
    if (it.type === "stroke") {
      var p = it.points;
      if (p.length) { ctx.moveTo(p[0].x, p[0].y); for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); }
      ctx.stroke();
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
    }
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < state.items.length; i++) drawItem(state.items[i]);
    if (state.cur) drawItem(state.cur);
    if (window.VPGeo) window.VPGeo.render(ctx, canvas.clientWidth, canvas.clientHeight);
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
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("pointerleave", function (e) { if (state.drawing && state.tool !== "eraser") endStroke(); });

  // ----- Lớp phủ: công thức & đồ thị (DOM, kéo được)
  function addOverlay(kind, x, y, build) {
    var el = document.createElement("div");
    el.className = "ov ov-" + kind;
    el.style.left = (x || 60) + "px";
    el.style.top = (y || 60) + "px";
    var body = document.createElement("div");
    body.className = "ov-body";
    el.appendChild(body);
    var del = document.createElement("button");
    del.className = "ov-del"; del.textContent = "✕"; del.title = "Xóa";
    del.onclick = function () { overlay.removeChild(el); };
    el.appendChild(del);
    build(body);
    makeDraggable(el);
    overlay.appendChild(el);
    return el;
  }
  function makeDraggable(el) {
    var sx, sy, ox, oy, moving = false;
    el.addEventListener("pointerdown", function (e) {
      if (e.target.classList.contains("ov-del")) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      moving = true; sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.style.left); oy = parseFloat(el.style.top);
      el.setPointerCapture(e.pointerId); el.classList.add("dragging");
    });
    el.addEventListener("pointermove", function (e) {
      if (!moving) return;
      el.style.left = (ox + e.clientX - sx) + "px";
      el.style.top = (oy + e.clientY - sy) + "px";
    });
    el.addEventListener("pointerup", function () { moving = false; el.classList.remove("dragging"); });
  }

  function insertMath(latex, x, y) {
    if (!latex) return;
    addOverlay("math", x, y, function (body) {
      window.VPMathPlot.renderMath(body, latex, true);
      body.dataset.latex = latex;
    });
  }
  function insertText(text, x, y) {
    if (!text) return;
    addOverlay("text", x, y, function (body) { body.textContent = text; });
  }
  function insertPlot(expr, x, y) {
    if (!expr) return;
    addOverlay("plot", x, y, function (body) { window.VPCalc.buildGraph(body, expr); });
  }
  function insertCalc(x, y) {
    addOverlay("calc", x, y, function (body) { window.VPSci.build(body); });
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
  $("size").oninput = function () { state.size = parseInt(this.value, 10); };
  var bt = $("beautify");
  bt.onclick = function () { state.beautify = !state.beautify; bt.classList.toggle("on", state.beautify); bt.textContent = state.beautify ? "✨ Làm đẹp nét: BẬT" : "✨ Làm đẹp nét: TẮT"; };
  $("undo").onclick = function () { state.items.pop(); redraw(); };
  $("clear").onclick = function () { if (confirm("Xóa toàn bộ bảng?")) { state.items = []; overlay.innerHTML = ""; if (window.VPGeo) window.VPGeo.clear(); redraw(); } };
  $("btn-calc").onclick = function () { insertCalc(100, 90); };
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
      var engine = $("ai-engine").value, data;
      if (engine === "tesseract") {
        statusEl.textContent = "Đang tải mô hình…";
        data = await window.VPRecognize.recognizeTesseract(canvas, function (st) { statusEl.textContent = st; });
      } else {
        data = await window.VPRecognize.recognizeServer(canvas.toDataURL("image/png"), $("ai-mode").value);
      }
      statusEl.textContent = "";
      if ((data.kind === "math" || data.kind === "mixed") && data.latex) {
        $("math-input").value = data.latex;
        window.VPMathPlot.renderMath($("math-preview"), data.latex, true);
        showDialog("dlg-math");             // mở ra để sửa LaTeX rồi chèn
      }
      if (data.text) insertText(data.text, 100, 100);
      if (!data.latex && !data.text) toast("Không nhận ra nội dung. Hãy viết rõ hơn.");
      else toast("Đã nhận dạng xong.");
    } catch (e) {
      statusEl.textContent = "";
      toast(e.message || "Lỗi nhận dạng.");
    } finally { btn.disabled = false; btn.textContent = old; }
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

  resize();
  // expose cho kiểm thử
  window.__vp = { state: state, insertMath: insertMath, insertPlot: insertPlot, redraw: redraw, resize: resize };
})();
