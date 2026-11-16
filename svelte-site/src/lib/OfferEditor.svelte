<script>
	import { ALL, SALARY_ADJUST, f$, baselineSalary } from '#lib/data.js';

	// One editable offer letter. Used in the hook and again in the final section,
	// both bound to the same offer held by the page.
	let { data, key, offer, onchange, editable = false } = $props();

	// The salary is the city × field typical (25th-percentile) entry-level pay, so readers compare places and industries on equal
	// terms. Only an `editable` editor (the final "Try other offers" step) lets the reader type a
	// salary or use − / + ($1,000 steps); changing the city or field always resets it to that typical salary.
	let baseline = $derived(baselineSalary(data, offer.city, offer.field));
	let custom = $derived(offer.salary !== baseline);
	const MIN = 20000;
	const MAX = 300000;
	const clamp = (v) => Math.max(MIN, Math.min(MAX, v));
	const bump = (dir) => onchange({ salary: clamp(offer.salary + dir * SALARY_ADJUST) });

	// Typed salary: the raw text while editing (null = show the offer's salary). Applied on Enter or
	// blur. Accepts "85000", "$85,000" or "85k"; anything else reverts. Kept within MIN–MAX.
	let draft = $state(null);
	// The clamped value a typed salary was pulled back to; the range hint shows while it stands.
	let clampedTo = $state(null);
	function commit() {
		if (draft == null) return;
		const m = draft
			.trim()
			.toLowerCase()
			.replace(/[$,\s]/g, '')
			.match(/^(\d+(?:\.\d+)?)(k?)$/);
		draft = null;
		if (!m) return;
		const v = Math.round(+m[1] * (m[2] ? 1000 : 1));
		clampedTo = v !== clamp(v) ? clamp(v) : null;
		onchange({ salary: clamp(v) });
	}
	function onkey(e) {
		if (e.key === 'Enter') e.currentTarget.blur();
		else if (e.key === 'Escape') {
			draft = null;
			e.currentTarget.blur();
		}
	}

	let cityOptions = $derived([...data.cities].sort((a, b) => a.city.localeCompare(b.city)));
	// "Other" is a catch-all of unrelated jobs, so it isn't offered as a field.
	let fieldOptions = $derived([ALL, ...data.fields.filter((f) => f !== 'Other')]);
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
		{#if editable}
			<button
				type="button"
				aria-label="Decrease offer {key} salary by {f$(SALARY_ADJUST)}"
				disabled={offer.salary <= MIN}
				onclick={() => bump(-1)}>−</button
			>
			<input
				class="salary"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				aria-label="Salary for offer {key}, in dollars a year"
				value={draft ?? f$(offer.salary)}
				onfocus={(e) => e.currentTarget.select()}
				oninput={(e) => (draft = e.currentTarget.value)}
				onblur={commit}
				onkeydown={onkey}
			/>
			<button
				type="button"
				aria-label="Increase offer {key} salary by {f$(SALARY_ADJUST)}"
				disabled={offer.salary >= MAX}
				onclick={() => bump(1)}>+</button
			>
		{:else}
			<output class="salary locked" aria-label="Salary for offer {key}">{f$(offer.salary)}</output>
		{/if}
		<small>per year</small>
	</div>
	<p class="basis">
		{#if editable && clampedTo === offer.salary}
			Salaries run from {f$(MIN)} to {f$(MAX)} ·
		{/if}
		{#if custom}
			Custom salary · typical here is {f$(baseline)}
		{:else}
			Typical entry-level salary (25th percentile) for {offer.field === ALL ? 'all fields' : offer.field} in {offer.city}
		{/if}
		{#if editable && custom}
			· <button type="button" class="link" onclick={() => onchange({ salary: baseline })}>Reset to typical</button>
		{/if}
	</p>
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
	.stepper button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.salary {
		min-width: 110px;
		font-size: 20px;
		font-weight: 650;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.stepper small {
		color: var(--muted);
	}
	input.salary {
		width: 120px;
		min-width: 0;
		padding: 4px 6px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: inherit;
		font-family: inherit;
	}
	.salary.locked {
		min-width: 0;
		text-align: left;
	}
	.basis {
		margin-top: 4px;
		font-size: 12px;
		color: var(--muted);
	}
	.link {
		border: 0;
		padding: 0;
		background: none;
		font: inherit;
		color: var(--ink-2);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
