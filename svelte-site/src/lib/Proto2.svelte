<script>
	import * as d3 from 'd3';
	import { ALL, REGIONS, f$, fPct, fN, fMo, fJobs, fSav, fieldRow } from '#lib/data.js';
	import { usMap } from '#lib/geo.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// PROTOTYPE 2: U.S. bubble map with brushing, industry + region filters, linked bar chart, city card.
	let { data, offers } = $props();

	const W = 640;
	const H = 400;
	const { projection, paths } = usMap(W, H);

	let field = $derived(offers.A.field);
	let region = $state('All regions');
	let brushed = $state(null); // [[x0, y0], [x1, y1]] in map coordinates, or null
	let sel = $state(null);

	let rows = $derived(
		data.cities
			.map((c) => {
				const f = fieldRow(data, c.city, field);
				return f ? { ...c, p: projection([c.lon, c.lat]), fjobs: f.jobs, fsal: f.salary, fsav: f.savings } : null;
			})
			.filter(Boolean)
	);
	function inView(d) {
		if (brushed) {
			const [[x0, y0], [x1, y1]] = brushed;
			return d.p[0] >= x0 && d.p[0] <= x1 && d.p[1] >= y0 && d.p[1] <= y1;
		}
		return region === 'All regions' || d.region === region;
	}
	let r = $derived(d3.scaleSqrt().domain([0, d3.max(rows, (d) => d.fjobs)]).range([2, 22]));
	// Biggest bubbles first so small ones stay clickable on top.
	let bubbles = $derived([...rows].sort((a, b) => b.fjobs - a.fjobs));

	// Brush: the one D3 selection in this view, confined to its own <g>.
	const brush = d3.brush().extent([
		[0, 0],
		[W, H]
	]);
	let brushNode;
	function attachBrush(node) {
		brushNode = node;
		brush.on('brush end', (e) => (brushed = e.selection));
		d3.select(node).call(brush).select('.overlay').style('cursor', 'crosshair');
		return () => brush.on('brush end', null);
	}
	function clearBrush() {
		if (brushNode) d3.select(brushNode).call(brush.move, null);
		brushed = null;
	}
	function pickRegion(rg) {
		region = rg;
		clearBrush();
	}

	// Bars
	const BW = 360;
	const BM = { l: 96, r: 44 };
	const BH_ROW = 22;
	let vis = $derived(
		rows
			.filter(inView)
			.sort((a, b) => b.fjobs - a.fjobs)
			.slice(0, 15)
	);
	let bh = $derived(Math.max(1, vis.length) * BH_ROW + 8);
	let bx = $derived(d3.scaleLinear().domain([0, d3.max(vis, (d) => d.fjobs) || 1]).range([0, BW - BM.l - BM.r]));
	let selected = $derived(rows.find((d) => d.city === sel));
	const fieldLabel = (f) => (f === ALL ? 'all fields' : f);
</script>

