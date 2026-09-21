/*
 * Drives the first-load splash (see splash.css). Plain script on purpose: it must run before React exists.
 *
 *  - fills the logo towards ~80 % while the app loads, then finishes the fill once React reports it is ready
 *  - the app calls lamicoSplash.mounted() once, and hold()/release() around anything it is still loading
 *  - when everything is ready the water reaches the top, the real logo colours fade in, the splash fades out
 *    and the "lamico:splash-done" event lets the homepage start its intro
 */
(function () {
  var el = document.getElementById('splash');
  if (!el) return;
  var rise = el.querySelector('.splash-rise');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try {
    seen = sessionStorage.getItem('lamico:splash-seen') === '1';
    sessionStorage.setItem('lamico:splash-seen', '1');
  } catch (e) {
    /* storage unavailable: behave like a first visit */
  }

  var MIN_SHOW = reduced ? 250 : seen ? 0 : 550; // a splash that flashes by looks like a glitch
  var QUIET_MS = 700; // returning visitors only see it when loading is really slow
  var MAX_MS = 10000; // never trap the visitor

  var start = performance.now();
  var last = start;
  var lastChange = start;
  var p = -0.07; // below the bottom edge: nothing is visible yet
  var TOP = 1.12; // fully covered, including the wave crest
  var mounted = false;
  var holds = 0;
  var finishing = false;
  var done = false;

  if (seen) el.classList.add('is-quiet');

  function setLevel() {
    rise.style.setProperty('--p', p.toFixed(4));
  }

  function finish() {
    done = true;
    el.classList.remove('is-quiet');
    el.classList.add('is-filled');
    setTimeout(function () {
      el.classList.add('is-done');
      window.dispatchEvent(new Event('lamico:splash-done'));
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 700);
    }, reduced ? 60 : 260);
  }

  function frame(now) {
    if (done) return;
    var dt = Math.min(64, now - last);
    last = now;

    if (seen && !finishing && now - start > QUIET_MS) el.classList.remove('is-quiet');

    var ready = mounted && holds === 0 && now - lastChange > 80 && now - start >= MIN_SHOW;
    if (!finishing && (ready || now - start > MAX_MS)) finishing = true;

    if (reduced) {
      p = TOP;
    } else if (finishing) {
      p = Math.min(TOP, p + (dt / 300) * 0.75); // brisk, steady finish
    } else {
      p += (0.8 - p) * (1 - Math.pow(0.5, dt / 420)); // eases towards 80 % and waits
    }
    setLevel();

    if (finishing && p >= TOP) return finish();
    requestAnimationFrame(frame);
  }

  window.lamicoSplash = {
    mounted: function () {
      mounted = true;
      lastChange = performance.now();
    },
    hold: function () {
      holds += 1;
      lastChange = performance.now();
    },
    release: function () {
      holds = Math.max(0, holds - 1);
      lastChange = performance.now();
    },
  };

  setLevel();
  requestAnimationFrame(frame);
})();
