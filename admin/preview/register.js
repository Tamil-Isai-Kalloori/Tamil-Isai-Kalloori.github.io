/**
 * register.js — Decap CMS preview style & template registration.
 *
 * Loaded as type="module" after decap-cms.js so window.CMS / window.h /
 * window.createClass are guaranteed to exist.
 *
 * ARCHITECTURE:
 * - Register Google Fonts + site stylesheet for the preview iframe.
 * - Define thin preview components that mirror Hugo template markup.
 * - Set lang= on the preview wrapper for Tamil typography (:lang(ta) rules).
 *
 * DRIFT WARNING:
 * These components duplicate Hugo template class names. When a Hugo layout
 * changes its markup, the corresponding preview component must be updated.
 * See README.md in this directory for the mapping.
 */

// ---------------------------------------------------------------------------
// 1. Preview styles — fonts + site CSS into the iframe <head>
// ---------------------------------------------------------------------------

// Google Fonts — exact URLs from layouts/partials/head.html
CMS.registerPreviewStyle(
  'https://fonts.googleapis.com/css2?family=Anek+Tamil:wdth,wght@75..125,100..800&display=swap'
);
CMS.registerPreviewStyle(
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap'
);
CMS.registerPreviewStyle(
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap'
);
CMS.registerPreviewStyle(
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap'
);

// Site stylesheet. The built CSS is fingerprinted (/css/main.min.<hash>.css in
// production), so /css/main.css does not exist there. Read the real href from
// the home page's <link rel="stylesheet">; fall back to the unfingerprinted
// path (dev server) if the lookup fails.
(function registerSiteStyle() {
  var fallback = '/css/main.css';
  fetch('/', { credentials: 'same-origin' })
    .then(function (res) { return res.ok ? res.text() : Promise.reject(new Error('HTTP ' + res.status)); })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var links = doc.querySelectorAll('link[rel="stylesheet"]');
      var href = null;
      for (var i = 0; i < links.length; i++) {
        var v = links[i].getAttribute('href') || '';
        if (/^\/css\/main[^/]*\.css(\?.*)?$/.test(v)) { href = v; break; }
      }
      CMS.registerPreviewStyle(href || fallback);
    })
    .catch(function (err) {
      console.warn('[TIK CMS] Could not locate site stylesheet, using fallback.', err);
      CMS.registerPreviewStyle(fallback);
    });
})();

// ---------------------------------------------------------------------------
// 2. Locale detection helper
// ---------------------------------------------------------------------------

/**
 * Determine the content locale. Uses Decap's undocumented `locale` prop
 * with a Tamil-script detection fallback.
 */
function detectLocale(props) {
  // Files-collection entries are named <page>_ta / <page>_en in config.yml,
  // and Decap passes that name as the entry slug. Most reliable signal.
  const slug = props.entry && props.entry.get('slug');
  const m = typeof slug === 'string' && slug.match(/_(ta|en)$/);
  if (m) {
    return m[1];
  }

  // Decap may pass locale as a prop (undocumented but real)
  const localeProp = props.locale;
  if (localeProp && typeof localeProp === 'string') {
    return localeProp;
  }

  // Fallback: inspect the body/title for Tamil Unicode block (U+0B80–U+0BFF)
  const entry = props.entry;
  const title = entry.getIn(['data', 'title']) || '';
  const body = entry.getIn(['data', 'body']) || '';
  const sample = title + body;
  if (/[\u0B80-\u0BFF]/.test(sample)) {
    return 'ta';
  }

  return 'en';
}

// ---------------------------------------------------------------------------
// 3. Preview wrapper — sets lang= and provides site chrome context
// ---------------------------------------------------------------------------

/**
 * Wraps preview content in a structure that mirrors baseof.html:
 *   <div lang="ta|en"> ← triggers :lang(ta) CSS rules
 *     <main id="main-content">
 *       {children}
 *     </main>
 *   </div>
 *
 * We skip header/footer — they add no editorial value in the preview
 * and would need nav data we don't have in the CMS context.
 */
function previewWrapper(props) {
  const lang = detectLocale(props);
  const children = Array.prototype.slice.call(arguments, 1);
  return h(
    'div',
    { lang: lang, style: { backgroundColor: 'var(--paper, #FAFAF5)', minHeight: '100vh' } },
    h.apply(null, ['main', { id: 'main-content' }].concat(children))
  );
}

// ---------------------------------------------------------------------------
// 4. Preview components
// ---------------------------------------------------------------------------

