/* Light / dark / auto. Auto follows the system. The choice is kept in this browser only. */
(function () {
  "use strict";
  var root = document.documentElement, KEY = "plasmie-theme";
  var buttons = document.querySelectorAll(".theme button[data-theme-set]");
  function current() { return root.getAttribute("data-theme") || "auto"; }
  function apply(mode) {
    if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode);
    else root.removeAttribute("data-theme");
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-theme-set") === mode ? "true" : "false"); });
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach(function (m) {
      var want = m.getAttribute("data-color");
      if (mode === "auto") m.setAttribute("media", m.getAttribute("data-media"));
      else if (m.getAttribute("data-media").indexOf(mode) >= 0) m.removeAttribute("media");
      else m.setAttribute("media", "not all");
      m.setAttribute("content", want);
    });
  }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      var mode = b.getAttribute("data-theme-set");
      apply(mode);
      try { if (mode === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) { /* storage blocked: still works for this visit */ }
    });
  });
  apply(current());
})();
