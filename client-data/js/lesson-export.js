(function lessonExport() {
	var xlinkNS = "http://www.w3.org/1999/xlink";
	var MAX_RENDER_DIMENSION = 3200;

	function requestTeacherStatus() {
		if (!window.fetch || typeof Tools === "undefined") return;
		fetch("/teacher/status", { credentials: "same-origin" })
			.then(function (response) {
				if (response.status === 204) createTeacherUI();
			})
			.catch(function () {});
	}

	function createTeacherUI() {
		if (document.getElementById("lessonExportButton")) return;

		var style = document.createElement("style");
		style.textContent = [
			"#lessonExportButton{position:fixed;right:18px;top:18px;z-index:80;height:42px;padding:0 14px;border:1px solid #cfdce8;border-radius:8px;background:#fff;color:#182533;box-shadow:0 4px 14px rgba(20,34,51,.18);font-weight:700;cursor:pointer}",
			"#lessonExportButton:disabled{opacity:.65;cursor:wait}",
			"#lessonExportDialog{position:fixed;right:18px;top:70px;z-index:81;width:min(360px,calc(100vw - 36px));padding:14px;background:#fff;border:1px solid #cfdce8;border-radius:8px;box-shadow:0 8px 26px rgba(20,34,51,.24);display:none}",
			"#lessonExportDialog.open{display:block}",
			"#lessonExportDialog h2{font-size:18px;line-height:1.2;margin:0 0 12px;color:#182533}",
			"#lessonExportDialog label{display:block;margin:10px 0 4px;font-size:13px;font-weight:700;color:#405466}",
			"#lessonExportDialog input,#lessonExportDialog textarea{width:100%;border:1px solid #cfdce8;border-radius:6px;padding:8px;font:inherit}",
			"#lessonExportDialog textarea{min-height:64px;resize:vertical}",
			"#lessonExportDialog .lesson-checkbox{display:flex;gap:8px;align-items:center;margin:12px 0;color:#405466;font-size:13px}",
			"#lessonExportDialog .lesson-checkbox input{width:auto}",
			"#lessonExportDialog .lesson-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}",
			"#lessonExportDialog button{border:1px solid #cfdce8;border-radius:6px;background:#fff;padding:8px 10px;font-weight:700;cursor:pointer}",
			"#lessonExportDialog button.primary{background:#0f6fbd;border-color:#0f6fbd;color:#fff}",
			"#lessonExportStatus{min-height:18px;margin-top:10px;color:#405466;font-size:13px}"
		].join("\n");
		document.head.appendChild(style);

		var button = document.createElement("button");
		button.id = "lessonExportButton";
		button.type = "button";
		button.textContent = "Сохранить урок";
		button.title = "Собрать белые листы в PDF";
		document.body.appendChild(button);

		var dialog = document.createElement("div");
		dialog.id = "lessonExportDialog";
		dialog.innerHTML = [
			"<h2>Сохранить урок</h2>",
			"<label for='lessonStudent'>Ученик</label>",
			"<input id='lessonStudent' type='text' autocomplete='off'>",
			"<label for='lessonTopic'>Тема</label>",
			"<input id='lessonTopic' type='text' autocomplete='off'>",
			"<label for='lessonNotes'>Заметки</label>",
			"<textarea id='lessonNotes'></textarea>",
			"<label class='lesson-checkbox'><input id='lessonClearAfter' type='checkbox'> Очистить доску после сохранения</label>",
			"<div class='lesson-actions'>",
			"<button type='button' id='lessonCancel'>Отмена</button>",
			"<button type='button' id='lessonSave' class='primary'>Создать PDF</button>",
			"</div>",
			"<div id='lessonExportStatus'></div>"
		].join("");
		document.body.appendChild(dialog);

		var student = document.getElementById("lessonStudent");
		var topic = document.getElementById("lessonTopic");
		var today = new Date().toLocaleDateString("ru-RU");
		student.value = decodeURIComponent(Tools.boardName || "anonymous");
		topic.value = "Урок " + today;

		button.addEventListener("click", function () {
			dialog.classList.toggle("open");
		});
		document.getElementById("lessonCancel").addEventListener("click", function () {
			dialog.classList.remove("open");
		});
		document.getElementById("lessonSave").addEventListener("click", saveLesson);
	}

	function getSheets() {
		var sheets = Array.prototype.slice.call(Tools.svg.querySelectorAll('[data-plane="sheet"]'));
		return sheets
			.filter(function (sheet) {
				return sheet.localName === "rect" && Number(sheet.getAttribute("width")) > 0 && Number(sheet.getAttribute("height")) > 0;
			})
			.sort(function (a, b) {
				var pageA = Number(a.getAttribute("data-page-no")) || 999999;
				var pageB = Number(b.getAttribute("data-page-no")) || 999999;
				if (pageA !== pageB) return pageA - pageB;
				var boundsA = sheetBounds(a);
				var boundsB = sheetBounds(b);
				if (Math.abs(boundsA.y - boundsB.y) > 80) return boundsA.y - boundsB.y;
				return boundsA.x - boundsB.x;
			});
	}

	function parseMatrix(transform) {
		var match = /^matrix\(([^)]+)\)$/.exec(transform || "");
		if (!match) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		var parts = match[1].split(/[\s,]+/).map(Number);
		if (parts.length !== 6 || !parts.every(function (value) { return !isNaN(value); })) {
			return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		}
		return { a: parts[0], b: parts[1], c: parts[2], d: parts[3], e: parts[4], f: parts[5] };
	}

	function transformPoint(matrix, x, y) {
		return {
			x: matrix.a * x + matrix.c * y + matrix.e,
			y: matrix.b * x + matrix.d * y + matrix.f
		};
	}

	function sheetBounds(sheet) {
		var x = Number(sheet.getAttribute("x")) || 0;
		var y = Number(sheet.getAttribute("y")) || 0;
		var width = Number(sheet.getAttribute("width")) || 1;
		var height = Number(sheet.getAttribute("height")) || 1;
		var matrix = parseMatrix(sheet.getAttribute("transform"));
		var points = [
			transformPoint(matrix, x, y),
			transformPoint(matrix, x + width, y),
			transformPoint(matrix, x, y + height),
			transformPoint(matrix, x + width, y + height)
		];
		var xs = points.map(function (point) { return point.x; });
		var ys = points.map(function (point) { return point.y; });
		var minX = Math.min.apply(Math, xs);
		var minY = Math.min.apply(Math, ys);
		var maxX = Math.max.apply(Math, xs);
		var maxY = Math.max.apply(Math, ys);
		return {
			x: minX,
			y: minY,
			width: Math.max(1, maxX - minX),
			height: Math.max(1, maxY - minY)
		};
	}

	function readHref(image) {
		return image.getAttribute("href") || image.getAttributeNS(xlinkNS, "href") || "";
	}

	function writeHref(image, href) {
		image.setAttribute("href", href);
		image.setAttributeNS(xlinkNS, "href", href);
	}

	function blobToDataUrl(blob) {
		return new Promise(function (resolve, reject) {
			var reader = new FileReader();
			reader.onload = function () { resolve(reader.result); };
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	function inlineImages(svgClone) {
		var images = Array.prototype.slice.call(svgClone.querySelectorAll("image"));
		return Promise.all(images.map(function (image) {
			var href = readHref(image);
			if (!href || href.indexOf("data:") === 0) return Promise.resolve();
			var absolute = new URL(href, window.location.href).toString();
			return fetch(absolute, { credentials: "same-origin" })
				.then(function (response) {
					if (!response.ok) throw new Error("Image load failed");
					return response.blob();
				})
				.then(blobToDataUrl)
				.then(function (dataUrl) {
					writeHref(image, dataUrl);
				})
				.catch(function () {});
		}));
	}

	function removeExportNoise(svgClone) {
		var selectors = ["#cursors", "#rect_1", "#transform-rect", ".opcursor", ".sheet-page-label", "script", "foreignObject", "iframe"];
		selectors.forEach(function (selector) {
			Array.prototype.slice.call(svgClone.querySelectorAll(selector)).forEach(function (node) {
				if (node.parentNode) node.parentNode.removeChild(node);
			});
		});
		Array.prototype.slice.call(svgClone.querySelectorAll("[data-sheet-helper]")).forEach(function (node) {
			var sheetId = node.getAttribute("data-sheet-helper");
			if (!sheetId || !svgClone.querySelector("#" + sheetId)) {
				if (node.parentNode) node.parentNode.removeChild(node);
			}
		});
	}

	function createExportSvg(x, y, width, height, canvasWidth, canvasHeight) {
		var exportSvg = document.createElementNS(Tools.svg.namespaceURI, "svg");
		var defs = Tools.svg.querySelector("#defs");
		var layer = Tools.svg.querySelector("#layer-1");
		var background = document.createElementNS(Tools.svg.namespaceURI, "rect");
		var content = document.createElementNS(Tools.svg.namespaceURI, "g");

		exportSvg.setAttribute("xmlns", Tools.svg.namespaceURI);
		exportSvg.setAttribute("xmlns:xlink", xlinkNS);
		exportSvg.setAttribute("width", canvasWidth);
		exportSvg.setAttribute("height", canvasHeight);
		exportSvg.setAttribute("viewBox", [x, y, width, height].join(" "));
		exportSvg.setAttribute("preserveAspectRatio", "none");

		if (defs) exportSvg.appendChild(defs.cloneNode(true));

		background.setAttribute("x", x);
		background.setAttribute("y", y);
		background.setAttribute("width", width);
		background.setAttribute("height", height);
		background.setAttribute("fill", "#fff");
		exportSvg.appendChild(background);

		if (layer) {
			Array.prototype.slice.call(layer.childNodes).forEach(function (node) {
				content.appendChild(node.cloneNode(true));
			});
		}
		exportSvg.appendChild(content);
		removeExportNoise(exportSvg);

		return exportSvg;
	}

	function renderSheet(sheet, index) {
		var bounds = sheetBounds(sheet);
		var x = bounds.x;
		var y = bounds.y;
		var width = bounds.width;
		var height = bounds.height;
		var scale = Math.min(1, MAX_RENDER_DIMENSION / width, MAX_RENDER_DIMENSION / height);
		var canvasWidth = Math.max(1, Math.round(width * scale));
		var canvasHeight = Math.max(1, Math.round(height * scale));
		var clone = createExportSvg(x, y, width, height, canvasWidth, canvasHeight);

		return inlineImages(clone).then(function () {
			return renderSvgElementsToJpeg(clone, canvasWidth, canvasHeight, index);
		});
	}

	function numberAttr(node, name, fallback) {
		var value = Number(node.getAttribute(name));
		return isNaN(value) ? fallback : value;
	}

	function applyPaint(ctx, node) {
		var opacity = Number(node.getAttribute("opacity"));
		ctx.globalAlpha = isNaN(opacity) ? 1 : opacity;
		ctx.lineWidth = numberAttr(node, "stroke-width", 1);
		ctx.lineCap = node.getAttribute("stroke-linecap") || "butt";
		ctx.lineJoin = node.getAttribute("stroke-linejoin") || "miter";
		ctx.strokeStyle = node.getAttribute("stroke") || "#000";
		ctx.fillStyle = node.getAttribute("fill") || "#000";
		ctx.setLineDash(parseDash(node.getAttribute("stroke-dasharray")));
		ctx.lineDashOffset = numberAttr(node, "stroke-dashoffset", 0);
	}

	function parseDash(value) {
		if (!value || value === "none") return [];
		return value.split(/[\s,]+/).map(Number).filter(function (part) {
			return !isNaN(part) && part > 0;
		});
	}

	function applyTransform(ctx, node) {
		var transform = node.getAttribute("transform");
		var match = /^matrix\(([^)]+)\)$/.exec(transform || "");
		if (!match) return;
		var parts = match[1].split(/[\s,]+/).map(Number);
		if (parts.length === 6 && parts.every(function (value) { return !isNaN(value); })) {
			ctx.transform(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]);
		}
	}

	function loadImage(src) {
		return new Promise(function (resolve, reject) {
			if (!src) return resolve(null);
			var image = new Image();
			image.onload = function () { resolve(image); };
			image.onerror = reject;
			image.src = src;
		});
	}

	function drawPath(ctx, node) {
		var d = node.getAttribute("d");
		if (!d || typeof Path2D === "undefined") return;
		var path = new Path2D(d);
		var fill = node.getAttribute("fill");
		var stroke = node.getAttribute("stroke");
		if (fill && fill !== "none") ctx.fill(path);
		if (!fill || fill === "none" || stroke && stroke !== "none") ctx.stroke(path);
	}

	function drawLine(ctx, node) {
		ctx.beginPath();
		ctx.moveTo(numberAttr(node, "x1", 0), numberAttr(node, "y1", 0));
		ctx.lineTo(numberAttr(node, "x2", 0), numberAttr(node, "y2", 0));
		ctx.stroke();
	}

	function drawRect(ctx, node) {
		var x = numberAttr(node, "x", 0);
		var y = numberAttr(node, "y", 0);
		var width = numberAttr(node, "width", 0);
		var height = numberAttr(node, "height", 0);
		var fill = node.getAttribute("fill");
		var stroke = node.getAttribute("stroke");
		if (fill && fill !== "none") ctx.fillRect(x, y, width, height);
		if (stroke && stroke !== "none") ctx.strokeRect(x, y, width, height);
	}

	function drawText(ctx, node) {
		var size = numberAttr(node, "font-size", numberAttr(node, "size", 24));
		ctx.font = size + "px Arial, sans-serif";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(node.textContent || "", numberAttr(node, "x", 0), numberAttr(node, "y", 0));
	}

	function drawImageNode(ctx, node) {
		var src = readHref(node);
		return loadImage(src).then(function (image) {
			if (!image) return;
			ctx.drawImage(
				image,
				numberAttr(node, "x", 0),
				numberAttr(node, "y", 0),
				numberAttr(node, "width", image.width || 0),
				numberAttr(node, "height", image.height || 0)
			);
		});
	}

	function drawNode(ctx, node) {
		if (!node || node.nodeType !== 1) return Promise.resolve();
		return Promise.resolve().then(function () {
			ctx.save();
			applyTransform(ctx, node);
			applyPaint(ctx, node);
			var name = node.localName;
			if (name === "g" || name === "svg") {
				return drawChildren(ctx, node);
			}
			if (name === "rect") drawRect(ctx, node);
			else if (name === "path") drawPath(ctx, node);
			else if (name === "line") drawLine(ctx, node);
			else if (name === "text") drawText(ctx, node);
			else if (name === "image") return drawImageNode(ctx, node);
		}).then(function () {
			ctx.restore();
		}, function (err) {
			ctx.restore();
			throw err;
		});
	}

	function drawChildren(ctx, node) {
		var children = Array.prototype.slice.call(node.childNodes);
		return children.reduce(function (promise, child) {
			return promise.then(function () {
				return drawNode(ctx, child);
			});
		}, Promise.resolve());
	}

	function renderSvgElementsToJpeg(svgNode, width, height, index) {
		return new Promise(function (resolve, reject) {
			try {
				var canvas = document.createElement("canvas");
				var ctx = canvas.getContext("2d");
				var viewBox = String(svgNode.getAttribute("viewBox") || "0 0 " + width + " " + height).split(/[\s,]+/).map(Number);
				canvas.width = width;
				canvas.height = height;
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, width, height);
				ctx.scale(width / viewBox[2], height / viewBox[3]);
				ctx.translate(-viewBox[0], -viewBox[1]);
				drawChildren(ctx, svgNode).then(function () {
					resolve({
						name: "page-" + (index + 1),
						width: width,
						height: height,
						dataUrl: canvas.toDataURL("image/jpeg", 0.92)
					});
				}, reject);
			} catch (err) {
				reject(new Error("Не удалось отрендерить лист " + (index + 1) + ": " + err.message));
			}
		});
	}

	function svgToJpeg(svgNode, width, height, index) {
		return new Promise(function (resolve, reject) {
			var serialized = new XMLSerializer().serializeToString(svgNode);
			var blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
			var url = URL.createObjectURL(blob);
			var image = new Image();
			image.onload = function () {
				var canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				var ctx = canvas.getContext("2d");
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(image, 0, 0, width, height);
				URL.revokeObjectURL(url);
				resolve({
					name: "page-" + (index + 1),
					width: width,
					height: height,
					dataUrl: canvas.toDataURL("image/jpeg", 0.92)
				});
			};
			image.onerror = function () {
				URL.revokeObjectURL(url);
				reject(new Error("Не удалось отрендерить лист " + (index + 1) + ". Попробуйте обновить страницу и повторить экспорт."));
			};
			image.src = url;
		});
	}

	function setBusy(isBusy, message) {
		var button = document.getElementById("lessonExportButton");
		var save = document.getElementById("lessonSave");
		var status = document.getElementById("lessonExportStatus");
		if (button) button.disabled = isBusy;
		if (save) save.disabled = isBusy;
		if (status) status.textContent = message || "";
	}

	function titleFromForm() {
		var student = document.getElementById("lessonStudent").value.trim();
		var topic = document.getElementById("lessonTopic").value.trim();
		return [student, topic].filter(Boolean).join(" - ") || "Урок";
	}

	function download(url) {
		var link = document.createElement("a");
		link.href = url;
		link.download = "";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function clearBoardAfterSave() {
		var clearMsg = { type: "clear" };
		if (!Tools.list["Clear"]) return;
		Tools.acceptMsgs = false;
		Tools.list["Clear"].draw(clearMsg, true);
		Tools.send(clearMsg, "Clear");
	}

	function saveLesson() {
		var sheets = getSheets();
		if (!sheets.length) {
			setBusy(false, "Сначала добавьте хотя бы один лист.");
			return;
		}

		setBusy(true, "Готовлю страницы: 0/" + sheets.length);
		Promise.all(sheets.map(function (sheet, index) {
			return renderSheet(sheet, index).then(function (page) {
				setBusy(true, "Готовлю страницы: " + (index + 1) + "/" + sheets.length);
				return page;
			});
		})).then(function (pages) {
			setBusy(true, "Собираю PDF...");
			return fetch("/lessons/pdf?board=" + encodeURIComponent(Tools.boardName || "anonymous"), {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: titleFromForm(),
					student: document.getElementById("lessonStudent").value.trim(),
					topic: document.getElementById("lessonTopic").value.trim(),
					notes: document.getElementById("lessonNotes").value.trim(),
					pages: pages
				})
			});
		}).then(function (response) {
			return response.json().then(function (payload) {
				if (!response.ok) throw new Error(payload.error || "Не удалось создать PDF.");
				return payload;
			});
		}).then(function (payload) {
			setBusy(false, "PDF сохранен.");
			download(payload.url);
			if (document.getElementById("lessonClearAfter").checked) clearBoardAfterSave();
		}).catch(function (err) {
			setBusy(false, err.message || "Не удалось сохранить урок.");
			console.error(err);
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", requestTeacherStatus);
	} else {
		requestTeacherStatus();
	}
})();
