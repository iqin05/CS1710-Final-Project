<script>
	import { onMount } from 'svelte';
	import scrollama from 'scrollama';

	// The whole story's scenes, each rendered by the `scene` snippet. The scene crossing the middle
	// of the viewport is `active` (the others dim). The < > buttons step to the previous / next
	// change in the story, not to storyboard sections: every element marked [data-stop] in the page
	// is one change (the hook's narration moments, each text card of the later sections).
	//   data-stop="top"   scroll so the spot sits at the top of the screen (the hook's moments)
	//   data-stop="card"  scroll so the card sits just above the middle, where it becomes active
	let { steps, active = $bindable(0), scene } = $props();

	let els = $state([]);
	// Which scenes currently cross the middle line. None do on the title screen or the footer,
	// and the buttons hide then.
	let inBand = $state([]);
	let shown = $derived(inBand.some(Boolean));
	let canPrev = $state(false);
	let canNext = $state(true);

	// Every stop's scroll position, in page order.
	function stops() {
		return [...document.querySelectorAll('[data-stop]')]
			.map((el) => {
				const top = el.getBoundingClientRect().top + scrollY;
				return Math.max(0, Math.round(el.dataset.stop === 'card' ? top - innerHeight * 0.4 : top));
			})
			.sort((a, b) => a - b);
	}
	// A few px of slack, so a stop just reached doesn't count as still ahead.
	const SLACK = 8;
	function updateButtons() {
		const ys = stops();
		canPrev = ys.some((y) => y < scrollY - SLACK);
		canNext = ys.some((y) => y > scrollY + SLACK);
	}
	function go(dir) {
		const ys = stops();
		const y = dir > 0 ? ys.find((v) => v > scrollY + SLACK) : ys.findLast((v) => v < scrollY - SLACK);
		if (y == null) return;
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
	}

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

		// Keep the buttons' enabled state in step with the scroll (one update per frame at most).
		let queued = false;
		const onScroll = () => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				updateButtons();
			});
		};
		// The trigger line is measured from the window height, so re-measure when it changes.
		const onResize = () => {
			scroller.resize();
			onScroll();
		};
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onResize);
		updateButtons();
		return () => {
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onResize);
			scroller.destroy();
		};
	});
</script>

{#each steps as s, i (s.id)}
	<div class="scene" class:active={i === active} data-i={i} bind:this={els[i]}>
		{@render scene(s, i)}
	</div>
{/each}

<nav class="controls" class:shown aria-label="Story navigation" aria-hidden={!shown} inert={!shown}>
	<button class="arrow" aria-label="Previous part of the story" disabled={!canPrev} onclick={() => go(-1)}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
	</button>
	<button class="arrow" aria-label="Next part of the story" disabled={!canNext} onclick={() => go(1)}>
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
	.arrow {
		width: 32px;
		height: 32px;
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
