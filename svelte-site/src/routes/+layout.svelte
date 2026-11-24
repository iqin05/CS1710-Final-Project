<script>
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Google Fonts (free): Comic Relief, comic lettering, for titles, headings and larger text;
	     Figtree for all other text, including the inbox, taskbar and charts. -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Comic+Relief:wght@400;700&family=Figtree:ital,wght@0,300..900;1,300..900&display=swap"
		rel="stylesheet"
	/>
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
