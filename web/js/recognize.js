// Gọi API nhận dạng nét vẽ bằng AI (trực tuyến).
(function (global) {
  "use strict";
  async function recognize(pngDataUrl, mode) {
    const res = await fetch("/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: pngDataUrl, mode: mode || "auto" }),
    });
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok || !data.ok) {
      throw new Error(data.error || ("Lỗi máy chủ (" + res.status + ")"));
    }
    return data; // {kind, text, latex}
  }
  global.VPRecognize = { recognize };
})(window);
