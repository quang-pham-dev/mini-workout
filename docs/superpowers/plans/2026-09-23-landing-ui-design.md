# Landing UI Design Proposal

**Status:** Editorial fitness direction approved; static Home prototype
implemented. Draft copy and generated images still require product/marketing
approval before launch.
**Date:** 2026-09-23
**Related plan:** [Landing Platform Architecture and Delivery Plan](./2026-09-22-landing-platform-architecture.md)

## 1. Design read and guardrails

**Reading this as:** a consumer fitness-product website for people who want to
build a consistent movement habit, with an energetic but trustworthy visual
language, leaning toward an editorial fitness brand using the existing Mini
Workout design tokens and Astro-native sections.

The current product provides workout categories (including strength, mobility,
cardio, yoga, pilates, flexibility, stretching, HIIT and meditation), experience
levels, interests and schedule preferences in onboarding. The design should
describe those real capabilities without promising personalized plans,
measurable health outcomes, workout durations, prices or a coach unless product
and marketing confirm them.

- **DESIGN_VARIANCE:** 7. Use asymmetric composition in hero and editorial
  imagery, but keep the reading order clear.
- **MOTION_INTENSITY:** 3. Use responsive layout and tactile focus/hover states;
  no scroll hijacks, autoplay carousels or animation dependency.
- **VISUAL_DENSITY:** 4. Short copy, generous spacing and a few distinct content
  shapes rather than a grid of identical feature cards.
- **Design foundation:** Astro components and current semantic design-system
  tokens. No React island or new design-system token is needed for this slice.
- **Color:** current brand blue for primary actions; neutral surfaces/text.
  Keep one coherent accent and ensure button contrast in both themes.
- **Typography:** stay with the shared font stack until Brand approves a family
  and Landing has an approved local font asset. Do not add remote font requests.
- **Theme:** support the existing light and dark token themes, with one theme per
  rendered page and no alternating inverted sections.
- **Copy:** English is provisional because the current app and content models
  are English. Marketing must approve final voice, claims and localized copy.

Generated composition assets are in `apps/landing/public/images/home/`:
`movement-hero.webp` and `mobility-stretch.webp`. They are implementation
placeholders, not approved brand assets. Marketing must approve or replace the
photography and its alt text before launch.

## 2. Home page composition

Desktop composition uses a centered content width of approximately 72-80rem,
12-column layout, 64-72px navigation, and section spacing of 5-8rem. On mobile,
every multi-column section collapses to one readable column, the primary CTA
remains visible near the headline, and image crops retain the subject.

```text
┌──────────────────────────────────────────────────────────┐
│ Mini Workout      How it works   Ways to move   Sign in  │
├──────────────────────────────────────────────────────────┤
│ headline + copy + CTA          | editorial workout image │
├──────────────────────────────────────────────────────────┤
│ Ways to move: varied editorial list / category links     │
├──────────────────────────────────────────────────────────┤
│ Choose a focus → Set your level → Pick a weekly rhythm   │
├──────────────────────────────────────────────────────────┤
│ Active campaign feature (only when approved/live)        │
├──────────────────────────────────────────────────────────┤
│ Latest useful reads (only when published content exists) │
├──────────────────────────────────────────────────────────┤
│ Closing CTA                                              │
├──────────────────────────────────────────────────────────┤
│ Footer                                                   │
└──────────────────────────────────────────────────────────┘
```

### Section 1: Header

- Wordmark placeholder “Mini Workout”; replace only after approved logo assets
  arrive. Do not invent a new logo mark.
- Desktop links: `Ways to move`, `How it works`, and `Pricing` only when their
  destination routes/anchor content are available. `Sign in` points to
  `https://app.example.com/login`; the primary action points to
  `https://app.example.com/register`.
- Keep one-line navigation at desktop. Mobile uses a keyboard-accessible
  disclosure only if links cannot fit; otherwise use a compact horizontal
  layout. No client JavaScript is needed for the first static version if a
  simple `<details>` pattern meets the visual design.

### Section 2: Hero

- **Layout:** asymmetric split, copy on the left and a real lifestyle image on
  the right, with the subject framed away from the headline. Do not use a fake
  application screenshot or gradient blob.
- **Draft headline:** “Build a movement habit that fits real life.”
- **Draft body:** “Choose the kinds of movement you enjoy, set a rhythm that
  works for you, and start with a workout that feels manageable.”
- **Primary CTA:** “Build my routine” → app registration.
- **Secondary link:** “See how it works” → `#how-it-works`.
- No numerical time promise, review score, social-proof strip or extra tagline.
- Reserve image dimensions and use responsive sources; prioritize this image
  for LCP when production photography is approved.

