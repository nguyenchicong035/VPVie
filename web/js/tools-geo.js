// Hình học động: điểm (kéo được, có nhãn), đoạn, đường thẳng, đường tròn.
// Kéo một điểm -> mọi hình phụ thuộc cập nhật tức thì (kiểu GeoGebra thu nhỏ).
(function (global) {
  "use strict";
  var PT = "#1F3D55", SH = "#13697A";

  var G = {
    points: [], shapes: [], tool: null, sel: [], dragging: null, seq: 0,

    setTool: function (t) { this.tool = t; this.sel = []; },
    active: function () { return !!this.tool; },
    clear: function () { this.points = []; this.shapes = []; this.sel = []; this.seq = 0; },
    label: function () {
      var i = this.seq++; var c = String.fromCharCode(65 + (i % 26));
      return i < 26 ? c : c + Math.floor(i / 26);
    },
    get: function (id) { for (var i = 0; i < this.points.length; i++) if (this.points[i].id === id) return this.points[i]; return null; },
    hit: function (pt, tol) {
      for (var i = this.points.length - 1; i >= 0; i--) {
        var p = this.points[i]; if (Math.hypot(p.x - pt.x, p.y - pt.y) <= (tol || 12)) return p;
      }
      return null;
    },
    addPoint: function (pt) { var p = { id: "p" + (Date.now() + Math.random()), x: pt.x, y: pt.y, label: this.label() }; this.points.push(p); return p; },
    pick: function (pt) { return this.hit(pt, 12) || this.addPoint(pt); },

    onDown: function (pt) {
      if (this.tool === "move") { this.dragging = this.hit(pt, 14); return; }
      if (this.tool === "point") { this.addPoint(pt); return; }
      // đoạn / đường thẳng / đường tròn: chọn 2 điểm
      var p = this.pick(pt); this.sel.push(p.id);
      if (this.sel.length === 2) {
        var a = this.sel[0], b = this.sel[1];
        if (a !== b) {
          if (this.tool === "segment") this.shapes.push({ type: "segment", a: a, b: b });
          else if (this.tool === "line") this.shapes.push({ type: "line", a: a, b: b });
          else if (this.tool === "circle") this.shapes.push({ type: "circle", c: a, p: b });
        }
        this.sel = [];
      }
    },
    onMove: function (pt) { if (this.dragging) { this.dragging.x = pt.x; this.dragging.y = pt.y; return true; } return false; },
    onUp: function () { this.dragging = null; },

    render: function (ctx, w, h) {
      ctx.save();
      ctx.lineWidth = 2; ctx.strokeStyle = SH; ctx.fillStyle = SH;
      var self = this;
      this.shapes.forEach(function (s) {
        if (s.type === "segment") { var a = self.get(s.a), b = self.get(s.b); if (a && b) { line(ctx, a.x, a.y, b.x, b.y); } }
        else if (s.type === "line") { var a2 = self.get(s.a), b2 = self.get(s.b); if (a2 && b2) extLine(ctx, a2, b2, w, h); }
        else if (s.type === "circle") { var c = self.get(s.c), p = self.get(s.p); if (c && p) { ctx.beginPath(); ctx.arc(c.x, c.y, Math.hypot(p.x - c.x, p.y - c.y), 0, Math.PI * 2); ctx.stroke(); } }
      });
      // điểm + nhãn
      ctx.font = "13px 'Segoe UI'";
      this.points.forEach(function (p) {
        ctx.fillStyle = PT; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0E2436"; ctx.fillText(p.label, p.x + 8, p.y - 7);
      });
      // điểm đang chờ ghép
      if (this.sel.length) { var sp = this.get(this.sel[0]); if (sp) { ctx.strokeStyle = "#E3A008"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sp.x, sp.y, 9, 0, Math.PI * 2); ctx.stroke(); } }
      ctx.restore();
    },
  };

  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function extLine(ctx, a, b, w, h) {
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    var big = (w + h) * 2;
    line(ctx, a.x - dx * big, a.y - dy * big, a.x + dx * big, a.y + dy * big);
  }

  global.VPGeo = G;
})(window);
