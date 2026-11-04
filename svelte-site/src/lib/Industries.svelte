<script>
	import * as d3 from 'd3';
	import { ALL, fN, fPct, fieldShares } from '#lib/data.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// Visual: what each offer city hires new grads for (all fields). Each city's fields are ranked by
	// entry-level jobs (as a share of all its entry-level jobs); the offer's own field is highlighted,
	// and a tick marks that field's typical share across all 40 metros for context.
	let { data, offers } = $props();

	// Typical (median) share of entry-level jobs in each field, across the 40 metros.
	let typical = $derived.by(() => {
		const all = data.cities.map((c) => fieldShares(data, c.city));
		const m = new Map();
		for (const f of data.fields.filter((f) => f !== 'Other'))
			m.set(f, d3.median(all, (rows) => rows.find((r) => r.field === f)?.share ?? 0));
		return m;
	});

	let cards = $derived(
		['A', 'B'].map((k) => {
			const o = offers[k];
			const c = data.byCity[o.city];
			const rows = fieldShares(data, o.city);
			const rank = rows.findIndex((r) => r.field === o.field) + 1;
			return { k, o, c, rows, rank, mine: rows[rank - 1] };
		})
	);

	// One share scale for both cards so the bars compare across cities.
	let max = $derived(
		d3.max([...cards.flatMap((c) => c.rows.map((r) => r.share)), ...typical.values()]) * 1.05
	);

	const W = 460;
	const M = { l: 178, r: 44, t: 4, b: 4 };
	const ROW = 24;
	let H = $derived(M.t + (cards[0]?.rows.length ?? 0) * ROW + M.b);
	let x = $derived(d3.scaleLinear().domain([0, max]).range([0, W - M.l - M.r]));

	// One line per offer about where its field stands.
	function line(card) {
		const { o, c, rows, rank, mine } = card;
		if (o.field === ALL)
			return `Your offer doesn't name a field. ${c.city}'s biggest fields for new grads are ${rows[0].field}, ${rows[1].field} and ${rows[2].field}.`;
		const t = typical.get(o.field);
		const vs = mine.share > t * 1.15 ? 'more than' : mine.share < t * 0.85 ? 'less than' : 'about';
		return `${o.field} is #${rank} of ${rows.length} fields in ${c.city}: ${fPct(mine.share)} of its entry-level jobs, ${vs} the typical metro (${fPct(t)}).`;
	}
</script>

<div class="viz">
		<div class="grid2">
			{#each cards as card (card.k)}
				<div class="card offer {card.k.toLowerCase()}">
					<div class="tag"><i></i>Offer {card.k} · {card.c.city}, {card.c.state}</div>
					<p class="line">{line(card)}</p>
					<svg viewBox="0 0 {W} {H}" role="img" aria-label="Fields in {card.c.city} ranked by share of entry-level jobs">
						{#each card.rows as r, i (r.field)}
							{@const isMine = r.field === card.o.field}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<g
								transform="translate(0,{M.t + i * ROW})"
								onpointermove={(e) =>
									showTip(e, {
										title: `${r.field} in ${card.c.city}`,
										rows: [
											[fN(r.jobs), 'entry-level jobs'],
											[fPct(r.share), `of ${card.c.city}'s entry-level jobs`],
											[fPct(typical.get(r.field)), 'typical across 40 metros']
										]
									})}
								onpointerleave={hideTip}
							>
								<text class="name" class:mine={isMine} x={M.l - 10} y={ROW / 2} dy="0.34em" text-anchor="end"
									>{r.field}</text
								>
								<rect class="bar" class:mine={isMine} x={M.l} y="4" width={x(r.share)} height={ROW - 8} rx="2" />
								<line
									class="typ"
									x1={M.l + x(typical.get(r.field))}
									x2={M.l + x(typical.get(r.field))}
									y1="1"
									y2={ROW - 1}
								/>
								<!-- The value sits past the bar or the typical tick, whichever reaches further. -->
								<text
									class="v"
									class:mine={isMine}
									x={M.l + Math.max(x(r.share), x(typical.get(r.field))) + 6}
									y={ROW / 2}
									dy="0.34em">{fPct(r.share)}</text
								>
							</g>
						{/each}
					</svg>
					<p class="key"><span class="tick"></span> typical share across the 40 metros</p>
				</div>
			{/each}
		</div>
</div>

<style>
	.offer {
		border-top: 4px solid var(--a);
	}
	.offer.b {
		border-top-color: var(--b);
	}
	.tag {
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--ink-2);
	}
	.tag i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--a);
	}
	.offer.b .tag i {
		background: var(--b);
	}
	.line {
		font-size: 14px;
		color: var(--ink-2);
		margin: 8px 0 10px;
		min-height: 3em;
	}
	.name {
		font-size: 12px;
		fill: var(--ink-2);
	}
	.name.mine {
		fill: var(--ink);
		font-weight: 700;
	}
	.bar {
		fill: var(--series-soft);
	}
	.offer.a .bar.mine {
		fill: var(--a);
	}
	.offer.b .bar.mine {
		fill: var(--b);
	}
	.typ {
		stroke: var(--ink);
		stroke-width: 1.5;
	}
	.v {
		font-size: 11px;
		fill: var(--muted);
	}
	.v.mine {
		fill: var(--ink);
		font-weight: 650;
	}
	.key {
		margin: 6px 0 0;
		font-size: 12px;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.key .tick {
		width: 2px;
		height: 12px;
		background: var(--ink);
	}
</style>
