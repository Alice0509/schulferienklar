# Schulferienklar SEO Growth Roadmap

Updated: 2026-07-19

## Goal

Build Schulferienklar into a top-ranking, genuinely useful planning product for German school holidays.

The strategy is not to mass-produce thin pages by changing only a state or year. Each important search page must provide a distinct answer, trustworthy source information, useful calculations, and a reason to choose Schulferienklar over older competitors.

## Core product position

Schulferienklar combines:

- official school-holiday periods
- statutory public holidays
- directly connected free time, including adjacent weekends and statewide public holidays
- bridge-day planning
- overlap comparisons between federal states
- travel-period planning
- calendar export and future printable assets
- transparent sources and review dates

## Non-negotiable rules

1. Do not create large numbers of near-identical pages.
2. Create a new URL only when it serves a distinct search intent.
3. Every important page must provide useful information beyond a date list.
4. Use the existing verified datasets and show the official source.
5. Clearly separate official holiday dates from calculated planning information.
6. Never imply live train, crowd, hotel, shop, or traffic data.
7. Do not guarantee rankings.
8. Measure results in Google Search Console and Bing Webmaster Tools before scaling a template.
9. Keep mobile usability as a primary requirement.
10. Generated pages must remain static, indexable, internally linked, and validated during the build.

## Phase 1 — Bayern 2027 Gold Page

Target URL:

`/schulferien-bayern-2027.html`

Reason:

Bing already shows meaningful impressions for searches including:

- Schulferien Bayern 2027
- Ferien Bayern 2027
- Sommerferien Bayern 2027
- Osterferien Bayern 2027
- Pfingstferien Bayern 2027
- Faschingsferien Bayern 2027

### Required page features

- improved title and meta description
- immediate answer block with all relevant 2027 holiday periods
- exact beginning and end dates
- official terminology
- explanation that “Faschingsferien” are officially Frühjahrsferien
- explanation that Bavaria officially uses “unterrichtsfreie Tage um Allerheiligen” rather than Herbstferien
- calculated connected free period around each holiday
- transparent explanation of the calculation
- official Bavaria source name and direct source links
- last checked date
- page-level navigation
- visible FAQ answers based on real search demand
- BreadcrumbList structured data
- FAQ structured data matching visible page content
- direct link to the selected calendar
- regression checks in the SEO-page validator
- responsive layout using the existing white, navy, and teal design system

### Calculation rule

The official period is the exact date range stored in the verified Bavaria school-holiday dataset.

The connected free period may extend the official period only when the directly adjacent day is:

- Saturday
- Sunday
- a statewide statutory public holiday included in the default calendar

Regional and local public holidays must not extend the default connected period.

The page must label the two values separately:

- Offizieller Zeitraum
- Zusammenhängend frei

## Phase 2 — Downloadable assets

Only after the Gold Page is stable:

- improved ICS export
- printable A4 portrait calendar
- printable A4 landscape calendar
- smartphone PNG
- print stylesheet
- stable downloadable URLs
- source and update information in the assets

## Phase 3 — Measurement

Measure the Bayern 2027 page for at least four to six weeks after deployment.

Primary metrics:

- Bing average position for the Bayern 2027 query group
- Bing non-brand CTR
- Google impressions and average position
- clicks to the interactive calendar
- download counts once downloads exist
- new referring domains and natural links
- indexed-page status and crawl changes

Initial validation target:

- improve Bing visibility from the existing first-page test toward positions 3–5
- establish Google top-10 potential before broad expansion

These are goals, not guarantees.

## Phase 4 — Controlled expansion

Expand only after the Bayern 2027 structure shows measurable value.

Candidate order based on observed data:

1. Bayern 2026
2. Hamburg 2027
3. Baden-Württemberg 2027
4. Sachsen 2029
5. Bayern 2030

Each expansion page must retain:

- distinct search demand
- direct answer block
- state-specific terminology
- source attribution
- connected-free-time calculation
- useful FAQ content
- internal links
- validation

## Phase 5 — Distinct search-intent pages

Create holiday-type pages only when they contain unique planning value.

Examples:

- Sommerferien comparison by federal state
- Osterferien comparison by federal state
- Herbstferien comparison by federal state
- Weihnachtsferien comparison by federal state
- school-year overview pages

A holiday-type page must include more than one date:

- nationwide comparison
- earliest start and latest finish
- durations
- state links
- overlap information
- travel-planning context
- source details
- calendar actions

## Phase 6 — Defensible data products

Build features that competitors cannot match with a simple static date table:

- federal-state holiday-overlap calendar
- connected-free-time comparison
- bridge days by federal state and year
- travel-period pressure guidance based only on known calendar events
- public JSON API
- embeddable school-holiday widget
- downloadable, source-labelled visual assets

## Phase 7 — Authority and links

Create assets that schools, parent groups, employers, travel sites, and local information sites can cite or embed.

Priority assets:

- free federal-state widgets
- printable calendars
- transparent data methodology
- update history
- public API documentation
- original comparison datasets

Avoid purchased links, automated directory submissions, and mass guest-post campaigns.

## Current execution order

- [ ] Create branch `feat/bayern-2027-gold-page`
- [ ] Add this roadmap to the repository
- [ ] Implement the Bayern 2027 Gold Page
- [ ] Add Gold Page validation
- [ ] Run data validation and SEO build
- [ ] Review desktop and mobile screenshots
- [ ] Commit and open a focused PR
- [ ] Deploy and request indexing for the Gold Page
- [ ] Record the deployment date
- [ ] Measure before expanding
