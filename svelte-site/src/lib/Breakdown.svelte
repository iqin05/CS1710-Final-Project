<script>
	import * as d3 from 'd3';
	import { ALL, f$, fMo, calc } from '#lib/data.js';
	import OfferEditor from '#lib/OfferEditor.svelte';

	// NEXT STEPS: the two offers as one-month paycheck breakdowns at the entered salaries.
	let { data, offers, setOffer } = $props();

	const COL = { rent: '#2f4f7f', rest: '#7f9cc4', tax: '#c3c2b7', left: '#3d6fb0', short: '#c0392b' };

	let A = $derived(calc(data, offers.A.city, offers.A.salary));
	let B = $derived(calc(data, offers.B.city, offers.B.salary));
	// Both bars share one scale: the larger gross monthly paycheck.
	let gross = $derived(Math.max(A.salary, B.salary) / 12);

	function segments(r) {
		const s = [
			['rent', r.housing, 'Rent (studio)'],
			['rest', r.rest, 'Food, transport, health, other'],
			['tax', r.taxes, 'Taxes']
		];
		s.push(r.savings >= 0 ? ['left', r.savings, 'Left to save'] : ['short', -r.savings, 'Shortfall']);
		return s;
	}

	let verdict = $derived.by(() => {
		const hi = A.salary >= B.salary ? A : B;
		const lo = hi === A ? B : A;
		const keep = A.savings >= B.savings ? A : B;
		if (hi === keep) {
			return `Here ${hi.c.city} wins on both counts: it pays ${f$(hi.salary - lo.salary)} more and keeps ${f$(hi.savings - lo.savings)} more a month. Still, ${Math.round((1 - hi.savings / (hi.salary / 12)) * 100)}% of the bigger paycheck is gone before you save a dollar.`;
		}
		const faster = isFinite(hi.months)
			? d3.format('.1f')(hi.months / lo.months) + '× faster'
			: 'while ' + hi.c.city + ' never does';
		return `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more, but ${lo.c.city} leaves ${f$(lo.savings - hi.savings)} more a month and gets you to $10,000 ${faster}. Pick the city that works for you, not the one with the biggest number.`;
	});
	let pair = $derived([
		['A', A, offers.A],
		['B', B, offers.B]
	]);
</script>

<section class="story" id="offer">
	<div class="wrap">
		<h2 class="small">Now look at the two offers with the full picture</h2>
		<p class="lede">
			Edit either offer: the salary, the city, or the field. Each bar splits one month of pay into rent, the rest of
			the budget, taxes, and what is left to save.
		</p>
		<div class="grid2">
			{#each ['A', 'B'] as k}
				<OfferEditor {data} key={k} offer={offers[k]} onchange={(patch) => setOffer(k, patch)} />
			{/each}
		</div>
		<div class="bd">
			{#each pair as [k, r, o] (k)}
				{@const segs = segments(r)}
				<div class="card">
					<h3>Offer {k} · {r.c.city}, {r.c.state} · {f$(r.salary)} a year ({f$(r.salary / 12)} a month)</h3>
					<p class="sub">{o.field === ALL ? 'any entry-level field' : o.field}</p>
					<div class="seg-bar" role="img" aria-label={segs.map(([, v, l]) => `${l} ${f$(v)}`).join(', ')}>
						{#each segs as [key, v, lbl] (key)}
							<div
								class:short={key === 'short'}
								style:background={COL[key]}
								style:width="{(v / gross) * 100}%"
								title="{lbl}: {f$(v)}"
							></div>
						{/each}
					</div>
					<div class="k">
						{#each segs as [key, v, lbl] (key)}
							<span><i style:background={COL[key]}></i>{lbl} {f$(v)}</span>
						{/each}
					</div>
					<p class="left">
						{r.savings < 0 ? '−' : ''}{f$(Math.abs(r.savings))} a month
						<small>
							{r.savings < 0 ? 'short of a modest budget' : `left to save · ${fMo(r.months)} to a $10,000 emergency fund`}
						</small>
					</p>
				</div>
			{/each}
		</div>
		<p class="prose verdict">{verdict}</p>
	</div>
</section>

<style>
	section.story {
		padding-top: 36px;
	}
	h2.small {
		font-size: 24px;
	}
	.bd {
		margin-top: 16px;
	}
	.bd .card {
		margin-bottom: 12px;
	}
	.seg-bar {
		display: flex;
		height: 34px;
		border-radius: 6px;
		overflow: hidden;
		gap: 2px;
	}
	.seg-bar div {
		height: 100%;
		min-width: 0;
		transition: width 300ms;
	}
	.seg-bar div.short {
		outline: 2px dashed #c0392b;
		outline-offset: -2px;
	}
	.k {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		font-size: 12px;
		color: var(--ink-2);
		margin-top: 8px;
	}
	.k i {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
		margin-right: 5px;
		vertical-align: -1px;
	}
	.left {
		font-size: 26px;
		font-weight: 650;
		margin: 10px 0 0;
	}
	.left small {
		font-size: 13px;
		color: var(--ink-2);
		font-weight: 400;
		margin-left: 6px;
	}
	.verdict {
		margin-top: 16px;
		font-size: 17px;
	}
</style>
