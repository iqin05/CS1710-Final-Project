<script>
	import { tip } from '#lib/tooltip.svelte.js';

	let w = $state(0);
	let h = $state(0);
	// Sit below-right of the pointer; flip when that would run off the window.
	let left = $derived(tip.x + 14 + w > window.innerWidth - 8 ? tip.x - w - 14 : tip.x + 14);
	let top = $derived(tip.y + 14 + h > window.innerHeight - 8 ? tip.y - h - 14 : tip.y + 14);
</script>

<div
	class="tooltip"
	role="tooltip"
	bind:offsetWidth={w}
	bind:offsetHeight={h}
	style:opacity={tip.visible ? 1 : 0}
	style:left="{left}px"
	style:top="{top}px"
>
	{#if tip.content}
		<div class="t">{tip.content.title}</div>
		{#if tip.content.meta}<div class="m">{tip.content.meta}</div>{/if}
		{#if tip.content.big}<div class="big">{tip.content.big}</div>{/if}
		{#each tip.content.rows ?? [] as [v, l]}
			<div class="row"><strong>{v}</strong><span>{l}</span></div>
		{/each}
		{#if tip.content.note}<div class="m note">{tip.content.note}</div>{/if}
	{/if}
</div>

<style>
	.tooltip {
		position: fixed;
		z-index: 20;
		pointer-events: none;
		transition: opacity 0.1s;
		background: var(--tip-bg);
		color: var(--ink);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
		padding: 10px 12px;
		font-size: 12px;
		min-width: 190px;
	}
	.t {
		font-weight: 650;
		font-size: 13px;
	}
	.m {
		color: var(--ink-2);
		margin-bottom: 6px;
	}
	.note {
		margin: 6px 0 0;
	}
	.big {
		font-size: 18px;
		font-weight: 650;
		margin: 2px 0 6px;
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		font-variant-numeric: tabular-nums;
	}
	.row strong {
		font-weight: 600;
	}
	.row span {
		color: var(--ink-2);
	}
</style>
