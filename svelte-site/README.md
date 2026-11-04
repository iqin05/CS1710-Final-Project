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

| File | Section |
| --- | --- |
| `src/routes/+page.svelte` | Page layout, nav, footer, and the two offers every section shares |
| `src/lib/Hook.svelte` | Hook: map with the two offer cities, offer letters, randomize/reset |
| `src/lib/Compare.svelte` | Rising insights: the two offers side by side |
| `src/lib/Proto1.svelte` | Jobs: top-15 bars, opportunity vs. pay scatter, city card |
| `src/lib/Message.svelte` | Main message: hero numbers and salary-vs-savings scatter |
| `src/lib/Heatmap.svelte` | Field × city savings heatmap |
| `src/lib/Proto2.svelte` | Explore: brushable bubble map, linked bars, city card |
| `src/lib/Timeline.svelte` | Months to the first $10K |
| `src/lib/Breakdown.svelte` | Final paycheck breakdown and verdict |
| `src/lib/OfferEditor.svelte` | Offer letter used in the hook and the final section |
| `src/lib/data.js` | CSV loading, formatters, savings formula (`calc`) |
| `src/lib/geo.js`, `axis.js`, `tooltip.svelte.js`, `Tooltip.svelte` | Map projection, axis helper, shared tooltip |
