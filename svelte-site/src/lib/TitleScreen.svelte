<script>
	import { onMount } from 'svelte';
	import { f$, SALARY_STEP } from '#lib/data.js';

	// TITLE SCREEN: the title between two piles of cash, Offer A on the left and Offer B on the right.
	// Each bundle is $5,000 of that offer's yearly salary. The screen stays pinned while the reader
	// scrolls through it, and bundles fly off each pile into Taxes, Rent and Everyday costs, in that
	// order and in proportion to that metro's real costs. Both piles spend the same share of their
	// salary and the fall stops partway, so the bigger offer still looks bigger: the title screen
	// hints that the money goes somewhere, and leaves "what's left?" for the story to answer.
	// `econ` = { A: { taxes, rent, everyday }, B: … }, dollars per year at the offered salary.
	let { offers, econ } = $props();

	// One bundle, in SVG units.
	const BW = 40;
	const BH = 17;
	const GAP = 4;
	const CATS = ['Taxes', 'Rent', 'Everyday costs'];

	// Stack n bundles as a tall pyramid, filled from the bottom: two rows at each width
	// (w, w, w-1, w-1, ... 1, 1), using the narrowest base that holds them.
	function pyramid(n) {
		let w = 1;
		while (w * (w + 1) < n) w++;
		const rows = [];
		for (let left = n, r = 0; left > 0; r++) {
			const k = Math.min(w - Math.floor(r / 2), left);
			rows.push(k);
			left -= k;
		}
		return { w, rows };
	}

	// Small deterministic jitter, so each bundle falls a little differently but the same way every time.
	const rand = (i, salt) => {
		const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
		return x - Math.floor(x);
	};

	const spendOf = (k) => econ[k].taxes + econ[k].rent + econ[k].everyday;

	// Both piles stop at the same share of salary spent: 90% of the smaller of the two real shares,
	// so neither pile reaches its true remainder (that's the story's reveal, not the title's).
	let share = $derived(
		0.9 * Math.min(...['A', 'B'].map((k) => Math.min(1, spendOf(k) / offers[k].salary)))
	);

	function pile(key, salt) {
		const salary = offers[key].salary;
		const n = Math.max(1, Math.round(salary / SALARY_STEP));
		const { w, rows } = pyramid(n);
		const bundles = [];
		rows.forEach((k, r) => {
			const x0 = ((w - k) * (BW + GAP)) / 2;
			for (let j = 0; j < k; j++) {
				const i = bundles.length;
				bundles.push({
					i,
					x: x0 + j * (BW + GAP),
					row: r,
					// Leaving order: top row first; within a row, outside bundles first, so the ones that
					// stay are side by side. The tiny jitter breaks ties between the two ends of a row.
					order: r + (Math.abs(j - (k - 1) / 2) / k) * 0.8 + rand(i, salt) * 0.05,
					start: 0,
					dur: 0.16,
					spin: (rand(i, salt + 1) - 0.5) * 50,
					falls: false,
					cat: 0
				});
			}
		});
		// Bundles leave from the top row down, outside in, in a steady stream. Each one
		// takes the next $5,000 of spending, so taxes come out first, then rent, then everyday costs.
		const m = Math.round(share * n);
		const t1 = econ[key].taxes;
		const t2 = t1 + econ[key].rent;
		[...bundles]
			.sort((a, b) => b.order - a.order)
			.slice(0, m)
			.forEach((b, k) => {
				const dollar = (k + 0.5) * SALARY_STEP;
				b.falls = true;
				b.cat = dollar < t1 ? 0 : dollar < t2 ? 1 : 2;
				b.start = 0.02 + (k / Math.max(1, m)) * 0.22 + rand(b.i, salt + 3) * 0.02;
			});
		// Draw falling bundles first, so they drop behind the bundles that stay.
		bundles.sort((a, b) => (b.falls ? 1 : 0) - (a.falls ? 1 : 0) || a.i - b.i);
		return { key, salary, n, w, rows: rows.length, bundles, m };
	}

	let piles = $derived([pile('A', 1), pile('B', 2)]);

	// Both piles share one viewBox so the same salary is the same size on either side.
	let maxW = $derived(Math.max(...piles.map((p) => p.w)));
	let maxRows = $derived(Math.max(...piles.map((p) => p.rows)));
	let VW = $derived(maxW * (BW + GAP) - GAP);
	let VH = $derived(maxRows * (BH + GAP) - GAP);
	let fallEnd = $derived(
		Math.max(0, ...piles.flatMap((p) => p.bundles.filter((b) => b.falls).map((b) => b.start + b.dur)))
	);

	// Scroll progress through the pinned title screen: 0 at the top, 1 when it starts to scroll away.
	let el;
	let progress = $state(0);
	let reduced = $state(false);
	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		let frame = 0;
		const update = () => {
			frame = 0;
			const room = el.offsetHeight - innerHeight;
			progress = room > 0 ? Math.min(1, Math.max(0, scrollY / room)) : 0;
		};
		const onScroll = () => (frame ||= requestAnimationFrame(update));
		update();
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll);
		return () => {
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
			cancelAnimationFrame(frame);
		};
	});

	const clamp01 = (v) => Math.min(1, Math.max(0, v));
	const q = (b) => (b.falls ? clamp01((progress - b.start) / b.dur) : 0);

	// Where a bundle's category label sits, in this bundle's own coordinates: the labels are spread
	// evenly under the pile, just below the bottom of the drawing.
	function target(p, b) {
		const ox = (VW - (p.w * (BW + GAP) - GAP)) / 2;
		const bx = ox + b.x + BW / 2;
		const by = VH - (b.row + 1) * (BH + GAP) + GAP + BH / 2;
		return { dx: (VW * (2 * b.cat + 1)) / 6 - bx, dy: VH + 16 - by };
	}

	// A falling bundle pops up off the pile, then floats down past its label like a dropped bill:
	// a projectile arc (a quick hop, then gravity), drifting sideways toward its label with a gentle
	// sway and a slow spin, fading out over the second half of the fall. It keeps its full size the
	// whole way. With reduced motion it just fades where it is.
	const HOP = 120; // initial upward speed, in SVG units per unit of t
	const PAST = 40; // how far below the label row it drifts before it's gone
	function look(p, b) {
		const t = q(b);
		if (!b.falls || t === 0) return { transform: 'none', opacity: 1 };
		if (reduced) return { transform: 'none', opacity: 1 - t };
		const { dx, dy } = target(p, b);
		// y(t) = -HOP·t + g·t², with g set so the bundle ends PAST units below its label.
		const g = dy + PAST + HOP;
		const y = -HOP * t + g * t * t;
		const drift = t * t * (3 - 2 * t); // smooth start and finish
		const sway = Math.sin(t * Math.PI * 2.2 + b.i) * 7 * t;
		return {
			transform: `translate(${dx * drift + sway}px, ${y}px) rotate(${b.spin * t}deg)`,
			opacity: t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55
		};
	}

	// Each label counts down as its bundles go; once its fall is over it turns into a question.
	const left = (p) => p.salary - SALARY_STEP * p.bundles.reduce((s, b) => s + q(b), 0);
	const done = (p) => p.bundles.every((b) => !b.falls || q(b) === 1);

	let labelsIn = $derived(clamp01(progress / 0.05));
	let settled = $derived(clamp01((progress - fallEnd - 0.02) / 0.08));
	let cueOut = $derived(clamp01(progress / 0.05));
