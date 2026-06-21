(function cursorTool() {
	var pan = {
		pressed: false,
		orig: { x: 0, y: 0 }
	};

	function stopEvent(evt) {
		evt.preventDefault();
		evt.stopPropagation();
		if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
	}

	function eventPoint(evt) {
		if (evt.changedTouches && evt.changedTouches.length) {
			return evt.changedTouches[0];
		}
		return evt;
	}

	function press(x, y, evt) {
		if (evt.button !== undefined && evt.button !== 0) return;
		var point = eventPoint(evt);
		stopEvent(evt);
		pan.pressed = true;
		pan.orig.x = scrollX + (point.clientX || 0);
		pan.orig.y = scrollY + (point.clientY || 0);
	}

	function move(x, y, evt) {
		if (!pan.pressed) return;
		if (evt.buttons !== undefined && (evt.buttons & 1) !== 1) {
			release(x, y, evt);
			return;
		}
		var point = eventPoint(evt);
		stopEvent(evt);
		window.scrollTo(pan.orig.x - (point.clientX || 0), pan.orig.y - (point.clientY || 0));
	}

	function release(x, y, evt) {
		if (!pan.pressed) return;
		if (evt) stopEvent(evt);
		pan.pressed = false;
	}

	window.addEventListener("blur", function () {
		pan.pressed = false;
	}, false);

	Tools.add({
		"name": "Cursor",
		"title": "Cursor",
		"iconHTML": "<i style='color:#111;margin-top:7px' class='fas fa-mouse-pointer'></i>",
		"listeners": {
			"press": press,
			"move": move,
			"release": release
		},
		"shortcuts": {
			"changeTool": "0"
		},
		"draw": function () {},
		"mouseCursor": "grab"
	});
})();
