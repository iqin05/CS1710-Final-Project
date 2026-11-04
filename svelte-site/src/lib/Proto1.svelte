<script>
	import * as d3 from 'd3';
	import { ALL, f$, fPct, fN, fMo, fJobs, fSav, fieldRow } from '#lib/data.js';
	import { axis, gridAxis } from '#lib/axis.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// Visual: job opportunities by industry. Industry filter plus one chart at a time, chosen by the
	// story step: `view` 'bars' (top 15 cities) or 'scatter' (opportunity vs. pay). The two offer
	// cities are marked throughout; the narrative lives in the step text.
	let { data, offers, view = 'bars' } = $props();

	// Follow Offer A until the reader picks something here.
	let field = $derived(offers.A.field);
	// A city the reader clicked (ringed); none to start, since the two offers are already marked.
	let sel = $state(null);
	let per1000 = $state(false);

	let rows = $derived(
		data.cities
			.map((c) => {
				const f = fieldRow(data, c.city, field);
				return f ? { ...c, fjobs: f.jobs, fsal: f.salary, fsav: f.savings, per: (f.jobs / c.totalJobs) * 1000 } : null;
			})
			.filter(Boolean)
	);
	let metric = $derived(per1000 ? (d) => d.per : (d) => d.fjobs);
	let marks = $derived(new Set([offers.A.city, offers.B.city]));
	const fieldLabel = (f) => (f === ALL ? 'all fields' : f);

	// Bars
	const BW = 520;
	const BM = { l: 110, r: 56, t: 4, b: 4 };
	const BH_ROW = 20;
	let top = $derived([...rows].sort((a, b) => metric(b) - metric(a)).slice(0, 15));
	let bh = $derived(BM.t + top.length * BH_ROW + BM.b);
	let bx = $derived(d3.scaleLinear().domain([0, d3.max(top, metric)]).range([0, BW - BM.l - BM.r]));

	// Scatter
	const SW = 520;
	const SH = 360;
	const SM = { l: 52, r: 16, t: 10, b: 36 };
	let sx = $derived(
		d3
			.scaleLog()
			.domain(d3.extent(rows, metric).map((v, i) => (i ? v * 1.6 : v / 1.4)))
			.range([SM.l, SW - SM.r])
	);
	let sy = $derived(
		d3
			.scaleLinear()
			.domain([d3.min(rows, (d) => d.fsal) * 0.92, d3.max(rows, (d) => d.fsal) * 1.05])
			.nice()
			.range([SH - SM.b, SM.t])
	);
	let xAxis = $derived(gridAxis(d3.axisBottom(sx).ticks(5, '~s'), SH - SM.b - SM.t));
	let yAxis = $derived(
		gridAxis(
			d3
				.axisLeft(sy)
				.ticks(6)
				.tickFormat((v) => '$' + d3.format('.0f')(v / 1000) + 'k'),
			SW - SM.l - SM.r
		)
	);
	// Selected and offer cities draw last so they sit on top.
	let dots = $derived(
		[...rows].sort((a, b) => (a.city === sel || marks.has(a.city)) - (b.city === sel || marks.has(b.city)))
	);
	let selected = $derived(rows.find((r) => r.city === sel));

	function tipFor(e, d) {
		showTip(e, {
			title: `${d.city}, ${d.state}`,
			meta: `${d.region} · ${fieldLabel(field)}`,
			rows: [
				[fN(d.fjobs), 'entry-level jobs'],
				[d3.format('.0f')(d.per), 'per 1,000 local jobs'],
				[f$(d.fsal), '25th-pct salary'],
				[fSav(d.fsav) + '/mo', 'est. savings']
			]
		});
	}
	// Offer cities in their offer colors (A blue, B orange, as everywhere in the story); a clicked city
	// gets a dark ring.
	const markClass = (d) =>
		[d.city === offers.A.city ? 'oa' : d.city === offers.B.city ? 'ob' : '', d.city === sel ? 'picked' : ''].join(' ');

</script>

