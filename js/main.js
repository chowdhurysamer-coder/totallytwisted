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
  var swirl = document.getElementById('swirl');
  var pour = document.getElementById('pour');
  var bar = document.getElementById('swirlBar');
  var doneSticker = document.getElementById('doneSticker');
  var plain = document.getElementById('swirlPlain');
  var toppedImg = document.getElementById('swirlTopped');
  var bits = Array.prototype.slice.call(document.querySelectorAll('#bits .bit'));
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('#steps li'));

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ticking = false;

  /* smooth deceleration — reads as the cup filling and settling */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  /* gravity landing with a real bounce */
  function easeOutBounce(t) {
    var n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }

  function render() {
    ticking = false;
    if (!swirl || prefersReduced) return;

    var rect = swirl.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = rect.height - vh;
    var p = total > 0 ? clamp(-rect.top / total, 0, 1) : 1;

    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';

    /* ---- phase 1 (0 -> 0.55): the real cup fills, bottom to tip ---- */
    var fp = clamp(p / 0.55, 0, 1);
    var fill = easeOutCubic(fp);
    if (plain) plain.style.setProperty('--hide', ((1 - fill) * 100).toFixed(1) + '%');

    /* pour stream runs while filling, shortens as the swirl rises */
    if (pour) {
      var pouring = p > 0.015 && fp < 0.98;
      pour.style.opacity = pouring ? '1' : '0';
      pour.style.height = pouring ? Math.max(24, 118 - fill * 100).toFixed(0) + 'px' : '0px';
    }

    /* ---- phase 2 (0.5 -> 0.92): toppings rain in, loaded cup reveals ---- */
    var tp = clamp((p - 0.5) / 0.42, 0, 1);
    var topped = clamp((tp - 0.2) / 0.7, 0, 1);
    if (toppedImg) toppedImg.style.opacity = topped.toFixed(3);

    var gap = 0.07, dur = 0.4;
    bits.forEach(function (el, i) {
      var local = clamp((tp - i * gap) / dur, 0, 1);
      var b = easeOutBounce(local);
      var fx = +el.dataset.x, fy = +el.dataset.y, fr = +el.dataset.r;
      var y = (1 - b) * -160;                                 /* falls from above */
      var rot = fr + (1 - local) * (i % 2 ? -1 : 1) * 220;    /* tumbles down */
      el.style.left = fx + '%';
      el.style.top = fy + '%';
      el.style.opacity = (local > 0 ? (1 - topped) : 0).toFixed(3); /* fade out as the loaded cup appears */
      el.style.transform = 'translate(-50%,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
    });

    /* completion sticker pops at the end */
    if (doneSticker) doneSticker.classList.toggle('pop', p > 0.9);

    /* steps light up in sync with the phases */
    var active = p > 0.9 ? 3 : p > 0.5 ? 2 : p > 0.08 ? 1 : 0;
    stepEls.forEach(function (el, i) { el.classList.toggle('active', i <= active); });
  }

  function requestRender() {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender);
  render();

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
      spacing = Math.min(carousel.clientWidth * 0.26, 190);
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
