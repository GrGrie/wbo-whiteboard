(function sheetTool() {
	var SHEET_WIDTH = 3200;
	var SHEET_HEIGHT = 2200;
	var SHEET_MARGIN = 120;

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function createSheet(evt) {
		if(evt)evt.preventDefault();
		var canvasWidth = Tools.svg.width.baseVal.value / Tools.getScale();
		var canvasHeight = Tools.svg.height.baseVal.value / Tools.getScale();
		var viewportCenterX = (document.documentElement.scrollLeft + window.innerWidth / 2) / Tools.getScale();
		var viewportTop = document.documentElement.scrollTop / Tools.getScale();
		var scale = Math.min(1, (canvasWidth - SHEET_MARGIN * 2) / SHEET_WIDTH, (canvasHeight - SHEET_MARGIN * 2) / SHEET_HEIGHT);
		scale = Math.max(0.25, scale);
		var width = SHEET_WIDTH * scale;
		var height = SHEET_HEIGHT * scale;
		var x = clamp(viewportCenterX - width / 2, SHEET_MARGIN, Math.max(SHEET_MARGIN, canvasWidth - width - SHEET_MARGIN));
		var y = clamp(viewportTop + SHEET_MARGIN, SHEET_MARGIN, Math.max(SHEET_MARGIN, canvasHeight - height - SHEET_MARGIN));

		var msg = {
			id: Tools.generateUID("sheet"),
			type: "sheet",
			x: Math.round(x),
			y: Math.round(y),
			w: Math.round(width),
			h: Math.round(height),
			protected: 1
		};
		draw(msg);
		Tools.send(msg, "Sheet");
		selectSheet(Tools.svg.getElementById(msg.id));
	}

	function draw(msg) {
		var rect = Tools.svg.getElementById(msg.id);
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
		rect.setAttribute("data-protected", msg.protected !== undefined ? msg.protected : 1);
		if(msg.transform){
			rect.setAttribute("transform", msg.transform);
		}
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
})();
