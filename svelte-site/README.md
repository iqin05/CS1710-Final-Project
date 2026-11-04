# What You Keep — SvelteKit version

A SvelteKit rebuild of the data story in `cs1710_data/site/`, with the same sections, text, data and
interactions. Svelte 5 runes, D3 v7 for scales, axes and the map brush; Svelte renders every mark.

## Run it

```sh
cd svelte-site
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in build/
npm run preview    # serve the build locally
```

For GitHub Pages the site lives under `/CS1710-Final-Project/`, so CI builds with
`BASE_PATH=/CS1710-Final-Project npm run build`. Local dev runs at the root.

## Data

`static/cities.csv` and `static/city_by_field.csv` are copies of the files in `cs1710_data/`.
After re-running `cs1710_data/build.py`, copy the two CSVs here again. They load in the browser with
`d3.csv` and are converted in `src/lib/data.js` (the same fields `site/build_data.py` produced), so
there is no `data.js` step.

## Where things are

The page follows the storyboard in four stages, each scrollytelling (text left, visual right); visuals are listed in story order. The step text for the last three stages is in `+page.svelte` (snippets) and `story.js`.

| File | Section |
| --- | --- |
| `src/routes/+page.svelte` | Section order, footer, and the two offers every section shares |
| `src/routes/+page.server.js` | Build-time default offers, so the title screen draws in the first paint |
| `src/lib/TitleScreen.svelte` | Title screen: two piles of cash that fall into taxes, rent and everyday costs |
| `src/lib/Scrolly.svelte` | Scroll index (Scrollama): one step per stage, step-indicator controls |
| `src/lib/StepStory.svelte` | One stage as scrollytelling (Scrollama): text steps left, pinned visual right, cross-fades |
| `src/lib/story.js` | The step text, computed from the data and the reader's offers |
| **Hook** | |
| `src/lib/Hook.svelte` | Full-screen zoomable map with three scroll cards and the offer letters |
| **Rising insights** (the two offer cities highlighted among all 40) | |
| `src/lib/Proto1.svelte` | Jobs in your field: top-15 bars, then opportunity vs. pay (one chart per step) |
| `src/lib/Industries.svelte` | What each offer city hires everyone for; the offer's field highlighted |
| `src/lib/Rent.svelte` | Studio rent vs. rent share of take-home pay |
| `src/lib/Commute.svelte` | Commute time vs. share commuting without a car |
| `src/lib/Timeline.svelte` | Savings per month and months to the first $10K |
| **Main message** | |
| `src/lib/Message.svelte` | Compare by savings, not salary: salary-vs-savings scatter, colored by region |
| **Next steps** | |
| `src/lib/Compare.svelte` | The two offers side by side on every factor, savings first |
| `src/lib/Breakdown.svelte` | Offer letters, paycheck breakdowns and verdict |
| **Shared** | |
| `src/lib/OfferEditor.svelte` | Offer letter used in the hook and the final section |
| `src/lib/data.js` | CSV loading, formatters, savings formula (`calc`), field ranking (`fieldShares`) |
| `src/lib/geo.js`, `axis.js`, `tooltip.svelte.js`, `Tooltip.svelte` | Map projection, axis helper, shared tooltip |
| *Not on the page* | |
| `src/lib/Heatmap.svelte`, `src/lib/Proto2.svelte` | Field × city savings heatmap and brushable explore map, kept for reuse |
