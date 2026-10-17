# Decap CMS Preview Templates

These preview components render site-styled previews inside the Decap CMS
editor pane. They deliberately duplicate Hugo template markup so the
preview looks like the published page.

## Drift control

**These components must stay in sync with Hugo layouts.** When a Hugo
template changes its class names or structure, the corresponding preview
component must be updated to match.

### Component → Hugo template mapping

| Preview component   | Hugo template(s)                                       | Collections using it                                |
|---------------------|--------------------------------------------------------|-----------------------------------------------------|
| `ProsePreview`      | `_default/single.html`, `page-header.html`, `hero.html`| history, navbar                                     |
| `HeroOnlyPreview`   | `hero.html` (image variant)                            | Isai_Vizha, Pann_Research, Isai Vizha Awards, Isai Vizha Special Guest |
| `EventsPreview`     | `index.html` (events section)                          | events                                              |
| `TablePreview`      | `awards.html`, `chief-guests.html`, `pann-research.html`| (table/paragraph sub-files within the above)       |
| `SliderPreview`     | `index.html` (hero slider)                             | slider                                              |
| `ParagraphsPreview` | `isai-vizha.html` (prose sections)                     | (paragraph sub-files)                               |
| `TimelinePreview`   | `isai-vizha.html` (timeline section)                   | (timeline sub-file)                                 |

### Class vocabulary used

These are the CSS classes emitted by the preview components. All come
from the site's SCSS design system:

- `.hero`, `.hero--image`, `.hero__image`, `.hero__overlay`, `.hero__inner`, `.hero__title`, `.hero__subtitle`
- `.section`, `.section--alt`, `.section__header`, `.section__title`, `.section__intro`
- `.container`, `.container--prose`
- `.prose`
- `.listing`, `.listing__item`, `.listing__body`, `.listing__name`, `.listing__role`, `.listing__meta`, `.listing__meta-pair`
- `.eyebrow`, `.caption`
- `.data-table`, `.table-wrap`, `.table-wrap__scroll`
- `.btn`, `.btn--primary`, `.btn--secondary`

### Deleted classes — do NOT use

- `.card` — deleted
- `.badge` — deleted
- `.kolam-divider` — deleted

### How to verify after a Hugo template change

1. Open `/admin/` in the browser.
2. Click into an entry for the changed collection.
3. Compare the preview pane to the live page at the same URL.
4. If they differ, update `register.js` to match the new Hugo markup.