<section class="story" id="explore">
	<div class="wrap">
		<h2>Before you accept, put the offer through the tool</h2>
		<p class="lede">Start with where the jobs are. Pick an industry, choose a region, or drag a box on the map.</p>
		<div class="filters">
			<label>
				Industry
				<select bind:value={field}>
					{#each [ALL, ...data.fields] as f (f)}<option value={f}>{f}</option>{/each}
				</select>
			</label>
			<div class="seg">
				{#each ['All regions', ...REGIONS] as rg (rg)}
					<button type="button" aria-pressed={rg === region} onclick={() => pickRegion(rg)}>{rg}</button>
				{/each}
			</div>
			{#if brushed}<button class="ghost" onclick={clearBrush}>Clear brush ✕</button>{/if}
		</div>
		<div class="grid-main-side">
			<div class="card">
				<h3>U.S. metro map</h3>
				<p class="sub">Bubble size = entry-level jobs in the field · drag to brush an area · click a bubble for details</p>
				<svg class="map" viewBox="0 0 {W} {H}" role="img" aria-label="Bubble map of entry-level jobs by metro">
					<g>
						{#each paths as s (s.id)}<path class="state" d={s.d} />{/each}
					</g>
					<g class="brush" {@attach attachBrush}></g>
					<g>
						{#each bubbles as d (d.city)}
							<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
							<circle
								class="metro"
								class:dim={!inView(d)}
								class:sel={d.city === sel}
								cx={d.p[0]}
								cy={d.p[1]}
								r={r(d.fjobs)}
								onclick={() => (sel = d.city)}
								onpointermove={(e) =>
									showTip(e, {
										title: `${d.city}, ${d.state}`,
										meta: `${d.region} · ${fieldLabel(field)}`,
										rows: [
											[fN(d.fjobs), 'entry-level jobs'],
											[f$(d.fsal), '25th-pct salary'],
											[fSav(d.fsav) + '/mo', 'est. savings']
										]
									})}
								onpointerleave={hideTip}
							/>
						{/each}
					</g>
				</svg>
			</div>
			<div class="card">
				<h3>{brushed ? `Top cities — brushed area (${vis.length})` : `Top cities — ${region}`}</h3>
				<p class="sub">{field === ALL ? 'All fields' : field} · entry-level jobs</p>
				<svg class="hbar" viewBox="0 0 {BW} {bh}" role="img" aria-label="Top metros in view by entry-level jobs">
					{#each vis as d, i (d.city)}
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<g class="row" style:transform="translate(0px, {4 + i * BH_ROW}px)" onclick={() => (sel = d.city)}>
							<rect class:sel={d.city === sel} x={BM.l} y="2" height={BH_ROW - 5} rx="3" style:width="{bx(d.fjobs)}px" />
							<text class="name" class:sel={d.city === sel} x={BM.l - 8} y={BH_ROW / 2} dy="0.3em" text-anchor="end"
								>{d.city}</text
							>
							<text class="v" x={BM.l + bx(d.fjobs) + 5} y={BH_ROW / 2} dy="0.3em">{fJobs(d.fjobs)}</text>
						</g>
					{/each}
				</svg>
			</div>
		</div>
		{#if selected}
			<div class="infocard">
				<h3>{selected.city}, {selected.state}</h3>
				<p class="meta">{selected.region} · {fieldLabel(field)}</p>
				<div class="stats">
					{#each [
						[fN(selected.fjobs), 'entry-level jobs'],
						[f$(selected.fsal), '25th-pct salary'],
						[f$(Math.round(selected.fsal / (selected.rpp / 100))), 'salary, COL-adjusted'],
						[fSav(selected.fsav) + '/mo', 'est. savings'],
						[fMo(selected.fsav > 0 ? 10000 / selected.fsav : Infinity), 'to save $10k'],
						[f$(selected.rent1br), 'median 1-br rent'],
						[selected.unemp.toFixed(1) + '%', "unemployment '25"],
						[fPct(selected.young), 'residents age 20-29'],
						[selected.commute.toFixed(0) + ' min', 'mean commute'],
						[fPct(selected.transit), 'commute by transit']
					] as [v, l]}
						<div class="stat"><b>{v}</b><span>{l}</span></div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="infocard idle">
				{sel ? `${sel} has no ${field} data.` : "Click a bubble or a bar to see a city's full profile."}
			</div>
		{/if}
	</div>
</section>

<style>
	.metro {
		fill: var(--series-soft);
		fill-opacity: 0.75;
		stroke: var(--surface);
		stroke-width: 1.5;
		cursor: pointer;
		transition: r 300ms;
	}
	.metro.dim {
		fill-opacity: 0.18;
	}
	.metro.sel {
		fill: var(--accent);
		fill-opacity: 1;
	}
	.brush :global(.selection) {
		fill: var(--accent);
		fill-opacity: 0.08;
		stroke: var(--accent);
	}
	.row {
		transition: transform 300ms;
	}
</style>
