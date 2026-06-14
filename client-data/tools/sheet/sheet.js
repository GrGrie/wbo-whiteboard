(function sheetTool() {
	var SHEET_WIDTH = 3200;
	var SHEET_MARGIN = 120;
	var SHEET_RATIO = 16 / 9;
	var SHEET_LABEL_CLASS = "sheet-page-label";
	var SHEET_DIVIDER_CLASS = "sheet-page-divider";

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function existingPageNumbers() {
		var used = {};
		var sheets = Tools.svg.querySelectorAll('[data-plane="sheet"]');
		for (var i = 0; i < sheets.length; i++) {
			var value = Number(sheets[i].getAttribute("data-page-no"));
			if (value > 0) used[value] = true;
		}
		return used;
	}

	function nextPageNumber() {
		var used = existingPageNumbers();
		var number = 1;
		while (used[number]) number++;
		return number;
	}

	function helperId(sheetId, suffix) {
		return sheetId + "-" + suffix;
	}

	function removeHelpers(sheetId) {
		["divider", "label"].forEach(function (suffix) {
			var helper = Tools.svg.getElementById(helperId(sheetId, suffix));
			if (helper && helper.parentNode) helper.parentNode.removeChild(helper);
		});
	}

	function cleanupSheetHelpers() {
		var helpers = Tools.svg.querySelectorAll("[data-sheet-helper]");
		for (var i = 0; i < helpers.length; i++) {
			var sheetId = helpers[i].getAttribute("data-sheet-helper");
			if (!sheetId || !Tools.svg.getElementById(sheetId)) {
				if (helpers[i].parentNode) helpers[i].parentNode.removeChild(helpers[i]);
			}
		}
	}

	function applyTransform(elem, transform) {
		if (transform) elem.setAttribute("transform", transform);
		else elem.removeAttribute("transform");
	}

	function drawHelpers(rect, msg) {
		removeHelpers(msg.id);
		var pageNo = Number(msg.pageNo) || Number(rect.getAttribute("data-page-no")) || 1;
		var x = Number(msg.x);
		var y = Number(msg.y);
		var width = Number(msg.w);
		var height = Number(msg.h);
		var transform = msg.transform || rect.getAttribute("transform") || "";
		var divider = Tools.createSVGElement("line");
		var label = Tools.createSVGElement("text");

		divider.id = helperId(msg.id, "divider");
		divider.setAttribute("class", SHEET_DIVIDER_CLASS);
		divider.setAttribute("x1", x + width / 2);
		divider.setAttribute("y1", y);
		divider.setAttribute("x2", x + width / 2);
		divider.setAttribute("y2", y + height);
		divider.setAttribute("stroke", "#111111");
		divider.setAttribute("stroke-width", "10");
		divider.setAttribute("opacity", "0.78");
		divider.setAttribute("pointer-events", "none");
		divider.setAttribute("data-sheet-helper", msg.id);
		divider.setAttribute("data-plane", "sheet-helper");
		applyTransform(divider, transform);

		label.id = helperId(msg.id, "label");
		label.setAttribute("class", SHEET_LABEL_CLASS);
		label.setAttribute("x", x + 28);
		label.setAttribute("y", y + 54);
		label.setAttribute("font-size", "34");
		label.setAttribute("font-family", "Arial, sans-serif");
		label.setAttribute("font-weight", "700");
		label.setAttribute("fill", "#111111");
		label.setAttribute("opacity", "0.42");
		label.setAttribute("pointer-events", "none");
		label.setAttribute("data-sheet-helper", msg.id);
		label.setAttribute("data-plane", "sheet-helper");
		label.textContent = "Лист " + pageNo;
		applyTransform(label, transform);

		Tools.placeElement(divider, "sheet");
		Tools.placeElement(label, "sheet");
	}

	function syncHelpers(rect) {
		drawHelpers(rect, {
			id: rect.id,
			x: Number(rect.getAttribute("x")) || 0,
			y: Number(rect.getAttribute("y")) || 0,
			w: Number(rect.getAttribute("width")) || 0,
			h: Number(rect.getAttribute("height")) || 0,
			pageNo: Number(rect.getAttribute("data-page-no")) || 1,
			transform: rect.getAttribute("transform") || ""
		});
	}

	function watchSheet(rect) {
		if (rect._sheetObserver) return;
		rect._sheetObserver = new MutationObserver(function () {
			if (!Tools.svg.getElementById(rect.id)) {
				removeHelpers(rect.id);
				return;
			}
			syncHelpers(rect);
		});
		rect._sheetObserver.observe(rect, {
			attributes: true,
			attributeFilter: ["x", "y", "width", "height", "transform", "data-page-no"]
		});
	}

	function createSheet(evt) {
		if(evt)evt.preventDefault();
		cleanupSheetHelpers();
		var canvasWidth = Tools.svg.width.baseVal.value / Tools.getScale();
		var canvasHeight = Tools.svg.height.baseVal.value / Tools.getScale();
		var viewportCenterX = (document.documentElement.scrollLeft + window.innerWidth / 2) / Tools.getScale();
		var viewportTop = document.documentElement.scrollTop / Tools.getScale();
		var sheetWidth = SHEET_WIDTH;
		var sheetHeight = Math.round(sheetWidth / SHEET_RATIO);
		var scale = Math.min(1, (canvasWidth - SHEET_MARGIN * 2) / sheetWidth, (canvasHeight - SHEET_MARGIN * 2) / sheetHeight);
		scale = Math.max(0.25, scale);
		var width = sheetWidth * scale;
		var height = sheetHeight * scale;
		var x = clamp(viewportCenterX - width / 2, SHEET_MARGIN, Math.max(SHEET_MARGIN, canvasWidth - width - SHEET_MARGIN));
		var y = clamp(viewportTop + SHEET_MARGIN, SHEET_MARGIN, Math.max(SHEET_MARGIN, canvasHeight - height - SHEET_MARGIN));

		var msg = {
			id: Tools.generateUID("sheet"),
			type: "sheet",
			x: Math.round(x),
			y: Math.round(y),
			w: Math.round(width),
			h: Math.round(height),
			pageNo: nextPageNumber(),
			protected: 1
		};
		draw(msg);
		Tools.send(msg, "Sheet");
		selectSheet(Tools.svg.getElementById(msg.id));
	}

	function draw(msg) {
		var rect = Tools.svg.getElementById(msg.id);
		cleanupSheetHelpers();
		if(!rect){
			rect = Tools.createSVGElement("rect");
			rect.id = msg.id;
		}
		rect.setAttribute("class", "layer-" + Tools.layer);
		rect.setAttribute("x", msg.x);
		rect.setAttribute("y", msg.y);
		rect.setAttribute("width", msg.w);
		rect.setAttribute("height", msg.h);
		rect.setAttribute("fill", "white");
		rect.setAttribute("stroke", "#d9d9d9");
		rect.setAttribute("stroke-width", "2");
		rect.setAttribute("data-plane", "sheet");
		rect.setAttribute("data-page-no", msg.pageNo || rect.getAttribute("data-page-no") || nextPageNumber());
		rect.setAttribute("data-protected", msg.protected !== undefined ? msg.protected : 1);
		applyTransform(rect, msg.transform || rect.getAttribute("transform") || "");
		rect.setAttribute("data-lock", msg.data !== undefined ? msg.data : 0);
		rect.onmousedown = function (evt) {
			var activeTool = Tools.curTool && Tools.curTool.name;
			if(["Pencil", "Remove", "Rectangle", "Text", "Line"].indexOf(activeTool) !== -1)return;
			evt.preventDefault();
			evt.stopPropagation();
			if(evt.stopImmediatePropagation)evt.stopImmediatePropagation();
			selectSheet(rect);
		};

		Tools.placeElement(rect, "sheet");
		drawHelpers(rect, msg);
		watchSheet(rect);
	}

	function selectSheet(rect) {
		if(rect && Tools.activateTransformTarget){
			Tools.activateTransformTarget(rect);
		}
	}

	Tools.add({
		"name": "Sheet",
		"icon": "Sheet",
		"iconHTML": "<span class='sheet-tool-icon'></span>",
		"listeners": {},
		"draw": draw,
		"oneTouch": true,
		"onstart": createSheet,
		"mouseCursor": "crosshair",
		"stylesheet": "tools/sheet/sheet.css"
	});

	window.setInterval(cleanupSheetHelpers, 2000);
})();
