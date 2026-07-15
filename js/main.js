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
  var pourView = document.getElementById('pourView');
  var flavorsView = document.getElementById('flavorsView');
  var pourHint = document.getElementById('pourHint');
  var replayBtn = document.getElementById('replayPour');
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('#steps li'));
  var swirlKicker = document.getElementById('swirlKicker');
  var swirlTitle = document.getElementById('swirlTitle');
  var swirlSub = document.getElementById('swirlSub');
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var SCRUB_END = 0.56;   /* fraction of the section's scroll spent pouring */
  var SWITCH = 0.64;      /* after this, hand the stage over to the flavors */

  function lightSteps(frac) {
    var active = frac > 0.9 ? 3 : frac > 0.6 ? 2 : frac > 0.25 ? 1 : 0;
    stepEls.forEach(function (el, i) { el.classList.toggle('active', i <= active); });
  }

  /* toggle between the pour stage and the flavors carousel */
  var isFlavors = false;
  function setFlavors(on) {
    if (on === isFlavors || !swirlSection) return;
    isFlavors = on;
    swirlSection.classList.toggle('poured', on);
    if (pourView) pourView.classList.toggle('is-on', !on);
    if (flavorsView) flavorsView.classList.toggle('is-on', on);
    if (swirlKicker) swirlKicker.textContent = on ? 'on the machines' : 'how it works';
    if (swirlTitle) swirlTitle.innerHTML = on
      ? 'Meet the <span class="scribble scribble--coral">flavors.</span>'
      : 'Pull the <span class="scribble">lever.</span>';
    if (swirlSub) swirlSub.textContent = on
      ? "This one's California Tart. Drag the cups to meet the rest."
      : 'Scroll to pour a cup, then meet the flavors it could be.';
    if (on) window.dispatchEvent(new Event('resize')); /* let the carousel re-measure */
  }

  /* ---- smooth scroll-scrub: scroll position drives the pour, eased ---- */
  var videoReady = false, videoDur = 5, desired = 0, seeking = false, ticking = false;
  function applySeek() {
    if (!videoReady || seeking) return;
    var cur = video.currentTime, d = desired;
    if (Math.abs(cur - d) < 0.03) return;
    var next = Math.abs(d - cur) < 0.06 ? d : cur + (d - cur) * 0.34; /* ease toward target */
    seeking = true;
    try { video.currentTime = next; } catch (e) { seeking = false; }
  }
  if (video) {
    video.addEventListener('loadedmetadata', function () { videoReady = true; videoDur = video.duration || 5; requestScrub(); });
    video.addEventListener('seeked', function () { seeking = false; if (Math.abs(video.currentTime - desired) > 0.03) requestScrub(); });
    video.load();
  }

  function scrub() {
    ticking = false;
    if (!swirlSection) return;
    var rect = swirlSection.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

    if (pourHint) pourHint.classList.toggle('hide', p > 0.03);

    var fillP = clamp(p / SCRUB_END, 0, 1);
    desired = Math.min(videoDur - 0.05, fillP * videoDur);
    if (!prefersReduced) applySeek();
    lightSteps(fillP);
    setFlavors(p >= SWITCH);

    /* keep easing toward the target even after the scroll stops */
    if (!prefersReduced && !isFlavors && videoReady && Math.abs(video.currentTime - desired) > 0.03) requestScrub();
  }
  function requestScrub() { if (!ticking) { ticking = true; requestAnimationFrame(scrub); } }

  window.addEventListener('scroll', requestScrub, { passive: true });
  window.addEventListener('resize', requestScrub);
  if (replayBtn) replayBtn.addEventListener('click', function () {
    if (swirlSection) window.scrollTo({ top: window.scrollY + swirlSection.getBoundingClientRect().top + 4, behavior: 'smooth' });
  });

  if (prefersReduced) setFlavors(true); else requestScrub();

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

    function goTo(i) { var base = Math.round(current); target = base + wrapOffset(i - base); schedule(); }
    function step(dir) { target = Math.round(current) + dir; schedule(); }

    /* Drag only engages after a movement threshold, and only THEN captures the
       pointer — so a plain tap still delivers its click to the cup/nav button. */
    var pending = false, pointerId = null;
    carousel.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.carousel__nav')) return; /* let nav buttons click */
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
