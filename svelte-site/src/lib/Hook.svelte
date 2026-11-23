<script>
	import { onMount, untrack } from 'svelte';
	import * as d3 from 'd3';
	import { ALL, f$, metrosInField } from '#lib/data.js';
	import { usMap } from '#lib/geo.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';
	import Inbox from '#lib/Inbox.svelte';

	// HOOK: scrollytelling over a full-screen inbox. The screen stays pinned while the reader
	// scrolls, and the narration changes underneath:
	//   act 1, inbox:  Offer A's email is open; Offer B's sits unread with a pulsing red dot. An
	//                  enlarged cursor (the story's, not the reader's) clicks it, the two offer
	//                  letters open side by side, and the cursor leaves.
	//   act 2, salary: the bigger paycheck catches your eye: both salary lines are marked.
	//   act 3, map:    "you've never lived in either city": the U.S. map fades in as an overview, each
	//                  letterhead flies out of its letter and lands as that city's pin while the map
	//                  zooms in to frame the pair, and the turn card asks which city gives you the
	//                  better start.
	// One clock `t` drives everything, and scroll position sets it: scrolling down plays the scene,
	// scrolling up rewinds it. `T` below is in "story seconds"; VH_PER_S converts them to scroll.
	// Once the turn card is up the map is the reader's to pan (drag, or two fingers on touch screens).
	// The offers are fixed for every reader; changing them waits for the final "Try other offers" step.
	let { data, offers } = $props();

	// ---------- the script (seconds) ----------
	const T = {
		cap1: 0, // "Imagine this…"
		cursorIn: 1.4,
		cap2: 4.4, // A's is open, B's is unread
		move1: 4.6, // cursor heads for B's row (it waits just beside it)
		hoverB: 5.2,
		click: 5.6, // pressed until click + PRESS, so the click holds through some scroll
		split: 6.5, // both letters side by side; the cursor fades out as they open
		cap3: 7.3, // the bigger paycheck, once both letters are open
		hlA: 7.7, // salary markers, A then B, as "catches your eye" comes in
		hlB: 8.2,
		cap4: 13.0, // "but you've never lived in either city"
		fly: 15.0, // letterheads leave for the map
		flyDur: 2.0,
		stagger: 0.25,
		cap5: 17.8, // distance
		card: 20.0, // turn card; the map is the reader's
		end: 20.4
	};
	const landed = (k) => T.fly + (k === 'B' ? T.stagger : 0) + T.flyDur;
	const tLink = landed('B') + 0.1;

	// Scroll length per story second, and extra scroll at the end that holds the turn card.
	const VH_PER_S = 38;
	const HOLD = 3;
	const SCROLL_VH = (T.end + HOLD) * VH_PER_S;

	let t = $state(0);
	let reduced = false;
	let sec;

	// The share of the hook scrolled through -> story time.
	function fromScroll() {
		if (!sec) return;
		const r = sec.getBoundingClientRect();
		const span = r.height - innerHeight;
		const p = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
		t = Math.min(T.end, p * (T.end + HOLD));
	}

	// The inbox's own CSS transitions (the letters splitting) keep moving after the reader stops
	// scrolling; keep re-measuring for a moment so the cursor lands where its target ends up.
	function settle() {
		const until = performance.now() + 900;
		const bump = () => {
			layoutTick++;
			if (performance.now() < until) requestAnimationFrame(bump);
		};
		requestAnimationFrame(bump);
	}

	// ---------- scene state, all from t ----------
	// How long (story seconds) the click is held down, and how long its ripple spreads.
	const PRESS = 0.5;
	const RIPPLE = 1.0;
	let readB = $derived(t >= T.click + PRESS);
	let split = $derived(t >= T.split);
	let hoverB = $derived(t >= T.hoverB && t < T.split);
	let pressB = $derived(t >= T.click && t < T.click + PRESS);
	let hl = $derived({ A: t >= T.hlA, B: t >= T.hlB });
	let flown = $derived({ A: t >= T.fly, B: t >= T.fly + T.stagger });
	let inboxGone = $derived(t >= T.fly + 0.45);
	let mapIn = $derived(t >= T.fly);
	let showCard = $derived(t >= T.card);
	// The map takes the reader's own mouse only once the story has handed it over.
	let interactive = $derived(showCard);

	let bigger = $derived(
		offers.A.salary === offers.B.salary ? null : offers.A.salary > offers.B.salary ? offers.A : offers.B
	);
	let smaller = $derived(bigger && (bigger === offers.A ? offers.B : offers.A));
	let fieldTxt = $derived(offers.A.field === ALL ? 'your field' : offers.A.field.toLowerCase());
	// Great-circle distance between the two offer cities, to the nearest 10 miles.
	let miles = $derived.by(() => {
		const [a, b] = [data.byCity[offers.A.city], data.byCity[offers.B.city]];
		return Math.round((d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 3958.8) / 10) * 10;
	});

	// The narration, one caption at a time.
	let captions = $derived([
		{
			from: T.cap1,
			to: T.cap2,
			beat: 'Imagine this',
			text: `You're about to graduate, and two entry-level offers in ${fieldTxt} just landed in your inbox.`
		},
		{ from: T.cap2, to: T.cap3, text: `You've already read ${offers.A.city}'s. ${offers.B.city}'s is still unread…` },
		{
			from: T.cap3,
			to: T.cap4,
			text: bigger
				? `${bigger.city}'s bigger paycheck catches your eye: ${f$(bigger.salary)} a year, against ${f$(smaller.salary)} in ${smaller.city}.`
				: 'Both pay the same, so the number alone can’t decide.'
		},
		{ from: T.cap4, to: T.cap5, text: 'But you’ve never lived in either city. Does earning more mean you’re better off?' },
		{
			from: T.cap5,
			to: T.card,
			text: `${offers.A.city} and ${offers.B.city} are about ${miles.toLocaleString()} miles apart. Either offer means moving somewhere new.`
		}
	]);
	let caption = $derived(captions.find((c) => t >= c.from && t < c.to) ?? null);
	// Each caption slides up in as its stretch of scroll begins and up out as it ends.
	let capMotion = $derived.by(() => {
		if (!caption) return { o: 0, y: 0 };
		const u = (t - caption.from) / (caption.to - caption.from);
		const enter = caption.from === 0 ? 1 : Math.max(0, Math.min(1, u / 0.12));
		const exit = Math.max(0, Math.min(1, (1 - u) / 0.12));
		return { o: Math.min(enter, exit), y: (1 - enter) * 28 - (1 - exit) * 28 };
	});

	// ---------- the map ----------
	// Projected once into a fixed base space; zooming transforms that space onto the screen.
	const BASE_W = 960;
	const BASE_H = 600;
	const { projection, paths } = usMap(BASE_W, BASE_H);

	// Every metro at its typical entry-level salary in the story's field (shown on hover).
	let points = $derived(metrosInField(data, offers.A.field).map((c) => ({ ...c, p: projection([c.lon, c.lat]) })));
	const at = (city) => points.find((d) => d.city === city).p;

	let stage;
	let box;
	let svgEl;
	let cw = $state(0);
	let ch = $state(0);
	let zt = $state(d3.zoomIdentity);
	let zoom;
	// Bumped on resize so cursor and letterhead positions are re-measured.
	let layoutTick = $state(0);
	// Wide layout: the turn card sits in a left column over the map. Narrow: it sits at the bottom.
	let wideLayout = $state(true);
	// Right edge of the card column, in px (left inset + width + gap); keep in step with the CSS.
	const COL_RIGHT = 24 + 360 + 24;

	// Markers are placed in screen space so they stay the same size at every zoom level.
	const sx = (p) => zt.applyX(p[0]);
	const sy = (p) => zt.applyY(p[1]);
	const minK = () => Math.min(cw / BASE_W, ch / BASE_H) * 0.5;

	// The part of the map the turn card and the narration leave open, in map-box pixels.
	function openArea() {
		// Narrow: generous side margins so both pin labels fit on screen.
		if (!wideLayout) return { x0: 70, x1: cw - 70, y0: ch * 0.08, y1: ch * 0.48 };
		return { x0: COL_RIGHT, x1: cw - 70, y0: 30, y1: ch - (cw < 1240 ? 130 : 80) };
	}
	// A view: base-space point (bx, by) shown at screen point (ax, ay), at scale k. Fits `box` (base
	// space) into the screen area `o`, filling `fill` of it.
	function fitView([x0, y0, x1, y1], fill, o) {
		const k = Math.max(
			minK(),
			Math.min(8, ((o.x1 - o.x0) * fill) / Math.max(40, x1 - x0), ((o.y1 - o.y0) * fill) / Math.max(40, y1 - y0))
		);
		return { bx: (x0 + x1) / 2, by: (y0 + y1) / 2, ax: (o.x0 + o.x1) / 2, ay: (o.y0 + o.y1) / 2, k };
	}
	const toTransform = (v) => d3.zoomIdentity.translate(v.ax - v.k * v.bx, v.ay - v.k * v.by).scale(v.k);
	// The overview: the whole lower 48, filling the screen above the narration.
	const usV = () =>
		fitView([0, 0, BASE_W, BASE_H], 0.96, { x0: 16, x1: cw - (cw < 1240 ? 16 : 56), y0: 16, y1: ch - (cw < 1240 ? 130 : 90) });
	// The two offer cities framed in the area the turn card leaves open.
	function pairV() {
		const [a, b] = [at(offers.A.city), at(offers.B.city)];
		return fitView([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], 0.55, openArea());
	}
	const pairView = () => toTransform(pairV());
	// The map's view at story time `time`: the overview while the letterheads take off, then a zoom
	// in to the pair as they land (scale eases geometrically, so the zoom feels even).
	// The overview holds until the letterheads are partway across the country.
	const ZOOM_FROM = T.fly + 0.9;
	const ZOOM_TO = landed('B') + 0.4;
	function viewAt(time) {
		const u = Math.max(0, Math.min(1, (time - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM)));
		if (u === 1) return pairView();
		const e = d3.easeCubicInOut(u);
		const [a, b] = [usV(), pairV()];
		const mix = (p, q) => p + (q - p) * e;
		return toTransform({
			bx: mix(a.bx, b.bx),
			by: mix(a.by, b.by),
			ax: mix(a.ax, b.ax),
			ay: mix(a.ay, b.ay),
			k: Math.exp(mix(Math.log(a.k), Math.log(b.k)))
		});
	}

	const sel = () => d3.select(svgEl);
	function go(view, ms) {
		if (!zoom || !cw) return;
		sel()
			.transition()
			.duration(reduced ? 0 : ms)
			.call(zoom.transform, view);
	}
	const frameOffers = () => go(pairView(), 650);

	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const mq = matchMedia('(min-width: 1100px)');
		wideLayout = mq.matches;
		const onMq = () => (wideLayout = mq.matches);
		mq.addEventListener('change', onMq);

		cw = box.clientWidth;
		ch = box.clientHeight;
		zoom = d3
			.zoom()
			// The reader can pan but not zoom: gestures are held to the framed view's scale (the story's
			// own overview-to-pair zoom sets the transform directly, so it isn't limited by this).
			.scaleExtent([pairView().k, pairView().k])
			// Only once the turn card is up. Mouse drag pans; on touch screens one finger scrolls the
			// page and two fingers pan. The wheel always scrolls the page.
			.filter((e) => {
				if (!interactive) return false;
				if (e.type === 'wheel') return false;
				if (e.type.startsWith('touch')) return e.touches.length > 1;
				return !e.button;
			})
			.on('zoom', (e) => (zt = e.transform));
		sel().call(zoom).on('dblclick.zoom', null);
		sel().call(zoom.transform, viewAt(t));

		// Scroll drives the story (one update per frame at most).
		let queued = false;
		const onScroll = () => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				fromScroll();
			});
		};
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll);
		fromScroll();

		const ro = new ResizeObserver(() => {
			cw = box.clientWidth;
			ch = box.clientHeight;
			zoom.scaleExtent([pairView().k, pairView().k]);
			if (!interactive) sel().call(zoom.transform, viewAt(t));
			layoutTick++;
		});
		ro.observe(box);
		return () => {
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
			ro.disconnect();
			mq.removeEventListener('change', onMq);
		};
	});

	// Until the turn card is up, the story owns the map: its view follows scroll (overview, then the
	// zoom in to the pair). Scrolling back above the card takes it back from the reader.
	$effect(() => {
		const time = t;
		if (!interactive) untrack(() => zoom && cw && sel().interrupt().call(zoom.transform, viewAt(time)));
	});
	// The letters split with a CSS transition; follow it with the cursor.
	$effect(() => {
		split;
		untrack(settle);
	});

	// ---------- the cursor and the flying letterheads ----------
	// Elements inside the inbox they aim for, bound from Inbox.
	let els = $state({ row: {}, lh: {}, sal: {}, reading: null });
	let cur = $state({ x: 0, y: 0, o: 0, press: false });
	let ripple = $state(null);
	let chips = $state([]);

	const ease = d3.easeCubicInOut;
	const lerp = (a, b, u) => a + (b - a) * u;
	const clamp01 = (u) => Math.max(0, Math.min(1, u));
	function rel(el) {
		const s = stage.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
	}
	// Where the cursor points, in stage pixels.
	const AIM = {
		// Waiting over the right end of B's row, so the move to click it is short.
		rest: () => {
			const r = rel(els.row.B);
			return [r.x + r.w - 46, r.y + r.h * 0.62];
		},
		rowB: () => {
			const r = rel(els.row.B);
			return [r.x + r.w * 0.5, r.y + r.h * 0.55];
		}
	};
	// Cursor keyframes: [time, where]. Between two different targets it glides; on one it rests.
	const KEYS = [
		[T.cursorIn, 'rest'],
		[T.move1, 'rest'],
		[T.hoverB, 'rowB']
	];
	function aimAt(time) {
		if (time <= KEYS[0][0]) return AIM[KEYS[0][1]]();
		const i = KEYS.findIndex((k, j) => j === KEYS.length - 1 || (time >= k[0] && time < KEYS[j + 1][0]));
		const [t0, a] = KEYS[i];
		if (i === KEYS.length - 1) return AIM[a]();
		const [t1, b] = KEYS[i + 1];
		const pa = AIM[a]();
		if (a === b) return pa;
		const pb = AIM[b]();
		const u = clamp01((time - t0) / (t1 - t0));
		const e = reduced ? (u < 1 ? 0 : 1) : ease(u);
		return [lerp(pa[0], pb[0], e), lerp(pa[1], pb[1], e)];
	}

	$effect(() => {
		const time = t;
		layoutTick;
		zt;
		if (!stage || !els.row.B || !els.lh.A || !els.lh.B) return;

		const [x, y] = aimAt(time);
		// In once the scene is set; out as the letters open (the salary markers take over).
		const o = time < T.split ? clamp01((time - T.cursorIn) / 0.3) : clamp01(1 - (time - T.split) / 0.3);
		cur = { x, y, o, press: time >= T.click && time < T.click + PRESS };
		const ru = (time - T.click) / RIPPLE;
		ripple = ru >= 0 && ru < 1 ? { x, y, u: ru } : null;

		// Each letterhead leaves its letter and lands on its city, shrinking into the pin.
		chips = reduced
			? []
			: ['A', 'B'].flatMap((k) => {
					const s = T.fly + (k === 'B' ? T.stagger : 0);
					const u = (time - s) / T.flyDur;
					if (u < 0 || u >= 1 || !cw) return [];
					const from = rel(els.lh[k]);
					const p = at(offers[k].city);
					const to = [sx(p), sy(p)];
					const e = ease(u);
					const size = 22;
					return [
						{
							k,
							x: lerp(from.x, to[0] - size / 2, e),
							// A gentle arc on the way: A dips under, B rises over, so the two paths
							// don't collide when the letters' order is the reverse of the map's.
							y: lerp(from.y, to[1] - size / 2, e) + Math.sin(Math.PI * u) * (k === 'A' ? 60 : -80),
							w: lerp(from.w, size, e),
							h: lerp(from.h, size, e),
							r: lerp(8, size / 2, e),
							fill: e,
							text: clamp01(1.4 - u * 2),
							o: offers[k]
						}
					];
				});
	});

	// ---------- pins ----------
	// Label beside the pin, flipped to the left near the right edge. When the two pins are close on
	// screen, A's label sits above its pin and B's below, and if either has to flip, both do.
	// What each offer city is known for: hand-drawn doodles that ring its pin once the turn card is
	// up (drawn in the `doodle` snippet, in shades of the pin's color with dark ink outlines).
	const KNOWN_FOR = {
		'New York': [
			{ key: 'skyline', label: 'The skyline' },
			{ key: 'columns', label: 'Wall Street finance' },
			{ key: 'apple', label: 'The Big Apple' },
			{ key: 'subway', label: 'The subway' }
		],
		Detroit: [
			{ key: 'car', label: 'The Motor City' },
			{ key: 'notes', label: 'Motown music' },
			{ key: 'factory', label: 'Manufacturing' },
			{ key: 'waves', label: 'The Great Lakes' }
		]
	};
	// Doodles sit on a ring around the pin, leaving a gap on the side its label is on.
	const RING = 60;
	function ringAngles(k, flip, close, west) {
		// Degrees, 0 = right, 90 = down.
		// Pins close together (phones): A's label sits above and B's below, both facing the other
		// pin, so A rings its lower side and B its upper side, each leaning away from the other.
		if (close) {
			const base = k === 'A' ? [5, 50, 95, 140] : [202, 235, 268, 301];
			const away = k === 'A' ? !west : west; // A leans east when it is east of B, etc.
			return away ? base : base.map((a) => 180 - a);
		}
		// Otherwise the label is to the side: ring the opposite side.
		const base = [255, 205, 155, 105];
		return flip ? base.map((a) => 180 - a) : base;
	}

	function pin(k) {
		const p = at(offers[k].city);
		const x = sx(p);
		const y = sy(p);
		const o = at(offers[k === 'A' ? 'B' : 'A'].city);
		const close = Math.abs(x - sx(o)) < 260 && Math.abs(y - sy(o)) < 70;
		const nearEdge = (px) => px > cw - 190;
		const flip = nearEdge(x) || (close && nearEdge(sx(o)));
		const below = close && k === 'B';
		return {
			k,
			x,
			y,
			o: offers[k],
			shown: t >= landed(k),
			anchor: flip ? 'end' : 'start',
			dx: flip ? -16 : 16,
			dy1: below ? '1.5em' : '-1em',
			dy2: below ? '2.65em' : '0.15em',
			icons: (KNOWN_FOR[offers[k].city] ?? []).map((ic, i, arr) => {
				// Close pins (phones) get smaller doodles on a tighter ring.
				const a = (ringAngles(k, flip, close, x < sx(o))[i % 4] * Math.PI) / 180;
				const r = close ? 44 : RING;
				return { ...ic, x: Math.cos(a) * r, y: Math.sin(a) * r, s: close ? 0.86 : 1.15, i: i + (k === 'B' ? arr.length : 0) };
			})
		};
	}
	let pins = $derived(cw ? [pin('A'), pin('B')] : []);
	// Pins close on screen stack their labels around the line, so the distance label stays out
	// of the way (the caption says it too).
	let pinsClose = $derived(
		pins.length === 2 && Math.abs(pins[0].x - pins[1].x) < 260 && Math.abs(pins[0].y - pins[1].y) < 70
	);
	let link = $derived(pins.length ? [pins[0].x, pins[0].y, pins[1].x, pins[1].y] : null);
