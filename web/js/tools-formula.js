// Bộ chèn công thức Toán đầy đủ (kiểu NoteRenderer): danh mục ký hiệu, tìm kiếm,
// hàng mẫu nhanh, xem trước KaTeX, chọn màu/cỡ/display. Mỗi mục: [glyph, latex].
(function (global) {
  "use strict";
  // Template dùng {} để đặt con trỏ.
  var CATS = [
    { key: "rel", label: "Quan hệ", icon: "≤", items: [
      ["<","<"],[">",">"],["\\le","\\le"],["\\ge","\\ge"],["\\neq","\\neq"],["\\approx","\\approx"],["\\equiv","\\equiv"],["\\not\\equiv","\\not\\equiv"],["\\sim","\\sim"],["\\simeq","\\simeq"],["\\cong","\\cong"],["\\propto","\\propto"],["\\ll","\\ll"],["\\gg","\\gg"],["\\lll","\\lll"],["\\ggg","\\ggg"],["\\nless","\\nless"],["\\ngtr","\\ngtr"],["\\nleq","\\nleq"],["\\ngeq","\\ngeq"],
      ["\\leqq","\\leqq"],["\\geqq","\\geqq"],["\\lesssim","\\lesssim"],["\\gtrsim","\\gtrsim"],["\\prec","\\prec"],["\\succ","\\succ"],["\\preceq","\\preceq"],["\\succeq","\\succeq"],["\\doteq","\\doteq"],["\\triangleq","\\triangleq"],["\\mid","\\mid"],["\\nmid","\\nmid"],
      ["\\parallel","\\parallel"],["\\nparallel","\\nparallel"],["\\perp","\\perp"],["\\models","\\models"],["\\vdash","\\vdash"],["\\dashv","\\dashv"],["\\bowtie","\\bowtie"],["\\smile","\\smile"],["\\frown","\\frown"] ] },
    { key: "op", label: "Phép toán", icon: "±", items: [
      ["\\pm","\\pm"],["\\mp","\\mp"],["\\times","\\times"],["\\div","\\div"],["\\cdot","\\cdot"],["\\ast","\\ast"],["\\star","\\star"],["\\circ","\\circ"],["\\bullet","\\bullet"],["\\oplus","\\oplus"],["\\ominus","\\ominus"],["\\otimes","\\otimes"],["\\oslash","\\oslash"],["\\odot","\\odot"],["\\wedge","\\wedge"],["\\vee","\\vee"],["\\setminus","\\setminus"],["\\uplus","\\uplus"],["\\sqcap","\\sqcap"],["\\sqcup","\\sqcup"],
      ["\\dagger","\\dagger"],["\\ddagger","\\ddagger"],["\\diamond","\\diamond"],["\\wr","\\wr"],["\\amalg","\\amalg"],["\\triangle","\\triangle"],["\\triangledown","\\bigtriangledown"],["\\boxplus","\\boxplus"],["\\boxminus","\\boxminus"],["\\boxtimes","\\boxtimes"],["\\boxdot","\\boxdot"],["\\ltimes","\\ltimes"],["\\rtimes","\\rtimes"] ] },
    { key: "logic", label: "Logic, tập hợp", icon: "∈", items: [
      ["\\forall","\\forall"],["\\exists","\\exists"],["\\nexists","\\nexists"],["\\neg","\\neg"],["\\wedge","\\wedge"],["\\vee","\\vee"],["\\Rightarrow","\\Rightarrow"],["\\Leftrightarrow","\\Leftrightarrow"],["\\therefore","\\therefore"],["\\because","\\because"],["\\top","\\top"],["\\bot","\\bot"],["\\in","\\in"],["\\notin","\\notin"],["\\ni","\\ni"],["\\subset","\\subset"],["\\supset","\\supset"],["\\subseteq","\\subseteq"],["\\supseteq","\\supseteq"],["\\subsetneq","\\subsetneq"],
      ["\\supsetneq","\\supsetneq"],["\\nsubseteq","\\nsubseteq"],["\\nsupseteq","\\nsupseteq"],["\\cup","\\cup"],["\\cap","\\cap"],["\\setminus","\\setminus"],["\\emptyset","\\emptyset"],["\\varnothing","\\varnothing"],["\\complement","\\complement"],["\\mathbb{N}","\\mathbb{N}"],["\\mathbb{N^*}","\\mathbb{N}^*"],["\\mathbb{Z}","\\mathbb{Z}"],["\\mathbb{Q}","\\mathbb{Q}"],["\\mathbb{R}","\\mathbb{R}"],["\\mathbb{C}","\\mathbb{C}"] ] },
    { key: "greek", label: "Hy Lạp", icon: "α", items: [
      ["\\alpha","\\alpha"],["\\beta","\\beta"],["\\gamma","\\gamma"],["\\delta","\\delta"],["\\epsilon","\\epsilon"],["\\varepsilon","\\varepsilon"],["\\zeta","\\zeta"],["\\eta","\\eta"],["\\theta","\\theta"],["\\vartheta","\\vartheta"],["\\iota","\\iota"],["\\kappa","\\kappa"],["\\lambda","\\lambda"],["\\mu","\\mu"],["\\nu","\\nu"],["\\xi","\\xi"],["\\pi","\\pi"],["\\varpi","\\varpi"],["\\rho","\\rho"],["\\varrho","\\varrho"],
      ["\\sigma","\\sigma"],["\\varsigma","\\varsigma"],["\\tau","\\tau"],["\\upsilon","\\upsilon"],["\\phi","\\phi"],["\\varphi","\\varphi"],["\\chi","\\chi"],["\\psi","\\psi"],["\\omega","\\omega"],
      ["\\Gamma","\\Gamma"],["\\Delta","\\Delta"],["\\Theta","\\Theta"],["\\Lambda","\\Lambda"],["\\Xi","\\Xi"],["\\Pi","\\Pi"],["\\Sigma","\\Sigma"],["\\Upsilon","\\Upsilon"],["\\Phi","\\Phi"],["\\Psi","\\Psi"],["\\Omega","\\Omega"] ] },
    { key: "arrow", label: "Mũi tên", icon: "→", items: [
      ["\\to","\\to"],["\\gets","\\gets"],["\\leftrightarrow","\\leftrightarrow"],["\\uparrow","\\uparrow"],["\\downarrow","\\downarrow"],["\\updownarrow","\\updownarrow"],["\\Rightarrow","\\Rightarrow"],["\\Leftarrow","\\Leftarrow"],["\\Leftrightarrow","\\Leftrightarrow"],["\\Uparrow","\\Uparrow"],["\\Downarrow","\\Downarrow"],["\\longrightarrow","\\longrightarrow"],["\\longleftarrow","\\longleftarrow"],["\\longleftrightarrow","\\longleftrightarrow"],["\\Longrightarrow","\\Longrightarrow"],["\\Longleftarrow","\\Longleftarrow"],["\\nearrow","\\nearrow"],["\\nwarrow","\\nwarrow"],["\\searrow","\\searrow"],["\\swarrow","\\swarrow"],
      ["\\mapsto","\\mapsto"],["\\longmapsto","\\longmapsto"],["\\hookrightarrow","\\hookrightarrow"],["\\hookleftarrow","\\hookleftarrow"],["\\rightrightarrows","\\rightrightarrows"],["\\leftleftarrows","\\leftleftarrows"],["\\rightleftarrows","\\rightleftarrows"],["\\rightleftharpoons","\\rightleftharpoons"],["\\upharpoonright","\\upharpoonright"],["\\rightharpoonup","\\rightharpoonup"],["\\rightsquigarrow","\\rightsquigarrow"],["\\nRightarrow","\\nRightarrow"],["\\nLeftrightarrow","\\nLeftrightarrow"] ] },
    { key: "txtarrow", label: "Mũi tên + chữ", icon: "→", items: [
      ["\\xrightarrow{}","\\xrightarrow{}"],["\\xleftarrow{}","\\xleftarrow{}"],["\\xrightarrow[]{}","\\xrightarrow[]{}"],["\\xleftarrow[]{}","\\xleftarrow[]{}"],["\\overset{}{\\to}","\\overset{}{\\rightarrow}"],["\\underset{}{\\to}","\\underset{}{\\rightarrow}"],["\\xLeftarrow{}","\\xLeftarrow{}"],["\\xRightarrow{}","\\xRightarrow{}"],["\\xleftrightarrow{}","\\xleftrightarrow{}"],["\\xrightleftharpoons{}","\\xrightleftharpoons{}"],["\\overrightarrow{AB}","\\overrightarrow{}"],["\\overleftarrow{AB}","\\overleftarrow{}"] ] },
    { key: "frac", label: "Phân số", icon: "½", items: [
      ["\\frac{a}{b}","\\frac{}{}"],["\\dfrac","\\dfrac{}{}"],["\\tfrac","\\tfrac{}{}"],["\\cfrac","\\cfrac{}{}"],["\\binom","\\binom{}{}"] ] },
    { key: "script", label: "Chỉ số", icon: "x²", items: [
      ["x^{n}","{}^{}"],["x_{i}","{}_{}"],["x_i^n","{}_{}^{}"],["\\sqrt{}","\\sqrt{}"],["\\sqrt[n]{}","\\sqrt[]{}"],["{}^{n}\\!A","{}^{}"],["\\prescript","{}_{}^{}"] ] },
    { key: "accent", label: "Dấu trên/dưới", icon: "â", items: [
      ["\\hat{}","\\hat{}"],["\\bar{}","\\bar{}"],["\\vec{}","\\vec{}"],["\\dot{}","\\dot{}"],["\\ddot{}","\\ddot{}"],["\\tilde{}","\\tilde{}"],["\\check{}","\\check{}"],["\\breve{}","\\breve{}"],["\\widehat{}","\\widehat{}"],["\\widetilde{}","\\widetilde{}"],["\\overline{}","\\overline{}"],["\\underline{}","\\underline{}"],["\\overbrace{}","\\overbrace{}"],["\\underbrace{}","\\underbrace{}"],["\\overrightarrow{}","\\overrightarrow{}"],["\\overleftarrow{}","\\overleftarrow{}"] ] },
    { key: "bracket", label: "Ngoặc", icon: "( )", items: [
      ["(\\,)","\\left( \\right)"],["[\\,]","\\left[ \\right]"],["\\{\\,\\}","\\left\\{ \\right\\}"],["\\langle\\rangle","\\left\\langle \\right\\rangle"],["\\lceil\\rceil","\\left\\lceil \\right\\rceil"],["\\lfloor\\rfloor","\\left\\lfloor \\right\\rfloor"],["|\\,|","\\left| \\right|"],["\\|\\,\\|","\\left\\| \\right\\|"],["\\binom","\\binom{}{}"] ] },
    { key: "int", label: "Tích phân", icon: "∫", items: [
      ["\\int","\\int"],["\\int_a^b","\\int_{}^{} {} \\,dx"],["\\iint","\\iint"],["\\iiint","\\iiint"],["\\oint","\\oint"],["\\oiint","\\oiint"],["\\int\\!dx","\\int {} \\,dx"] ] },
    { key: "sum", label: "Tổng, tích", icon: "∑", items: [
      ["\\sum","\\sum"],["\\sum_{}^{}","\\sum_{}^{} {}"],["\\prod","\\prod"],["\\prod_{}^{}","\\prod_{}^{} {}"],["\\coprod","\\coprod"],["\\bigcup","\\bigcup"],["\\bigcap","\\bigcap"],["\\bigoplus","\\bigoplus"],["\\bigotimes","\\bigotimes"],["\\bigvee","\\bigvee"],["\\bigwedge","\\bigwedge"] ] },
    { key: "calc", label: "Giải tích", icon: "∂", items: [
      ["\\lim","\\lim"],["\\lim_{x\\to}","\\lim_{{} \\to {}} {}"],["\\partial","\\partial"],["\\nabla","\\nabla"],["\\infty","\\infty"],["\\frac{d}{dx}","\\frac{d}{d{}}"],["\\frac{\\partial}{\\partial x}","\\frac{\\partial}{\\partial {}}"],["f'(x)","f'({})"],["\\int_a^b","\\int_{}^{} {} \\,dx"],["\\sum_{}^{}","\\sum_{}^{} {}"],["dx","\\,dx"],["\\to","\\to"] ] },
    { key: "func", label: "Hàm số", icon: "ƒ", items: [
      ["\\sin","\\sin"],["\\cos","\\cos"],["\\tan","\\tan"],["\\cot","\\cot"],["\\sec","\\sec"],["\\csc","\\csc"],["\\arcsin","\\arcsin"],["\\arccos","\\arccos"],["\\arctan","\\arctan"],["\\sinh","\\sinh"],["\\cosh","\\cosh"],["\\tanh","\\tanh"],["\\log","\\log"],["\\ln","\\ln"],["\\lg","\\lg"],["\\log_a","\\log_{}"],["\\exp","\\exp"],["\\lim","\\lim"],["\\max","\\max"],["\\min","\\min"],["\\gcd","\\gcd"],["\\deg","\\deg"],["\\det","\\det"],["\\sin^2","\\sin^{2}"],["\\cos^2","\\cos^{2}"],["f(x)","f({})"],["f^{-1}","f^{-1}({})"],["f\\circ g","{} \\circ {}"],["a\\equiv b","{} \\equiv {} \\pmod{{}}"] ] },
    { key: "geo", label: "Hình học", icon: "△", items: [
      ["\\angle","\\angle"],["\\angle ABC","\\angle {}"],["\\measuredangle","\\measuredangle"],["\\triangle ABC","\\triangle {}"],["\\square","\\square"],["\\bigcirc","\\bigcirc"],["\\perp","\\perp"],["\\parallel","\\parallel"],["\\cong","\\cong"],["\\sim","\\sim"],["\\overrightarrow{AB}","\\overrightarrow{}"],["\\overline{AB}","\\overline{}"],["{}^\\circ","^{\\circ}"],["30^\\circ","30^{\\circ}"],["\\widehat{ABC}","\\widehat{}"],
      ["a\\parallel b","{} \\parallel {}"],["AB\\perp CD","{} \\perp {}"],["\\triangle\\sim\\triangle","\\triangle {} \\sim \\triangle {}"],["\\triangle\\cong\\triangle","\\triangle {} \\cong \\triangle {}"],["(x;y)","({};{})"],["(x;y;z)","({};{};{})"],["\\odot(O)","\\odot({})"] ] },
    { key: "matrix", label: "Ma trận", icon: "▦", items: [
      ["\\begin{matrix}","\\begin{matrix} {} & {} \\\\ {} & {} \\end{matrix}"],["(\\ )pmatrix","\\begin{pmatrix} {} & {} \\\\ {} & {} \\end{pmatrix}"],["[\\ ]bmatrix","\\begin{bmatrix} {} & {} \\\\ {} & {} \\end{bmatrix}"],["|\\ |vmatrix","\\begin{vmatrix} {} & {} \\\\ {} & {} \\end{vmatrix}"],["cases","\\begin{cases} {} \\\\ {} \\end{cases}"],["3×3","\\begin{pmatrix} {} & {} & {} \\\\ {} & {} & {} \\\\ {} & {} & {} \\end{pmatrix}"] ] },
    { key: "stat", label: "Thống kê", icon: "Cₙᵏ", items: [
      ["\\binom{n}{k}","\\binom{}{}"],["C_n^k","C_{}^{}"],["A_n^k","A_{}^{}"],["P_n","P_{}"],["\\bar{x}","\\bar{x}"],["\\overline{X}","\\overline{X}"],["\\hat{p}","\\hat{p}"],["\\sum x_i","\\sum {}_{}"],["n!","{}!"],["\\mu","\\mu"],["\\sigma","\\sigma"],["\\sigma^2","\\sigma^{2}"],
      ["P(A)","P({})"],["P(A|B)","P({} \\mid {})"],["E(X)","E({})"],["\\operatorname{Var}","\\operatorname{Var}({})"],["\\operatorname{Cov}","\\operatorname{Cov}({},{})"],["\\bar{x}=\\frac1n\\sum","\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n} x_i"],["\\sqrt{\\frac1n\\sum(x_i-\\bar x)^2}","\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\bar{x})^2}"] ] },
    { key: "text", label: "Chữ, dấu cách", icon: "T", items: [
      ["\\text{}","\\text{}"],["\\mathbf{}","\\mathbf{}"],["\\mathbb{}","\\mathbb{}"],["\\mathcal{}","\\mathcal{}"],["\\mathrm{}","\\mathrm{}"],["\\;","\\;"],["\\quad","\\quad"],["\\qquad","\\qquad"],["\\,","\\,"],["\\!","\\!"] ] },
    { key: "other", label: "Khác", icon: "∞", items: [
      ["\\infty","\\infty"],["\\partial","\\partial"],["\\nabla","\\nabla"],["\\hbar","\\hbar"],["\\ell","\\ell"],["\\wp","\\wp"],["\\Re","\\Re"],["\\Im","\\Im"],["\\aleph","\\aleph"],["^\\circ","^{\\circ}"],["\\prime","'"],["\\cdots","\\cdots"],["\\vdots","\\vdots"],["\\ddots","\\ddots"],["\\dots","\\dots"],["\\star","\\star"],["\\checkmark","\\checkmark"],["\\%","\\%"] ] }
  ];
  // Hàng mẫu nhanh (luôn hiện)
  var QUICK = [
    ["π","\\pi"],["∞","\\infty"],["∈","\\in"],["∉","\\notin"],["⊂","\\subset"],["∅","\\varnothing"],["→","\\to"],["⇒","\\Rightarrow"],["⇔","\\Leftrightarrow"],["≤","\\le"],["≥","\\ge"],["≠","\\neq"],["±","\\pm"],["≈","\\approx"],["30°","^{\\circ}"],["Δ","\\Delta"],["α","\\alpha"],
    ["▯/▯","\\frac{}{}"],["√","\\sqrt{}"],["ⁿ√","\\sqrt[]{}"],["xⁿ","{}^{}"],["xᵢ","{}_{}"],["( )","\\left( \\right)"],["[ ]","\\left[ \\right]"],["{ }","\\left\\{ \\right\\}"],["⎰","\\begin{cases} {} \\\\ {} \\end{cases}"],["[▦]","\\begin{pmatrix} {} & {} \\\\ {} & {} \\end{pmatrix}"],["AB⃗","\\overrightarrow{}"],["⌢","\\widehat{}"],["∫","\\int_{}^{} {} \\,dx"],["lim","\\lim_{{} \\to {}} {}"],["log","\\log_{}"],["Cₙᵏ","C_{}^{}"],["∑","\\sum_{}^{} {}"]
  ];

  var state = { color: "#111111", size: 46, display: true, mode: "math", cat: "rel" };

  function render(el, latex) {
    el.innerHTML = "";
    if (state.mode === "text") { el.textContent = latex; }
    else { try { global.katex.render(latex || "\\;", el, { throwOnError: false, displayMode: state.display }); } catch (e) { el.textContent = latex; } }
    el.style.color = state.color;
  }

  function insertSnippet(inp, snip, preview) {
    var s = inp.selectionStart || 0, e = inp.selectionEnd || 0, v = inp.value;
    inp.value = v.slice(0, s) + snip + v.slice(e);
    var rel = snip.indexOf("{}"); var caret = rel >= 0 ? s + rel + 1 : s + snip.length;
    inp.focus(); inp.setSelectionRange(caret, caret);
    render(preview, inp.value);
  }

  function build(dom) {
    var cats = dom.cats, grid = dom.grid, quick = dom.quick, search = dom.search, inp = dom.input, preview = dom.preview;
    // danh mục
    cats.innerHTML = "";
    CATS.forEach(function (c) {
      var b = document.createElement("button"); b.className = "fcat" + (c.key === state.cat ? " sel" : "");
      b.innerHTML = '<span class="fcat-ic">' + c.icon + '</span>' + c.label; b.dataset.cat = c.key;
      b.onclick = function () { state.cat = c.key; search.value = ""; drawGrid(); dom.cats.querySelectorAll(".fcat").forEach(function (x) { x.classList.toggle("sel", x.dataset.cat === c.key); }); };
      cats.appendChild(b);
    });
    // lưới ký hiệu
    function drawGrid() {
      grid.innerHTML = "";
      var q = (search.value || "").trim().toLowerCase(), list;
      if (q) { list = []; CATS.forEach(function (c) { c.items.forEach(function (it) { if (it[1].toLowerCase().indexOf(q) >= 0 || it[0].toLowerCase().indexOf(q) >= 0) list.push(it); }); }); }
      else { var c = CATS.filter(function (x) { return x.key === state.cat; })[0]; list = c ? c.items : []; }
      list.forEach(function (it) {
        var b = document.createElement("button"); b.className = "fsym"; b.title = it[1];
        try { global.katex.render(it[1].replace(/\{\}/g, "{\\square}"), b, { throwOnError: false }); } catch (e) { b.textContent = it[0]; }
        b.onmousedown = function (e) { e.preventDefault(); };
        b.onclick = function () { insertSnippet(inp, it[1], preview); };
        grid.appendChild(b);
      });
    }
    // hàng mẫu nhanh
    quick.innerHTML = "";
    QUICK.forEach(function (it) {
      var b = document.createElement("button"); b.className = "fquick"; b.title = it[1];
      try { global.katex.render(it[1].replace(/\{\}/g, "{\\square}"), b, { throwOnError: false }); } catch (e) { b.textContent = it[0]; }
      b.onmousedown = function (e) { e.preventDefault(); };
      b.onclick = function () { insertSnippet(inp, it[1], preview); };
      quick.appendChild(b);
    });
    search.oninput = drawGrid;
    inp.oninput = function () { render(preview, inp.value); };
    drawGrid(); render(preview, inp.value);
  }

  global.VPFormula = {
    build: build,
    render: render,
    state: state,
    setColor: function (c) { state.color = c; },
    setSize: function (s) { state.size = s; },
    setDisplay: function (d) { state.display = d; },
    setMode: function (m) { state.mode = m; }
  };
})(window);
