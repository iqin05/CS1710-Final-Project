<script>
	import { onMount } from 'svelte';
	import scrollama from 'scrollama';
	import { fade } from 'svelte/transition';

	// One stage of the story as scrollytelling: text cards scroll on the left while a visual stays
	// pinned on the right. Scrollama marks the card crossing the middle of the screen as active, and
	// the visual follows it: `steps[i].vis` names which visual to show (a change cross-fades), and the
	// `graphic` snippet gets the active step so a visual can also adjust within itself.
	// Narrow screens drop the pinning: each card is followed by its own visual.
	let { id, steps, text, graphic } = $props();

	let active = $state(0);
	let stepEls = $state([]);
	let stacked = $state(false);
	let reduced = $state(false);

	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const mq = matchMedia('(max-width: 900px)');
		stacked = mq.matches;
		const onMq = () => (stacked = mq.matches);
		mq.addEventListener('change', onMq);

		const scroller = scrollama();
		scroller
			.setup({ step: stepEls.filter(Boolean), offset: 0.55 })
			.onStepEnter(({ index }) => (active = index));
		const onResize = () => scroller.resize();
		addEventListener('resize', onResize);
		return () => {
			removeEventListener('resize', onResize);
			mq.removeEventListener('change', onMq);
			scroller.destroy();
		};
	});

	let step = $derived(steps[active]);
	const dur = () => (reduced ? 0 : 450);
</script>

<section class="stepstory" {id}>
	<div class="layout" class:stacked>
		<div class="steps">
			{#each steps as s, i (s.key)}
				<div class="step" class:active={i === active} bind:this={stepEls[i]}>
					<div class="card text">{@render text(s, i)}</div>
					{#if stacked}
						<div class="inline-vis">{@render graphic(s, i)}</div>
					{/if}
				</div>
			{/each}
		</div>
		{#if !stacked}
			<div class="visual">
				<div class="frame">
					{#key step.vis}
						<div class="vis" in:fade={{ duration: dur(), delay: dur() * 0.4 }} out:fade={{ duration: dur() * 0.6 }}>
							{@render graphic(step, active)}
						</div>
					{/key}
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.stepstory {
		padding: 8vh 0 0;
	}
	.layout {
		max-width: 1320px;
		margin: 0 auto;
		padding: 0 24px;
		display: grid;
		grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
		gap: 40px;
	}
	/* Leave the right margin to the step-indicator rail on wide screens. */
	@media (min-width: 1240px) {
		.layout {
			padding-right: 72px;
		}
	}
	.steps {
		grid-column: 1;
		padding: 25vh 0 35vh;
	}
	.step {
		min-height: 80vh;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
	}
	.step:last-child {
		min-height: 60vh;
	}
	.text {
		opacity: 0.35;
		transition: opacity 350ms;
	}
	.step.active .text {
		opacity: 1;
	}
	.text :global(h2) {
		font-size: 26px;
		line-height: 1.2;
		margin: 0 0 10px;
	}
	.text :global(p) {
		font-size: 15px;
		color: var(--ink-2);
		margin: 0 0 10px;
	}
	.text :global(p:last-child) {
		margin-bottom: 0;
	}
	.text :global(strong) {
		color: var(--ink);
	}
	/* The pinned visual, centered in the screen. Visuals stack in one cell so they cross-fade. */
	.visual {
		grid-column: 2;
		grid-row: 1;
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100svh;
		display: flex;
		align-items: center;
		align-self: start;
	}
	.frame {
		width: 100%;
		display: grid;
		/* A visual taller than a short screen scrolls inside the panel rather than spilling off it. */
		max-height: calc(100vh - 32px);
		overflow-y: auto;
	}
	.vis {
		grid-area: 1 / 1;
		min-width: 0;
	}

	/* Narrow screens: no pinning; each text card is followed by its own visual. */
	.layout.stacked {
		display: block;
		padding: 0 16px;
	}
	.layout.stacked .steps {
		padding: 0 0 8vh;
	}
	.layout.stacked .step {
		min-height: 0;
		margin-bottom: 40px;
	}
	.layout.stacked .text {
		opacity: 1;
	}
	.inline-vis {
		margin-top: 14px;
	}
</style>
