<script>
	import { onMount, untrack } from 'svelte';
	import * as d3 from 'd3';
	import scrollama from 'scrollama';
	import { ALL, f$ } from '#lib/data.js';
	import { usMap } from '#lib/geo.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';
	import OfferEditor from '#lib/OfferEditor.svelte';

	// HOOK: a full-screen U.S. map stays pinned while three short cards scroll past.
	//   1. setup: the whole country, and the two offer pins drop in.
	//   2. pull:  the map flies in to frame the two cities; the bigger paycheck catches your eye.
	//   3. turn:  salary is only part of the story; the offer letters appear and the reader decides.
	// The map moves on its own only when a card arrives; in between, the reader can zoom (+ / −,
	// trackpad pinch, Ctrl + scroll) and drag to pan. Clicking a metro makes it Offer A (shift: B).
	let { data, offers, setOffer, onrandomize, onreset } = $props();

	const STEPS = ['setup', 'pull', 'turn'];
	// -1 before the first card arrives (pins not dropped yet).
	let step = $state(-1);

	// The map is projected once into a fixed base space; zooming transforms that space onto the screen.
	const BASE_W = 960;
	const BASE_H = 600;
	const { projection, paths } = usMap(BASE_W, BASE_H);

	let points = $derived(data.cities.map((c) => ({ ...c, p: projection([c.lon, c.lat]) })));
	const at = (city) => points.find((d) => d.city === city).p;

	let box;
	let svgEl;
	let stepEls = $state([]);
	let cw = $state(0);
	let ch = $state(0);
	let t = $state(d3.zoomIdentity);
	let zoom;
	let reduced = false;
	// Wide layout: cards in a left column over the map. Narrow: cards scroll over the map full width.
	// Either way the offer letters sit right under the last card and arrive with it.
	let wideLayout = $state(true);
	// Right edge of the card column, in px (left inset + width + gap); keep in step with the CSS.
	const COL_RIGHT = 20 + 360 + 24;
	const TURN_RIGHT = 20 + 640 + 24;

	// Changing cities by clicking the map only starts with the last card, once the story has
	// introduced the offers as something the reader can change.
	let interactive = $derived(step === 2);

	// Markers are placed in screen space so they stay the same size at every zoom level.
	const sx = (p) => t.applyX(p[0]);
	const sy = (p) => t.applyY(p[1]);
	const minK = () => Math.min(cw / BASE_W, ch / BASE_H) * 0.5;

	// The part of the map the cards leave open, in map-box pixels.
	function openArea(withLetters) {
		if (!wideLayout) return { x0: cw * 0.06, x1: cw * 0.94, y0: ch * 0.08, y1: ch * 0.48 };
		return { x0: withLetters ? TURN_RIGHT : COL_RIGHT, x1: cw - 90, y0: 24, y1: ch - 24 };
	}
	// Fit a base-space box into the open area, filling `fill` of it.
	function fit([x0, y0, x1, y1], fill, withLetters) {
		const o = openArea(withLetters);
		const k = Math.max(
			minK(),
			Math.min(8, ((o.x1 - o.x0) * fill) / Math.max(40, x1 - x0), ((o.y1 - o.y0) * fill) / Math.max(40, y1 - y0))
		);
		const [cx, cy] = [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2];
		return d3.zoomIdentity.translate(cx - k * ((x0 + x1) / 2), cy - k * ((y0 + y1) / 2)).scale(k);
	}
	const usView = () => fit([0, 0, BASE_W, BASE_H], 0.96, false);
	function pairView(withLetters) {
		const [a, b] = [at(offers.A.city), at(offers.B.city)];
		return fit([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], 0.55, withLetters);
	}
	const viewFor = (s) => (s >= 1 ? pairView(s === 2) : usView());

	const sel = () => d3.select(svgEl);
	const dur = (ms) => (reduced ? 0 : ms);
	function go(view, ms) {
		if (!zoom || !cw) return;
		sel().transition().duration(dur(ms)).call(zoom.transform, view);
	}
	const zoomBy = (f) => sel().transition().duration(dur(250)).call(zoom.scaleBy, f);
	const frameOffers = () => go(pairView(step === 2), 650);

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
			.scaleExtent([minK(), 24])
			// Wheel zooms only with a pinch (browsers send trackpad pinches as Ctrl + wheel) or with Ctrl
			// held, so plain scrolling still moves down the page. On touch screens, one finger scrolls
			// the page and two fingers zoom and pan. Mouse drag pans.
			.filter((e) => {
				if (e.type === 'wheel') return e.ctrlKey || e.metaKey;
				if (e.type.startsWith('touch')) return e.touches.length > 1;
				return !e.button;
			})
			// About 1.7× per Ctrl + mouse-wheel notch; trackpad pinches send many small steps.
			.wheelDelta((e) => -e.deltaY * (e.deltaMode === 1 ? 0.25 : e.deltaMode ? 2 : 0.008))
			.on('zoom', (e) => (t = e.transform));
		sel().call(zoom).on('dblclick.zoom', null);
		sel().call(zoom.transform, usView());

		// Cards advance as they cross the middle of the screen. Scrolling back above the first card
		// lifts the pins again, so they drop in afresh next time.
		const scroller = scrollama();
		scroller
			.setup({ step: stepEls.filter(Boolean), offset: 0.55 })
			.onStepEnter(({ index }) => (step = index))
			.onStepExit(({ index, direction }) => {
				if (index === 0 && direction === 'up') step = -1;
			});

		const ro = new ResizeObserver(() => {
			cw = box.clientWidth;
			ch = box.clientHeight;
			zoom.scaleExtent([minK(), 24]);
			scroller.resize();
		});
		ro.observe(box);
		return () => {
			ro.disconnect();
			scroller.destroy();
			mq.removeEventListener('change', onMq);
		};
	});

	// A new card moves the map to that card's view.
	$effect(() => {
		const s = step;
		untrack(() => go(viewFor(s), 1000));
	});
	// When either offer moves to another city, re-frame on the new pair (once the map is zoomed in).
	let pairKey = $derived(`${offers.A.city}|${offers.B.city}`);
	let lastPair = '';
	$effect(() => {
		const k = pairKey;
		if (lastPair && k !== lastPair) untrack(() => step >= 1 && go(pairView(step === 2), 650));
		lastPair = k;
	});

	// Offer pins: label beside the pin, flipped to the left near the right edge. When the two pins
	// are close on screen (zoomed out, or on a phone), A's label sits above its pin and B's below,
	// and if either has to flip, both do, so the two never overlap.
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
			anchor: flip ? 'end' : 'start',
			dx: flip ? -16 : 16,
			dy1: below ? '1.5em' : '-1em',
			dy2: below ? '2.65em' : '0.15em'
		};
	}
	let pins = $derived(cw ? [pin('A'), pin('B')] : []);
	let link = $derived(pins.length ? [pins[0].x, pins[0].y, pins[1].x, pins[1].y] : null);

	// The higher-paying offer (null when both pay the same), named in the second card.
	let bigger = $derived(
		offers.A.salary === offers.B.salary ? null : offers.A.salary > offers.B.salary ? offers.A : offers.B
	);
