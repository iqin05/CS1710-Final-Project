// One shared tooltip for the whole page. Views call showTip/hideTip; Tooltip.svelte renders it.
// content: { title, meta?, big?, rows?: [[value, label], ...] }
export const tip = $state({ visible: false, x: 0, y: 0, content: null });

export function showTip(event, content) {
	tip.content = content;
	tip.x = event.clientX;
	tip.y = event.clientY;
	tip.visible = true;
}

export function hideTip() {
	tip.visible = false;
}
