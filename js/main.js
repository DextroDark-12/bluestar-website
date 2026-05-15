/* ===== BlueStar Granite & Marble — main.js ===== */

(function () {
  'use strict';

  /* ── Navbar scroll handler ── */
  const navbar = document.querySelector('.navbar');

  function onScroll() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load in case page is already scrolled

  /* ── Mobile hamburger toggle ── */
  const hamburger = document.querySelector('.hamburger');

  if (hamburger && navbar) {
    hamburger.addEventListener('click', function () {
      const isOpen = navbar.classList.toggle('open');
      this.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  /* ── Close mobile menu on nav link click ── */
  const navLinks = document.querySelectorAll('.navbar__links a');

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navbar.classList.remove('open');
      if (hamburger) hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ── IntersectionObserver: reveal on scroll ── */
  var observerOptions = {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  };

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ── Smooth scroll for anchor links ── */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;

    var targetId = link.getAttribute('href');
    if (targetId === '#') return;

    var target = document.querySelector(targetId);
    if (!target) return;

    e.preventDefault();

    var navHeight = navbar ? navbar.offsetHeight : 0;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 12;

    window.scrollTo({ top: top, behavior: 'smooth' });
  });

})();