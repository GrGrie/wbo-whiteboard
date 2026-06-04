/**
 * Board zoom slider.
 */
(function () {
	var input = document.getElementById("boardZoom");
	var value = document.getElementById("boardZoomValue");
	if (!input || !value || typeof Tools === "undefined" || !Tools.setScale) return;

	var originalSetScale = Tools.setScale;

	function clamp(scale) {
		return Math.max(parseFloat(input.min), Math.min(parseFloat(input.max), scale));
	}

	function sync(scale) {
		scale = clamp(scale || Tools.getScale());
		input.value = scale.toFixed(2);
		value.textContent = Math.round(scale * 100) + "%";
	}

	function getViewportOrigin() {
		var scale = Tools.getScale();
		var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		var height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		return {
			scrollX: window.scrollX,
			scrollY: window.scrollY,
			x: (window.scrollX + width / 2) / scale,
			y: (window.scrollY + height / 2) / scale,
			scale: scale
		};
	}

	function writeHash() {
		var scale = Tools.getScale();
		var x = window.scrollX / scale;
		var y = window.scrollY / scale;
		var hash = "#" + (x | 0) + "," + (y | 0) + "," + scale.toFixed(2);
		window.history.replaceState({}, "", hash);
	}

	function zoomTo(scale) {
		var origin = getViewportOrigin();
		var nextScale = Tools.setScale(clamp(scale));
		window.scrollTo(
			origin.scrollX + origin.x * (nextScale - origin.scale),
			origin.scrollY + origin.y * (nextScale - origin.scale)
		);
		writeHash();
	}

	function zoomAtPoint(scale, pageX, pageY) {
		var originScale = Tools.getScale();
		var origin = {
			scrollX: window.scrollX,
			scrollY: window.scrollY,
			x: pageX / originScale,
			y: pageY / originScale,
			scale: originScale
		};
		var nextScale = Tools.setScale(clamp(scale));
		window.scrollTo(
			origin.scrollX + origin.x * (nextScale - origin.scale),
			origin.scrollY + origin.y * (nextScale - origin.scale)
		);
		writeHash();
	}

	function onWheel(evt) {
		if (!evt.ctrlKey) return;
		evt.preventDefault();
		var direction = evt.deltaY > 0 ? -1 : 1;
		var step = parseFloat(input.step) || 0.05;
		var nextScale = Tools.getScale() + direction * step;
		zoomAtPoint(nextScale, evt.pageX, evt.pageY);
	}

	Tools.setScale = function setScaleWithSlider(scale) {
		var nextScale = originalSetScale.call(Tools, clamp(scale));
		sync(nextScale);
		return nextScale;
	};

	input.addEventListener("input", function () {
		zoomTo(parseFloat(input.value));
	});

	Tools.board.addEventListener("wheel", onWheel, { passive: false });

	window.addEventListener("hashchange", function () {
		window.setTimeout(function () {
			sync(Tools.getScale());
		}, 0);
	});

	sync(Tools.getScale());
})();
