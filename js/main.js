/* =========================================================
   Totally Twisted — interactions
   - sticky nav + mobile menu
   - scroll-scrub froyo pour (real photo revealed bottom-up)
   - toppings drop, steps light up, progress bar, fill shine
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
     THE SWIRL — pour scrub
     ========================================================= */
  var swirl = document.getElementById('swirl');
  var froyo = document.getElementById('froyo');
  var shine = document.getElementById('froyoShine');
  var pour = document.getElementById('pour');
  var bar = document.getElementById('swirlBar');
  var drops = Array.prototype.slice.call(document.querySelectorAll('[data-drop]'));
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('#steps li'));

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ticking = false;

  function render() {
    ticking = false;
    if (!swirl || prefersReduced) return;

    var rect = swirl.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = rect.height - vh;
    var p = clamp(-rect.top / total, 0, 1);

    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';

    /* phase 1: pour + fill (0 -> 0.55) */
    var fillP = clamp(p / 0.55, 0, 1);
    var fillE = easeOut(fillP);

    if (pour) {
      var pouring = p > 0.04 && fillP < 0.98;
      pour.style.opacity = pouring ? '1' : '0';
      pour.style.height = pouring ? (150 - fillE * 40).toFixed(0) + 'px' : '0px';
    }

    /* reveal froyo bottom-up */
    var hiddenTop = (1 - fillE) * 100;
    froyo.style.clipPath = 'inset(' + hiddenTop.toFixed(1) + '% 0 0 0)';
    froyo.style.transform = 'translateX(-50%) translateY(' + ((1 - fillE) * 14).toFixed(0) + 'px)';

    /* fill shine rides the surface while pouring */
    if (shine) {
      shine.style.top = hiddenTop.toFixed(1) + '%';
      shine.style.opacity = (fillP > 0.02 && fillP < 0.99) ? '1' : '0';
    }

    /* phase 2: toppings drop (0.55 -> 0.9) */
    var topP = clamp((p - 0.55) / 0.35, 0, 1);
    var n = drops.length;
    drops.forEach(function (el, i) {
      var start = i / n;
      var local = clamp((topP - start) / (1 / n), 0, 1);
      var e = easeOut(local);
      var rot = (i % 2 ? 1 : -1) * (1 - e) * 40;
      el.style.opacity = e.toFixed(2);
      el.style.transform = 'translateY(' + (-260 * (1 - e)).toFixed(0) + 'px) rotate(' + rot.toFixed(0) + 'deg)';
    });

    /* steps light up across whole scroll */
    var active = p < 0.4 ? 0 : p < 0.6 ? 1 : p < 0.9 ? 2 : 3;
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