</script>

<!-- The known-for doodles, about 40 px across, centered on 0,0. Classes: f = pin-color fill,
     l = light fill, hl = highlight (no outline), ink = outline only, inkf = ink fill. -->
{#snippet doodle(key)}
	{#if key === 'skyline'}
		<path class="f" d="M-17 18 L-17.4 -3.5 L-7 -4.2 L-6.6 18 Z" />
		<path class="l" d="M5.2 18 L5.6 0.8 L15.6 0.3 L16 18 Z" />
		<path class="f" d="M-6.6 18 L-6.1 -15.8 L-3.2 -18.6 L-0.6 -27 L1.9 -18.8 L5 -16.4 L5.4 18 Z" />
		<path class="hl" d="M-4.6 15.5 L-4.2 -13.8 L-2.3 -14 L-2.6 15.5 Z" />
		<path class="ink" d="M-14.2 1.5h4.2M-14.4 6.5h4.4M-14.2 11.5h4M-1.8 -10h3.6M-2 -5h3.8M-1.8 0h3.6M-2 5h3.8M-1.8 10h3.6M8.2 5.5h4.4M8 10.5h4.6" />
		<path class="ink" d="M-20.5 18.6 Q0 17.4 20.5 18.9" />
	{:else if key === 'columns'}
		<path class="f" d="M-18.5 -8 L0.2 -19.5 L18.6 -8.6 Z" />
		<path class="l" d="M-17.4 -8.1 L17.4 -8.6 L17.6 -3.8 L-17.2 -3.4 Z" />
		<path class="l" d="M-14.2 -3.4 L-9.4 -3.5 L-9.7 13 L-14.4 13.1 Z" />
		<path class="l" d="M-2.4 -3.7 L2.4 -3.8 L2.2 13 L-2.5 13 Z" />
		<path class="l" d="M9.4 -3.8 L14.2 -3.9 L14.4 12.9 L9.7 13 Z" />
		<path class="f" d="M-19.2 13 L19.1 12.6 L19.6 18.2 L-19.6 18.5 Z" />
		<path class="ink" d="M-11.8 0.2v9.4M0 -0.2v9.6M11.9 -0.3v9.5M-4.2 -11.4h8.6" />
		<path class="ink" d="M-15 16.6l1.2 0M-11 16.4l1 0" />
	{:else if key === 'apple'}
		<path class="f" d="M0 -8.6 C-4.2 -12.8 -17.2 -12 -17 1.2 C-16.8 11.4 -9.2 18.2 -4 17.2 C-2 16.8 2.2 16.7 4.2 17.2 C9.4 18.2 17.1 11 17 0.8 C16.8 -12.2 4.3 -13 0 -8.6 Z" />
		<path class="hl" d="M-12.6 -2.6 C-12.4 -6.6 -9.6 -8.2 -7.2 -8.2 C-9.4 -6 -10.4 -3 -10.2 1.4 Z" />
		<path class="ink" d="M0 -8.8 C0.2 -13 1.2 -16.2 3.4 -18.4" />
		<path class="l" d="M1.4 -13.2 C4.2 -19.4 11 -19.6 13.4 -16.2 C10.4 -12.2 5.2 -11 1.4 -13.2 Z" />
		<path class="ink" d="M3.4 -13.6 C6.2 -15.2 9 -16 11.2 -16.2M-9.4 10.2l-0.6 2M-6.8 11.2l-0.5 2" />
	{:else if key === 'subway'}
		<path class="f" d="M-12 -17.6 C-12 -20.4 12 -20.6 12.2 -17.8 L13 9.6 C13 13.2 -13 13.4 -13.2 9.8 Z" />
		<path class="l" d="M-9.2 -14 L9.2 -14.6 L9.6 -2.8 L-9.6 -2.4 Z" />
		<path class="hl" d="M-11 0 L-11.3 7.8 L-9.6 7.8 L-9.4 0 Z" />
		<circle class="l" cx="-7" cy="5" r="2.6" />
		<circle class="l" cx="7.2" cy="4.8" r="2.6" />
		<path class="ink" d="M0.1 -14.3 V-2.7M-3.2 -17.2h6.4M-8 10h16M-9 13.2 L-12.4 20M9.2 13.2 L12.6 20M-17.4 20.2 Q0 19.4 17.4 20.4" />
	{:else if key === 'car'}
		<path class="f" d="M-20.2 6 C-20.2 2 -18 -0.2 -14 -0.6 L-9 -8 C-8 -9.6 -6 -10.2 -4 -10.2 L6 -10.2 C8 -10.2 9.6 -9.2 10.6 -7.6 L14.2 -1 C18.2 -0.4 20.6 1.6 20.6 5 L20.6 9 L-20 9.6 Z" />
		<path class="l" d="M-7.6 -1.2 L-4 -7.6 L-0.6 -7.8 L-0.4 -1.2 Z" />
		<path class="l" d="M1.8 -1.2 L1.7 -7.8 L6 -7.6 L9.6 -1.2 Z" />
		<path class="hl" d="M-17 3.2 L11 2.8 L11 4.6 L-17 5 Z" />
		<path class="ink" d="M0.8 -1 V8M16.6 2.6h2M-18.6 2.8h1.4" />
		<circle class="inkf" cx="-11" cy="9.6" r="5" />
		<circle class="inkf" cx="11.2" cy="9.4" r="5" />
		<circle class="hub" cx="-11" cy="9.6" r="1.7" />
		<circle class="hub" cx="11.2" cy="9.4" r="1.7" />
	{:else if key === 'notes'}
		<path class="f" d="M-6 -13.8 L15 -19.2 L15.2 -14 L-5.8 -8.8 Z" />
		<path class="ink thick" d="M-5.6 -11 V9.4M14.6 -16.2 V5.2" />
		<path class="f" d="M-5 9.2 C-5 13.2 -11 15.6 -14 14.2 C-16.6 12.8 -14.2 8.2 -9 7.2 C-6.6 6.7 -5 7.6 -5 9.2 Z" />
		<path class="f" d="M15.2 5 C15.2 9 9.2 11.4 6.2 10 C3.6 8.6 6 4 11.2 3 C13.6 2.5 15.2 3.4 15.2 5 Z" />
		<path class="hls" d="M-12.4 11 C-11.8 10 -10.8 9.6 -9.8 9.4M7.8 7 C8.4 6 9.4 5.6 10.4 5.4" />
		<path class="ink" d="M-14.8 -5.6 l-3.4 -2M-15.6 -0.8 l-3.8 0M-15 4 l-3.2 1.6" />
	{:else if key === 'factory'}
		<path class="f" d="M-19 18 L-19.2 -2 L-11 -8.2 L-11 -2 L-3 -8.2 L-3 -2 L5 -8.2 L5.2 18 Z" />
		<path class="l" d="M8 18 L8.5 -15 L14.1 -15.4 L14.6 18 Z" />
		<path class="l" d="M11 -18 C8 -18 7 -22 10 -23.6 C10.2 -27 15 -27.6 16 -24.6 C19.6 -25 20.6 -20.6 17.6 -19 C17 -17 13 -16.6 11 -18 Z" />
		<path class="l" d="M-16 4 h4.2 v4.2 h-4.2 Z M-8 4 h4.2 v4.2 h-4.2 Z" />
		<path class="hl" d="M-17.4 0 L-17.6 14 L-16 14 L-15.8 -0.6 Z" />
		<path class="ink" d="M8.4 -10 H14.2M0.2 18 V11.6 H3.4 V18M-21 18.6 Q-2 17.6 18 18.8" />
	{:else if key === 'waves'}
		<!-- A curling wave over a band of water, with a gull. -->
		<path class="f" d="M-19 17.4 L-19.2 8 C-17.4 -4 -6 -12 5 -11.2 C13 -10.6 18.2 -4.6 17.2 1.4 C16.4 6.2 11.4 8.4 7.8 6.6 C5 5.2 4.8 1.6 7 0.4 C8.8 -0.6 10.8 0.6 10.4 2.6 C12.8 0.4 12.2 -4.6 7.4 -6 C0.6 -8 -7 -2 -9 8 C-9.6 11 -9.6 14.4 -9.4 17.4 Z" />
		<path class="l" d="M-9.4 17.4 C-6 12.2 0 11.2 4 13 C8 14.8 13 13.2 19.2 10.6 L19.4 17.6 Z" />
		<path class="hls" d="M-14.6 8.6 C-12.6 -1 -5.4 -6.4 2 -7.4" />
		<path class="ink" d="M-4.6 15.6 l2.2 0M5 15.8 l2.2 0M12.4 15.2 l2 0M6.4 -18.6 q2.6 -3 5.2 0 q2.6 -3 5.2 0" />
	{/if}
{/snippet}

<section class="hook" id="hook" bind:this={sec} style:height="calc(100svh + {SCROLL_VH}vh)">
<div class="stage" bind:this={stage}>
	<!-- Act 3: the map, behind the inbox until the letterheads fly to it. -->
	<div class="map-box" class:shown={mapIn} class:live={interactive} bind:this={box}>
		<svg
			bind:this={svgEl}
			class="map"
			width={cw}
			height={ch}
			role="img"
			aria-label="Map of 40 U.S. metros with the two offer cities marked, {offers.A.city} and {offers.B.city}, about {miles} miles apart"
		>
			<defs>
				<!-- Roughens the doodles' lines slightly, like a hand-inked sketch. -->
				<filter id="hook-sketch" x="-10%" y="-10%" width="120%" height="120%">
					<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" />
					<feDisplacementMap in="SourceGraphic" scale="1.8" />
				</filter>
			</defs>
			<g transform="translate({zt.x},{zt.y}) scale({zt.k})">
				{#each paths as s (s.id)}<path class="state" d={s.d} />{/each}
			</g>
			{#if link}
				<line class="link" class:shown={t >= tLink} x1={link[0]} y1={link[1]} x2={link[2]} y2={link[3]} />
				<text
					class="dist"
					class:shown={t >= tLink && !pinsClose}
					x={(link[0] + link[2]) / 2}
					y={(link[1] + link[3]) / 2}
					dy="-0.7em"
					text-anchor="middle">≈ {miles.toLocaleString()} miles</text
				>
			{/if}
			<g>
				{#each points as d (d.city)}
					<circle
						class="metro"
						class:dim={d.city !== offers.A.city && d.city !== offers.B.city}
						cx={sx(d.p)}
						cy={sy(d.p)}
						r="6"
						role="img"
						aria-label="{d.city}, {d.state}"
						onpointermove={(e) =>
							interactive &&
							showTip(e, {
								title: `${d.city}, ${d.state}`,
								meta: d.region,
								rows: [[f$(d.salary), `typical entry salary, ${offers.A.field}`]]
							})}
						onpointerleave={hideTip}
					/>
				{/each}
			</g>
			{#each pins as l (l.k)}
				<g class="pin" transform="translate({l.x},{l.y})">
					<g class="land" class:shown={l.shown}>
						<circle r="10" fill="var(--{l.k.toLowerCase()})" />
						<text class="lbl" text-anchor={l.anchor} x={l.dx} dy={l.dy1}>{l.o.city}, {data.byCity[l.o.city].state}</text>
						<text class="lbl2" text-anchor={l.anchor} x={l.dx} dy={l.dy2}>Offer {l.k} · {f$(l.o.salary)}</text>
					</g>
					<!-- What the city is known for: pops in with the turn card. -->
					{#each l.icons as ic (ic.label)}
						<g transform="translate({ic.x},{ic.y})">
							<g
								class="known {l.k.toLowerCase()}"
								class:shown={showCard}
								style:transition-delay={showCard ? `${150 + ic.i * 70}ms` : '0ms'}
								role="img"
								aria-label="{l.o.city}: {ic.label}"
								onpointermove={(e) => showTip(e, { title: ic.label, meta: `${l.o.city}, ${data.byCity[l.o.city].state}` })}
								onpointerleave={hideTip}
							>
								<!-- An invisible hit area for the tooltip; the doodle itself is unboxed. -->
								<circle class="hit" r="18" />
								<g class="ink-wobble" transform="scale({ic.s})">{@render doodle(ic.key)}</g>
							</g>
						</g>
					{/each}
				</g>
			{/each}
		</svg>

		<div class="zoom" role="group" aria-label="Map controls" inert={!interactive}>
			<button class="frame" aria-label="Frame the two offers" title="Frame the two offers" onclick={frameOffers}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
				</svg>
			</button>
			<span class="hint">Drag to pan</span>
		</div>
	</div>

	<!-- Acts 1–2: the inbox. -->
	<div class="window" class:gone={inboxGone}>
		<Inbox {data} {offers} {split} {readB} {hoverB} {pressB} {hl} {flown} bind:els />
	</div>

	<!-- The letterheads in flight. -->
	{#each chips as c (c.k)}
		<div
			class="chip {c.k.toLowerCase()}"
			aria-hidden="true"
			style:transform="translate({c.x}px, {c.y}px)"
			style:width="{c.w}px"
			style:height="{c.h}px"
			style:border-radius="{c.r}px"
		>
			<span class="chip-fill" style:opacity={c.fill}></span>
			<span class="chip-txt" style:opacity={c.text}><b>{c.o.city} Company</b>{c.o.city}, {data.byCity[c.o.city].state}</span>
		</div>
	{/each}

	<!-- The story's cursor: bigger than a real one, so it reads as the narrator's, not the reader's. -->
	<div class="cursor" class:press={cur.press} aria-hidden="true" style:transform="translate({cur.x}px, {cur.y}px)" style:opacity={cur.o}>
		<svg viewBox="0 0 28 40" width="34" height="48">
			<path d="M2 2 L2 31 L9.5 24.5 L14.5 36 L19.5 33.8 L14.6 22.6 L24.5 22.6 Z" />
		</svg>
	</div>
	{#if ripple}
		<span class="ripple" aria-hidden="true" style:left="{ripple.x}px" style:top="{ripple.y}px" style:--u={ripple.u}></span>
	{/if}

	<!-- Act 3's turn card, at the end of the scroll. -->
	<div class="turn" class:shown={showCard} inert={!showCard}>
		<p class="prose">Salary is only one part of the story. Also weigh:</p>
		<ul class="factors">
			<li><strong>what’s left over</strong> after living expenses</li>
			<li>the <strong>opportunities</strong> in your industry</li>
			<li>the <strong>lifestyle</strong> you want</li>
		</ul>
		<h2>So, which city gives you the better start?</h2>
		<p class="next">Scroll to find out <span aria-hidden="true">↓</span></p>
	</div>

	<!-- Narration. -->
	<div class="caption-wrap" aria-live="polite">
		{#if caption}
			<p class="caption" style:opacity={capMotion.o} style:transform="translateY({capMotion.y}px)">
				{#if caption.beat}<span class="beat">{caption.beat}</span>{/if}
				{caption.text}
			</p>
		{/if}
	</div>
</div>
</section>

<style>
	/* The section is tall (its height is set inline from the script's length); the stage inside it
	   pins to the screen while the reader scrolls through, and every layer shares the stage's box. */
	.hook {
		position: relative;
		background: var(--page);
	}
	.stage {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100svh;
		min-height: 560px;
		overflow: hidden;
	}

	/* ---------- map ---------- */
	.map-box {
		position: absolute;
		inset: 0;
		opacity: 0;
		pointer-events: none;
		transition: opacity 700ms ease-out;
	}
	.map-box.shown {
		opacity: 1;
	}
	.map-box.live {
		pointer-events: auto;
	}
	.map {
		display: block;
		max-width: none;
		overflow: hidden;
		cursor: grab;
		/* One finger scrolls the page; pinches go to the map. */
		touch-action: pan-y;
	}
	.map:active {
		cursor: grabbing;
	}
	.map :global(path.state) {
		vector-effect: non-scaling-stroke;
		stroke-width: 1;
	}
	.metro {
		fill: var(--series-soft);
		fill-opacity: 0.8;
		stroke: var(--surface);
		stroke-width: 1.5;
		outline: none;
	}
	.metro.dim {
		fill-opacity: 0.35;
	}
	.link {
		stroke: var(--axis);
		stroke-width: 1.5;
		stroke-dasharray: 4 4;
		opacity: 0;
		transition: opacity 500ms;
	}
	.dist {
		font-size: 13px;
		font-weight: 650;
		fill: var(--ink-2);
		paint-order: stroke;
		stroke: var(--page);
		stroke-width: 4px;
		opacity: 0;
		transition: opacity 500ms 200ms;
	}
	.link.shown,
	.dist.shown {
		opacity: 1;
	}
	.pin {
		pointer-events: none;
	}
	/* A pin appears the moment its letterhead lands, with a small settle. */
	.land {
		opacity: 0;
		transform: scale(0.6);
		transition:
			opacity 150ms,
			transform 350ms cubic-bezier(0.3, 1.8, 0.5, 1);
	}
	.land.shown {
		opacity: 1;
		transform: none;
	}
	.pin circle {
		stroke: var(--surface);
		stroke-width: 3;
	}
	.lbl {
		font-size: 14px;
		font-weight: 650;
		fill: var(--ink);
		paint-order: stroke;
		stroke: var(--page);
		stroke-width: 4px;
	}
	.lbl2 {
		font-size: 12px;
		fill: var(--ink-2);
		paint-order: stroke;
		stroke: var(--page);
		stroke-width: 4px;
	}
	/* The known-for doodles: hand-drawn style (dark ink outlines, flat fills in shades of the pin's
	   color, a lighter highlight, small ink ticks), popping out from the pin. */
	.known {
		--c: var(--a);
		--ink: #23211e;
		opacity: 0;
		transform: scale(0.2);
		transform-box: fill-box;
		transform-origin: center;
		transition:
			opacity 200ms,
			transform 380ms cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	.known.b {
		--c: var(--b);
	}
	.known.shown {
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}
	.known .hit {
		fill: transparent;
		stroke: none;
	}
	.ink-wobble {
		filter: url(#hook-sketch);
	}
	.known :global(:is(.f, .l, .ink, .inkf, .hls)) {
		stroke: var(--ink);
		stroke-width: 2.1;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.known :global(.f) {
		fill: var(--c);
	}
	.known :global(.l) {
		fill: color-mix(in srgb, var(--c) 42%, #fff);
	}
	.known :global(.hl) {
		fill: color-mix(in srgb, var(--c) 18%, #fff);
		stroke: none;
	}
	.known :global(.ink) {
		fill: none;
	}
	.known :global(.ink.thick) {
		stroke-width: 3;
	}
	.known :global(.inkf) {
		fill: var(--ink);
	}
	.known :global(.hub) {
		fill: #fff;
		stroke: none;
	}
	.known :global(.hls) {
		fill: none;
		stroke: color-mix(in srgb, var(--c) 18%, #fff);
		stroke-width: 1.8;
	}

	/* Zoom controls, top right (left of the story's step dots). */
	.zoom {
		position: absolute;
		top: 20px;
		right: 56px;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 6px;
		opacity: 0;
		transition: opacity 300ms;
	}
	.live .zoom {
		opacity: 1;
	}
	.zoom button {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		font: inherit;
		font-size: 22px;
		line-height: 1;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
		cursor: pointer;
	}
	.zoom button:hover {
		border-color: var(--axis);
	}
	.zoom button:focus-visible {
		outline: 2px solid var(--control-active);
		outline-offset: 2px;
	}
	.zoom .frame svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.zoom .hint {
		max-width: 150px;
		text-align: right;
		font-size: 11px;
		color: var(--muted);
	}

	/* ---------- inbox: fills the screen ---------- */
	.window {
		position: absolute;
		inset: 0;
		transition: opacity 800ms ease-in;
	}
	.window :global(.mail) {
		border: 0;
		border-radius: 0;
		box-shadow: none;
	}
	/* Room under the letters for the narration, and on the right for the story's step dots
	   (a right-edge rail at 1240px and up). */
	.window :global(.reading) {
		padding-bottom: 130px;
		padding-right: 56px;
	}
	.window.gone {
		opacity: 0;
		pointer-events: none;
	}

	/* ---------- flying letterheads ---------- */
	.chip {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 4;
		overflow: hidden;
		pointer-events: none;
		background: color-mix(in srgb, var(--a) 12%, var(--surface));
		border: 1px solid color-mix(in srgb, var(--a) 35%, transparent);
		box-shadow: 0 8px 24px rgba(20, 30, 45, 0.18);
	}
	.chip.b {
		background: color-mix(in srgb, var(--b) 12%, var(--surface));
		border-color: color-mix(in srgb, var(--b) 35%, transparent);
	}
	.chip-fill {
		position: absolute;
		inset: 0;
		background: var(--a);
	}
	.chip.b .chip-fill {
		background: var(--b);
	}
	.chip-txt {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 6px 12px 6px 36px;
		font-size: 12px;
		line-height: 1.25;
		color: var(--ink-2);
		white-space: nowrap;
	}
	.chip-txt b {
		font-size: 14px;
		color: var(--ink);
	}

	/* ---------- scripted cursor ---------- */
	.cursor {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 6;
		pointer-events: none;
		filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.3));
	}
	.cursor svg {
		display: block;
		transform-origin: 2px 2px;
		transition: transform 90ms;
	}
	.cursor.press svg {
		transform: scale(0.84);
	}
	.cursor path {
		fill: #fff;
		stroke: var(--ink);
		stroke-width: 2;
		stroke-linejoin: round;
	}
	/* The click: a filled pulse at the cursor tip with a ring spreading out from it. */
	.ripple {
		position: absolute;
		z-index: 5;
		width: 64px;
		height: 64px;
		margin: -32px 0 0 -32px;
		border-radius: 50%;
		border: 4px solid var(--b);
		background: color-mix(in srgb, var(--b) 22%, transparent);
		pointer-events: none;
		transform: scale(calc(0.35 + var(--u) * 1.1));
		opacity: calc(1 - var(--u) * var(--u));
	}

	/* ---------- turn card ---------- */
	.turn {
		position: absolute;
		left: 24px;
		top: 50%;
		z-index: 3;
		width: 360px;
		padding: 16px 18px;
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
		opacity: 0;
		transform: translateY(calc(-50% + 16px));
		transition:
			opacity 500ms,
			transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.turn.shown {
		opacity: 1;
		transform: translateY(-50%);
	}
	.turn .prose {
		font-size: 14px;
		margin: 0 0 8px;
	}
	.turn h2 {
		font-size: 21px;
		line-height: 1.25;
		margin: 12px 0 0;
	}
	.factors {
		margin: 0;
		padding-left: 18px;
		font-size: 14px;
		color: var(--ink-2);
	}
	.factors li {
		margin: 1px 0;
	}
	.factors strong {
		color: var(--ink);
		font-weight: 600;
	}
	.next {
		margin: 12px 0 0;
		padding-top: 10px;
		border-top: 1px solid var(--grid);
		font-size: 14px;
		font-weight: 650;
		color: var(--accent);
	}

	/* ---------- narration ---------- */
	.caption-wrap {
		position: absolute;
		left: 50%;
		bottom: 28px;
		z-index: 7;
		width: min(760px, calc(100% - 32px));
		transform: translateX(-50%);
		display: flex;
		justify-content: center;
		pointer-events: none;
	}
	.caption {
		margin: 0;
		padding: 10px 18px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--hero-bg) 94%, transparent);
		color: var(--hero-ink);
		font-size: 17px;
		line-height: 1.4;
		text-align: center;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
	}
	.caption .beat {
		display: block;
		margin: 0 0 2px;
		color: var(--accent-soft);
	}
	/* Below 1240px the story's step dots become a pill at the bottom center: lift the narration
	   above it. */
	@media (max-width: 1239px) {
		.caption-wrap {
			bottom: 64px;
		}
		.window :global(.reading) {
			padding-bottom: 170px;
			padding-right: 14px;
		}
	}

	/* Narrower screens: the inbox fills the width; the turn card sits under the map. */
	@media (max-width: 1099px) {
		.turn {
			top: auto;
			bottom: 64px;
			left: 16px;
			right: 16px;
			width: auto;
			max-width: 640px;
			margin: 0 auto;
			transform: translateY(16px);
		}
		.turn.shown {
			transform: none;
		}
		.zoom {
			top: 12px;
			right: 12px;
		}
		.zoom .hint {
			display: none;
		}
		.caption {
			font-size: 15px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.map-box,
		.window,
		.land,
		.known,
		.link,
		.dist,
		.turn,
		.cursor svg {
			transition: none;
		}
	}
</style>
