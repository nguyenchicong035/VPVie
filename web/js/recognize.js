// Nhận dạng nét vẽ: Tesseract.js (nguồn mở, miễn phí, chạy trong trình duyệt) hoặc máy chủ (Ollama/Claude).
(function (global) {
  "use strict";
  var worker = null, loading = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var has = Array.prototype.some.call(document.scripts, function (s) { return s.src.indexOf(src) >= 0; });
      if (has && global.Tesseract) return res();
      var el = document.createElement("script");
      el.src = src; el.onload = res; el.onerror = function () { rej(new Error("Không tải được " + src)); };
      document.head.appendChild(el);
    });
  }

  async function getWorker(onStatus) {
    if (worker) return worker;
    if (loading) return loading;
    loading = (async function () {
      await loadScript("/vendor/tesseract/tesseract.min.js");
      var w = await global.Tesseract.createWorker(["vie", "eng"], 1, {
        workerPath: "/vendor/tesseract/worker.min.js",
        corePath: "/vendor/tesseract/",
        langPath: "/vendor/tesseract/lang",
        gzip: false,
        logger: function (m) { if (onStatus && m.status) onStatus(m.status + (m.progress ? " " + Math.round(m.progress * 100) + "%" : "")); },
      });
      worker = w; return w;
    })();
    return loading;
  }

  async function recognizeTesseract(imageSource, onStatus) {
    var w = await getWorker(onStatus);
    var out = await w.recognize(imageSource);
    return { kind: "text", text: (out.data.text || "").trim().replace(/\n{2,}/g, "\n"), latex: "" };
  }

  async function recognizeServer(pngDataUrl, mode) {
    var res = await fetch("/api/recognize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: pngDataUrl, mode: mode || "auto" }),
    });
    var d = {}; try { d = await res.json(); } catch (e) { d = {}; }
    if (!res.ok || !d.ok) throw new Error(d.error || ("Lỗi máy chủ (" + res.status + ")"));
    return d;
  }

  global.VPRecognize = { recognizeTesseract: recognizeTesseract, recognizeServer: recognizeServer };
})(window);
