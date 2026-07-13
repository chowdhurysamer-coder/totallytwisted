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
  var coils = Array.prototype.slice.call(document.querySelectorAll('#softserve .coil, #softserve .coil-tip'));
  var drops = Array.prototype.slice.call(document.querySelectorAll('#topdrops .tdrop'));
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('#steps li'));

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ticking = false;

  /* pop-in with a soft overshoot — reads as the serve "settling" */
  function easeOutBack(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
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

    /* ---- phase 1 (0 -> 0.5): the serve coils up, bottom to tip ---- */
    var fp = clamp(p / 0.5, 0, 1);
    var n = coils.length;

    coils.forEach(function (el, i) {
      /* each coil owns a slice of the fill; slight overlap keeps it fluid */
      var local = clamp(fp * (n + 0.6) - i, 0, 1);
      var e = easeOutBack(local);
      var base = parseFloat(el.dataset.base || 0);
      var dir = (i % 2 ? -1 : 1);              /* alternate twist direction */
      var scale = 0.25 + 0.75 * e;
      var rot = base + (1 - local) * 110 * dir; /* twists into place */
      var lift = (1 - e) * 30;                  /* rises as it lands */
      el.style.opacity = local > 0.02 ? '1' : '0';
      el.style.transform = 'translateY(' + lift.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
    });

    /* pour stream runs while filling, shortens as the stack rises */
    if (pour) {
      var pouring = p > 0.02 && fp < 0.97;
      pour.style.opacity = pouring ? '1' : '0';
      pour.style.height = pouring ? Math.max(50, 205 - fp * 150).toFixed(0) + 'px' : '0px';
    }

    /* ---- phase 2 (0.52 -> 0.92): toppings fall in & bounce ---- */
    var tp = clamp((p - 0.52) / 0.4, 0, 1);
    var gap = 0.08, dur = 0.34;
    drops.forEach(function (el, i) {
      var local = clamp((tp - i * gap) / dur, 0, 1);
      var b = easeOutBounce(local);
      var fx = +el.dataset.x, fy = +el.dataset.y, fr = +el.dataset.r;
      var y = fy - (1 - b) * 340;                     /* falls from above */
      var rot = fr + (1 - local) * (i % 2 ? -1 : 1) * 200; /* tumbles down */
      el.style.opacity = local > 0 ? '1' : '0';
      el.style.left = fx + 'px';
      el.style.top = y.toFixed(1) + 'px';
      el.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';
    });

    /* completion sticker pops at the end */
    if (doneSticker) doneSticker.classList.toggle('pop', p > 0.93);

    /* steps light up in sync with the phases */
    var active = p > 0.92 ? 3 : p > 0.52 ? 2 : p > 0.08 ? 1 : 0;
    stepEls.forEach(function (el, i) { el.classList.toggle('active', i <= active); });
  }

  function requestRender() {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender);
  render();

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
