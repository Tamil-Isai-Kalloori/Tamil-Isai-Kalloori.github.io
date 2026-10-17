/* events.js: re-checks event status when the page is viewed. The HTML is already correct as of its build; this keeps it right until the next one. */
(function () {
  'use strict';
  var now = function () { return Date.now(); };
  var t = function (el) { return Date.parse(el.getAttribute('data-start')); };
  var e = function (el) { return Date.parse(el.getAttribute('data-end')); };
  var state = function (el) { return e(el) < now() ? 'past' : t(el) <= now() ? 'now' : 'upcoming'; };

  function update() {
    document.querySelectorAll('[data-events-upcoming]').forEach(function (box) {
      var live = 0;
      box.querySelectorAll('[data-event]').forEach(function (it) {
        var ended = state(it) === 'past';
        it.hidden = ended;
        if (!ended) live++;
      });
      var empty = box.querySelector('[data-events-empty]');
      if (empty) empty.hidden = live > 0;
    });
    document.querySelectorAll('[data-event-status]').forEach(function (s) {
      var k = state(s), key = k === 'past' ? 'ended' : k;
      s.textContent = s.getAttribute('data-l-' + key);
      s.className = 'event-status event-status--' + k;
      s.hidden = s.getAttribute('data-show') === 'now' && k !== 'now';
    });
    document.querySelectorAll('[data-event] [data-registration]').forEach(function (r) {
      r.hidden = state(r.closest('[data-event]')) !== 'upcoming';
    });
    document.querySelectorAll('[data-countdown]').forEach(function (c) {
      var ms = t(c) - now();
      if (ms <= 0) { c.hidden = true; return; }
      var a = function (k) { return c.getAttribute('data-' + k); };
      var unit = function (n, one, many) { return n + ' ' + (n === 1 ? a(one) : a(many)); };
      var mins = Math.floor(ms / 6e4), h = Math.floor(mins / 60), d = Math.floor(h / 24);
      var parts = [];
      if (d) {
        parts.push(unit(d, 'd1', 'd'));
        if (h % 24) parts.push(unit(h % 24, 'h1', 'h'));
      } else if (h) {
        parts.push(unit(h, 'h1', 'h'));
        if (mins % 60) parts.push(unit(mins % 60, 'm1', 'm'));
      } else if (mins) {
        parts.push(unit(mins, 'm1', 'm'));
      }
      c.textContent = parts.length ? a('prefix') + ' ' + parts.join(', ') : a('soon');
    });
  }
  update();
  setInterval(update, 60000);
})();