</script>

{#snippet letters()}
	<div class="editors">
		{#each ['A', 'B'] as k}
			<OfferEditor {data} key={k} offer={offers[k]} onchange={(patch) => setOffer(k, patch)} />
		{/each}
	</div>
	<div class="actions">
		<button class="ghost primary" onclick={onrandomize}>Randomize offers</button>
		<button class="ghost" onclick={onreset}>Reset to default</button>
		<span class="hint">Shift-click a city on the map for Offer B</span>
	</div>
{/snippet}

<section class="hook" id="hook">
	<div class="stage">
		<div class="pinned">
			<div class="map-box" bind:this={box}>
				<svg
					bind:this={svgEl}
					class="map"
					width={cw}
					height={ch}
					role="img"
					aria-label="Map of 40 U.S. metros with the two offer cities marked, {offers.A.city} and {offers.B.city}"
				>
					<g transform="translate({t.x},{t.y}) scale({t.k})">
						{#each paths as s (s.id)}<path class="state" d={s.d} />{/each}
					</g>
					{#if link}
						<line class="link" class:shown={step >= 0} x1={link[0]} y1={link[1]} x2={link[2]} y2={link[3]} />
					{/if}
					<g>
						{#each points as d (d.city)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<circle
								class="metro"
								class:dim={step >= 0 && d.city !== offers.A.city && d.city !== offers.B.city}
								class:clickable={interactive}
								aria-disabled={!interactive}
								cx={sx(d.p)}
								cy={sy(d.p)}
								r="6"
								role="button"
								tabindex="-1"
								aria-label="{d.city}, {d.state}"
								onpointermove={(e) =>
									showTip(e, {
										title: `${d.city}, ${d.state}`,
										meta: d.region,
										rows: [[f$(d.salary), 'typical entry salary']],
										note: interactive ? 'Click to make this Offer A · shift-click for Offer B' : undefined
									})}
								onpointerleave={hideTip}
								onclick={(e) => interactive && setOffer(e.shiftKey ? 'B' : 'A', { city: d.city })}
							/>
						{/each}
					</g>
					{#each pins as l (l.k)}
						<g class="pin" transform="translate({l.x},{l.y})">
							<g class="drop" class:shown={step >= 0} style:transition-delay={l.k === 'B' ? '180ms' : '0ms'}>
								<circle r="10" fill="var(--{l.k.toLowerCase()})" />
								<text class="lbl" text-anchor={l.anchor} x={l.dx} dy={l.dy1}
									>{l.o.city}, {data.byCity[l.o.city].state}</text
								>
								<text class="lbl2" text-anchor={l.anchor} x={l.dx} dy={l.dy2}>Offer {l.k} · {f$(l.o.salary)}</text>
							</g>
						</g>
					{/each}
				</svg>

				<div class="zoom" role="group" aria-label="Map zoom">
					<button aria-label="Zoom in" onclick={() => zoomBy(1.6)}>+</button>
					<button aria-label="Zoom out" onclick={() => zoomBy(1 / 1.6)}>−</button>
					<button class="frame" aria-label="Frame the two offers" title="Frame the two offers" onclick={frameOffers}>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
						</svg>
					</button>
					<span class="hint">Pinch or Ctrl + scroll to zoom · drag to pan</span>
				</div>

			</div>
		</div>

		<div class="steps">
			{#each STEPS as id, i (id)}
				<div class="step" class:turn={id === 'turn'} bind:this={stepEls[i]}>
					<div class="block">
					<div class="card" class:active={step === i}>
						{#if id === 'setup'}
							<p class="beat">Imagine this</p>
							<p class="prose">You're graduating with two entry-level offers, both in cities you've never lived in:</p>
							{#each ['A', 'B'] as k}
								<div class="offerline {k.toLowerCase()}">
									<b>{f$(offers[k].salary)} in {offers[k].city}</b>
									<small>{offers[k].field === ALL ? 'any entry-level field' : offers[k].field}</small>
								</div>
							{/each}
						{:else if id === 'pull'}
							<p class="prose big">
								{#if bigger}
									{bigger.city}'s bigger paycheck catches your eye.
								{:else}
									Both pay the same, so the number alone can't decide.
								{/if}
							</p>
							<p class="prose big">But does earning more mean you're better off?</p>
						{:else}
							<p class="prose">Salary is only one part of the story. Also weigh:</p>
							<ul class="factors">
								<li>what you <strong>save</strong> after living expenses</li>
								<li>the <strong>opportunities</strong> in your industry</li>
								<li>the <strong>lifestyle</strong> you want</li>
							</ul>
							<h2>So, which city gives you the better start?</h2>
							<p class="try">
								<strong>Give it a go:</strong> change the field, city or salary in the offers below, or click any city
								on the map to make it Offer A.
							</p>
						{/if}
					</div>
					{#if id === 'turn'}
						<!-- The offer letters, left-aligned under the card; usable once this card is active. -->
						<div class="letters" class:active={interactive} inert={!interactive}>{@render letters()}</div>
					{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	/* The map and the cards share one grid cell: the map pins to the screen while the cards scroll. */
	.stage {
		display: grid;
	}
	.pinned,
	.steps {
		grid-area: 1 / 1;
	}
	.pinned {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100svh;
		overflow: hidden;
		background: var(--page);
	}
	.map-box {
		position: absolute;
		inset: 0;
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
		transition: fill-opacity 400ms;
	}
	.metro.clickable {
		cursor: pointer;
	}
	.metro.dim {
		fill-opacity: 0.35;
	}
	.link {
		stroke: var(--axis);
		stroke-width: 1.5;
		stroke-dasharray: 4 4;
		opacity: 0;
		transition: opacity 400ms 400ms;
	}
	.link.shown {
		opacity: 1;
	}
	.pin {
		pointer-events: none;
	}
	/* Pins drop in from above when the first card arrives. */
	.drop {
		opacity: 0;
		transform: translateY(-28px);
		transition:
			opacity 300ms ease-out,
			transform 450ms cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	.drop.shown {
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

	/* Zoom controls, top right. */
	.zoom {
		position: absolute;
		top: 20px;
		right: 20px;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 6px;
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
	}
	.hint {
		font-size: 11px;
		color: var(--muted);
	}

	/* Cards: a column on the left that scrolls over the map. Empty space passes clicks to the map. */
	.steps {
		position: relative;
		z-index: 1;
		pointer-events: none;
		padding: 42vh 0 0 20px;
	}
	.step {
		min-height: 95vh;
	}
	/* The last card holds the screen a while so the reader can try the offer letters. */
	.step:last-child {
		min-height: 140vh;
	}
	.card {
		pointer-events: auto;
		width: 360px;
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
		opacity: 0.45;
		transition: opacity 300ms;
	}
	.card.active {
		opacity: 1;
	}
	.card h2 {
		font-size: 21px;
		line-height: 1.25;
		margin: 12px 0 0;
	}
	.card .prose {
		font-size: 14px;
		margin: 0 0 8px;
	}
	.card .prose.big {
		font-size: 17px;
		color: var(--ink);
	}
	.card .prose.big:last-child {
		margin-bottom: 0;
	}
	.offerline {
		border-left: 3px solid var(--a);
		padding: 1px 10px;
		margin: 6px 0 10px;
	}
	.offerline.b {
		border-left-color: var(--b);
	}
	.offerline:last-child {
		margin-bottom: 0;
	}
	.offerline b {
		font-size: 15px;
	}
	.offerline small {
		display: block;
		color: var(--muted);
	}
	.try {
		margin: 10px 0 0;
		padding-top: 10px;
		border-top: 1px solid var(--grid);
		font-size: 14px;
		color: var(--ink-2);
	}
	.try strong {
		color: var(--accent);
		font-weight: 650;
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

	/* The last step: the card and the offer letters form one left-aligned block, as wide as the two
	   letters side by side. It scrolls in, holds at the top while the reader tries the letters, and
	   scrolls away with the step. */
	.block {
		width: 360px;
	}
	.turn .block {
		width: 640px;
		position: sticky;
		top: 20px;
	}
	.turn .card {
		width: auto;
	}
	.letters {
		pointer-events: auto;
		margin-top: 12px;
		opacity: 0.45;
		transition: opacity 300ms;
	}
	.letters.active {
		opacity: 1;
	}
	.editors {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.editors :global(.offer) {
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
	}

	/* Narrower screens: cards scroll full width over the map; the letters ride in the last card. */
	@media (max-width: 1099px) {
		.steps {
			padding: 55vh 16px 0;
		}
		.block,
		.turn .block {
			width: auto;
			max-width: 640px;
			margin: 0 auto;
			position: static;
		}
		.card {
			width: auto;
			opacity: 1;
		}
		.letters {
			opacity: 1;
		}
		.zoom {
			top: 12px;
			right: 12px;
		}
		.zoom .hint {
			display: none;
		}
	}
	@media (max-width: 600px) {
		.editors {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drop,
		.link,
		.metro {
			transition: none;
		}
	}
</style>
