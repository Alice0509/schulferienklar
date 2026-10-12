# Ferienplanung guide and project transparency

Base: f6ec66c43ff2895fc4ab8ce3c7d37ca964aa5a1f (PR #287).

## Observed issue and scope

The supplied AdSense screen names low-value content and permits another review.
It does not identify a specific URL or the precise cause of rejection. This change
is a user-facing improvement, not a claim that the rejection is resolved.

State-year pages already contain dates, computed free periods and state-specific
information. A central workflow guide was missing. The about page described the
product but gave little explanation of project responsibility and data handling.

## Changes

- Add an original, static planning guide covering childcare, interstate overlap,
  vacation budgets, PDF/ICS/subscriptions and incomplete data.
- Explain that with three or more selected states the comparison also shows
  overlaps involving only two states; readers must inspect the listed states.
- Use explicitly hypothetical arithmetic examples rather than invent official dates.
- Link the guide from the rendered home footer, initial HTML and about page.
- Expand the about page with Joan's role, official versus computed data,
  technical validation limits and the existing correction contact.
- Add the guide to the sitemap generator, generated sitemap and canonical checks.

## Validation

- 45 existing tests passed; ESLint and Vite production build passed.
- Generated SEO validation passed for 106 generated HTML files plus static-page checks.
- Scanned 197 public HTML files and 2,301 local file links: no missing targets.
- Guide/about links and in-page section anchors resolve.
- Browser verification covers guide, about and rendered homepage at 390/1280 px,
  guide section navigation, homepage-to-guide navigation and initial HTML without JS.
- No date data, coverage rules, comparisons or optimizer algorithms changed.

## Remaining review work

This does not establish AdSense approval readiness. External source freshness,
page-by-page originality, all runtime planning flows and the advertising/consent
configuration still need a broader review before another application.

References:
https://support.google.com/adsense/answer/10015918
https://support.google.com/adsense/answer/12176698
