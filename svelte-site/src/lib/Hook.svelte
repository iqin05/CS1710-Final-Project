<script>
	import { ALL, f$, fSav } from '#lib/data.js';
	import { usMap } from '#lib/geo.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';
	import OfferEditor from '#lib/OfferEditor.svelte';

	// HOOK: U.S. map with the two offer cities highlighted, offer letters, randomize/reset.
	let { data, offers, setOffer, onrandomize, onreset } = $props();

	const W = 760;
	const H = 460;
	const { projection, paths } = usMap(W, H);

	let points = $derived(data.cities.map((c) => ({ ...c, p: projection([c.lon, c.lat]) })));
	let pa = $derived(points.find((d) => d.city === offers.A.city).p);
	let pb = $derived(points.find((d) => d.city === offers.B.city).p);

	// Label side for each pin: flip left near the east edge, and push B below A when they crowd.
	function label(k) {
		const [p, q] = k === 'A' ? [pa, pb] : [pb, pa];
		const flip = p[0] > W * 0.72 || (k === 'B' && Math.abs(pb[0] - pa[0]) < 90 && pb[0] >= pa[0]);
		const below = k === 'B' && Math.abs(pb[0] - pa[0]) < 120 && Math.abs(pb[1] - pa[1]) < 40;
		return {
			k,
			p,
			o: offers[k],
			anchor: flip ? 'end' : 'start',
			dx: flip ? -14 : 14,
			dy1: below ? '1.6em' : '-1.1em',
			dy2: below ? '2.7em' : '-0.1em'
		};
	}
	let pins = $derived([label('A'), label('B')]);
</script>

<section class="story" id="hook">
	<div class="wrap">
		<div class="hook-layout">
			<div class="imagine">
				<p class="beat">Imagine this</p>
				<h2>Which one do you choose?</h2>
				<p class="prose">
					You're about to graduate, and two job offers just landed in your inbox. Taking either one means
					relocating to a city you've never lived in:
				</p>
				{#each ['A', 'B'] as k}
					<div class="offerline {k.toLowerCase()}">
						<b>{f$(offers[k].salary)} in {offers[k].city}</b>
						<small>{offers[k].field === ALL ? 'any entry-level field' : offers[k].field}</small>
					</div>
				{/each}
				<p class="prose">
					<strong>Most grads pick by the bigger number.</strong> But our data says the bigger number is the wrong
					metric.
				</p>
				<p class="prose hint">
					Change either offer below, or roll a new pair. The rest of this page follows the two cities you choose.
				</p>
			</div>
			<div>
				<div class="card">
					<svg class="map" viewBox="0 0 {W} {H}" role="img" aria-label="Map of 40 U.S. metros with the two offer cities marked">
						<g>
							{#each paths as s (s.id)}<path class="state" d={s.d} />{/each}
						</g>
						<g>
							{#each points as d (d.city)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<circle
									class="metro"
									class:dim={d.city !== offers.A.city && d.city !== offers.B.city}
									cx={d.p[0]}
									cy={d.p[1]}
									r="5"
									role="button"
									tabindex="-1"
									aria-label="{d.city}, {d.state}"
									onpointermove={(e) =>
										showTip(e, {
											title: `${d.city}, ${d.state}`,
											meta: d.region,
											rows: [
												[f$(d.salary), 'typical entry salary'],
												[fSav(d.savings) + '/mo', 'est. savings, all fields']
											],
											note: 'Click to make this Offer A · shift-click for Offer B'
										})}
									onpointerleave={hideTip}
									onclick={(e) => setOffer(e.shiftKey ? 'B' : 'A', { city: d.city })}
								/>
							{/each}
						</g>
						<line class="link" x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} />
						{#each pins as l (l.k)}
							<g class="pin" transform="translate({l.p[0]},{l.p[1]})">
								<circle r="9" fill="var(--{l.k.toLowerCase()})" />
								<text class="lbl" text-anchor={l.anchor} x={l.dx} dy={l.dy1}>{l.o.city}, {data.byCity[l.o.city].state}</text>
								<text class="lbl2" text-anchor={l.anchor} x={l.dx} dy={l.dy2}>Offer {l.k} · {f$(l.o.salary)}</text>
							</g>
						{/each}
					</svg>
				</div>
				<div class="grid2 editors">
					{#each ['A', 'B'] as k}
						<OfferEditor {data} key={k} offer={offers[k]} onchange={(patch) => setOffer(k, patch)} />
					{/each}
				</div>
				<div class="actions">
					<button class="ghost primary" onclick={onrandomize}>Randomize offers</button>
					<button class="ghost" onclick={onreset}>Reset to default</button>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.hook-layout {
		display: grid;
		grid-template-columns: minmax(260px, 0.9fr) minmax(0, 2fr);
		gap: 18px;
		align-items: start;
	}
	@media (max-width: 900px) {
		.hook-layout {
			grid-template-columns: 1fr;
		}
	}
	.imagine {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 18px 20px;
	}
	.offerline {
		border-left: 3px solid var(--a);
		padding: 2px 10px;
		margin: 8px 0;
	}
	.offerline.b {
		border-left-color: var(--b);
	}
	.offerline b {
		font-size: 16px;
	}
	.offerline small {
		display: block;
		color: var(--muted);
	}
	.hint {
		font-size: 13px;
		color: var(--muted);
	}
	.metro {
		fill: var(--series-soft);
		fill-opacity: 0.75;
		stroke: var(--surface);
		stroke-width: 1.5;
		cursor: pointer;
		outline: none;
	}
	.metro.dim {
		fill-opacity: 0.18;
	}
	.link {
		stroke: var(--axis);
		stroke-dasharray: 3 3;
	}
	.pin {
		pointer-events: none;
	}
	.pin circle {
		stroke: var(--surface);
		stroke-width: 2.5;
	}
	.lbl {
		font-size: 12px;
		font-weight: 650;
		fill: var(--ink);
	}
	.lbl2 {
		font-size: 11px;
		fill: var(--ink-2);
	}
	.editors {
		margin-top: 14px;
	}
	.actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}
</style>
