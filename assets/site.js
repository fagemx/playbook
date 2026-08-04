/* playbook 全站互動 — 主題三態 / 目錄 scrollspy / 進場 reveal / 導覽 scramble / 圖放大與流點
   無外部依賴；沒有 JS 時整站仍完整可讀（reveal 由 JS 掛類，不掛就不隱藏）。 */
(function () {
  "use strict";

  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 主題三態：auto / light / dark ── */
  var root = document.documentElement;
  var KEY = "playbook-theme";
  var buttons = document.querySelectorAll(".theme-toggle button");

  function applyTheme(mode) {
    if (mode === "light" || mode === "dark") {
      root.setAttribute("data-theme", mode);
    } else {
      root.removeAttribute("data-theme");
      mode = "auto";
    }
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    });
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.dataset.mode); });
  });

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  applyTheme(saved || "auto");

  /* ── 圖上的流點：沿既有 e-path 跑，動不了就停在畫布外 ── */
  var SVGNS = "http://www.w3.org/2000/svg";
  if (!reduceMotion) {
    document.querySelectorAll("figure.dg svg").forEach(function (svg) {
      var paths = svg.querySelectorAll("path.e-path");
      var n = Math.min(paths.length, 3);
      for (var i = 0; i < n; i++) {
        var d = paths[i].getAttribute("d");
        if (!d) continue;
        var c = document.createElementNS(SVGNS, "circle");
        c.setAttribute("class", "dot");
        c.setAttribute("r", "3");
        c.setAttribute("cx", "-20");
        c.setAttribute("cy", "-20");
        var m = document.createElementNS(SVGNS, "animateMotion");
        m.setAttribute("dur", (1.6 + i * 0.5).toFixed(1) + "s");
        m.setAttribute("begin", (i * 0.4).toFixed(1) + "s");
        m.setAttribute("repeatCount", "indefinite");
        m.setAttribute("path", d);
        c.appendChild(m);
        svg.appendChild(c);
      }
    });
  }

  /* ── scrollspy：本頁塊目錄（.side-nav a.sub）跟著閱讀位置亮 ── */
  var subs = Array.prototype.slice.call(document.querySelectorAll(".side-nav a.sub[href^='#']"));
  var map = {};
  subs.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
  var targets = Array.prototype.slice.call(document.querySelectorAll(".blk[id]"));
  var current = -1;

  function activate(i) {
    if (i < 0 || i >= targets.length || i === current) return;
    current = i;
    subs.forEach(function (l) { l.classList.remove("active"); });
    var own = map[targets[i].id];
    if (own) own.classList.add("active");
  }

  if ("IntersectionObserver" in window && targets.length && subs.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = targets.indexOf(en.target);
        if (en.isIntersecting) {
          activate(i);
        } else if (en.rootBounds && en.boundingClientRect.top >= en.rootBounds.bottom) {
          activate(i - 1);
        }
      });
    }, { rootMargin: "0px 0px -72% 0px", threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest(".side-nav a.sub[href^='#']");
    if (!a) return;
    var el = document.getElementById(a.getAttribute("href").slice(1));
    var i = targets.indexOf(el);
    if (i >= 0) activate(i);
  });

  /* ── 進場 reveal：JS 自己掛類再觀察，無 JS 不隱藏任何內容 ── */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var els = Array.prototype.slice.call(document.querySelectorAll(
      ".blk, .toc-card, figure.dg, .plain, .pager"
    ));
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) return; /* 首屏直接可見，不玩進場 */
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* ── 架構圖放大：點圖開 lightbox，✕ / Esc / 點外側關閉 ── */
  var lb = document.createElement("div");
  lb.className = "lightbox";
  lb.hidden = true;
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "圖放大檢視");
  lb.innerHTML = '<div class="lightbox-panel"><button type="button" class="lightbox-close" aria-label="關閉">✕ ESC</button><div class="lightbox-body"></div><p class="lightbox-cap"></p></div>';
  document.body.appendChild(lb);
  var lbBody = lb.querySelector(".lightbox-body");
  var lbCap = lb.querySelector(".lightbox-cap");
  var lbClose = lb.querySelector(".lightbox-close");
  var lastFocus = null;

  function openLightbox(fig) {
    var svg = fig.querySelector("svg");
    if (!svg) return;
    var clone = svg.cloneNode(true);
    var vb = (svg.getAttribute("viewBox") || "0 0 940 300").split(/\s+/);
    var ar = parseFloat(vb[2]) / parseFloat(vb[3]);
    var w = Math.min(window.innerWidth * 0.88, (window.innerHeight * 0.78) * ar);
    clone.style.width = w + "px";
    clone.style.height = (w / ar) + "px";
    clone.style.minWidth = "0";
    lbBody.innerHTML = "";
    lbBody.appendChild(clone);
    var cap = fig.querySelector("figcaption");
    lbCap.textContent = cap ? cap.textContent : "";
    lb.hidden = false;
    document.body.classList.add("no-scroll");
    lastFocus = document.activeElement;
    lbClose.focus();
  }

  function closeLightbox() {
    lb.hidden = true;
    lbBody.innerHTML = "";
    document.body.classList.remove("no-scroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    if (!lb.hidden) {
      if (e.target === lb || e.target.closest(".lightbox-close")) closeLightbox();
      return;
    }
    var fig = e.target.closest("figure.dg");
    if (fig) openLightbox(fig);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !lb.hidden) closeLightbox();
  });

  /* ── 導覽 scramble 懸停（reduced-motion 下停用） ── */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";
  function pick() { return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }

  document.querySelectorAll(".scramble").forEach(function (el) {
    var finalText = el.dataset.text || el.textContent;
    if (reduceMotion) return;
    var timer = null;

    el.addEventListener("mouseenter", function () {
      var frame = 0;
      var len = finalText.length;
      clearInterval(timer);
      timer = setInterval(function () {
        var out = "";
        for (var i = 0; i < len; i++) {
          var ch = finalText.charAt(i);
          if (ch === " ") { out += " "; continue; }
          out += (i < frame / 2) ? ch : pick();
        }
        el.textContent = out;
        frame++;
        if (frame / 2 >= len) { clearInterval(timer); el.textContent = finalText; }
      }, 38);
    });

    el.addEventListener("mouseleave", function () {
      clearInterval(timer);
      el.textContent = finalText;
    });
  });
})();