<div class="viz">
		<div class="filters">
			<label>
				Industry
				<select bind:value={field}>
					{#each [ALL, ...data.fields] as f (f)}<option value={f}>{f}</option>{/each}
				</select>
			</label>
			<div class="seg">
				<button type="button" aria-pressed={!per1000} onclick={() => (per1000 = false)}>Total jobs</button>
				<button type="button" aria-pressed={per1000} onclick={() => (per1000 = true)}>Per 1,000 local jobs</button>
			</div>
		</div>
		{#if view === 'bars'}
			<div class="card">
				<h3>Top 15 cities by opportunity</h3>
				<p class="sub">{per1000 ? 'Entry-level jobs per 1,000 local jobs' : 'Entry-level jobs'}, {fieldLabel(field)}</p>
				<svg class="hbar" viewBox="0 0 {BW} {bh}" role="img" aria-label="Top 15 metros by entry-level jobs">
					{#each top as d, i (d.city)}
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<g
							class="row"
							style:transform="translate(0px, {BM.t + i * BH_ROW}px)"
							onclick={() => (sel = d.city)}
							onpointermove={(e) => tipFor(e, d)}
							onpointerleave={hideTip}
						>
							<rect class={markClass(d)} x={BM.l} y="2" height={BH_ROW - 4} rx="3" style:width="{bx(metric(d))}px" />
							<text class="name" class:sel={d.city === sel || marks.has(d.city)} x={BM.l - 8} y={BH_ROW / 2} dy="0.34em" text-anchor="end"
								>{d.city}{marks.has(d.city) ? ' ●' : ''}</text
							>
							<text class="v" x={BM.l + bx(metric(d)) + 6} y={BH_ROW / 2} dy="0.34em"
								>{per1000 ? d3.format('.0f')(d.per) : fJobs(d.fjobs)}</text
							>
						</g>
					{/each}
				</svg>
			</div>
		{:else}
			<div class="card">
				<h3>Opportunity vs. pay</h3>
				<p class="sub">Each dot is a metro · x: entry-level jobs (log) · y: 25th-pct salary in the field</p>
				<svg viewBox="0 0 {SW} {SH}" role="img" aria-label="Scatterplot of entry-level jobs against salary">
					<g class="axis" transform="translate(0,{SH - SM.b})" {@attach axis(xAxis)}></g>
					<g class="axis" transform="translate({SM.l},0)" {@attach axis(yAxis)}></g>
					<text class="axis-label" x={(SW + SM.l) / 2} y={SH - 4} text-anchor="middle"
						>{per1000 ? 'entry-level jobs per 1,000 local jobs (log scale)' : 'entry-level jobs (log scale)'}</text
					>
					{#each dots as d (d.city)}
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<circle
							class="dot moving {markClass(d)}"
							r={d.city === sel ? 7 : 5}
							style:transform="translate({sx(metric(d))}px, {sy(d.fsal)}px)"
							onclick={() => (sel = d.city)}
							onpointermove={(e) => tipFor(e, d)}
							onpointerleave={hideTip}
						/>
					{/each}
					{#each rows.filter((d) => d.city === sel || marks.has(d.city)) as d (d.city)}
						<text class="dotlbl" class:sel={marks.has(d.city)} x={sx(metric(d)) + 9} y={sy(d.fsal) - 8}>{d.city}</text>
					{/each}
				</svg>
			</div>
		{/if}
</div>

<style>
	.hbar rect.oa,
	.dot.oa {
		fill: var(--a);
		fill-opacity: 1;
	}
	.hbar rect.ob,
	.dot.ob {
		fill: var(--b);
		fill-opacity: 1;
	}
	/* Offer and clicked cities' names in ink, bold: their bars carry the color. */
	.hbar text.name.sel {
		fill: var(--ink);
	}
	.hbar rect.picked,
	.dot.picked {
		stroke: var(--ink);
		stroke-width: 2;
	}
	.row {
		transition: transform 300ms;
	}
	.moving {
		transition: transform 300ms;
	}
</style>
