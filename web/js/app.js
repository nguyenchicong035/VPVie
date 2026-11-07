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
    pen: "ball",      // ball | brush | pencil | hl (dạ quang)
    // Cài đặt trang giấy + hình vẽ (toàn cục, không theo trang)
    paper: { style: "lined", bg: "#FFFFFF", lineColor: "#9CC2F0", spacing: 34, thickness: 1, orient: "portrait", titlebox: true, margin: true, pagebreak: true },
    opt: { showdots: true, autolabel: false, snap: false, lblsize: 16, lblcolor: "#111111", dotsize: 4, subject: "toan", cursor: "pen", cursize: "s", touch: "auto", autosave: true, penlead: true, scratchrase: false },
  };

  // ----- Vẽ nền giấy (kẻ dòng / ô vuông / chấm / trơn) – vẽ trước mọi nét
  var _imgCache = {};
  function getImg(url) { if (_imgCache[url]) return _imgCache[url]; var im = new Image(); im.onload = function () { redraw(); }; im.src = url; _imgCache[url] = im; return im; }
  function drawPaper() {
    var w = canvas.clientWidth, h = canvas.clientHeight, p = state.paper;
    ctx.save();
    ctx.fillStyle = p.bg || "#FFFFFF"; ctx.fillRect(0, 0, w, h);
    // Nền là ảnh/đề PDF: vẽ đè, viết lên trên
    if (state.pageBg) {
      var im = getImg(state.pageBg);
      if (im.complete && im.naturalWidth) { var sc = w / im.naturalWidth; ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, w, im.naturalHeight * sc); }
      if (p.pagebreak) { ctx.fillStyle = "#B7C2CC"; ctx.font = "12px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText("— Trang " + (cur + 1) + " —", w / 2, h - 10); ctx.textAlign = "left"; }
      ctx.restore(); return;
    }
    var sp = Math.max(8, p.spacing || 34), lc = p.lineColor || "#CBD8E8", x, y;
    ctx.strokeStyle = lc; ctx.lineWidth = p.thickness || 1;
    if (p.style === "lined") {
      ctx.beginPath();
      for (y = sp; y < h; y += sp) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
    } else if (p.style === "grid") {
      ctx.beginPath();
      for (y = sp; y < h; y += sp) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      for (x = sp; x < w; x += sp) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      ctx.stroke();
    } else if (p.style === "dot") {
      ctx.fillStyle = lc;
      for (y = sp; y < h; y += sp) for (x = sp; x < w; x += sp) { ctx.beginPath(); ctx.arc(x, y, (p.thickness || 1) + 0.6, 0, 6.2832); ctx.fill(); }
    }
    // Đường lề dọc (màu đỏ, kiểu vở)
    if (p.margin) { ctx.strokeStyle = "#E8A6B2"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(52.5, 0); ctx.lineTo(52.5, h); ctx.stroke(); }
    // Ô tiêu đề ở trang đầu
    if (p.titlebox && cur === 0) {
      ctx.setLineDash([6, 4]); ctx.strokeStyle = "#9DB6D6"; ctx.lineWidth = 1.2;
      ctx.strokeRect(66, 14, w - 132, 58); ctx.setLineDash([]);
      ctx.fillStyle = "#9AA7B4"; ctx.font = "13px 'Segoe UI'"; ctx.fillText("Tiêu đề", 76, 32);
    }
    // Số trang
    if (p.pagebreak) { ctx.fillStyle = "#B7C2CC"; ctx.font = "12px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText("— Trang " + (cur + 1) + " —", w / 2, h - 10); ctx.textAlign = "left"; }
    ctx.restore();
  }

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
      var p = it.points, base = it.size || state.size, pen = it.pen || "ball";
      ctx.save();
      if (pen === "hl") { ctx.globalAlpha = 0.38; ctx.lineCap = "butt"; base = Math.max(base * 3.2, 16); }
      else if (pen === "pencil") { ctx.globalAlpha = 0.72; }
      if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0].x, p[0].y, base / 2, 0, 6.2832); ctx.fillStyle = it.color; ctx.fill(); ctx.restore(); return; }
      for (var i = 1; i < p.length; i++) {
        var pr = p[i].pr != null ? p[i].pr : 0.5;
        // bút bi: đều nét; bút dạ: biến thiên theo lực; bút chì: hơi mảnh; dạ quang: đều & dày
        var lw = pen === "brush" ? base * (0.55 + pr * 0.9) : (pen === "pencil" ? base * 0.85 : base);
        ctx.beginPath(); ctx.lineWidth = lw;
        ctx.moveTo(p[i - 1].x, p[i - 1].y); ctx.lineTo(p[i].x, p[i].y); ctx.stroke();
      }
      ctx.restore();
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
    } else if (it.type === "poly") {
      var pp = it.pts; ctx.moveTo(pp[0].x, pp[0].y); for (var k = 1; k < pp.length; k++) ctx.lineTo(pp[k].x, pp[k].y); ctx.closePath(); ctx.stroke();
    } else if (it.type === "path") {
      var pa = it.pts; ctx.moveTo(pa[0].x, pa[0].y); for (var k2 = 1; k2 < pa.length; k2++) ctx.lineTo(pa[k2].x, pa[k2].y); ctx.stroke();
    } else if (it.type === "arrow") {
      drawArrow(it);
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

  // Vẽ mũi tên / đoạn đo / ngoặc
  function arrowHead(x, y, ang, s) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s * Math.cos(ang - 0.4), y - s * Math.sin(ang - 0.4)); ctx.lineTo(x - s * Math.cos(ang + 0.4), y - s * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill(); }
  function drawArrow(it) {
    var x1 = it.x1, y1 = it.y1, x2 = it.x2, y2 = it.y2, w = it.size || 2, st = it.style || "arrow";
    ctx.save(); ctx.strokeStyle = it.color || state.color; ctx.fillStyle = it.color || state.color; ctx.lineWidth = w; ctx.lineCap = "round";
    var ang = Math.atan2(y2 - y1, x2 - x1), hs = 8 + w * 1.6, L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
    if (st === "dash") ctx.setLineDash([8, 6]);
    if (st === "brace") {
      var o = 12, mx = (x1 + x2) / 2 + nx * o, my = (y1 + y2) / 2 + ny * o;
      ctx.beginPath(); ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(x1 + nx * o, y1 + ny * o, mx - (x2 - x1) / L * 6, my - (y2 - y1) / L * 6);
      ctx.lineTo(mx, my); ctx.lineTo(mx + (x2 - x1) / L * 6, my + (y2 - y1) / L * 6);
      ctx.quadraticCurveTo(x2 + nx * o, y2 + ny * o, x2, y2); ctx.stroke(); ctx.restore(); return;
    }
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    if (st === "dim") { // đoạn đo: vạch vuông góc 2 đầu
      ctx.beginPath(); ctx.moveTo(x1 + nx * 6, y1 + ny * 6); ctx.lineTo(x1 - nx * 6, y1 - ny * 6); ctx.moveTo(x2 + nx * 6, y2 + ny * 6); ctx.lineTo(x2 - nx * 6, y2 - ny * 6); ctx.stroke(); }
    else { arrowHead(x2, y2, ang, hs); if (st === "darrow") arrowHead(x1, y1, ang + Math.PI, hs); }
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaper();
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
    if (it.type === "line" || it.type === "arrow") return { minx: Math.min(it.x1, it.x2), maxx: Math.max(it.x1, it.x2), miny: Math.min(it.y1, it.y2), maxy: Math.max(it.y1, it.y2) };
    if (it.type === "rect") return { minx: it.x, maxx: it.x + it.w, miny: it.y, maxy: it.y + it.h };
    if (it.type === "circle") return { minx: it.cx - it.r, maxx: it.cx + it.r, miny: it.cy - it.r, maxy: it.cy + it.r };
    if (it.type === "ellipse") return { minx: it.cx - it.rx, maxx: it.cx + it.rx, miny: it.cy - it.ry, maxy: it.cy + it.ry };
    if (it.type === "triangle" || it.type === "poly" || it.type === "path") { var xs = it.pts.map(function (p) { return p.x; }), ys = it.pts.map(function (p) { return p.y; }); return { minx: Math.min.apply(0, xs), maxx: Math.max.apply(0, xs), miny: Math.min.apply(0, ys), maxy: Math.max.apply(0, ys) }; }
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
    if (state.tool === "pan") return;   // công cụ di chuyển: không vẽ
    canvas.setPointerCapture(e.pointerId);
    if (state.tool === "eraser") { state.drawing = true; eraseAt(pt); return; }
    if (state.tool === "arrow") { state.drawing = true; state.cur = { type: "arrow", x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, style: state.arrowStyle || "arrow", color: state.color, size: state.size }; return; }
    state.drawing = true;
    state.cur = { type: "stroke", points: [pt], color: state.color, size: state.size, pen: state.pen };
  });
  canvas.addEventListener("pointermove", function (e) {
    if (state.tool === "geo") { if (state.geoDown && window.VPGeo.onMove(pos(e))) redraw(); return; }
    if (!state.drawing) return;
    var pt = pos(e);
    if (state.tool === "eraser") { eraseAt(pt); return; }
    if (state.tool === "arrow") { state.cur.x2 = pt.x; state.cur.y2 = pt.y; redraw(); return; }
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
    redoStack = [];
    if (s.type === "arrow") { if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 6) state.items.push(s); redraw(); return; }
    if (state.beautify && window.VPBeautify && s.pen !== "hl") {
      var shp = window.VPBeautify.beautify(s.points);
      if (shp) { shp.color = s.color; shp.size = s.size; state.items.push(shp); redraw(); return; }
    }
    state.items.push(s); redraw();
  }
  var redoStack = [];
  canvas.addEventListener("pointerup", function (e) { if (e.pointerType === "pen") { state.penDown = false; state.lastPen = Date.now(); } endStroke(); });
  canvas.addEventListener("pointercancel", function (e) { if (e.pointerType === "pen") { state.penDown = false; state.lastPen = Date.now(); } endStroke(); });
  canvas.addEventListener("pointerleave", function (e) { if (state.drawing && state.tool !== "eraser") endStroke(); });

  // ----- Lớp phủ dạng DỮ LIỆU (lưu/mở theo trang được)
  function overlayBody(kind, body, data) {
    if (kind === "math") {
      if (data.mode === "text") body.textContent = data.latex || "";
      else window.VPMathPlot.renderMath(body, data.latex, data.display !== false);
      if (data.color) body.style.color = data.color;
      if (data.size) body.style.fontSize = data.size + "px";
    }
    else if (kind === "text") { body.textContent = data.text; if (data.font) body.style.fontFamily = data.font; if (data.size) body.style.fontSize = data.size + "px"; }
    else if (kind === "plot") window.VPCalc.buildGraph(body, data.expr);
    else if (kind === "calc") window.VPSci.build(body);
    else if (kind === "quiz") data.sub === "tf" ? window.VPQuiz.buildTF(body, data) : window.VPQuiz.buildMCQ(body, data);
    else if (kind === "var") window.VPVar.build(body, data);
    else if (kind === "timer") window.VPClass.buildTimer(body, data);
    else if (kind === "picker") window.VPClass.buildPicker(body, data);
    else if (kind === "ptable") window.VPScience.buildPTable(body);
    else if (kind === "chem") window.VPScience.buildChem(body);
    else if (kind === "circuit" || kind === "force" || kind === "pedigree" || kind === "dna") { data._save = scheduleSave; window.VPDiagram.build(body, kind, data); }
    else if (kind === "table") {
      var tb = document.createElement("table"); tb.className = "ov-table";
      data.cells = data.cells || [];
      for (var ri = 0; ri < data.rows; ri++) {
        var tr = document.createElement("tr");
        for (var ci = 0; ci < data.cols; ci++) {
          var td = document.createElement("td"); td.contentEditable = "true";
          data.cells[ri] = data.cells[ri] || [];
          td.textContent = data.cells[ri][ci] || "";
          (function (rr, cc, cell) { cell.addEventListener("input", function () { data.cells[rr] = data.cells[rr] || []; data.cells[rr][cc] = cell.textContent; scheduleSave(); }); })(ri, ci, td);
          tr.appendChild(td);
        }
        tb.appendChild(tr);
      }
      body.appendChild(tb);
    }
    else if (kind === "web") {
      var fr = document.createElement("iframe"); fr.className = "ov-web"; fr.src = data.url; fr.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
      var cap = document.createElement("div"); cap.className = "ov-webcap"; cap.textContent = data.url;
      body.appendChild(cap); body.appendChild(fr);
    }
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

  function insertMath(latex, x, y, opts) { if (latex) addOverlayData("math", Object.assign({ latex: latex }, opts || {}), x, y); }
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
      if (b.dataset.pen) state.pen = b.dataset.pen;
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
  // Cỡ nét (3 chấm)
  document.querySelectorAll("[data-sizedot]").forEach(function (b) {
    b.onclick = function () {
      state.size = parseInt(b.dataset.sizedot, 10);
      document.querySelectorAll("[data-sizedot]").forEach(function (x) { x.classList.remove("sel"); });
      b.classList.add("sel");
    };
  });
  // Bút dạ quang (highlighter)
  document.querySelectorAll("[data-hl]").forEach(function (b) {
    b.onclick = function () {
      state.tool = "pen"; state.pen = "hl"; state.color = b.dataset.hl;
      if (window.VPGeo) window.VPGeo.setTool(null);
      clearActive();
      document.querySelectorAll("[data-hl]").forEach(function (x) { x.classList.remove("sel"); });
      b.classList.add("sel");
    };
  });
  var bt = $("beautify");
  bt.onclick = function () { state.beautify = !state.beautify; bt.classList.toggle("on", state.beautify); bt.title = state.beautify ? "Làm đẹp nét: BẬT" : "Làm đẹp nét: TẮT"; toast(state.beautify ? "Làm đẹp nét: BẬT" : "Làm đẹp nét: TẮT"); };
  $("undo").onclick = function () { if (state.items.length) redoStack.push(state.items.pop()); redraw(); };
  if ($("redo")) $("redo").onclick = function () { if (redoStack.length) { state.items.push(redoStack.pop()); redraw(); } };
  $("clear").onclick = function () { if (confirm("Xóa toàn bộ trang?")) { state.items = []; state.overlays = []; overlay.innerHTML = ""; if (window.VPGeo) window.VPGeo.clear(); redraw(); scheduleSave(); } };
  if ($("btn-calc")) $("btn-calc").onclick = function () { insertCalc(100, 90); };
  $("btn-note").onclick = function () { insertNote(130, 100); };
  // Công cụ môn học (Lý/Hoá/Sinh) qua nút ★
  if ($("btn-shapes-fav")) $("btn-shapes-fav").onclick = function () { showDialog("dlg-sci"); };
  document.querySelectorAll("[data-sci]").forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.sci;
      if (k === "ptable") addOverlayData("ptable", {}, 70, 90);
      else if (k === "chem") addOverlayData("chem", {}, 120, 110);
      else if (k === "circuit") addOverlayData("circuit", {}, 120, 110);
      else if (k === "force") addOverlayData("force", {}, 140, 110);
      else if (k === "pedigree") addOverlayData("pedigree", {}, 140, 110);
      else if (k === "dna") addOverlayData("dna", {}, 160, 110);
      else toast("Công cụ này đang được phát triển.");
      hideDialog("dlg-sci");
    };
  });
  // Mũi tên / đoạn đo / ngoặc – nút có menu chọn kiểu
  function activateArrow(style) {
    state.tool = "arrow"; state.arrowStyle = style || state.arrowStyle || "arrow";
    if (window.VPGeo) window.VPGeo.setTool(null);
    clearActive(); $("btn-arrow").classList.add("active");
  }
  if ($("btn-arrow")) $("btn-arrow").onclick = function (e) {
    e.stopPropagation();
    var m = $("arrow-menu"), r = this.getBoundingClientRect();
    m.style.left = r.left + "px"; m.style.top = (r.bottom + 4) + "px"; m.classList.toggle("show");
    activateArrow();
  };
  document.querySelectorAll("#arrow-menu button").forEach(function (b) {
    b.onclick = function (e) { e.stopPropagation(); activateArrow(b.dataset.arrow); $("arrow-menu").classList.remove("show"); toast("Công cụ: " + b.textContent.trim()); };
  });
  document.addEventListener("click", function () { var m = $("arrow-menu"); if (m) m.classList.remove("show"); });
  // Thước kẻ / đo góc
  if ($("btn-ruler")) $("btn-ruler").onclick = function () { var on = window.VPRuler.toggle(board); this.classList.toggle("active", on); };
  // Hiện/ẩn danh sách trang
  if ($("btn-sidebar")) $("btn-sidebar").onclick = function () { var s = $("nr-side"); s.classList.toggle("hidden"); this.classList.toggle("active", !s.classList.contains("hidden")); };
  if ($("btn-menu")) $("btn-menu").onclick = function () { var s = $("nr-side"); s.classList.toggle("hidden"); };
  if ($("btn-library")) $("btn-library").onclick = function () { openBookFile(); };
  // Chèn bảng
  if ($("btn-table")) $("btn-table").onclick = function () {
    var r = parseInt(prompt("Số hàng:", "3"), 10), c = parseInt(prompt("Số cột:", "3"), 10);
    if (!r || !c) return; addOverlayData("table", { rows: r, cols: c, cells: [] }, 120, 110);
  };
  // Khung văn bản / chữ
  function askText() { var t = prompt("Nhập nội dung chữ:", ""); if (t) insertText(t, 140, 120, { font: $("text-font") ? $("text-font").value : "", size: 22 }); }
  if ($("btn-textbox")) $("btn-textbox").onclick = askText;
  if ($("btn-text")) $("btn-text").onclick = askText;
  // Trình duyệt web nhúng
  if ($("btn-web")) $("btn-web").onclick = function () { var u = prompt("Địa chỉ trang web:", "https://"); if (u && u !== "https://") addOverlayData("web", { url: u }, 120, 110); };
  // Tô màu miền / Chọn vùng (đang phát triển)
  if ($("btn-fill")) $("btn-fill").onclick = function () { toast("Công cụ tô màu miền đang phát triển."); };
  if ($("btn-select")) $("btn-select").onclick = function () { toast("Công cụ chọn vùng đang phát triển."); };
  // Quay màn hình
  if ($("btn-record")) $("btn-record").onclick = toggleRecord;
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

  // Hộp thoại công thức đầy đủ (VPFormula)
  var formulaBuilt = false;
  function buildFormulaUI() {
    if (formulaBuilt) return; formulaBuilt = true;
    window.VPFormula.build({ cats: $("f-cats"), grid: $("f-grid"), quick: $("f-quick"), search: $("f-search"), input: $("math-input"), preview: $("math-preview") });
    // Màu
    document.querySelectorAll("#f-colors .fcs").forEach(function (b) {
      b.onclick = function () { window.VPFormula.setColor(b.dataset.fc); if ($("f-color-wheel")) $("f-color-wheel").value = b.dataset.fc; document.querySelectorAll("#f-colors .fcs").forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); window.VPFormula.render($("math-preview"), $("math-input").value); };
    });
    if ($("f-color-wheel")) $("f-color-wheel").oninput = function () { window.VPFormula.setColor(this.value); document.querySelectorAll("#f-colors .fcs").forEach(function (x) { x.classList.remove("sel"); }); window.VPFormula.render($("math-preview"), $("math-input").value); };
    // Cỡ
    $("f-size").oninput = function () { window.VPFormula.setSize(parseInt(this.value, 10)); $("f-size-val").textContent = this.value; };
    // Display
    $("f-display").onchange = function () { window.VPFormula.setDisplay(this.checked); window.VPFormula.render($("math-preview"), $("math-input").value); };
    // Toán / Văn bản
    $("f-math").onclick = function () { window.VPFormula.setMode("math"); this.classList.add("sel"); $("f-text").classList.remove("sel"); window.VPFormula.render($("math-preview"), $("math-input").value); };
    $("f-text").onclick = function () { window.VPFormula.setMode("text"); this.classList.add("sel"); $("f-math").classList.remove("sel"); window.VPFormula.render($("math-preview"), $("math-input").value); };
  }
  $("btn-math").onclick = function () { showDialog("dlg-math"); buildFormulaUI(); $("math-input").focus(); };
  $("math-ok").onclick = function () {
    var st = window.VPFormula.state;
    insertMath($("math-input").value, 90, 90, { color: st.color, size: st.size, display: st.display, mode: st.mode });
    $("math-input").value = ""; window.VPFormula.render($("math-preview"), ""); hideDialog("dlg-math");
  };

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
  function regPoly(cx, cy, r, n, rot) { var a = []; for (var i = 0; i < n; i++) { var t = rot + i * 2 * Math.PI / n; a.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) }); } return a; }
  function addShapeTemplate(kind) {
    var cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2, s = 90, c = state.color, w = state.size;
    function push(o) { o.color = c; o.size = w; state.items.push(o); }
    if (kind === "triangle") push({ type: "triangle", pts: [{ x: cx, y: cy - s }, { x: cx - s, y: cy + s }, { x: cx + s, y: cy + s }] });
    else if (kind === "triangle-eq") { var h = s * Math.sqrt(3); push({ type: "triangle", pts: [{ x: cx, y: cy - h / 2 }, { x: cx - s, y: cy + h / 2 }, { x: cx + s, y: cy + h / 2 }] }); }
    else if (kind === "right-tri") push({ type: "triangle", pts: [{ x: cx - s, y: cy - s }, { x: cx - s, y: cy + s }, { x: cx + s, y: cy + s }] });
    else if (kind === "square") push({ type: "rect", x: cx - s, y: cy - s, w: 2 * s, h: 2 * s });
    else if (kind === "rect") push({ type: "rect", x: cx - s, y: cy - s * 0.7, w: 2 * s, h: 1.4 * s });
    else if (kind === "para") push({ type: "poly", pts: [{ x: cx - s + 30, y: cy - s * 0.6 }, { x: cx + s + 30, y: cy - s * 0.6 }, { x: cx + s - 30, y: cy + s * 0.6 }, { x: cx - s - 30, y: cy + s * 0.6 }] });
    else if (kind === "rhombus") push({ type: "poly", pts: [{ x: cx, y: cy - s }, { x: cx + s * 0.7, y: cy }, { x: cx, y: cy + s }, { x: cx - s * 0.7, y: cy }] });
    else if (kind === "trapezoid") push({ type: "poly", pts: [{ x: cx - s * 0.55, y: cy - s * 0.6 }, { x: cx + s * 0.55, y: cy - s * 0.6 }, { x: cx + s, y: cy + s * 0.6 }, { x: cx - s, y: cy + s * 0.6 }] });
    else if (kind === "pentagon") push({ type: "poly", pts: regPoly(cx, cy, s, 5, -Math.PI / 2) });
    else if (kind === "hexagon") push({ type: "poly", pts: regPoly(cx, cy, s, 6, -Math.PI / 2) });
    else if (kind === "circle") push({ type: "circle", cx: cx, cy: cy, r: s });
    else if (kind === "ellipse") push({ type: "ellipse", cx: cx, cy: cy, rx: s * 1.3, ry: s * 0.75 });
    else if (kind === "parabola") { var pts = []; for (var x = -s * 1.4; x <= s * 1.4; x += 6) pts.push({ x: cx + x, y: cy + s - (x * x) / (s * 1.0) }); push({ type: "path", pts: pts }); }
    else if (kind === "axes") { push({ type: "line", x1: cx - 180, y1: cy, x2: cx + 180, y2: cy }); push({ type: "line", x1: cx, y1: cy - 140, x2: cx, y2: cy + 140 }); }
    redraw();
  }

  // Nhận dạng (Tesseract miễn phí hoặc máy chủ Ollama/Claude). Kết quả công thức mở ra để sửa trước khi chèn.
  $("btn-ai").onclick = async function () {
    var btn = this; var old = btn.textContent; var statusEl = $("ai-status");
    btn.disabled = true; btn.textContent = "Đang nhận dạng…";
    try {
      var engine = $("ai-engine").value, mode = $("ai-mode").value, data, src = cropForOCR();
      if (engine === "tesseract") {
        statusEl.textContent = "Đang tải mô hình…";
        data = await window.VPRecognize.recognizeTesseract(src, function (st) { statusEl.textContent = st; }, { math: mode === "math", psm: mode === "text" ? "6" : "6" });
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
      else if (data.confidence != null && data.confidence < 55) toast("Đã nhận dạng (độ tin cậy " + data.confidence + "%). Viết to & rõ hơn để chính xác hơn.");
      else toast("Đã chuyển chữ viết tay thành chữ đánh máy." + (data.confidence != null ? " (tin cậy " + data.confidence + "%)" : ""));
    } catch (e) {
      statusEl.textContent = "";
      toast(e.message || "Lỗi nhận dạng.");
    } finally { btn.disabled = false; btn.textContent = old; }
  };

  // Câu hỏi
  var qTab = "mcq";
  if ($("btn-quiz")) $("btn-quiz").onclick = function () { showDialog("dlg-quiz"); };
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
  function blankPage() { return { items: [], geo: { points: [], shapes: [] }, overlays: [], bg: null }; }
  function capture() { pages[cur] = { items: state.items, geo: { points: window.VPGeo.points, shapes: window.VPGeo.shapes }, overlays: state.overlays, bg: pages[cur] ? pages[cur].bg : null, thumb: pages[cur] ? pages[cur].thumb : null }; }
  function restore() {
    var pg = pages[cur] || blankPage();
    state.items = pg.items; state.overlays = pg.overlays; state.pageBg = pg.bg || null;
    window.VPGeo.points = pg.geo.points; window.VPGeo.shapes = pg.geo.shapes; window.VPGeo.sel = [];
    renderOverlays(); redraw(); updatePageLabel();
  }
  function updatePageLabel() { var el = $("page-label"); if (el) el.textContent = (cur + 1) + " / " + pages.length; }
  function snapshotThumb() { try { var sm = document.createElement("canvas"); sm.width = 130; sm.height = Math.round(130 * canvas.clientHeight / canvas.clientWidth); sm.getContext("2d").drawImage(canvas, 0, 0, sm.width, sm.height); pages[cur].thumb = sm.toDataURL("image/jpeg", 0.5); } catch (e) {} }
  function makeThumbs() {
    var host = $("thumbs"); if (!host) return; host.innerHTML = "";
    pages.forEach(function (pg, i) {
      var d = document.createElement("div"); d.className = "thumb" + (i === cur ? " sel" : "");
      if (pg.thumb) { var im = document.createElement("img"); im.src = pg.thumb; d.appendChild(im); } else { d.style.height = "92px"; d.style.background = "repeating-linear-gradient(#fff 0 10px,#eef2f6 10px 11px)"; }
      var n = document.createElement("div"); n.className = "tn-num"; n.textContent = (i + 1); d.appendChild(n);
      d.onclick = function () { gotoPage(i); };
      host.appendChild(d);
    });
  }
  function gotoPage(i) { capture(); snapshotThumb(); cur = Math.max(0, Math.min(pages.length - 1, i)); restore(); makeThumbs(); scheduleSave(); }
  function addPage() { capture(); snapshotThumb(); pages.splice(cur + 1, 0, blankPage()); cur++; restore(); makeThumbs(); scheduleSave(); }
  function delPage() { if (!confirm("Xóa trang hiện tại?")) return; if (pages.length <= 1) pages[0] = blankPage(); else { pages.splice(cur, 1); if (cur >= pages.length) cur = pages.length - 1; } restore(); makeThumbs(); scheduleSave(); }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveLocal, 400); }
  function serialize() { capture(); return JSON.stringify({ v: 1, cur: cur, pages: pages }); }
  function saveLocal() { if (state.opt && state.opt.autosave === false) return; snapshotThumb(); try { localStorage.setItem("vpvie.book", serialize()); } catch (e) {} if ($("thumbs") && $("thumbs").children[cur]) { var im = $("thumbs").children[cur].querySelector("img"); if (im && pages[cur].thumb) im.src = pages[cur].thumb; } }
  function loadBook(obj) {
    if (!obj || !obj.pages || !obj.pages.length) return;
    pages = obj.pages.map(function (pg) { return { items: pg.items || [], geo: { points: (pg.geo && pg.geo.points) || [], shapes: (pg.geo && pg.geo.shapes) || [] }, overlays: pg.overlays || [], thumb: pg.thumb, bg: pg.bg || null }; });
    cur = Math.min(obj.cur || 0, pages.length - 1); restore(); makeThumbs();
  }
  function loadLocal() { try { var s = localStorage.getItem("vpvie.book"); if (s) loadBook(JSON.parse(s)); } catch (e) {} }
  function downloadBook() { var b = new Blob([serialize()], { type: "application/json" }); var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "so-bai-giang.vpvie.json"; a.click(); }
  function openBookFile() {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { try { loadBook(JSON.parse(rd.result)); scheduleSave(); toast("Đã mở sổ bài giảng."); } catch (e) { toast("Tệp không hợp lệ."); } }; rd.readAsText(f); };
    inp.click();
  }
  if ($("page-prev")) $("page-prev").onclick = function () { gotoPage(cur - 1); };
  if ($("page-next")) $("page-next").onclick = function () { gotoPage(cur + 1); };
  if ($("page-add")) $("page-add").onclick = addPage;
  if ($("sheet-add")) $("sheet-add").onclick = addPage;
  if ($("page-del")) $("page-del").onclick = delPage;
  if ($("book-save")) $("book-save").onclick = downloadBook;
  if ($("book-open")) $("book-open").onclick = openBookFile;
  function movePage(d) { var j = cur + d; if (j < 0 || j >= pages.length) return; capture(); snapshotThumb(); var tmp = pages[cur]; pages[cur] = pages[j]; pages[j] = tmp; cur = j; restore(); makeThumbs(); scheduleSave(); }
  if ($("th-up")) $("th-up").onclick = function () { movePage(-1); };
  if ($("th-down")) $("th-down").onclick = function () { movePage(1); };

  // ----- Cài đặt – lưu riêng, áp dụng toàn cục
  function loadSettings() {
    try { var s = JSON.parse(localStorage.getItem("vpvie.settings") || "null"); if (s) { if (s.paper) state.paper = Object.assign(state.paper, s.paper); if (s.opt) state.opt = Object.assign(state.opt, s.opt); } } catch (e) {}
    applyCursor();
  }
  function saveSettings() { try { localStorage.setItem("vpvie.settings", JSON.stringify({ paper: state.paper, opt: state.opt })); } catch (e) {} }
  function applyCursor() {
    var c = state.opt.cursor, m = { pen: "crosshair", hand: "grab", "default": "default", dot: "crosshair" };
    canvas.style.cursor = m[c] || "crosshair";
  }
  function selGroup(attr, val) { document.querySelectorAll("[data-" + attr + "]").forEach(function (b) { b.classList.toggle("sel", b.dataset[attr] === val); }); }
  function syncSettingsUI() {
    var p = state.paper, o = state.opt;
    selGroup("paper", p.style); selGroup("orient", p.orient);
    selGroup("subj", o.subject); selGroup("cursor", o.cursor); selGroup("cursize", o.cursize); selGroup("touch", o.touch);
    if ($("set-size")) $("set-size").value = p.size || "a4";
    if ($("set-bg")) $("set-bg").value = p.bg;
    if ($("set-line")) $("set-line").value = p.lineColor;
    if ($("set-space")) { $("set-space").value = p.spacing; $("set-space-val").textContent = p.spacing; }
    if ($("set-thick")) $("set-thick").value = p.thickness;
    if ($("set-lblsize")) { $("set-lblsize").value = o.lblsize; $("set-lblsize-val").textContent = o.lblsize; }
    if ($("set-dotsize")) { $("set-dotsize").value = o.dotsize; $("set-dotsize-val").textContent = o.dotsize; }
    [["set-titlebox", p.titlebox], ["set-margin", p.margin], ["set-infinite", p.infinite], ["set-pagebreak", p.pagebreak],
     ["set-autolabel", o.autolabel], ["set-snap", o.snap], ["set-showdots", o.showdots], ["set-autosave", o.autosave], ["set-penlead", o.penlead], ["set-scratchrase", o.scratchrase]].forEach(function (kv) { if ($(kv[0])) $(kv[0]).checked = !!kv[1]; });
    document.querySelectorAll('[data-swatch="bg"] .cs').forEach(function (b) { b.classList.toggle("sel", b.dataset.c === p.bg); });
    document.querySelectorAll('[data-swatch="line"] .cs').forEach(function (b) { b.classList.toggle("sel", b.dataset.c === p.lineColor); });
    document.querySelectorAll('[data-swatch="lblcolor"] .cs').forEach(function (b) { b.classList.toggle("sel", b.dataset.c === o.lblcolor); });
  }
  if ($("btn-settings")) $("btn-settings").onclick = function () { syncSettingsUI(); showDialog("dlg-settings"); };
  document.querySelectorAll("[data-paper]").forEach(function (b) { b.onclick = function () { state.paper.style = b.dataset.paper; syncSettingsUI(); redraw(); saveSettings(); }; });
  document.querySelectorAll("[data-orient]").forEach(function (b) { b.onclick = function () { state.paper.orient = b.dataset.orient; syncSettingsUI(); saveSettings(); toast("Hướng trang: " + (b.dataset.orient === "portrait" ? "Dọc" : "Ngang")); }; });
  document.querySelectorAll("[data-subj]").forEach(function (b) { b.onclick = function () { state.opt.subject = b.dataset.subj; syncSettingsUI(); saveSettings(); }; });
  document.querySelectorAll("[data-cursor]").forEach(function (b) { b.onclick = function () { state.opt.cursor = b.dataset.cursor; syncSettingsUI(); applyCursor(); saveSettings(); }; });
  document.querySelectorAll("[data-cursize]").forEach(function (b) { b.onclick = function () { state.opt.cursize = b.dataset.cursize; syncSettingsUI(); saveSettings(); }; });
  document.querySelectorAll("[data-touch]").forEach(function (b) { b.onclick = function () { state.opt.touch = b.dataset.touch; syncSettingsUI(); saveSettings(); }; });
  document.querySelectorAll('[data-swatch="bg"] .cs').forEach(function (b) { b.onclick = function () { state.paper.bg = b.dataset.c; if ($("set-bg")) $("set-bg").value = b.dataset.c; syncSettingsUI(); redraw(); saveSettings(); }; });
  document.querySelectorAll('[data-swatch="line"] .cs').forEach(function (b) { b.onclick = function () { state.paper.lineColor = b.dataset.c; if ($("set-line")) $("set-line").value = b.dataset.c; syncSettingsUI(); redraw(); saveSettings(); }; });
  document.querySelectorAll('[data-swatch="lblcolor"] .cs').forEach(function (b) { b.onclick = function () { state.opt.lblcolor = b.dataset.c; syncSettingsUI(); saveSettings(); }; });
  if ($("set-bg")) $("set-bg").oninput = function () { state.paper.bg = this.value; syncSettingsUI(); redraw(); saveSettings(); };
  if ($("set-line")) $("set-line").oninput = function () { state.paper.lineColor = this.value; syncSettingsUI(); redraw(); saveSettings(); };
  if ($("set-size")) $("set-size").onchange = function () { state.paper.size = this.value; saveSettings(); };
  if ($("set-space")) $("set-space").oninput = function () { state.paper.spacing = parseInt(this.value, 10); $("set-space-val").textContent = this.value; redraw(); saveSettings(); };
  if ($("set-thick")) $("set-thick").oninput = function () { state.paper.thickness = parseInt(this.value, 10); redraw(); saveSettings(); };
  if ($("set-lblsize")) $("set-lblsize").oninput = function () { state.opt.lblsize = parseInt(this.value, 10); $("set-lblsize-val").textContent = this.value; saveSettings(); };
  if ($("set-dotsize")) $("set-dotsize").oninput = function () { state.opt.dotsize = parseInt(this.value, 10); $("set-dotsize-val").textContent = this.value; saveSettings(); };
  [["set-titlebox", "paper", "titlebox"], ["set-margin", "paper", "margin"], ["set-infinite", "paper", "infinite"], ["set-pagebreak", "paper", "pagebreak"],
   ["set-autolabel", "opt", "autolabel"], ["set-snap", "opt", "snap"], ["set-showdots", "opt", "showdots"], ["set-autosave", "opt", "autosave"], ["set-penlead", "opt", "penlead"], ["set-scratchrase", "opt", "scratchrase"]].forEach(function (kv) {
    if ($(kv[0])) $(kv[0]).onchange = function () { state[kv[1]][kv[2]] = this.checked; redraw(); saveSettings(); };
  });

  // ----- Nhập ảnh / PDF làm nền trang (viết đè lên đề)
  function setPageBg(url) { state.pageBg = url; pages[cur].bg = url; redraw(); scheduleSave(); snapshotThumb(); makeThumbs(); }
  if ($("set-img")) $("set-img").onclick = function () { $("imp-img").click(); };
  if ($("imp-img")) $("imp-img").onchange = function () { var f = this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { setPageBg(rd.result); toast("Đã đặt ảnh làm nền trang."); }; rd.readAsDataURL(f); this.value = ""; hideDialog("dlg-settings"); };
  if ($("set-nobg")) $("set-nobg").onclick = function () { setPageBg(null); toast("Đã bỏ nền trang."); };
  if ($("set-pdf")) $("set-pdf").onclick = function () { $("imp-pdf").click(); };
  if ($("imp-pdf")) $("imp-pdf").onchange = function () {
    var f = this.files[0]; if (!f) return; this.value = ""; hideDialog("dlg-settings");
    if (!window.pdfjsLib) { toast("Chưa tải được pdf.js."); return; }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
    var rd = new FileReader();
    rd.onload = async function () {
      try {
        toast("Đang mở PDF…");
        var doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(rd.result) }).promise;
        for (var i = 1; i <= doc.numPages; i++) {
          var page = await doc.getPage(i), vp = page.getViewport({ scale: 2 });
          var oc = document.createElement("canvas"); oc.width = vp.width; oc.height = vp.height;
          await page.render({ canvasContext: oc.getContext("2d"), viewport: vp }).promise;
          var url = oc.toDataURL("image/jpeg", 0.8);
          if (i === 1) { setPageBg(url); }
          else { capture(); pages.splice(cur + 1, 0, blankPage()); cur++; pages[cur].bg = url; restore(); }
        }
        makeThumbs(); scheduleSave(); toast("Đã nhập " + doc.numPages + " trang PDF. Hãy viết lên đề.");
      } catch (e) { toast("Không mở được PDF."); }
    };
    rd.readAsArrayBuffer(f);
  };

  // ----- Quay màn hình (screen recording) kèm micro
  var mediaRec = null, recChunks = [];
  async function toggleRecord() {
    var btn = $("btn-record");
    if (mediaRec && mediaRec.state !== "inactive") { mediaRec.stop(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { toast("Trình duyệt không hỗ trợ quay màn hình."); return; }
    try {
      var stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      try { var mic = await navigator.mediaDevices.getUserMedia({ audio: true }); mic.getAudioTracks().forEach(function (t) { stream.addTrack(t); }); } catch (e) {}
      recChunks = []; mediaRec = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRec.ondataavailable = function (ev) { if (ev.data.size) recChunks.push(ev.data); };
      mediaRec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(recChunks, { type: "video/webm" }));
        a.download = "bai-giang-" + Date.now() + ".webm"; a.click();
        btn.classList.remove("active"); toast("Đã lưu video bài giảng (.webm).");
      };
      mediaRec.start(); btn.classList.add("active"); toast("Đang quay màn hình… bấm lại để dừng.");
    } catch (e) { toast("Đã hủy quay màn hình."); }
  }

  loadSettings();
  resize();
  loadLocal();
  updatePageLabel();
  makeThumbs();
  // expose cho kiểm thử
  window.__vp = { state: state, insertMath: insertMath, insertPlot: insertPlot, redraw: redraw, resize: resize, gotoPage: gotoPage, addPage: addPage, pages: function () { return pages; }, cur: function () { return cur; } };
})();