// -- A. ProsePreview --------------------------------------------------------
// Used by: every page entry (title + optional hero_image + markdown body).
// Mirrors: single.html — page-header + .section > .container--prose > .prose
// Bespoke layouts (tables, galleries, listings) are NOT reproduced; this shows
// the title, hero and prose, which is what staff edit.

var ProsePreview = createClass({
  render: function () {
    const entry = this.props.entry;
    const title = entry.getIn(['data', 'title']) || '';
    const heroImage = entry.getIn(['data', 'hero_image']);

    let heroEl;
    if (heroImage) {
      const imgSrc = this.props.getAsset(heroImage).toString();
      heroEl = h('header', { className: 'hero hero--image' },
        h('img', { className: 'hero__image', src: imgSrc, alt: '', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } }),
        h('div', { className: 'hero__overlay' },
          h('div', { className: 'hero__inner container' },
            h('h1', { className: 'hero__title' }, title)
          )
        )
      );
    } else {
      heroEl = h('section', { className: 'section' },
        h('div', { className: 'container' },
          h('div', { className: 'section__header' },
            h('h1', { className: 'section__title' }, title)
          )
        )
      );
    }

    return previewWrapper(this.props,
      heroEl,
      h('section', { className: 'section' },
        h('div', { className: 'container--prose' },
          h('div', { className: 'prose' },
            this.props.widgetFor('body')
          )
        )
      )
    );
  }
});

// -- B. SliderPreview -------------------------------------------------------
// Used by: home_slider_ta / home_slider_en (home/slider.{ta,en}.md)

var SliderPreview = createClass({
  render: function () {
    const entry = this.props.entry;
    const title = entry.getIn(['data', 'title']) || '';
    const slides = entry.getIn(['data', 'slides']);

    const slideEls = slides ? slides.map(function (slide, i) {
      const heading = slide.get('heading') || '';
      const image = slide.get('image');
      const imgSrc = image ? this.props.getAsset(image).toString() : '';

      return h('div', { key: i, style: { position: 'relative', marginBottom: 'var(--space-6)' } },
        imgSrc ? h('img', { src: imgSrc, alt: '', style: { width: '100%', height: '300px', objectFit: 'cover' } }) : null,
        h('div', { style: { position: 'absolute', bottom: 'var(--space-4)', left: 'var(--space-4)', color: '#FAFAF5', textShadow: '0 1px 8px rgba(0,0,0,0.6)' } },
          h('h2', { className: 'hero__title', style: { fontSize: 'var(--text-h2)' } }, heading)
        )
      );
    }.bind(this)).toArray() : [];

    return previewWrapper(this.props,
      h('section', { className: 'section' },
        h('div', { className: 'container' },
          h('div', { className: 'section__header' },
            h('h2', { className: 'section__title' }, title)
          ),
          slideEls
        )
      )
    );
  }
});

// ---------------------------------------------------------------------------
// 4. Register preview templates
// ---------------------------------------------------------------------------
//
// Decap looks previews up by COLLECTION name for folder collections but by
// FILE-ENTRY name (the `name:` of each item under `files:`) for files
// collections. Every collection in config.yml is a files collection, so these
// are entry names, each in a _ta and an _en variant.
//
// Not registered, because config.yml sets `editor: preview: false` on them:
//   navigation  (navbar_ta / navbar_en)  — structural data, no page to preview
//   site_data   (data_*)                 — data tables, rendered by bespoke templates

var LOCALES = ['ta', 'en'];

// Page entries previewed with title + hero + prose.
var PAGE_ENTRIES = [
  'home_page',
  'about', 'about_history', 'about_trustees', 'about_leaders',
  'vizha', 'vizha_pann', 'vizha_awards', 'vizha_guests',
  'college', 'college_history', 'college_principals', 'college_day', 'college_evening',
  'college_grade', 'college_online', 'college_distance', 'college_openuni', 'college_faculty',
  'museum', 'library',
  'gallery', 'media', 'events_page', 'events_upcoming', 'events_past', 'news_page',
  'admissions', 'contact'
];

LOCALES.forEach(function (loc) {
  PAGE_ENTRIES.forEach(function (name) {
    CMS.registerPreviewTemplate(name + '_' + loc, ProsePreview);
  });
  CMS.registerPreviewTemplate('home_slider_' + loc, SliderPreview);
});

// Event entries live in a FOLDER collection, so the preview is keyed by the
// collection name (not per locale): Decap shows whichever locale is being edited.
CMS.registerPreviewTemplate('events', ProsePreview);

console.log('[TIK CMS] Preview templates registered.');
