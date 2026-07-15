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
  var pourBtn = document.getElementById('pourBtn');
  var replayBtn = document.getElementById('replayPour');
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('#steps li'));
  var swirlKicker = document.getElementById('swirlKicker');
  var swirlTitle = document.getElementById('swirlTitle');
  var swirlSub = document.getElementById('swirlSub');
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function lightSteps(frac) {
    var active = frac > 0.85 ? 3 : frac > 0.55 ? 2 : frac > 0.2 ? 1 : 0;
    stepEls.forEach(function (el, i) { el.classList.toggle('active', i <= active); });
  }

  /* once the pour finishes, the stage becomes the flavors carousel */
  function showFlavors() {
    if (!swirlSection || swirlSection.classList.contains('poured')) return;
    swirlSection.classList.add('poured');
    if (pourView) pourView.classList.remove('is-on');
    if (flavorsView) flavorsView.classList.add('is-on');
    if (swirlKicker) swirlKicker.textContent = 'on the machines';
    if (swirlTitle) swirlTitle.innerHTML = 'Meet the <span class="scribble scribble--coral">flavors.</span>';
    if (swirlSub) swirlSub.textContent = "Drag the cups or tap one to see what's on the machines.";
    window.dispatchEvent(new Event('resize')); /* let the carousel re-measure */
  }
  function showPour() {
    if (!swirlSection) return;
    swirlSection.classList.remove('poured');
    if (flavorsView) flavorsView.classList.remove('is-on');
    if (pourView) pourView.classList.add('is-on');
    if (swirlKicker) swirlKicker.textContent = 'how it works';
    if (swirlTitle) swirlTitle.innerHTML = 'Pull the <span class="scribble">lever.</span>';
    if (swirlSub) swirlSub.textContent = 'Watch a cup fill up, then meet the flavors it could be.';
    lightSteps(0);
    started = false;
    startPour();
  }

  var started = false, fallbackTimer = null;
  /* whatever happens, never leave the visitor stuck on the pour */
  function armFallback(ms) {
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(function () {
      if (swirlSection && !swirlSection.classList.contains('poured')) showFlavors();
    }, ms);
  }
  function startPour() {
    if (started || !video) return;
    /* if the browser can't play this clip (e.g. no transparent-webm support), skip to flavors */
    if (video.canPlayType && !video.canPlayType('video/webm; codecs="vp9"') && /\.webm(\?|#|$)/i.test(video.currentSrc || video.src)) {
      showFlavors(); return;
    }
    started = true;
    if (pourBtn) pourBtn.classList.add('hide');
    try { video.currentTime = 0; } catch (e) {}
    var pr = video.play();
    if (pr && pr.catch) { pr.catch(function () { started = false; if (pourBtn) pourBtn.classList.remove('hide'); }); }
    armFallback(11000);
  }

  if (video) {
    video.addEventListener('timeupdate', function () {
      if (video.duration) lightSteps(video.currentTime / video.duration);
    });
    video.addEventListener('ended', function () { lightSteps(1); showFlavors(); });
    video.addEventListener('error', showFlavors);
  }
  if (pourBtn) pourBtn.addEventListener('click', startPour);
  if (replayBtn) replayBtn.addEventListener('click', showPour);

  if (prefersReduced) {
    showFlavors(); /* no autoplay under reduced motion — go straight to flavors */
  } else if (video && swirlSection && 'IntersectionObserver' in window) {
    var swirlIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) startPour(); });
    }, { threshold: 0.5 });
    swirlIO.observe(swirlSection);
  } else {
    startPour();
  }

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
