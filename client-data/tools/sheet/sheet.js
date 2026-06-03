(function sheetTool() {
	var SHEET_WIDTH = 1080;
	var SHEET_HEIGHT = 1920;
	var SHEET_MARGIN = 80;

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
			h: Math.round(height)
		};
		draw(msg);
		Tools.send(msg, "Sheet");
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
		if(msg.transform){
			rect.setAttribute("transform", msg.transform);
		}
		if(msg.data){
			rect.setAttribute("data-lock", msg.data);
		}

		Tools.group.appendChild(rect);
	}

	Tools.add({
		"name": "Sheet",
		"icon": "□",
		"iconHTML": "<span class='sheet-tool-icon'></span>",
		"listeners": {},
		"draw": draw,
		"oneTouch": true,
		"onstart": createSheet,
		"mouseCursor": "crosshair",
		"stylesheet": "tools/sheet/sheet.css"
	});
})();
