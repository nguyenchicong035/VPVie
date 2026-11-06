// Nhận dạng nét vẽ: Tesseract.js (nguồn mở, miễn phí, chạy trong trình duyệt) hoặc máy chủ (Ollama/Claude).
// Có tiền xử lý ảnh (nhị phân hoá Otsu + làm dày nét) và tinh chỉnh tham số để nhận chữ viết tay tiếng Việt tốt hơn.
(function (global) {
  "use strict";
  var worker = null, loading = null;
  // Bộ ký tự tiếng Việt + số + dấu toán cơ bản (giúp giảm ký tự rác)
  var VI = "AÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬEÈÉẺẼẸÊỀẾỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢUÙÚỦŨỤƯỪỨỬỮỰYỲÝỶỸỴĐ";
  var WHITE = VI + VI.toLowerCase() + "BCDFGHJKLMNPQRSTVWXZbcdfghjklmnpqrstvwxz0123456789.,:;?!()[]{}+-*/=<>%°^√π…'\"  \n";

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var has = Array.prototype.some.call(document.scripts, function (s) { return s.src.indexOf(src) >= 0; });
      if (has && global.Tesseract) return res();
      var el = document.createElement("script");
      el.src = src; el.onload = res; el.onerror = function () { rej(new Error("Không tải được " + src)); };
      document.head.appendChild(el);
    });
  }

  // ----- Tiền xử lý: xám hoá -> ngưỡng Otsu -> nhị phân -> làm dày nét (giãn nở)
  function preprocess(src, opts) {
    opts = opts || {};
    var w = src.width, h = src.height;
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    var c = cv.getContext("2d"); c.drawImage(src, 0, 0);
    var img = c.getImageData(0, 0, w, h), d = img.data, n = w * h;
    var gray = new Uint8Array(n), hist = new Array(256).fill(0), i, g;
    for (i = 0; i < n; i++) {
      g = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0;
      gray[i] = g; hist[g]++;
    }
    // Ngưỡng Otsu
    var sum = 0; for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, wF = 0, maxV = 0, thr = 127, mB, mF, between;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; wF = n - wB; if (!wF) break;
      sumB += i * hist[i]; mB = sumB / wB; mF = (sum - sumB) / wF;
      between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maxV) { maxV = between; thr = i; }
    }
    // Nhị phân: nét = đen (0), nền = trắng (255)
    var bin = new Uint8Array(n);
    for (i = 0; i < n; i++) bin[i] = gray[i] < thr - 6 ? 0 : 255;
    // Giãn nở nét (làm dày) để Tesseract bắt nét mảnh của bút cảm ứng
    var out = bin;
    if (opts.dilate !== false) {
      out = new Uint8Array(n); out.fill(255);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var dark = false;
        for (var dy = -1; dy <= 1 && !dark; dy++) for (var dx = -1; dx <= 1; dx++) {
          var yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
          if (bin[yy * w + xx] === 0) { dark = true; break; }
        }
        out[y * w + x] = dark ? 0 : 255;
      }
    }
    for (i = 0; i < n; i++) { var v = out[i]; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    c.putImageData(img, 0, 0);
    return cv;
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

  // Dọn kết quả: bỏ ký tự rác, gộp khoảng trắng, sửa vài nhầm lẫn phổ biến của chữ viết tay
  function cleanText(t) {
    return (t || "").replace(/\r/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{2,}/g, "\n")
      .replace(/ *\n */g, "\n")
      .trim();
  }

  async function recognizeTesseract(imageSource, onStatus, opts) {
    opts = opts || {};
    var w = await getWorker(onStatus);
    if (onStatus) onStatus("đang xử lý ảnh…");
    var pre = preprocess(imageSource, opts);
    try {
      await w.setParameters({
        tessedit_pageseg_mode: opts.psm || "6",          // 6 = một khối văn bản đều
        preserve_interword_spaces: "1",
        tessedit_char_whitelist: opts.math ? "" : WHITE,  // chế độ toán: không giới hạn ký tự
      });
    } catch (e) {}
    var out = await w.recognize(pre);
    var text = cleanText(out.data.text);
    var conf = out.data.confidence || 0;
    return { kind: "text", text: text, latex: "", confidence: Math.round(conf) };
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

  global.VPRecognize = { recognizeTesseract: recognizeTesseract, recognizeServer: recognizeServer, preprocess: preprocess };
})(window);
