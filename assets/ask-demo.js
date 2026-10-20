/* The Ask demo: a loop of the app's Ask overlay answering one made-up question.
   Plays only while on screen; with reduced motion it shows the finished answer. */
(function () {
  "use strict";
  var demo = document.getElementById("ask-demo");
  if (!demo) return;
  var blob = document.getElementById("ask-blob"), q = document.getElementById("ask-q"), ph = document.getElementById("ask-ph");
  var status = document.getElementById("ask-status"), ans = document.getElementById("ask-a"), src = document.getElementById("ask-src");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var QUESTION = "What did we decide about the release checklist?";
  var ANSWER = "On Tuesday you decided to ship on Thursday, so the database migration lands first. " +
    "The release checklist gained a rollback step and a QA sign-off. Two items are still open: update the changelog and tag the build.";
  /* Sources are always the user's own notes. Pills mirror the app: [type tag] Note title,
     with the type labels and dot colours of Plasmie's map filters. */
  var SOURCES = [
    ["Release checklist", "note"],
    ["Daily digest, Tue 14 Oct", "digest"],
    ["Ship on Thursday", "decision"]
  ];

  function morph(state) { if (window.Plasmie) window.Plasmie.morph(blob, state); }
  function reset() {
    q.textContent = ""; ans.textContent = ""; src.replaceChildren();
    ph.hidden = false; status.textContent = "⌃⌥⌘K"; demo.classList.remove("answered", "typing");
    morph("idle");
  }
  function addSource(s) {
    var li = document.createElement("li");
    li.innerHTML = '<span class="src-kind" data-type="' + s[1] + '"><i aria-hidden="true"></i>' + s[1] + "</span>" + s[0];
    src.appendChild(li);
  }
  function finished() {
    ph.hidden = true; q.textContent = QUESTION; ans.textContent = ANSWER;
    src.replaceChildren(); SOURCES.forEach(addSource);
    status.textContent = "From 3 notes, on device"; demo.classList.add("answered");
  }

  if (reduce) { finished(); return; }

  var timers = [], playing = false;
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function play() {
    timers.forEach(clearTimeout); timers = [];
    reset();
    var t = 700;
    at(t, function () { ph.hidden = true; demo.classList.add("typing"); });
    for (var i = 1; i <= QUESTION.length; i++) (function (n) { at(t + n * 45, function () { q.textContent = QUESTION.slice(0, n); }); })(i);
    t += QUESTION.length * 45 + 500;
    at(t, function () { demo.classList.remove("typing"); morph("ask"); status.textContent = "Searching your notes…"; });
    t += 1100;
    at(t, function () { status.textContent = "Answering on device…"; demo.classList.add("answered"); });
    var words = ANSWER.split(" ");
    words.forEach(function (w, k) { at(t + 200 + k * 70, function () { ans.textContent = words.slice(0, k + 1).join(" "); }); });
    t += 200 + words.length * 70 + 300;
    SOURCES.forEach(function (s, k) { at(t + k * 220, function () { addSource(s); }); });
    t += SOURCES.length * 220 + 200;
    at(t, function () { status.textContent = "From 3 notes, on device"; morph("success"); });
    at(t + 1200, function () { morph("idle"); });
    at(t + 5200, play);                                // hold the answer, then ask again
  }
  function stop() { timers.forEach(clearTimeout); timers = []; }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !playing) { playing = true; play(); }
        else if (!e.isIntersecting && playing) { playing = false; stop(); }
      });
    }, { threshold: 0.35 }).observe(demo);
  } else { play(); }
})();
