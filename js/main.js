/* =========================================================
   Totally Twisted — interactions
   - sticky nav state
   - mobile menu
   - scroll-driven froyo pour + toppings
   - reveal-on-scroll
   ========================================================= */
(function () {
  'use strict';

  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');

  /* ---- sticky nav shade ---- */
  const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* ---- mobile menu ---- */
  const toggleMenu = (open) => {
    const isOpen = open ?? !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', isOpen);
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu());
  mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));

  /* ---- current year ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     THE SWIRL — pour + toppings driven by scroll progress
     ========================================================= */
  const swirl = document.getElementById('swirl');
  const froyo = document.getElementById('froyo');
  const pour = document.getElementById('pour');
  const bar = document.getElementById('swirlBar');
  const toppings = Array.from(document.querySelectorAll('[data-topping]'));
  const stepEls = Array.from(document.querySelectorAll('#steps li'));

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // ease that "sticks" softly at the end for a satisfying settle
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ticking = false;

  function render() {
    ticking = false;
    if (!swirl || prefersReduced) return;

    const rect = swirl.getBoundingClientRect();
    const vh = window.innerHeight;
    // progress through the pinned section: 0 when top hits viewport top, 1 near the end
    const total = rect.height - vh;
    const p = clamp(-rect.top / total, 0, 1);

    // progress bar
    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';

    /* --- phase 1: pour + fill (0 -> 0.55) --- */
    const fillP = clamp(p / 0.55, 0, 1);
    const fillEased = easeOut(fillP);

    // pour stream: visible while actively filling, dries up as the cup tops off
    if (pour) {
      const pouring = p > 0.04 && fillP < 0.98;
      pour.style.opacity = pouring ? '1' : '0';
      // stream length pulses toward the cup
      pour.style.height = pouring ? (150 - fillEased * 40).toFixed(0) + 'px' : '0px';
    }

    // reveal froyo bottom-up: hidden-from-top goes 100% -> 0%
    const hiddenTop = (1 - fillEased) * 100;
    froyo.style.clipPath = `inset(${hiddenTop.toFixed(1)}% 0 0 0)`;
    // tiny rise so the swirl looks like it's growing upward
    froyo.style.transform = `translateX(-50%) translateY(${(1 - fillEased) * 14}px)`;

    /* --- phase 2: toppings drop (0.55 -> 0.9) --- */
    const topP = clamp((p - 0.55) / 0.35, 0, 1);
    const n = toppings.length;
    toppings.forEach((el, i) => {
      // stagger each topping across the window
      const start = i / n;
      const local = clamp((topP - start) / (1 / n), 0, 1);
      const e = easeOut(local);
      const rot = (i % 2 ? 1 : -1) * (1 - e) * 40;
      el.style.opacity = e.toFixed(2);
      el.style.transform = `translateY(${(-260 * (1 - e)).toFixed(0)}px) rotate(${rot.toFixed(0)}deg)`;
    });

    /* --- steps activate across whole scroll --- */
    let activeStep;
    if (p < 0.4) activeStep = 0;
    else if (p < 0.6) activeStep = 1;
    else if (p < 0.9) activeStep = 2;
    else activeStep = 3;
    stepEls.forEach((el, i) => el.classList.toggle('active', i <= activeStep));
  }

  function requestRender() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender);
  render();

  /* =========================================================
     Reveal-on-scroll for sections
     ========================================================= */
  const revealTargets = document.querySelectorAll(
    '.story__copy, .story__art, .menu__head, .card, .band__col, .g, .visit__card'
  );
  revealTargets.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealTargets.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      io.observe(el);
    });
  } else {
    revealTargets.forEach((el) => el.classList.add('in'));
  }
})();
