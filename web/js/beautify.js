// Làm đẹp nét vẽ tay: nhận dạng nét nguệch ngoạc -> đường thẳng / tròn / elip / chữ nhật / tam giác.
// Thuần hình học, chạy ngay trên trình duyệt (không cần mạng).
(function (global) {
  "use strict";

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function pathLength(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
    return L;
  }

  function bbox(pts) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const p of pts) {
      if (p.x < minx) minx = p.x; if (p.y < miny) miny = p.y;
      if (p.x > maxx) maxx = p.x; if (p.y > maxy) maxy = p.y;
    }
    return { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny };
  }

  // Khoảng cách từ điểm p tới đoạn ab
  function distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1e-9;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  // Rút gọn Ramer–Douglas–Peucker -> các đỉnh góc
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    let dmax = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distToSeg(pts[i], pts[0], pts[pts.length - 1]);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps) {
      const left = rdp(pts.slice(0, idx + 1), eps);
      const right = rdp(pts.slice(idx), eps);
      return left.slice(0, -1).concat(right);
    }
    return [pts[0], pts[pts.length - 1]];
  }

  function snapAngle(x1, y1, x2, y2) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const deg = ang * 180 / Math.PI;
    const tol = 8;
    // ngang
    if (Math.abs(deg) < tol || Math.abs(Math.abs(deg) - 180) < tol) { const y = (y1 + y2) / 2; return [x1, y, x2, y]; }
    // dọc
    if (Math.abs(Math.abs(deg) - 90) < tol) { const x = (x1 + x2) / 2; return [x, y1, x, y2]; }
    return [x1, y1, x2, y2];
  }

  // Trả về shape đã làm đẹp, hoặc null nếu nên giữ nguyên nét.
  function beautify(pts) {
    if (!pts || pts.length < 4) return null;
    const L = pathLength(pts);
    if (L < 24) return null;
    const bb = bbox(pts);
    const size = Math.max(bb.w, bb.h);
    if (size < 16) return null;
    const endGap = dist(pts[0], pts[pts.length - 1]);
    const straightness = endGap / L;
    const closed = endGap < size * 0.4;

    // Đường thẳng (nét mở, gần như thẳng)
    if (!closed && straightness > 0.9) {
      const [x1, y1, x2, y2] = snapAngle(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
      return { type: "line", x1, y1, x2, y2 };
    }

    // Tâm & bán kính theo hộp bao; độ lệch so với elip (0 = tròn/elip hoàn hảo)
    const cx = (bb.minx + bb.maxx) / 2, cy = (bb.miny + bb.maxy) / 2;
    const rx = bb.w / 2, ry = bb.h / 2;
    let dev = 0;
    for (const p of pts) {
      const nx = (p.x - cx) / (rx || 1), ny = (p.y - cy) / (ry || 1);
      dev += Math.abs(Math.hypot(nx, ny) - 1);
    }
    dev /= pts.length;

    function roundShape() {
      if (Math.abs(rx - ry) / Math.max(rx, ry) < 0.18) return { type: "circle", cx, cy, r: (rx + ry) / 2 };
      return { type: "ellipse", cx, cy, rx, ry };
    }

    // 1) Nét cong & bán kính đều -> ĐƯỜNG TRÒN/ELIP MƯỢT (kể cả khi khép hở một chút)
    if (straightness < 0.45 && dev < 0.15) return roundShape();

    if (closed) {
      // 2) Đa giác: xét số đỉnh góc
      const epsP = size * 0.09;
      let corners = rdp(pts, epsP);
      if (corners.length > 1 && dist(corners[0], corners[corners.length - 1]) < size * 0.18) corners = corners.slice(0, -1);
      const n = corners.length;
      if (n === 3) return { type: "triangle", pts: corners.map(p => ({ x: p.x, y: p.y })) };
      if (n === 4) return { type: "rect", x: bb.minx, y: bb.miny, w: bb.w, h: bb.h };
      // 3) Mặc định vẫn là đường tròn/elip
      return roundShape();
    }
    return null;
  }

  // ---------- NẮN NÉT CHỮ VIẾT TAY ----------
  // Làm mượt nét viết tay (giảm run tay, bớt nguệch ngoạc) NHƯNG GIỮ NGUYÊN là nét
  // chữ của người dùng — không đổi thành hình, không thành chữ đánh máy.
  function resampleEven(pts, step) {
    if (pts.length < 2) return pts.slice();
    var out = [pts[0]], prev = pts[0], acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = dist(prev, pts[i]);
      if (d < 1e-6) { continue; }
      while (acc + d >= step) {
        var t = (step - acc) / d;
        var np = { x: prev.x + t * (pts[i].x - prev.x), y: prev.y + t * (pts[i].y - prev.y), pr: pts[i].pr };
        out.push(np); prev = np; d = dist(prev, pts[i]); acc = 0;
      }
      acc += d; prev = pts[i];
    }
    var last = pts[pts.length - 1];
    if (dist(out[out.length - 1], last) > step * 0.3) out.push(last);
    return out;
  }
  // Làm trơn kiểu trung bình trượt, giữ nguyên 2 đầu nét
  function smoothPass(pts, w) {
    if (pts.length < 3) return pts;
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var sx = 0, sy = 0, n = 0;
      for (var j = -w; j <= w; j++) { var k = i + j; if (k < 0 || k >= pts.length) continue; sx += pts[k].x; sy += pts[k].y; n++; }
      out.push({ x: sx / n, y: sy / n, pr: pts[i].pr });
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // Nội suy Catmull-Rom cho đường cong trơn qua các điểm
  function catmullRom(pts, samples) {
    if (pts.length < 3) return pts.slice();
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
      for (var s = 0; s < samples; s++) {
        var t = s / samples, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
          pr: p1.pr
        });
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // strength: 1 nhẹ · 2 vừa · 3 mạnh · 4 rất mượt
  function refineInk(pts, strength) {
    if (!pts || pts.length < 4) return pts;
    strength = strength || 2;
    // RDP giữ NHẸ ở mọi mức để KHÔNG méo chữ; độ mượt đến từ số lần làm trơn + mật độ
    // đường cong (samples), không phải từ rút gọn mạnh.
    var cfg = {
      1: { eps: 0.010, pre: 1, win: 1, passes: 1, samples: 10, post: 0 },
      2: { eps: 0.012, pre: 1, win: 1, passes: 2, samples: 12, post: 1 },
      3: { eps: 0.013, pre: 2, win: 1, passes: 3, samples: 16, post: 2 },
      4: { eps: 0.014, pre: 2, win: 2, passes: 4, samples: 20, post: 3 }
    }[strength] || { eps: 0.012, pre: 1, win: 1, passes: 2, samples: 12, post: 1 };
    var bb = bbox(pts), size = Math.max(bb.w, bb.h);
    if (size < 8) return pts;
    // 1) Resample đều để ổn định
    var step = Math.max(2, size * 0.02);
    var r = resampleEven(pts, step);
    if (r.length < 4) return pts;
    // 2) Làm trơn sơ bộ trên nét dày (khử run tay trực tiếp) trước khi rút gọn
    for (var a = 0; a < cfg.pre; a++) r = smoothPass(r, cfg.win);
    // 3) Bỏ điểm nhiễu bằng RDP (giữ hình dáng chữ)
    var simplified = rdp(r, size * cfg.eps);
    if (simplified.length < 3) simplified = r;
    // 4) Làm trơn các điểm điều khiển + nội suy Catmull-Rom -> nét cong mượt
    var sm = simplified;
    for (var k = 0; k < cfg.passes; k++) sm = smoothPass(sm, cfg.win);
    var curve = catmullRom(sm, cfg.samples);
    // 5) Làm trơn lần cuối trên đường cong dày -> rất mượt
    for (var b2 = 0; b2 < cfg.post; b2++) curve = smoothPass(curve, 2);
    return curve.length >= 2 ? curve : pts;
  }

  global.VPBeautify = { beautify, bbox, pathLength, rdp, refineInk, resampleEven, smoothPass, catmullRom };
})(window);