</script>

<!-- A strapped bundle of $100 bills, front bill facing out, drawn in grays only (no real artwork):
     two offset edges for the stack, the frame, corner "100"s, a seal, an oval portrait, and the
     paper strap. Fifty $100s in a strap is $5,000, which is what each bundle stands for. -->
{#snippet bundle()}
	<rect class="edge-bill" x="2.4" y="2.4" width={BW} height={BH} rx="1" />
	<rect class="edge-bill" x="1.2" y="1.2" width={BW} height={BH} rx="1" />
	<rect class="bill" width={BW} height={BH} rx="1" />
	<rect class="frame" x="1.6" y="1.6" width={BW - 3.2} height={BH - 3.2} rx="0.6" />
	<text class="denom" x="3" y="5.4">100</text>
	<text class="denom big" x={BW - 3} y={BH - 2.6} text-anchor="end">100</text>
	<circle class="seal" cx="32" cy="6.4" r="1.9" />
	<ellipse class="oval" cx="22.5" cy="8.5" rx="4.4" ry="5.7" />
	<circle class="portrait" cx="22.5" cy="7.2" r="1.8" />
	<path class="portrait" d="M19.2 13.1 q3.3 -4.4 6.6 0 z" />
	<rect class="strap" x="10" y="-0.6" width="4.2" height={BH + 1.2} />
{/snippet}

<header class="title-screen" bind:this={el}>
	<div class="pin">
		<div class="stage">
			{#each piles as p (p.key)}
				<figure class="pile {p.key.toLowerCase()}">
					<svg
						viewBox="0 0 {VW} {VH}"
						role="img"
						aria-label="Offer {p.key}: {f$(p.salary)} a year, drawn as {p.n} bundles of {f$(SALARY_STEP)}. As you scroll, bundles go to taxes, rent and everyday costs."
					>
						{#each p.bundles as b (b.i)}
							{@const s = look(p, b)}
							<g
								class="bundle"
								transform="translate({b.x + (VW - (p.w * (BW + GAP) - GAP)) / 2},{VH - (b.row + 1) * (BH + GAP) + GAP})"
							>
								<g style:transform={s.transform} style:opacity={s.opacity}>{@render bundle()}</g>
							</g>
						{/each}
					</svg>
					<!-- Where the money goes. -->
					<ul class="cats" style:opacity={labelsIn} aria-hidden="true">
						{#each CATS as c}<li>{c}</li>{/each}
					</ul>
					<figcaption>
						<b>Offer {p.key}</b>
						<span class="amt">
							{#if done(p) && progress > 0}? / year{:else}{f$(left(p))} / year{/if}
						</span>
					</figcaption>
				</figure>
			{/each}

			<div class="center">
				<h1>Beyond the First Paycheck</h1>
				<p class="after" style:opacity={settled} aria-hidden={settled < 0.5}>
					What's left after a year of everyday living?
				</p>
			</div>
		</div>

		<a class="cue" href="#hook" style:opacity={1 - cueOut} tabindex={cueOut > 0.5 ? -1 : undefined}>
			<span>Scroll to begin</span>
			<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
				<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</a>
	</div>
</header>

<style>
	/* Tall outer block, pinned inner screen: the fall plays while the screen holds still. */
	.title-screen {
		height: 220vh;
		height: 220svh;
		position: relative;
	}
	.pin {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100svh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px 16px 100px;
		overflow: clip;
	}
	.stage {
		width: 100%;
		max-width: 1400px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		grid-template-areas: 'a center b';
		align-items: end;
		gap: 24px;
	}
	.center {
		grid-area: center;
		align-self: center;
		text-align: center;
	}
	h1 {
		font-size: clamp(40px, 6vw, 88px);
		line-height: 1.02;
		letter-spacing: -0.025em;
		/* Two lines: "Beyond the / First Paycheck". */
		max-width: 12ch;
		margin: 0 auto;
	}
	.after {
		max-width: 26ch;
		margin: 40px auto 0;
		font-size: 17px;
		color: var(--ink-2);
	}

	.pile {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.pile.a {
		grid-area: a;
	}
	.pile.b {
		grid-area: b;
	}
	.pile svg,
	.cats {
		width: 100%;
		max-width: 400px;
	}
	/* The three destinations, spread evenly under the pile (bundles aim at the middle of each). */
	.cats {
		list-style: none;
		margin: 0;
		padding: 6px 0 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border-top: 1px solid var(--grid);
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
		text-align: center;
	}
	figcaption {
		text-align: center;
		line-height: 1.3;
		margin-top: 6px;
	}
	figcaption b {
		display: block;
		font-size: 15px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.amt {
		font-size: 24px;
		font-weight: 650;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
	}

	/* The $100 bundle, in the page's grays. */
	.bill,
	.edge-bill {
		fill: var(--mid);
		stroke: var(--muted);
		stroke-width: 0.7;
	}
	.edge-bill {
		fill: var(--grid);
		stroke: var(--axis);
	}
	.frame,
	.oval,
	.seal {
		fill: none;
		stroke: var(--axis);
		stroke-width: 0.5;
	}
	.oval {
		stroke: var(--muted);
		stroke-width: 0.6;
	}
	.portrait {
		fill: var(--axis);
	}
	.denom {
		font-size: 3.6px;
		font-weight: 700;
		fill: var(--muted);
		letter-spacing: -0.02em;
	}
	.denom.big {
		font-size: 4.6px;
	}
	.strap {
		fill: var(--axis);
		stroke: var(--muted);
		stroke-width: 0.4;
	}
	.bundle > g {
		transform-box: fill-box;
		transform-origin: center;
		will-change: transform, opacity;
	}

	.cue {
		position: absolute;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 650;
		color: var(--muted);
		text-decoration: none;
	}
	.cue:hover {
		color: var(--ink);
	}
	.cue svg {
		animation: nudge 1.8s ease-in-out infinite;
	}
	@keyframes nudge {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(5px);
		}
	}

	/* Narrow screens: title on top, the two piles side by side beneath it. */
	@media (max-width: 760px) {
		.stage {
			grid-template-columns: 1fr 1fr;
			grid-template-areas:
				'center center'
				'a b';
			gap: 36px 20px;
		}
		.after {
			margin-top: 24px;
			font-size: 14px;
		}
		figcaption b {
			font-size: 12px;
		}
		.amt {
			font-size: 17px;
		}
		.cats {
			font-size: 8.5px;
			letter-spacing: 0.02em;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cue svg {
			animation: none;
		}
	}
</style>
