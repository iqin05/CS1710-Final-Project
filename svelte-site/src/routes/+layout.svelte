<script>
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- The shared hand-drawn filter: `doodle` roughens small drawings (arrows, money, city doodles,
     the cursor). Boxes are drawn with real pen strokes instead (SketchBox.svelte). -->
<svg class="doodle-defs" width="0" height="0" aria-hidden="true">
	<defs>
		<filter id="doodle" x="-10%" y="-10%" width="120%" height="120%">
			<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" />
			<feDisplacementMap in="SourceGraphic" scale="1.8" />
		</filter>
	</defs>
</svg>

{@render children()}
