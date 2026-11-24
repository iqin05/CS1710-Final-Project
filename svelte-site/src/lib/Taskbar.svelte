<script>
	// HOOK: the reader's computer taskbar, always along the bottom of the hook so the inbox (and
	// later the map) reads as "your screen". A generic, minimal bar in black and grays: the launcher,
	// search box and a few app shapes (mail is the open one) centered together, and a clock set to
	// graduation season on the right. Purely presentational, and hidden from assistive tech; the hook
	// types the search query by scroll.
	//   query   what's typed in the search box so far ('' shows the placeholder)
	//   focus   the search box is active (ring + blinking caret)
	//   app     the open app: 'mail' for the inbox, 'map' once the search result becomes the map
	// `searchEl` (bindable) is the search box, which the hook's callout and map panel aim for.
	let { query = '', focus = false, app = 'mail', searchEl = $bindable() } = $props();

	const ICON = {
		launcher: 'M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01',
		search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM16 16l5 5',
		mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
		// A folded paper map: three panels.
		map: 'M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5zM9 4v13.5M15 6.5V20',
		globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18',
		folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
		notes: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6'
	};
</script>

{#snippet icon(name)}
	<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d={ICON[name]} /></svg>
{/snippet}

<div class="taskbar" aria-hidden="true" inert>
	<!-- Launcher, search and apps sit together in the middle; the clock keeps to the right. -->
	<span class="middle">
		<span class="app launcher">{@render icon('launcher')}</span>
		<span class="search" class:focus bind:this={searchEl}>
			{@render icon('search')}
			{#if query}
				<span class="q">{query}</span>
			{:else}
				<span class="ph">Search the internet</span>
			{/if}
			{#if focus}<span class="caret"></span>{/if}
		</span>
		<span class="app" class:on={app === 'mail'}>{@render icon('mail')}</span>
		<span class="app" class:on={app === 'map'}>{@render icon('map')}</span>
		<span class="app">{@render icon('globe')}</span>
		<span class="app">{@render icon('folder')}</span>
		<span class="app">{@render icon('notes')}</span>
	</span>
	<span class="clock"><b>9:43 AM</b><small>May 12, 2027</small></span>
</div>

<style>
	.taskbar {
		height: 100%;
		display: grid;
		/* Equal side columns keep the middle group centered on the bar. */
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 0 14px;
		background: #111;
		color: #e6e6e6;
		font-family: var(--font-ui);
		font-size: 13px;
		user-select: none;
	}
	.middle {
		grid-column: 2;
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}
	.ico {
		width: 24px;
		height: 24px;
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.launcher .ico {
		stroke-width: 4;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 320px;
		min-width: 0;
		height: 34px;
		margin: 0 6px;
		padding: 0 12px;
		border-radius: 999px;
		background: #2b2b2b;
		border: 1px solid #3a3a3a;
		color: #bdbdbd;
		transition:
			background 200ms,
			border-color 200ms,
			color 200ms;
	}
	.search .ico {
		width: 18px;
		height: 18px;
	}
	.search.focus {
		background: #f2f2f2;
		color: #111;
		border-color: #9a9a9a;
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.22);
	}
	.ph {
		color: #8c8c8c;
	}
	.q {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: clip;
		font-weight: 500;
	}
	.caret {
		width: 1.5px;
		height: 16px;
		margin-left: -6px;
		background: currentColor;
		animation: blink 1s steps(1) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	.app {
		position: relative;
		width: 42px;
		height: 42px;
		flex: none;
		display: grid;
		place-items: center;
		border-radius: 9px;
		color: #b3b3b3;
	}
	.app.on {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	/* The open app's marker. */
	.app.on::after {
		content: '';
		position: absolute;
		bottom: 2px;
		width: 16px;
		height: 3px;
		border-radius: 2px;
		background: #d0d0d0;
	}
	.clock {
		grid-column: 3;
		justify-self: end;
		white-space: nowrap;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1.2;
	}
	.clock b {
		font-weight: 600;
		font-size: 12px;
	}
	.clock small {
		font-size: 11px;
		color: #a6a6a6;
	}
	/* Mid widths: a narrower search box. Phones: just the search box and mail, still centered. */
	@media (max-width: 1100px) {
		.search {
			width: 240px;
		}
	}
	@media (max-width: 720px) {
		.taskbar {
			grid-template-columns: 0 1fr auto;
			gap: 8px;
		}
		.app:not(.on) {
			display: none;
		}
		.middle {
			justify-content: center;
		}
		.search {
			width: auto;
			flex: 1 1 auto;
			margin: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.caret {
			animation: none;
		}
	}
</style>
