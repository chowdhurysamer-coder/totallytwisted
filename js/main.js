/* =========================================================
   Totally Twisted — interactions
   - sticky nav + mobile menu
   - THE SWIRL: scroll builds the soft-serve coil by coil
     (twist-in with overshoot), then toppings fall & bounce
   - reveal-on-scroll
   ========================================================= */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  /* sticky nav shade */
  var onScrollNav = function () { nav.classList.toggle('scrolled', window.scrollY > 40); };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* mobile menu */
  function toggleMenu(open) {
    var isOpen = (typeof open === 'boolean') ? open : !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', isOpen);
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { toggleMenu(); });
  Array.prototype.forEach.call(mobileMenu.querySelectorAll('a'), function (a) {
    a.addEventListener('click', function () { toggleMenu(false); });
  });

  /* year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     THE SWIRL
     ========================================================= */
  var swirlSection = document.getElementById('swirl');
  var video = document.getElementById('swirlVideo');
  var replayBtn = document.getElementById('replayPour');
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('#steps li'));
  var swirlKicker = document.getElementById('swirlKicker');
  var swirlTitle = document.getElementById('swirlTitle');
  var swirlSub = document.getElementById('swirlSub');
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var SCRUB_END = 0.56;   /* fraction of the section's scroll spent pouring */
  var SWITCH = 0.64;      /* after this, the other flavor cups appear */

  function lightSteps(frac) {
    var active = frac > 0.9 ? 3 : frac > 0.6 ? 2 : frac > 0.25 ? 1 : 0;
    stepEls.forEach(function (el, i) { el.classList.toggle('active', i <= active); });
  }

  /* only the background/context changes here — the poured cup stays put */
  var isFlavors = false;
  function setFlavors(on) {
    if (on === isFlavors || !swirlSection) return;
    isFlavors = on;
    swirlSection.classList.toggle('poured', on);
    if (swirlKicker) swirlKicker.textContent = on ? 'on the machines' : 'how it works';
    if (swirlTitle) swirlTitle.innerHTML = on
      ? 'Meet the <span class="scribble scribble--coral">flavors.</span>'
      : 'Pull the <span class="scribble">lever.</span>';
    if (swirlSub) swirlSub.textContent = on
      ? "This one's California Tart. Drag the cups to meet the rest."
      : 'Scroll to pour a cup, then meet the flavors it could be.';
    if (on) window.dispatchEvent(new Event('resize')); /* let the carousel re-measure */
  }

  /* ---- the pour plays once per window; a new window shows it fresh ---- */
  var seen = false;
  try { seen = sessionStorage.getItem('tt_pour_seen') === '1'; } catch (e) {}
  function markSeen() { if (seen) return; seen = true; try { sessionStorage.setItem('tt_pour_seen', '1'); } catch (e) {} }

  /* ---- scroll sets a target time; the video PLAYS toward it (native = smooth) ---- */
  var videoReady = false, videoDur = 5, desired = 0, seeking = false, ticking = false, replaying = false;
  function driveVideo() {
    if (!videoReady || prefersReduced) return;
    var gap = desired - video.currentTime;
    if (gap > 0.03) {
      video.playbackRate = clamp(gap * 6, 0.7, 5);
      if (video.paused) { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
    } else if (gap < -0.06) {              /* scrolled back up */
      if (!video.paused) video.pause();
      if (!seeking) { seeking = true; try { video.currentTime = desired; } catch (e) { seeking = false; } }
    } else if (!video.paused) {
      video.pause();
    }
  }
  if (video) {
    var markReady = function () { videoReady = true; if (video.duration) videoDur = video.duration; };
    video.addEventListener('loadedmetadata', function () {
      markReady();
      if (seen || prefersReduced) { try { video.currentTime = videoDur - 0.05; } catch (e) {} } /* rest on the finished cup */
      requestScrub();
    });
    video.addEventListener('loadeddata', markReady);
    video.addEventListener('canplay', markReady);
    video.addEventListener('seeked', function () { seeking = false; });
    video.addEventListener('timeupdate', function () {
      if (replaying) return;                 /* let a manual replay run to the end */
      if (videoDur) lightSteps(video.currentTime / videoDur);
      if (!video.paused && video.currentTime >= desired - 0.02) video.pause(); /* hold at the scroll target */
    });
    video.addEventListener('ended', function () { if (replaying) { replaying = false; setFlavors(true); } });
    video.load();

    /* Safari won't buffer/decode a video until it's told to play, which left
       the cup blank and un-scrubbable. Kick playback once the section is in
       view (muted playback is allowed) so there are frames to scrub. */
    if (!seen && !prefersReduced && swirlSection && 'IntersectionObserver' in window) {
      var kicked = false;
      var kio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !kicked) {
            kicked = true;
            var pr = video.play();
            if (pr && pr.then) { pr.then(function () { markReady(); }).catch(function () {}); }
          }
        });
      }, { threshold: 0.12 });
      kio.observe(swirlSection);
    }
  }

  function scrub() {
    ticking = false;
    if (!swirlSection || seen || replaying) return;   /* poured once already — stay on the flavors */
    var rect = swirlSection.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    var fillP = clamp(p / SCRUB_END, 0, 1);
    desired = Math.min(videoDur - 0.03, fillP * videoDur);
    driveVideo();
    lightSteps(fillP);
    setFlavors(p >= SWITCH);
    if (p >= SWITCH) markSeen();             /* lock it so scrolling back won't replay */
  }
  function requestScrub() { if (!ticking) { ticking = true; requestAnimationFrame(scrub); } }

  window.addEventListener('scroll', requestScrub, { passive: true });
  window.addEventListener('resize', requestScrub);

  /* "watch the pour again" plays it straight through, then settles back on the flavors */
  if (replayBtn) replayBtn.addEventListener('click', function () {
    if (!video) return;
    replaying = true;
    setFlavors(false);
    try { video.currentTime = 0; } catch (e) {}
    video.playbackRate = 1;
    var pr = video.play();
    if (pr && pr.catch) pr.catch(function () { replaying = false; setFlavors(true); });
  });

  if (prefersReduced || seen) { setFlavors(true); }
  else requestScrub();

  /* =========================================================
     FLAVOR CAROUSEL — drag, tap, or arrow to rotate the cups
     ========================================================= */
  (function initCarousel() {
    var carousel = document.getElementById('carousel');
    if (!carousel) return;
    var cups = Array.prototype.slice.call(document.querySelectorAll('#carouselTrack .fcup'));
    var nameEl = document.getElementById('flavorName');
    var descEl = document.getElementById('flavorDesc');
    var dotsWrap = document.getElementById('flavorDots');
    var prevBtn = document.getElementById('flavPrev');
    var nextBtn = document.getElementById('flavNext');
    var n = cups.length;
    if (!n) return;

    /* the carousel is inert until the pour has finished */
    var swirlEl = document.getElementById('swirl');
    function locked() { return swirlEl && !swirlEl.classList.contains('poured'); }

    var current = 0;   /* continuous position (fractional while dragging/tweening) */
    var target = 0;    /* integer snap target */
    var dragging = false, startX = 0, startCurrent = 0, moved = false;
    var spacing = 190, raf = null, lastLabel = -1;

    var dots = [];
    for (var d = 0; d < n; d++) {
      var s = document.createElement('span');
      (function (idx) { s.addEventListener('click', function () { goTo(idx); }); })(d);
      dotsWrap.appendChild(s); dots.push(s);
    }

    function wrapOffset(o) { o = ((o % n) + n) % n; if (o > n / 2) o -= n; return o; }
    function activeIndex() { return ((Math.round(current) % n) + n) % n; }

    function place() {
      spacing = Math.min(carousel.clientWidth * 0.235, 235);
      cups.forEach(function (cup, i) {
        var off = wrapOffset(i - current);
        var ax = Math.abs(off);
        var x = off * spacing;
        var y = ax * 20;
        var scale = Math.max(0.5, 1 - ax * 0.16);
        cup.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ') rotate(' + (off * 5).toFixed(1) + 'deg)';
        cup.style.opacity = ax > 3.2 ? '0' : (ax > 2.2 ? '0.35' : '1');
        cup.style.zIndex = String(100 - Math.round(ax * 10));
        cup.setAttribute('aria-current', Math.round(off) === 0 ? 'true' : 'false');
      });
    }

    function updateLabel() {
      var cup = cups[activeIndex()];
      nameEl.textContent = cup.getAttribute('data-name');
      descEl.innerHTML = cup.getAttribute('data-desc');
      dots.forEach(function (dot, i) { dot.classList.toggle('on', i === activeIndex()); });
    }

    function tick() {
      raf = null;
      if (!dragging) {
        current += (target - current) * 0.18;
        if (Math.abs(target - current) < 0.001) current = target;
      }
      place();
      var idx = activeIndex();
      if (idx !== lastLabel) { lastLabel = idx; updateLabel(); }
      if (dragging || Math.abs(target - current) > 0.001) schedule();
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(tick); }

    function goTo(i) { if (locked()) return; var base = Math.round(current); target = base + wrapOffset(i - base); schedule(); }
    function step(dir) { if (locked()) return; target = Math.round(current) + dir; schedule(); }

    /* Drag only engages after a movement threshold, and only THEN captures the
       pointer — so a plain tap still delivers its click to the cup/nav button. */
    var pending = false, pointerId = null;
    carousel.addEventListener('pointerdown', function (e) {
      if (locked() || e.target.closest('.carousel__nav')) return; /* inert until poured; let nav buttons click */
      pending = true; dragging = false; moved = false;
      startX = e.clientX; startCurrent = current; pointerId = e.pointerId;
    });
    carousel.addEventListener('pointermove', function (e) {
      if (!pending && !dragging) return;
      var dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 6) return;
        dragging = true; moved = true;
        carousel.classList.add('dragging');
        try { carousel.setPointerCapture(pointerId); } catch (err) {}
      }
      current = startCurrent - dx / spacing;
      schedule();
    });
    function endDrag() {
      pending = false;
      if (!dragging) return;
      dragging = false; carousel.classList.remove('dragging');
      target = Math.round(current); schedule();
    }
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);

    cups.forEach(function (cup, i) {
      cup.addEventListener('click', function () { if (!moved) goTo(i); });
    });
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });

    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    });

    window.addEventListener('resize', place);
    updateLabel(); place();
  })();

  /* =========================================================
     Reveal-on-scroll
     ========================================================= */
  var targets = document.querySelectorAll(
    '.story__copy .reveal, .menu__head, .card, .band__col, .g, .visit__card'
  );
  Array.prototype.forEach.call(targets, function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(targets, function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      io.observe(el);
    });
  } else {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('in'); });
  }
})();
