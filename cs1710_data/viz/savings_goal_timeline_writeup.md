# Additional Visualization #2 — "How long until your first $10,000?"

**File:** `viz/savings_goal_timeline.html` (self-contained: D3 v7 from a CDN, data embedded from `cities.csv` and `city_by_field.csv`; rerun `python3 viz/embed_data.py` after `build.py` to refresh it).

**Question answered:** Sketch 5 / Q5 from Milestone 3 ("How long would it take to reach a savings goal in each city?"), which tied for the most votes in Milestone 4 and was listed as Sketch 2 in the Milestone 5 design review, but was never implemented. It also answers Q18 (expected monthly savings) and Q13 (opportunity vs. affordability) once a field is selected.

## What the viewer sees

One lane per metro, sorted fastest to slowest. The shared horizontal axis is time in months; each metro's dot sits at the month its typical entry-level salary has saved the goal (goal ÷ estimated monthly savings, using the same `est_monthly_savings` and `months_to_save_10k` logic as the rest of our dataset). Metros whose modest single-adult budget exceeds take-home pay drop below a divider into a "never" group, shown as hollow markers at the end of the track with the monthly shortfall. A single hue is used for all metros and orange only for the pinned one (emphasis, not a rainbow), so the ranking stays the loudest thing on the page.

## Interactions

- **Industry dropdown**: the same shared industry filter as Prototypes 1 and 2, drawing on `city_by_field.csv`. Changing it re-sorts the lanes and the dots "race" from the start line at a speed proportional to monthly savings, so faster savers visibly arrive first.
- **Region buttons** (All / Northeast / Midwest / South / West), matching the prototypes' control.
- **Goal slider** ($1K–$50K): the axis rescales and every dot glides to its new month.
- **Hover** any lane for a tooltip with salary, take-home, budget, savings and rent share; **click** to pin a metro and show a detail card modeled on the prototypes' information card (entry salary, take-home, budget by category, savings, months to goal, rent share, entry-level jobs in the field, unemployment, share of residents aged 20–29).
- **Table view** toggle for a WCAG-clean twin of the chart; keyboard focus shows the same tooltip as hover.
- **URL presets** for embedding a particular state in the website, e.g. `savings_goal_timeline.html?field=Healthcare&region=South&goal=15000&pin=Atlanta`.

## Why it fits our data story

Our Milestone 5 story had four beats: job opportunities, monthly savings, savings goals, and personal fit. The two prototypes cover opportunities and fit, and the field heatmap and the hook map cover monthly savings, but nothing yet turned "what you keep" into the unit a graduate actually feels: time. This view does that. On the default view San Jose reaches $10,000 in 4.4 months and Detroit in 5.1, while New York needs 47.4 months; New York pays about $13K more than Detroit yet takes 9.3× longer to build the same emergency fund, which is our central message in one glance. It also reinforces the heatmap's point that the field matters as much as the city: on a typical Arts, Design & Media salary, 37 of the 40 metros never reach the goal, while on a Computer & Math salary every Midwestern metro gets there in under five months.

## Caveats (same as the dataset README)

Savings are estimated at the 25th-percentile wage of bachelor's-entry occupations (BLS OEWS, May 2025) after EPI's "modest but adequate" single-adult budget (2026 edition), with EPI's effective tax rate. The budget assumes car ownership everywhere, so transit-heavy metros such as New York are likely understated. Metros are CBSAs. Months to goal is linear (no interest, raises or one-time costs).
