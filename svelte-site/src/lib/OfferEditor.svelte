<script>
	import { ALL } from '#lib/data.js';

	// One editable offer letter. Used in the hook and again in the final section,
	// both bound to the same offer held by the page.
	let { data, key, offer, onchange } = $props();

	const MIN = 20000;
	const MAX = 300000;
	const STEP = 1000;
	const clamp = (v) => Math.max(MIN, Math.min(MAX, v));

	let cityOptions = $derived([...data.cities].sort((a, b) => a.city.localeCompare(b.city)));
	let fieldOptions = $derived([ALL, ...data.fields]);
</script>

<div class="offer {key.toLowerCase()}">
	<div class="tag"><i></i>Offer {key}</div>
	<p>We're pleased to offer you a full-time position in</p>
	<select
		aria-label="Industry for offer {key}"
		value={offer.field}
		onchange={(e) => onchange({ field: e.currentTarget.value })}
	>
		{#each fieldOptions as f (f)}
			<!-- Grey out fields this city has no grad jobs in. -->
			<option value={f} disabled={f !== ALL && !data.byField[offer.city]?.[f]}>{f}</option>
		{/each}
	</select>
	<p>based in</p>
	<select
		aria-label="City for offer {key}"
		value={offer.city}
		onchange={(e) => onchange({ city: e.currentTarget.value })}
	>
		{#each cityOptions as c (c.city)}
			<option value={c.city}>{c.city}, {c.state}</option>
		{/each}
	</select>
	<p>with a starting salary of</p>
	<div class="stepper">
		<button type="button" aria-label="Decrease salary" onclick={() => onchange({ salary: clamp(offer.salary - STEP) })}>−</button>
		<input
			type="number"
			aria-label="Salary for offer {key}"
			min={MIN}
			max={MAX}
			step={STEP}
			value={offer.salary}
			onchange={(e) => onchange({ salary: clamp(+e.currentTarget.value || 0) })}
		/>
		<button type="button" aria-label="Increase salary" onclick={() => onchange({ salary: clamp(offer.salary + STEP) })}>+</button>
		<small>per year</small>
	</div>
</div>

<style>
	.offer {
		border: 1px solid var(--border);
		border-top: 4px solid var(--a);
		border-radius: 12px;
		background: var(--surface);
		padding: 14px 16px;
		min-width: 0;
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
		display: inline-block;
	}
	.offer.b .tag i {
		background: var(--b);
	}
	p {
		margin: 8px 0 4px;
		color: var(--ink-2);
		font-size: 13px;
	}
	select {
		min-width: 0;
		width: 100%;
		font-size: 15px;
		font-weight: 600;
		padding: 8px 26px 8px 10px;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.stepper button {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--control);
		font-size: 16px;
		cursor: pointer;
		color: var(--ink-2);
	}
	.stepper input {
		width: 120px;
		font-size: 20px;
		font-weight: 650;
		padding: 4px 8px;
		text-align: right;
	}
	.stepper small {
		color: var(--muted);
	}
</style>