### Section 3: Ways to move

- **Job:** let visitors recognize a relevant starting point and create the
  information architecture for category SEO pages.
- **Layout:** editorial taxonomy, not nine equal cards. Use one featured
  movement family beside a compact two-column list of the remaining published
  categories. Keep category groups data-driven so content owners can reorder
  or hide them.
- **Initial categories available in product onboarding:** strength, cardio,
  mobility, flexibility, stretching, HIIT, yoga, pilates and meditation.
- Link only categories that have a published SEO page. Do not render empty
  category shells or link users to authenticated-only app routes.
- Show a representative image for the featured category only when an approved
  asset exists; category names remain readable without imagery or JavaScript.

### Section 4: How it works

- **Job:** explain the actual onboarding sequence, not imply that a plan is
  algorithmically generated.
- **Layout:** one stacked heading and short intro above three unequal,
  horizontally connected steps on desktop; vertically ordered on mobile.
- **Step headings:** “Choose a focus”, “Set your level”, “Pick a rhythm”.
  These reflect existing onboarding data: interests, experience level and
  schedule.
- Avoid numbered labels and unsupported claims such as “AI-built plan”, “only
  five minutes”, or “guaranteed progress”.

### Section 5: Campaign feature

- Optional and data-driven. Render only when a published, currently active
  campaign exists; absence means the section is omitted, not replaced with a
  placeholder.
- Use campaign-approved headline, dates/eligibility where relevant, image,
  CTA and canonical URL. A/B variants must preserve indexable title, H1, body,
  canonical and structured data per the platform plan.
- Defer expiry/410 behavior to the campaign content and retention policy.

### Section 6: Latest articles

- Optional editorial preview for the article/category SEO system. Use one
  featured article with a different composition from the category section,
  then at most two supporting links. No equal-card triplet.
- Require approved title, excerpt, author/date policy, hero image and URL from
  the content model. Hide the section until at least one article is published.

### Section 7: Closing conversion and footer

- A quiet full-width CTA returning to the same primary registration intent.
  Reuse the exact label “Build my routine” to avoid duplicate intent variants.
- Footer links only to implemented routes and approved legal/privacy pages.
- No invented social accounts, company address, app-store badges or customer
  logos.

## 3. MVP page-template visual contracts

These are templates, not six independent visual systems. Share typography,
content width, CTA, image treatment, focus styles and spacing tokens. Keep each
page mostly static HTML for SEO and accessible no-JavaScript rendering.

| Page         | Composition                                                                                                    | Content/asset requirements                                                              | Important state                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Home         | Asymmetric hero, category taxonomy, onboarding explainer, optional campaign and article modules, closing CTA   | Approved promise, category inventory, hero image, real published campaign/articles      | Omit optional modules when no content exists                         |
| Campaign     | Campaign-specific hero, benefit/eligibility sections, proof only when sourced, FAQ, one conversion CTA         | Owner, audience, dates, offer terms, creative, legal review, destination                | Scheduled, live, expired; no expired offer remains active            |
| Pricing      | Clear plan comparison with one recommended path only if commercially approved, FAQ and CTA                     | Currency, prices, billing cadence, entitlements, cancellation/refund terms              | No fake prices; loading/error states if pricing is ever dynamic      |
| Article      | Article title, summary, author/date policy, hero, readable body, optional TOC, related reading, restrained CTA | Approved structured article, author attribution, licensed images, canonical/OG metadata | TOC only for sufficiently long articles; images reserve aspect ratio |
| Category SEO | Specific intro, curated workout/content list, related categories/articles, FAQ only when genuinely useful      | Unique editorial copy, published items, category metadata and canonical                 | Empty/unpublished categories are not indexable and not in sitemap    |

The pricing page must not be designed around guessed tiers. Until commercial
inputs arrive, produce a neutral wireframe for plan information hierarchy only;
do not put example numbers into production UI.

## 4. Accessibility, SEO and performance acceptance

- One `<h1>` per page; landmarks and heading order reflect the visual hierarchy.
- All navigation and CTAs work by keyboard with visible focus. Mobile disclosure
  exposes its expanded state to assistive technology.
- Text contrast meets WCAG AA; focus indicators remain visible in light and dark
  themes. No meaning depends on color alone.
- Images have useful alt text when informative and empty alt when decorative.
  Images use width/height or aspect ratio to prevent layout shift.
- The value proposition, category names, campaign/article copy and primary CTA
  exist in static HTML without hydration.
- Canonical, title, description, JSON-LD and crawler policy remain stable across
  variants. Sitemap membership requires a published page with complete SEO
  metadata.
