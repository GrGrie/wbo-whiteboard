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

(function undo() { //Code isolation


	var msg = {
		"type": "undo"
	};

	function undo(evt) {
		if(evt)evt.preventDefault();
		Tools.send(msg,"Undo");
	};

	function isEditableTarget(target) {
		if (!target) return false;
		if (target.isContentEditable) return true;
		return $(target).is("textarea,input,select") || $(target).closest(".CodeMirror, [contenteditable=true]").length > 0;
	}

	function keyUndo(evt) {
		var isZ = (evt.key && evt.key.toLowerCase() === "z") || evt.code === "KeyZ";
		if ((!evt.ctrlKey && !evt.metaKey) || evt.shiftKey || !isZ) return;
		if (isEditableTarget(evt.target)) return;
		undo(evt);
	}

	function draw(data) {
		var elem;
		switch (data.type) {
			//TODO: add the ability to erase only some points in a line
			case "undo":
				break;
			default:
				console.error("Clear: 'clear' instruction with unknown type. ", data);
				break;
		}
	}


	Tools.add({ //The new tool
		"name": "Undo",
		"icon": "🗑",
		"iconHTML":"<i style='color: #39CCCC;margin-top:7px' class='fas fa-undo-alt'></i>",
		"listeners": {},
		"draw": draw,
		"hidden": true,
		"oneTouch":true,
		"onstart":undo,
		"mouseCursor": "crosshair",
	});

	window.addEventListener("keydown", keyUndo, true);

})(); //End of code isolation
