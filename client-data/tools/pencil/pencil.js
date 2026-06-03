/**
 *                        WHITEBOPHIR
 *********************************************************
 * @licstart  The following is the entire license notice for the
 *  JavaScript code in this page.
 *
 * Copyright (C) 2013  Ophir LOJKINE
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 */

(function () { //Code isolation

	//Indicates the id of the line the user is currently drawing or an empty string while the user is not drawing
	var curLineId = "",
		startX=0,
		startY=0,
		lastTime = performance.now(), //The time at which the last point was drawn
		end=false;
	var curPen = {
		"penSize":3
	};
	//The data of the message that will be sent for every new point
	function PointMessage(x, y) {
		this.type = 'child';
		this.parent = curLineId;
		this.x = x-(Tools.showMarker?25:0);
		this.y = y-(Tools.showMarker?25:0);
	}

	function onStart(){
		if(!menuInitialized)initMenu();
		Tools.menus["Pencil"].show(true);
	};

	function onQuit(){
		if(Tools.menus["Pencil"])Tools.menus["Pencil"].show(false);
		Tools.showMarker=false;
		var cursor = Tools.svg.getElementById("mycursor");
		if(cursor){
			cursor.remove();
		}
	};

	var colorPresets = [
		"#111111", "#666666", "#ffffff", "#ff4136", "#ff851b",
		"#ffdc00", "#2ecc40", "#0074d9", "#001f3f", "#7fdbff",
		"#39cccc", "#b10dc9", "#f012be", "#85144b", "#aaaaaa"
	];
	var menuInitialized = false;

	function buildColorMenu() {
		var presets = colorPresets.map(function (color) {
			return '<button type="button" class="pencil-color-preset" data-color="' + color + '" style="background-color:' + color + '" title="' + color + '"></button>';
		}).join("");

		return '<div class="pencil-color-menu">' +
				'<div class="pencil-color-presets">' + presets + '</div>' +
				'<label class="pencil-color-picker" for="pencilColorInput">' +
					'<span class="pencil-current-color"></span>' +
					'<input type="color" id="pencilColorInput" value="' + Tools.getColor() + '" />' +
				'</label>' +
			'</div>';
	}

	function initMenu() {
		var chooser = document.getElementById("pencilColorInput");
		var presets = document.getElementsByClassName("pencil-color-preset");
		for(var i = 0; i < presets.length; i++){
			presets[i].addEventListener("click", presetClicked);
		}
		if(chooser){
			chooser.value = Tools.getColor();
			chooser.addEventListener("input", updateSelectedColor);
			chooser.addEventListener("change", updateSelectedColor);
		}
		document.addEventListener("click", updateColorAfterExternalPicker, true);
		updateSelectedColor();
		menuInitialized = true;
	}

	function presetClicked(evt) {
		var color = evt.currentTarget.getAttribute("data-color");
		setColor(color);
	}

	function setColor(color) {
		var state = document.getElementById("chooseColor");
		var chooser = document.getElementById("pencilColorInput");
		if(state)state.value = color;
		if(chooser){
			chooser.value = color;
			chooser.style.backgroundColor = color;
		}
		updateSelectedColor();
	}

	function updateSelectedColor() {
		var chooser = document.getElementById("pencilColorInput");
		if(chooser){
			var state = document.getElementById("chooseColor");
			if(state)state.value = chooser.value;
		}
		var color = Tools.getColor().toLowerCase();
		var current = document.getElementsByClassName("pencil-current-color")[0];
		if(current)current.style.backgroundColor = color;
		var presets = document.getElementsByClassName("pencil-color-preset");
		for(var i = 0; i < presets.length; i++){
			if(presets[i].getAttribute("data-color").toLowerCase() == color){
				presets[i].classList.add("selected");
			}else{
				presets[i].classList.remove("selected");
			}
		}
	}

	function updateColorAfterExternalPicker(evt) {
		if($(evt.target).closest(".canvascolor-container").length){
			setTimeout(function () {
				var chooser = document.getElementById("pencilColorInput");
				if(chooser)setColor(chooser.value);
			}, 0);
		}
	}


	function startLine(x, y, evt) {
		//Prevent the press from being interpreted by the browser
		evt.preventDefault();

		Tools.suppressPointerMsg = true;
		curLineId = Tools.generateUID("l"); //"l" for line

		Tools.drawAndSend({
			'type': 'line',
			'id': curLineId,
			'color': Tools.getColor(),
			'size': Tools.getSize(),
			'opacity': Tools.getOpacity()
		});
		startX=x;
		startY=y;
		//Immediatly add a point to the line
		continueLine(x, y);
	}

	function continueLine(x, y, evt) {
		/*Wait 20ms before adding any point to the currently drawing line.
		This allows the animation to be smother*/
		if (curLineId !== "" && (performance.now() - lastTime > 20 || end)) {
			Tools.drawAndSend(new PointMessage(x, y));
			lastTime = performance.now();
			if(wb_comp.list["Measurement"]){
				wb_comp.list["Measurement"].update(
					{type:"Path",
					x:startX,
					y:startY,
					x2:x,
					y2:y,
					}
				)
			}
		}
		if (evt) evt.preventDefault();
	}

	function stopLine(x, y, evt) {
		evt.preventDefault();
		//Add a last point to the line
		end=true;
		continueLine(x, y);
		end=false;
		curLineId = "";
		Tools.suppressPointerMsg = false;
	}

	var renderingLine = {};
	function draw(data) {
		Tools.drawingEvent=true;
		switch (data.type) {
			case "line":
				renderingLine = createLine(data);
				if(data.pts) addPoints(renderingLine,data.pts);
				break;
			case "child":
				var line = (renderingLine.id == data.parent) ? renderingLine : svg.getElementById(data.parent);
				if (!line) {
					console.error("Pencil: Hmmm... I received a point of a line that has not been created (%s).", data.parent);
					return false;
				}else{
					if(Tools.useLayers){
						if(line.getAttribute("class")!="layer"+Tools.layer){
							line.setAttribute("class","layer-"+Tools.layer);
							Tools.placeElement(line, "drawing");
						}
					}
				};
				addPoints(line, [[data.x, data.y]], true);
				break;
			case "endline":
				//TODO?
				break;
			default:
				console.error("Pencil: Draw instruction with unknown type. ", data);
				break;
		}
	}

	function dist(x1, y1, x2, y2) {
		//Returns the distance between (x1,y1) and (x2,y2)
		return Math.hypot(x2 - x1, y2 - y1);
	}

	function getPathData(line) {
		var pathData = Tools.pathDataCache[line.id];
		if (!pathData) {
			pathData = line.getPathData();
			Tools.pathDataCache[line.id] = pathData;
		}
		return pathData;
	}

	var svg = Tools.svg;
	function addPoints(line, npts, single) {
		var pts = getPathData(line); //The points that are already in the line as a PathData
		for(var i = 0; i  < npts.length; i++){
			var npoint;
			var x = npts[i][0];
			var y = npts[i][1];
			var nbr = pts.length; //The number of points already in the line
			switch (nbr) {
				case 0: //The first point in the line
					//If there is no point, we have to start the line with a moveTo statement
					npoint = { type: "M", values: [x, y] };
					break;
				case 1: //There is only one point.
					//Draw a curve that is segment between the old point and the new one
					npoint = {
						type: "C", values: [
							pts[0].values[0], pts[0].values[1],
							x, y,
							x, y,
						]
					};
					break;
				default: //There are at least two points in the line
					//We add the new point, and smoothen the line
					var ANGULARITY = 3; //The lower this number, the smoother the line
					var prev_values = pts[nbr - 1].values; // Previous point
					var ante_values = pts[nbr - 2].values; // Point before the previous one
					var prev_x = prev_values[prev_values.length - 2];
					var prev_y = prev_values[prev_values.length - 1];
					var ante_x = ante_values[ante_values.length - 2];
					var ante_y = ante_values[ante_values.length - 1];


					//We don't want to add the same point twice consecutively
					if (!((prev_x == x && prev_y == y)
						|| (ante_x == x && ante_y == y))){

						var vectx = x - ante_x,
							vecty = y - ante_y;
						var norm = Math.hypot(vectx, vecty);
						var dist1 = dist(ante_x, ante_y, prev_x, prev_y) / norm,
							dist2 = dist(x, y, prev_x, prev_y) / norm;
						vectx /= ANGULARITY;
						vecty /= ANGULARITY;
						//Create 2 control points around the last point
						var cx1 = prev_x - dist1 * vectx,
							cy1 = prev_y - dist1 * vecty, //First control point
							cx2 = prev_x + dist2 * vectx,
							cy2 = prev_y + dist2 * vecty; //Second control point
						prev_values[2] = cx1;
						prev_values[3] = cy1;
						
						npoint = {
							type: "C", values: [
								cx2, cy2,
								x, y,
								x, y,
							]
						};
					}else{
						if(single)return;
					}
			}
			if(npoint)pts.push(npoint);
		}
		line.setPathData(pts);
	}

	function createLine(lineData) {
		//Creates a new line on the canvas, or update a line that already exists with new information
		var line = svg.getElementById(lineData.id) || Tools.createSVGElement("path");
		line.id = lineData.id;
		//If some data is not provided, choose default value. The line may be updated later
		line.setAttribute("stroke", lineData.color || "black");
		line.setAttribute("stroke-width", lineData.size || 10);
		if(Tools.useLayers)
		line.setAttribute("class","layer-"+Tools.layer);
		if(lineData.data){
			line.setAttribute("data-lock",lineData.data);
		}
		if(lineData.transform)
			line.setAttribute("transform",lineData.transform);
		line.setAttribute("opacity", Math.max(0.1, Math.min(1, lineData.opacity)) || 1);
		Tools.placeElement(line, "drawing");
		return line;
	}


	Tools.add({ //The new tool
		// "name": "Pencil",
		 "icon": "✏",
		"name": "Pencil",
		"title":"Pencil",
		"listeners": {
			"press": startLine,
			"move": continueLine,
			"release": stopLine,
		},
		"shortcuts": {
            "changeTool":"1"
        },
		"draw": draw,
		"menu":{
			"title":"Color",
			"content": buildColorMenu(),
			"listener": function (elem, onButton, onMenu, e) {
				if($(e.target).closest(".canvascolor-container").length)return false;
				if(!onMenu&&!onButton){
					e.stopPropagation();
					return true;
				}
				return false;
			}
		},
		"onstart":onStart,
		"onquit":onQuit,
		"mouseCursor": "crosshair",
		"stylesheet": "tools/pencil/pencil.css"
	});

})(); //End of code isolation
