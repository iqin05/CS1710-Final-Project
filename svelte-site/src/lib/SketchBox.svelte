<script>
	// A cartoon "sketched" box drawn behind its parent's content: a rounded rectangle outlined with
	// real pen-like strokes (smooth vector curves, slightly uneven sides and corners, two overlapping
	// passes, and a small overshoot where the line closes, like a quick hand sketch), over a flat
	// fill with a flat offset shadow. It fills its parent, which needs `position` set and
	// `isolation: isolate` so the box sits behind the parent's text.
	//   ink, fill, shadow   colors;  r: corner radius (capped at half the height)
	//   seed                varies the hand-drawn wobble between boxes
	//   shadowLeft          cast the shadow down-left instead of down-right
	let {
		ink = '#23211e',
		fill = 'var(--surface)',
		shadow = 'var(--grid)',
		r = 20,
		seed = 1,
		shadowLeft = false
	} = $props();

	let w = $state(0);
	let h = $state(0);
	const SHADOW = 5;

	// Small deterministic jitter in [-1, 1], so a box looks the same every time it's drawn.
	const jit = (i, s) => {
		const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
		return (x - Math.floor(x)) * 2 - 1;
	};
	const f = (n) => n.toFixed(1);

	// One hand-drawn pass around the box: each side a gentle curve that bows a little, each corner a
	// curve of the given radius, with the end point carried a few px past the start (closed: false)
	// or joined up (closed: true, for the fill).
	function outline(s, closed, amp = 1.3) {
		if (!w || !h) return '';
		const rr = Math.min(r, h / 2, w / 2);
		let k = 0;
		const j = () => jit(++k, s) * amp;
		const bow = () => jit(++k, s) * amp * 1.4;
		const pts = [
			// [side start, side end, corner control, corner end] going clockwise from the top-left
			[[rr, 0], [w - rr, 0], [w, 0], [w, rr]],
			[[w, rr], [w, h - rr], [w, h], [w - rr, h]],
			[[w - rr, h], [rr, h], [0, h], [0, h - rr]],
			[[0, h - rr], [0, rr], [0, 0], [rr, 0]]
		];
		const start = [rr + j(), j()];
		let d = `M${f(start[0])},${f(start[1])}`;
		pts.forEach(([a, b, c, e], i) => {
			const horizontal = i % 2 === 0;
			const [bx, by] = [b[0] + j(), b[1] + j()];
			// The side: a cubic with both controls nudged off the straight line by a small bow.
			const t1 = [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3];
			const t2 = [a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3];
			const n1 = bow();
			const n2 = bow();
			const c1 = horizontal ? [t1[0], t1[1] + n1] : [t1[0] + n1, t1[1]];
			const c2 = horizontal ? [t2[0], t2[1] + n2] : [t2[0] + n2, t2[1]];
			d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(bx)},${f(by)}`;
			// The corner. On the last one, either close up or overshoot a little past the start.
			const last = i === 3;
			const end = last
				? closed
					? start
					: [start[0] + 11 + j(), start[1] + j() * 0.6]
				: [e[0] + j(), e[1] + j()];
			d += ` Q${f(c[0] + j())},${f(c[1] + j())} ${f(end[0])},${f(end[1])}`;
		});
		return closed ? d + 'Z' : d;
	}

	let fillD = $derived(outline(seed, true, 1));
	let pass1 = $derived(outline(seed + 11, false, 1.8));
	let pass2 = $derived(outline(seed + 23, false, 2.6));
</script>

<div class="sketch" aria-hidden="true" bind:clientWidth={w} bind:clientHeight={h}>
	{#if w && h}
		<svg width={w} height={h} style:--sk-ink={ink} style:--sk-fill={fill} style:--sk-shadow={shadow}>
			<path class="shadow" d={fillD} transform="translate({shadowLeft ? -SHADOW : SHADOW},{SHADOW})" />
			<path class="fill" d={fillD} />
			<path class="pen" d={pass1} />
			<path class="pen second" d={pass2} />
		</svg>
	{/if}
</div>

<style>
	.sketch {
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
	}
	svg {
		display: block;
		overflow: visible;
	}
	.shadow {
		fill: var(--sk-shadow);
	}
	.fill {
		fill: var(--sk-fill);
	}
	.pen {
		fill: none;
		stroke: var(--sk-ink);
		stroke-width: 2.3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	/* The second, lighter pass: two overlapping lines read as pen on paper. */
	.pen.second {
		stroke-width: 1.2;
		opacity: 0.7;
	}
</style>
