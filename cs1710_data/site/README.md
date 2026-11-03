# Site

Single-page data story following the Milestone 7 storyboard: hook (two offers on a map) → rising insights (side-by-side, Prototype 1) → main message → field heatmap → next steps (Prototype 2, savings-goal timeline, paycheck breakdown).

Run locally from the repo root (the page fetches `data.js` and the U.S. map, so it needs a server, not `file://`):

    python3 -m http.server 8766

then open http://localhost:8766/site/

Regenerate `data.js` after `build.py`: `python3 site/build_data.py`. Each visualization is its own file in `js/`; they share the two "offers" via `App.state` in `js/common.js`.
