/**
 * main.js — Tamil Isai Kalloori site chrome interactions.
 *
 * Vanilla ES6+, no dependencies, no build step.
 *
 * Responsibilities:
 * 1. Mobile/drawer nav toggle with focus trap, Escape close, body scroll lock
 * 2. iOS --vh custom property fix for full-height drawer
 * 3. TOC scrollspy — marks the active section in the sidebar table of contents
 * 4. YouTube facade — inject iframe on click/Enter (saves ~1MB per embed)
 * 5. Stat counter — count-up animation via IntersectionObserver
 *
 * What this file does NOT do (handled by CSS in motion/_motion.scss):
 * - Scroll reveals (animation-timeline: view() — CSS-only)
 * - Header elevation on scroll (animation-timeline: scroll() — CSS-only)
 * - Parallax photo bands (animation-timeline: scroll() — CSS-only)
 * - Ken Burns dolly zoom (animation-timeline: view() — CSS-only)
 * - IntersectionObserver for reveals (removed — was causing stuck-invisible sections)
 *
 * The js-enabled class is added inline in <head> to avoid FOUC.
 * Do not duplicate it here.
 *
 * Every DOM query is guarded so a missing element cannot throw.
 */
(function () {
  'use strict';

  // =========================================================================
  // 1. iOS --vh custom property fix
  // =========================================================================
  // Mobile Safari's 100vh includes the address bar, causing the drawer to
  // extend behind it. This sets a --vh custom property to the actual
  // inner height, updated on resize. The drawer uses
  // height: calc(var(--vh, 1vh) * 100) as a fallback-safe value.
  function setVh() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVh();
  window.addEventListener('resize', setVh, { passive: true });

  // =========================================================================
  // 2. Drawer nav toggle
  // =========================================================================
  // Opens/closes the full-screen navigation drawer. Keeps aria-expanded in
  // sync, traps focus while open, closes on Escape, locks body scroll, and
  // restores focus to the toggle button on close.
  //
  // The drawer is available at ALL viewports (desktop + mobile). On desktop,
  // it holds the full nav; the header bar shows only 5 primary items.
  var header = document.getElementById('site-header');
  var toggle = document.getElementById('mobile-nav-toggle');
  var drawer = document.getElementById('mobile-nav');
  var closeBtn = document.getElementById('mobile-nav-close');

  if (toggle && drawer && header) {
    // Prevent the anchor's default hash navigation — JS takes over
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      openDrawer();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeDrawer();
      });
    }

    function openDrawer() {
      header.classList.add('site-header--open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      // Move focus into the drawer for accessibility
      var firstFocusable = drawer.querySelector('a, button');
      if (firstFocusable) firstFocusable.focus();

      // Listen for Escape key
      document.addEventListener('keydown', onEscape);
    }

    function closeDrawer() {
      header.classList.remove('site-header--open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';

      // Restore focus to the toggle button
      toggle.focus();

      document.removeEventListener('keydown', onEscape);
    }

    function onEscape(e) {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    }

    // Focus trap: keep Tab cycling within the drawer while open
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;

      var focusable = drawer.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab from first → wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab from last → wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // =========================================================================
  // 3. TOC scrollspy
  // =========================================================================
  // Marks the active heading's link in the sidebar table of contents.
  // Hugo generates .TableOfContents with plain <a> tags (no class).
  // The SCSS styles .toc__link--active, so we add that class to the
  // matching <a>. This is a navigational state indicator, not decoration —
  // it must work regardless of prefers-reduced-motion.
  var tocNav = document.querySelector('.toc__nav');
  var tocLinks = tocNav ? tocNav.querySelectorAll('a[href^="#"]') : [];
  if (tocLinks.length > 0) {
    // Build a map of heading-id → link element
    var linkMap = {};
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      if (id) linkMap[id] = link;
    });

    var headings = Object.keys(linkMap)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if (headings.length > 0) {
      var activeLink = null;

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var link = linkMap[entry.target.id];
          if (!link) return;
          if (activeLink) activeLink.classList.remove('toc__link--active');
          link.classList.add('toc__link--active');
          activeLink = link;
        });
      }, {
        // Fire when a heading enters the top 20% of the viewport
        rootMargin: '0px 0px -80% 0px',
        threshold: 0
      });

      headings.forEach(function (h) { observer.observe(h); });
    }
  }

  // =========================================================================
  // 4. YouTube facade — inject iframe on click
  // =========================================================================
  // Delegated handler on document.body. Any .yt-facade with a valid
  // data-video-id gets an iframe injected on activation (click, Enter, Space).
  // The iframe points at youtube-nocookie.com for privacy.
  //
  // This saves ~1MB of YouTube JS per embed on Indian mobile data.
  document.body.addEventListener('click', handleFacade);
  document.body.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var facade = e.target.closest('.yt-facade');
      if (facade) {
        e.preventDefault();
        activateFacade(facade);
      }
    }
  });

  function handleFacade(e) {
    var facade = e.target.closest('.yt-facade');
    if (facade) activateFacade(facade);
  }

  function activateFacade(el) {
    if (el.classList.contains('yt-facade--active')) return;
    var id = el.getAttribute('data-video-id');
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;

    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('title', el.getAttribute('aria-label') || 'Video');
    el.appendChild(iframe);
    el.classList.add('yt-facade--active');
  }

  // =========================================================================
  // 5. Stat counter — count-up on scroll into view
  // =========================================================================
  // Animates stat numbers from 0 to their final value when scrolled into
  // view. The FINAL number is always the initial text content in the markup,
  // so it reads correctly with JS disabled.
  //
  // Under prefers-reduced-motion: reduce, the count is skipped entirely —
  // the number stays at its final value.
  var statValues = document.querySelectorAll('.stat-grid__value[data-count]');
  if (statValues.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        statObserver.unobserve(el);

        var target = parseInt(el.getAttribute('data-count'), 10);
        if (isNaN(target) || target <= 0) return;

        var suffix = el.getAttribute('data-suffix') || '';
        // Years (1943) must not be thousands-separated into "1,943".
        var group = el.getAttribute('data-group') !== 'false';
        var duration = 1200; // ms
        var start = performance.now();

        el.classList.add('stat-grid__value--counting');

        function tick(now) {
          var elapsed = now - start;
          var progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          var eased = 1 - Math.pow(1 - progress, 3);
          var current = Math.round(eased * target);
          el.textContent = (group ? current.toLocaleString() : String(current)) + suffix;

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            el.textContent = (group ? target.toLocaleString() : String(target)) + suffix;
            el.classList.remove('stat-grid__value--counting');
          }
        }

        requestAnimationFrame(tick);
      });
    }, { threshold: 0.3 });

    statValues.forEach(function (el) { statObserver.observe(el); });
  }
})();
