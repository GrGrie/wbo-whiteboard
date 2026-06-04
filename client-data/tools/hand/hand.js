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
	var rightMousePan = {
		orig: { x: 0, y: 0 },
		pressed: false,
		previousCursor: ""
	};

	function isRightMouseButton(evt) {
		return evt.button === 2 || (evt.buttons & 2) === 2;
	}

	function stopRightMouseEvent(evt) {
		evt.preventDefault();
		evt.stopPropagation();
		if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
	}

	function startRightMousePan(evt) {
		if (!isRightMouseButton(evt)) return;
		stopRightMouseEvent(evt);
		rightMousePan.pressed = true;
		rightMousePan.orig.x = scrollX + evt.clientX;
		rightMousePan.orig.y = scrollY + evt.clientY;
		rightMousePan.previousCursor = Tools.svg.style.cursor;
		Tools.svg.style.cursor = "move";
	}

	function moveRightMousePan(evt) {
		if (!rightMousePan.pressed) return;
		if (evt.buttons !== undefined && (evt.buttons & 2) !== 2) {
			stopRightMousePan(evt);
			return;
		}
		stopRightMouseEvent(evt);
		window.scrollTo(rightMousePan.orig.x - evt.clientX, rightMousePan.orig.y - evt.clientY);
	}

	function stopRightMousePan(evt) {
		if (!rightMousePan.pressed) return;
		stopRightMouseEvent(evt);
		rightMousePan.pressed = false;
		Tools.svg.style.cursor = rightMousePan.previousCursor;
	}

	function cancelRightMousePan() {
		if (!rightMousePan.pressed) return;
		rightMousePan.pressed = false;
		Tools.svg.style.cursor = rightMousePan.previousCursor;
	}

	function preventBoardContextMenu(evt) {
		evt.preventDefault();
	}

	Tools.svg.addEventListener("mousedown", startRightMousePan, true);
	document.addEventListener("mousemove", moveRightMousePan, true);
	document.addEventListener("mouseup", stopRightMousePan, true);
	window.addEventListener("blur", cancelRightMousePan, false);
	Tools.board.addEventListener("contextmenu", preventBoardContextMenu, false);
})(); //End of code isolation
