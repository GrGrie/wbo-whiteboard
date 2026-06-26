window.WBO_BOARD_VERSION = {
	label: "2026.06.26-selfhost.1",
	description: "Self-hosted client, no Desmos/CDN boot dependencies"
};

(function showBoardVersion() {
	function updateVersionText() {
		var el = document.getElementById("board-version");
		if (!el || !window.WBO_BOARD_VERSION) return;
		el.textContent = "Board " + window.WBO_BOARD_VERSION.label;
		el.title = window.WBO_BOARD_VERSION.description || "";
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", updateVersionText, { once: true });
	} else {
		updateVersionText();
	}
})();