- No testimonial, customer logo, clinical/fitness outcome, workout duration,
  price, rating or product capability is invented.
- Motion remains optional and honors `prefers-reduced-motion`; this direction
  can ship without a motion package.
- Lighthouse review at mobile/desktop before launch: LCP < 2.5s, CLS < 0.1,
  first-party compressed JavaScript within the platform plan's 120 KB ceiling.

## 5. Implementation slices and dependencies

1. **Review this visual direction.** Product approves value proposition and
   onboarding description; Marketing/Brand approves voice, colors/logo and
   image direction; Content approves category names and article metadata.
2. **Home static prototype.** Implemented hero, movement taxonomy, onboarding
   explainer and closing CTA using Astro-native HTML. Campaign/article modules
   remain omitted until approved content exists. Desktop/mobile browser checks
   are in progress; visual direction, draft copy and image assets still need
   product/marketing sign-off.
3. **Template pages.** Add pricing, article and category layouts after the
   corresponding commercial/editorial inputs are available. Do not create
   indexable empty pages to satisfy navigation.
4. **CMS binding.** Replace fixture data with validated content mapping only
   after Phase 3 schema work; preview/publish remain gated by Spikes A/C.

**Vertical-slice status (2026-09-24):** Mobility is the first approved editorial
direction. Static `/movement/mobility/` and
`/articles/a-gentler-way-to-explore-mobility/` routes now exercise category and
article view models, reusable templates, an explicit category-to-article
relationship, canonical/type-specific JSON-LD contracts, sitemap membership and
cross-linking from Home through Article. Their English copy and generated
photography remain provisional. Unpublished content stays unlinked and does not
generate routes.

## 6. Modern editorial fitness guardrails

Apply these constraints to every new section and page template. They are part
of design review, not optional styling preferences.

- Lead with human movement, useful editorial hierarchy and credible copy. Do
  not use AI imagery motifs, chat prompts, neural-network graphics, purple mesh
  gradients or fake generated-plan interfaces.
- Do not default to centered hero copy, three equal feature cards, repeated
  rounded rectangles, glass panels or a bento grid. Each section needs a clear
  editorial job and a composition distinct from adjacent sections.
- Photography should feel observational and attainable: real homes, studios or
  outdoor contexts; natural light; varied bodies and experience levels; no
  unsupported before/after transformation narrative.
- Use one brand accent with neutral surfaces. Shape comes primarily from image
  crops, type scale, alignment and whitespace rather than decorative effects.
- Keep motion quiet and functional. Favor hover/focus feedback and optional
  image/type transitions; no scroll hijacking, parallax dependency or looping
  decorative animation.
- Avoid fitness-domain clichés such as aggression-first copy, calorie promises,
  countdown urgency, body-shaming language and fabricated social proof.
- Review every page at 390, 768, 1280 and 1440 pixel widths, in light/dark and
  reduced-motion modes. Long-copy and missing-optional-content states must keep
  their hierarchy without placeholder cards.

## 7. Ordered next steps

1. Close the remaining Phase 1–2 engineering gates: Astro-aware boundaries,
   rendered SEO contracts and compressed JavaScript/static artifact budgets.
2. Capture and approve Home at the agreed responsive/theme states. Replace the
   provisional photography and copy only when Brand/Product supplies approved
   assets; these inputs do not block engineering guardrails.
3. Build Phase 3 published-content contracts against local fixtures: category,
   article and campaign view models plus an exhaustive section registry. Keep
   Sanity preview and publish automation disabled until Spikes A/C close.
4. The Mobility Category-to-Article vertical slice is implemented. Keep
   additional category and article routes unpublished until they have unique
   approved copy and media. Add Campaign next when a real campaign fixture and
   retention/expiry policy are approved; otherwise continue the offline Phase 3
   section registry and published-content mapper without exposing preview or
   webhooks.
5. Implement Pricing only after currency, billing cadence, entitlements and
   legal/refund copy are approved. Do not ship guessed tiers or placeholder
   amounts.

### Open review inputs

- Is the draft home promise “Build a movement habit that fits real life” on
  target, or should the product lead with a different user benefit?
- Which campaign offer, if any, is in scope for the first published home page?
- What pricing plans, billing terms and legal text are approved?
- Which categories should be public SEO destinations at launch, and what unique
  editorial copy/assets exist for them?
- Is `app.example.com` the accepted authentication CTA target for preview and
  production, or will a different non-production app origin be used?

Do not block offline design-system/layout work on these inputs; they are gates
for final copy, campaign/pricing data, route linking and indexability.
