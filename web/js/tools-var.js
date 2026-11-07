// Bảng biến thiên & bảng xét dấu tự động từ hàm số (dùng math.js: đạo hàm, tính giá trị; tìm nghiệm bằng số).
(function (global) {
  "use strict";
  var M = function () { return global.math; };

  function bisect(f, a, b) {
    var fa = f(a), fb = f(b);
    for (var i = 0; i < 60; i++) { var m = (a + b) / 2, fm = f(m); if (fm === 0 || (b - a) < 1e-10) return m; if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else { b = m; } }
    return (a + b) / 2;
  }
  function roots(f, xmin, xmax, steps) {
    var rs = [], prev, px = xmin;
    try { prev = f(xmin); } catch (e) { prev = NaN; }
    for (var i = 1; i <= steps; i++) {
      var x = xmin + (xmax - xmin) * i / steps, v;
      try { v = f(x); } catch (e) { v = NaN; }
      if (isFinite(prev) && isFinite(v)) {
        if ((prev < 0 && v > 0) || (prev > 0 && v < 0)) rs.push(bisect(f, px, x));
        else if (Math.abs(v) < 1e-9) rs.push(x);
      }
      prev = v; px = x;
    }
    rs.sort(function (a, b) { return a - b; });
    var out = []; rs.forEach(function (r) { if (!out.length || Math.abs(r - out[out.length - 1]) > (xmax - xmin) * 1e-3) out.push(r); });
    return out;
  }
  function fmt(v) {
    if (!isFinite(v)) return v > 0 ? "+∞" : "−∞";
    if (Math.abs(v) > 1e4) return v > 0 ? "+∞" : "−∞";
    var r = Math.round(v * 1000) / 1000;
    return (r === 0 ? 0 : r).toString().replace("-", "−");
  }
  function fmtx(v) { var r = Math.round(v * 1000) / 1000; return (r === 0 ? 0 : r).toString().replace("-", "−"); }

  function analyze(expr, xmin, xmax, useDeriv) {
    var math = M();
    var node = math.parse(expr);
    var dnode = useDeriv ? math.derivative(node, "x") : node;
    var g = function (x) { return dnode.evaluate({ x: x }); };
    var f = function (x) { return node.evaluate({ x: x }); };
    var rts = roots(g, xmin, xmax, 3000);
    var pts = [-Infinity].concat(rts).concat([Infinity]);
    var signs = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i] === -Infinity ? rts.length ? rts[0] - 1 : xmin : pts[i];
      var b = pts[i + 1] === Infinity ? (rts.length ? rts[rts.length - 1] + 1 : xmax) : pts[i + 1];
      var mid = (a + b) / 2;
      if (pts[i] === -Infinity) mid = (rts.length ? rts[0] : xmax) - 1;
      if (pts[i + 1] === Infinity) mid = (rts.length ? rts[rts.length - 1] : xmin) + 1;
      var s = 0; try { s = Math.sign(g(mid)); } catch (e) { s = 0; }
      signs.push(s);
    }
    return { f: f, g: g, node: node, dnode: dnode, dstr: dnode.toString(), roots: rts, signs: signs };
  }

  function cell(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function buildTable(body, data, mode) {
    body.innerHTML = "";
    var xmin = data.xmin != null ? data.xmin : -10, xmax = data.xmax != null ? data.xmax : 10;
    var A;
    try { A = analyze(data.expr, xmin, xmax, mode === "bbt"); }
    catch (e) { body.textContent = "Không phân tích được: " + data.expr; return; }
    var cap = cell("div", "ov-cap", mode === "bbt" ? ("Bảng biến thiên của y = " + data.expr) : ("Bảng xét dấu: " + data.expr));
    body.appendChild(cap);
    if (mode === "bbt") { var dc = cell("div", "var-deriv", "y' = " + A.dstr); body.appendChild(dc); }

    var rts = A.roots, signs = A.signs;
    var tbl = cell("table", "vartbl");
    // Dòng x
    var rx = cell("tr"); rx.appendChild(cell("th", null, "x"));
    rx.appendChild(cell("td", "pt", "−∞"));
    rts.forEach(function (r) { rx.appendChild(cell("td", "gap")); rx.appendChild(cell("td", "pt", fmtx(r))); });
    rx.appendChild(cell("td", "gap")); rx.appendChild(cell("td", "pt", "+∞"));
    tbl.appendChild(rx);

    // Dòng dấu (y' với bbt, hoặc biểu thức với xét dấu)
    var label = mode === "bbt" ? "y'" : "dấu";
    var rs = cell("tr"); rs.appendChild(cell("th", null, label));
    rs.appendChild(cell("td", "pt"));
    for (var i = 0; i < signs.length; i++) {
      rs.appendChild(cell("td", "sign", signs[i] > 0 ? "+" : signs[i] < 0 ? "−" : "0"));
      if (i < rts.length) rs.appendChild(cell("td", "pt zero", "0"));
    }
    rs.appendChild(cell("td", "pt"));
    tbl.appendChild(rs);

    if (mode === "bbt") {
      // Dòng y: mũi tên + cực trị
      var ry = cell("tr"); ry.appendChild(cell("th", null, "y"));
      ry.appendChild(cell("td", "pt", signs[0] > 0 ? "−∞" : "+∞"));
      for (var j = 0; j < signs.length; j++) {
        ry.appendChild(cell("td", "arrow", signs[j] > 0 ? "↗" : "↘"));
        if (j < rts.length) {
          var y = A.f(rts[j]); var kind = (signs[j] > 0 && signs[j + 1] < 0) ? "CĐ" : (signs[j] < 0 && signs[j + 1] > 0) ? "CT" : "";
          ry.appendChild(cell("td", "pt ext", fmt(y) + (kind ? '<div class="ext-k">' + kind + "</div>" : "")));
        }
      }
      var last = signs[signs.length - 1];
      ry.appendChild(cell("td", "pt", last > 0 ? "+∞" : "−∞"));
      tbl.appendChild(ry);
    }
    body.appendChild(tbl);
  }

  // ---- Lưới sửa được: tạo từ hàm số, rồi vẽ bảng từ lưới ----
  // grid = { mode, moc: [{x, yp, y, ytype}], signs: ["+"/"−"/""] (giữa các mốc) }
  function gridFromExpr(expr, xmin, xmax, mode) {
    var A = analyze(expr, xmin, xmax, mode === "bbt");
    var rts = A.roots, signs = A.signs.map(function (s) { return s > 0 ? "+" : s < 0 ? "−" : "0"; });
    var moc = [{ x: "-inf", yp: "", y: "", ytype: "value" }];
    rts.forEach(function (r) { moc.push({ x: fmtx(r), yp: mode === "bbt" ? "0" : "0", y: "", ytype: "value" }); });
    moc.push({ x: "+inf", yp: "", y: "", ytype: "value" });
    if (mode === "bbt") {
      moc[0].y = signs[0] === "+" ? "-inf" : "+inf";
      rts.forEach(function (r, i) { moc[i + 1].y = fmt(A.f(r)); });
      moc[moc.length - 1].y = signs[signs.length - 1] === "+" ? "+inf" : "-inf";
    }
    return { mode: mode, expr: expr, deriv: A.dstr, moc: moc, signs: signs };
  }
  function parseVal(s) {
    s = (s || "").trim().toLowerCase().replace("−", "-").replace("∞", "inf");
    if (s === "-inf" || s === "-vc" || s === "-∞") return -Infinity;
    if (s === "inf" || s === "+inf" || s === "+∞" || s === "vc") return Infinity;
    try { return M().evaluate(s); } catch (e) { return NaN; }
  }
  function show(s) { if (s == null) return ""; s = ("" + s).trim(); var l = s.toLowerCase().replace("−", "-"); if (l === "-inf" || l === "-∞") return "−∞"; if (l === "inf" || l === "+inf" || l === "+∞") return "+∞"; return s.replace("-", "−"); }

  // Vẽ bảng biến thiên / xét dấu từ lưới (đã sửa tay)
  function buildFromGrid(body, data) {
    body.innerHTML = "";
    var grid = data.grid, mode = grid.mode, moc = grid.moc, signs = grid.signs;
    var tbl = cell("table", "vartbl");
    // x
    var rx = cell("tr"); rx.appendChild(cell("th", null, "x"));
    moc.forEach(function (m, i) { rx.appendChild(cell("td", "pt", show(m.x))); if (i < moc.length - 1) rx.appendChild(cell("td", "gap")); });
    tbl.appendChild(rx);
    // y' (dấu)
    var rs = cell("tr"); rs.appendChild(cell("th", null, mode === "bbt" ? "y'" : "dấu"));
    moc.forEach(function (m, i) {
      rs.appendChild(cell("td", "pt zero", m.yp === "||" ? "‖" : (m.yp === "∄" ? "∄" : (m.yp || ""))));
      if (i < signs.length) rs.appendChild(cell("td", "sign", signs[i] === "||" ? "‖" : signs[i]));
    });
    tbl.appendChild(rs);
    // y (chỉ bbt)
    if (mode === "bbt") {
      var ry = cell("tr"); ry.appendChild(cell("th", null, "y"));
      moc.forEach(function (m, i) {
        var val = m.ytype === "undef" ? "∄" : (m.ytype === "bar" ? "‖" : show(m.y));
        ry.appendChild(cell("td", "pt ext", val));
        if (i < signs.length) ry.appendChild(cell("td", "arrow", signs[i] === "+" ? "↗" : signs[i] === "−" ? "↘" : ""));
      });
      tbl.appendChild(ry);
    }
    body.appendChild(tbl);
  }

  function build(body, data) { if (data.grid) return buildFromGrid(body, data); buildTable(body, data, data.mode === "xetdau" ? "xetdau" : "bbt"); }
  global.VPVar = { build: build, analyze: analyze, gridFromExpr: gridFromExpr, buildFromGrid: buildFromGrid };
})(window);
