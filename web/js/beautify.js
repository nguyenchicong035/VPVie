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
    const straightness = dist(pts[0], pts[pts.length - 1]) / L;
    const closed = endGap < size * 0.32;

    // Đường thẳng
    if (!closed && straightness > 0.9) {
      const [x1, y1, x2, y2] = snapAngle(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
      return { type: "line", x1, y1, x2, y2 };
    }

    if (closed) {
      const eps = size * 0.08;
      let corners = rdp(pts, eps);
      // bỏ đỉnh trùng điểm đầu/cuối
      if (corners.length > 1 && dist(corners[0], corners[corners.length - 1]) < size * 0.18) corners = corners.slice(0, -1);
      const n = corners.length;

      // Độ "tròn": độ lệch bán kính so với tâm bbox
      const cx = (bb.minx + bb.maxx) / 2, cy = (bb.miny + bb.maxy) / 2;
      let rs = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
      const rmean = rs.reduce((a, b) => a + b, 0) / rs.length;
      const rdev = Math.sqrt(rs.reduce((a, b) => a + (b - rmean) * (b - rmean), 0) / rs.length) / rmean;

      if (n >= 3 && n <= 3) return { type: "triangle", pts: corners.map(p => ({ x: p.x, y: p.y })) };
      if (n === 4 && rdev > 0.18) return { type: "rect", x: bb.minx, y: bb.miny, w: bb.w, h: bb.h };
      // Tròn hoặc elip
      const rx = bb.w / 2, ry = bb.h / 2;
      if (Math.abs(rx - ry) / Math.max(rx, ry) < 0.2) return { type: "circle", cx, cy, r: (rx + ry) / 2 };
      return { type: "ellipse", cx, cy, rx, ry };
    }
    return null;
  }

  global.VPBeautify = { beautify, bbox, pathLength, rdp };
})(window);
