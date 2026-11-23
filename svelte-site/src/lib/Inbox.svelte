<script>
	import { ALL, f$ } from '#lib/data.js';

	// HOOK, act 1: the reader's inbox, a generic three-pane mail client (folders, message list,
	// reading pane). Offer A's email is already open; Offer B's sits unread with a pulsing red dot.
	// Purely presentational: the hook's timeline drives every state below, and a scripted cursor
	// "uses" it, so the whole window is hidden from assistive tech and can't be focused (the hook's
	// captions carry the narration).
	//   split   Offer B's email has been opened: the reading pane shows both letters side by side
	//   readB   Offer B's red dot is gone
	//   hoverB / pressB   the cursor is over / clicking Offer B's row
	//   hl      { A, B }: a marker swipe across that letter's salary line
	//   flown   { A, B }: that letter's letterhead has left for the map (the hook draws the flying copy)
	// `els` (bindable) exposes the elements the hook's cursor and flying letterheads aim for.
	let {
		data,
		offers,
		split = false,
		readB = false,
		hoverB = false,
		pressB = false,
		hl = { A: false, B: false },
		flown = { A: false, B: false },
		els = $bindable()
	} = $props();

	const company = (o) => `${o.city} Company`;
	const place = (o) => `${o.city}, ${data.byCity[o.city].state}`;
	// "New York Company" → "NC": the city's first letter, then C for Company.
	const initials = (o) => o.city[0].toUpperCase() + 'C';
	const role = (o) => (o.field === ALL ? 'Entry-level Associate' : `Associate, ${o.field}`);
	const TIME = { A: '8:15 AM', B: '9:41 AM' };

	const ICON = {
		grid: 'M5 5h2v2H5zM11 5h2v2h-2zM17 5h2v2h-2zM5 11h2v2H5zM11 11h2v2h-2zM17 11h2v2h-2zM5 17h2v2H5zM11 17h2v2h-2zM17 17h2v2h-2z',
		mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
		search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM16 16l5 5',
		inbox: 'M3 13h5l1.5 2.5h5L16 13h5M5.5 5h13L21 13v6H3v-6z',
		drafts: 'M4 20h4L19 9l-4-4L4 16z',
		sent: 'M3 11l18-8-8 18-2-8z',
		archive: 'M3 5h18v4H3zM5 9v10h14V9M10 13h4',
		trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
		reply: 'M10 8L4 13l6 5M4 13h10a6 6 0 0 1 6 6',
		forward: 'M14 8l6 5-6 5M20 13H10a6 6 0 0 0-6 6',
		pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7.5a2 2 0 1 0 0 4a2 2 0 0 0 0-4z',
		chevron: 'M6 9l6 6 6-6'
	};
</script>

