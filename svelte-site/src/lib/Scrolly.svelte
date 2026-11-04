<script>
	import { onMount } from 'svelte';
	import scrollama from 'scrollama';

	// Scrollytelling index for the whole story. Each step is one storyboard beat, rendered as a full
	// scene by the `scene` snippet. The step crossing the middle of the viewport is `active`; the
	// indicator highlights it, and its buttons scroll to a scene so Scrollama updates the index
	// exactly as if the reader had scrolled there.
	let { steps, active = $bindable(0), scene } = $props();

	let els = $state([]);
	// Which scenes currently cross the middle line. None do on the title screen or the footer,
	// and the indicator hides then.
	let inBand = $state([]);
	let shown = $derived(inBand.some(Boolean));

	onMount(() => {
		// Scrollama fires onStepEnter / onStepExit as a scene crosses the trigger line at the
		// middle of the viewport (offset 0.5).
		const scroller = scrollama();
		scroller
			.setup({ step: els.filter(Boolean), offset: 0.5 })
			.onStepEnter(({ index }) => {
				inBand[index] = true;
				active = index;
			})
			.onStepExit(({ index }) => (inBand[index] = false));

		// The trigger line is measured from the window height, so re-measure when it changes.
		const onResize = () => scroller.resize();
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('resize', onResize);
			scroller.destroy();
		};
	});

	function goTo(i) {
		const el = els[Math.max(0, Math.min(steps.length - 1, i))];
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		el?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
	}
</script>

{#each steps as s, i (s.id)}
	<div class="scene" class:active={i === active} data-i={i} bind:this={els[i]}>
		{@render scene(s, i)}
	</div>
{/each}

<nav class="controls" class:shown aria-label="Story steps" aria-hidden={!shown} inert={!shown}>
	<button class="arrow" aria-label="Previous step" disabled={active === 0} onclick={() => goTo(active - 1)}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
	</button>
	{#each steps as s, i (s.id)}
		<button
			class="dot"
			aria-label="Step {i + 1} of {steps.length}"
			aria-current={i === active ? 'step' : undefined}
			onclick={() => goTo(i)}
		>
			<span class="circle"></span>
		</button>
	{/each}
	<button class="arrow" aria-label="Next step" disabled={active === steps.length - 1} onclick={() => goTo(active + 1)}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
	</button>
</nav>

<style>
	.scene {
		min-height: 100vh;
		min-height: 100svh;
		transition: opacity 400ms;
	}
	.scene:not(.active) {
		opacity: 0.4;
	}

	/* Wide screens: a vertical rail in the right margin. */
	.controls {
		position: fixed;
		right: 16px;
		top: 50%;
		transform: translateY(-50%);
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		opacity: 0;
		pointer-events: none;
		transition: opacity 300ms;
	}
	.controls.shown {
		opacity: 1;
		pointer-events: auto;
	}
	.controls button {
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
		color: var(--ink-2);
	}
	/* Each step is a circle; the active one fills in. The button pads it to a 28px target. */
	.dot {
		position: relative;
		display: flex;
		align-items: center;
		padding: 7px;
		border: 0;
		background: none;
	}
	.circle {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1.5px solid var(--axis);
		background: var(--control);
		transition:
			background 200ms,
			border-color 200ms,
			transform 200ms;
	}
	.dot:hover:not([aria-current]) .circle {
		border-color: var(--ink-2);
	}
	.dot[aria-current='step'] .circle {
		background: var(--control-active);
		border-color: var(--control-active);
		transform: scale(1.2);
	}
	.arrow {
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0;
		background: none;
		display: grid;
		place-items: center;
		color: var(--ink-2);
	}
	.arrow svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.25;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: transform 200ms;
	}
	.arrow:hover:not(:disabled) {
		color: var(--ink);
	}
	.arrow:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.controls button:focus-visible {
		outline: 2px solid var(--control-active);
		outline-offset: 2px;
		border-radius: 999px;
	}

	/* Without a margin wide enough for the rail: a pill pinned to the bottom. */
	@media (max-width: 1239px) {
		.controls {
			top: auto;
			right: auto;
			bottom: 12px;
			left: 50%;
			transform: translateX(-50%);
			flex-direction: row;
			align-items: center;
			padding: 4px 6px;
			border-radius: 999px;
			background: var(--surface);
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
		}
		/* The chevrons point up/down on the rail; turn them to point left/right in the pill. */
		.arrow svg {
			transform: rotate(-90deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.scene:not(.active) {
			opacity: 1;
		}
	}
</style>