{#snippet icon(name)}
	<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d={ICON[name]} /></svg>
{/snippet}

{#snippet row(k)}
	{@const o = offers[k]}
	{@const unread = k === 'B' && !readB}
	<div
		class="row {k.toLowerCase()}"
		class:unread
		class:selected={k === 'A' || split}
		class:hover={k === 'B' && hoverB}
		class:press={k === 'B' && pressB}
		bind:this={els.row[k]}
	>
		<span class="dot" class:on={unread}></span>
		<span class="av">{initials(o)}</span>
		<span class="txt">
			<span class="top"><b>{company(o)}</b><time>{TIME[k]}</time></span>
			<span class="subj">Offer of Employment: {company(o)}</span>
			<span class="prev">Congratulations! We're delighted to offer you…</span>
		</span>
	</div>
{/snippet}

{#snippet letter(k)}
	{@const o = offers[k]}
	<article class="letter {k.toLowerCase()}">
		<header class="lh" class:flown={flown[k]} bind:this={els.lh[k]}>
			<span class="lh-pin">{@render icon('pin')}</span>
			<span class="lh-txt"><b>{company(o)}</b><span>{place(o)}</span></span>
		</header>
		<h3 class="l-subj">Offer of Employment: {company(o)}</h3>
		<div class="from">
			<span class="av">{initials(o)}</span>
			<span class="from-txt"><b>Human Resources · {company(o)}</b><span>to me · {TIME[k]}</span></span>
			<span class="acts">{@render icon('reply')}{@render icon('forward')}</span>
		</div>
		<div class="body">
			<p>Dear graduate,</p>
			<p>Congratulations! We're delighted to offer you the position of <b>{role(o)}</b> at {company(o)}.</p>
			<dl class="terms">
				<div class="sal" class:hl={hl[k]} bind:this={els.sal[k]}>
					<dt>Salary</dt>
					<dd><mark>{f$(o.salary)} per year</mark></dd>
				</div>
				<div><dt>Location</dt><dd>{place(o)}</dd></div>
				<div><dt>Start date</dt><dd>July 6, 2027</dd></div>
			</dl>
			<p class="small">Please reply by April 30, 2027.</p>
			<p class="small sig">Best regards,<br />Human Resources<br />{company(o)}</p>
		</div>
	</article>
{/snippet}

<div class="mail" aria-hidden="true" inert>
	<div class="appbar">
		{@render icon('grid')}
		<span class="brand">{@render icon('mail')} Mail</span>
		<span class="search">{@render icon('search')} Search mail</span>
		<span class="me">YOU</span>
	</div>

	<div class="panes" class:split>
		<nav class="folders">
			<span class="new">{@render icon('drafts')} New message</span>
			<span class="folder on">{@render icon('inbox')} Inbox {#if !readB}<em>1</em>{/if}</span>
			<span class="folder">{@render icon('drafts')} Drafts</span>
			<span class="folder">{@render icon('sent')} Sent</span>
			<span class="folder">{@render icon('archive')} Archive</span>
			<span class="folder">{@render icon('trash')} Deleted</span>
		</nav>

		<div class="list">
			<div class="tabs"><b>Inbox</b></div>
			<div class="group">{@render icon('chevron')} Unread</div>
			{@render row('B')}
			<div class="group">{@render icon('chevron')} Today</div>
			{@render row('A')}
		</div>

		<div class="reading" bind:this={els.reading}>
			<div class="slot a">{@render letter('A')}</div>
			<div class="slot b">{@render letter('B')}</div>
		</div>
	</div>
</div>

<style>
	.mail {
		--mail-bar: #24364f;
		--mail-ink: #f4f1ea;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		box-shadow: 0 18px 50px rgba(20, 30, 45, 0.16);
		overflow: hidden;
		font-size: 13px;
		user-select: none;
	}
	.ico {
		width: 16px;
		height: 16px;
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* App bar */
	.appbar {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 9px 14px;
		background: var(--mail-bar);
		color: var(--mail-ink);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 650;
		font-size: 14px;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 0 1 360px;
		margin-left: 18px;
		padding: 5px 10px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.92);
		color: var(--muted);
	}
	.me {
		margin-left: auto;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 9px;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.18);
	}

	/* Three panes */
	.panes {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 180px 300px 1fr;
	}
	.folders {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 10px;
		border-right: 1px solid var(--grid);
		background: var(--page);
		color: var(--ink-2);
	}
	.new {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--mail-bar);
		color: var(--mail-ink);
		font-weight: 600;
	}
	.folder {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 6px 10px;
		border-radius: 6px;
	}
	.folder.on {
		background: color-mix(in srgb, var(--a) 14%, transparent);
		color: var(--ink);
		font-weight: 650;
	}
	.folder em {
		margin-left: auto;
		font-style: normal;
		font-weight: 700;
		color: var(--neg);
	}

	.list {
		overflow: hidden;
		border-right: 1px solid var(--grid);
	}
	.tabs {
		padding: 10px 14px 8px;
		border-bottom: 1px solid var(--grid);
		font-size: 14px;
	}
	.group {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px 4px;
		font-size: 12px;
		font-weight: 650;
		color: var(--ink-2);
	}
	.group .ico {
		width: 12px;
		height: 12px;
	}
	.row {
		position: relative;
		display: grid;
		grid-template-columns: 12px 30px 1fr;
		align-items: start;
		gap: 8px;
		padding: 8px 12px 8px 8px;
		border-left: 3px solid transparent;
		border-bottom: 1px solid var(--grid);
		transition:
			background 200ms,
			border-color 200ms,
			transform 120ms;
	}
	.row.selected {
		background: color-mix(in srgb, var(--a) 9%, var(--surface));
		border-left-color: var(--a);
	}
	.row.b.selected {
		background: color-mix(in srgb, var(--b) 9%, var(--surface));
		border-left-color: var(--b);
	}
	.row.hover {
		background: color-mix(in srgb, var(--b) 13%, var(--surface));
	}
	.row.press {
		transform: scale(0.985);
		background: color-mix(in srgb, var(--b) 20%, var(--surface));
	}
	.row.unread b {
		font-weight: 700;
		color: var(--ink);
	}
	/* The unread marker: a red dot that pulses until the email is opened. */
	.dot {
		width: 10px;
		height: 10px;
		margin-top: 11px;
		border-radius: 50%;
		background: transparent;
	}
	.dot.on {
		background: var(--neg);
		animation: pulse 1.4s ease-out infinite;
	}
	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--neg) 60%, transparent);
		}
		100% {
			box-shadow: 0 0 0 9px color-mix(in srgb, var(--neg) 0%, transparent);
		}
	}
	.av {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 11px;
		font-weight: 700;
		color: #fff;
		background: var(--a);
	}
	.b .av,
	.letter.b .av {
		background: var(--b);
	}
	.txt {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.txt > span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.top {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}
	.top b {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.top time {
		flex: none;
		font-size: 11px;
		color: var(--muted);
	}
	.subj {
		color: var(--ink-2);
	}
	.prev {
		font-size: 12px;
		color: var(--muted);
	}

	/* Reading pane: one letter, then both side by side once Offer B is opened. */
	.reading {
		display: grid;
		grid-template-columns: 1fr 0fr;
		gap: 0;
		min-width: 0;
		padding: 14px;
		background: var(--page);
		overflow: hidden;
		transition:
			grid-template-columns 700ms cubic-bezier(0.4, 0, 0.2, 1),
			gap 700ms;
	}
	.split .reading {
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.slot {
		min-width: 0;
		overflow: hidden;
	}
	.slot.b {
		opacity: 0;
		transform: translateX(24px);
		transition:
			opacity 450ms 250ms,
			transform 600ms 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.split .slot.b {
		opacity: 1;
		transform: none;
	}
	.letter {
		height: 100%;
		min-width: 260px;
		padding: 16px 18px;
		background: var(--surface);
		border: 1px solid var(--grid);
		border-top: 4px solid var(--a);
		border-radius: 10px;
		overflow: hidden;
	}
	.letter.b {
		border-top-color: var(--b);
	}
	/* The letterhead: the company and its city. It flies to the map at the end of the act. */
	.lh {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px 6px 8px;
		border-radius: 8px;
		background: color-mix(in srgb, var(--a) 12%, var(--surface));
		border: 1px solid color-mix(in srgb, var(--a) 35%, transparent);
	}
	.letter.b .lh {
		background: color-mix(in srgb, var(--b) 12%, var(--surface));
		border-color: color-mix(in srgb, var(--b) 35%, transparent);
	}
	.lh.flown {
		visibility: hidden;
	}
	.lh-pin {
		color: var(--a);
		display: flex;
	}
	.letter.b .lh-pin {
		color: var(--b);
	}
	.lh-pin .ico {
		width: 20px;
		height: 20px;
	}
	.lh-txt {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
	}
	.lh-txt b {
		font-size: 14px;
	}
	.lh-txt span {
		font-size: 12px;
		color: var(--ink-2);
	}
	.l-subj {
		font-size: 17px;
		margin: 12px 0 10px;
	}
	.from {
		display: flex;
		align-items: center;
		gap: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--grid);
	}
	.from-txt {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.3;
	}
	.from-txt b,
	.from-txt span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.from-txt span {
		font-size: 12px;
		color: var(--muted);
	}
	.acts {
		margin-left: auto;
		display: flex;
		gap: 8px;
		color: var(--muted);
	}
	.body p {
		margin: 10px 0;
		color: var(--ink-2);
	}
	.body b {
		color: var(--ink);
		font-weight: 600;
	}
	.small {
		font-size: 12px;
	}
	.terms {
		margin: 12px 0;
		padding: 8px 12px;
		border-radius: 8px;
		background: var(--page);
	}
	.terms div {
		display: flex;
		gap: 10px;
		padding: 3px 0;
	}
	.terms dt {
		width: 70px;
		flex: none;
		color: var(--muted);
	}
	.terms dd {
		margin: 0;
		color: var(--ink);
	}
	.sal dd {
		font-weight: 700;
		font-size: 15px;
	}
	/* The salary marker swipe, in the offer's color. */
	mark {
		color: inherit;
		padding: 0 3px;
		border-radius: 3px;
		background: linear-gradient(color-mix(in srgb, var(--a) 30%, transparent), color-mix(in srgb, var(--a) 30%, transparent))
			no-repeat left / 0% 100%;
		transition: background-size 600ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.letter.b mark {
		background-image: linear-gradient(
			color-mix(in srgb, var(--b) 30%, transparent),
			color-mix(in srgb, var(--b) 30%, transparent)
		);
	}
	.sal.hl mark {
		background-size: 100% 100%;
	}

	/* Narrower windows: drop the folders, then stack the list over the reading pane. */
	@media (max-width: 1100px) {
		.panes {
			grid-template-columns: 260px 1fr;
		}
		.folders {
			display: none;
		}
		.letter {
			min-width: 220px;
		}
	}
	@media (max-width: 720px) {
		.panes {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
		}
		.list {
			border-right: 0;
			border-bottom: 1px solid var(--grid);
		}
		.tabs,
		.prev {
			display: none;
		}
		.letter {
			min-width: 0;
			padding: 12px;
		}
		.split .reading {
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}
		.body > p:not(.small),
		.from,
		.l-subj,
		.small {
			display: none;
		}
		.terms dt {
			width: auto;
		}
		.terms div {
			flex-direction: column;
			gap: 0;
		}
		.search {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dot.on {
			animation: none;
		}
		.reading,
		.slot.b,
		mark,
		.row {
			transition: none;
		}
	}
</style>
