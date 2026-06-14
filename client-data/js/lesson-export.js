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
				var ay = Number(a.getAttribute("y")) || 0;
				var by = Number(b.getAttribute("y")) || 0;
				if (Math.abs(ay - by) > 80) return ay - by;
				return (Number(a.getAttribute("x")) || 0) - (Number(b.getAttribute("x")) || 0);
			});
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
		var selectors = ["#cursors", "#rect_1", "#transform-rect", ".opcursor"];
		selectors.forEach(function (selector) {
			Array.prototype.slice.call(svgClone.querySelectorAll(selector)).forEach(function (node) {
				if (node.parentNode) node.parentNode.removeChild(node);
			});
		});
	}

	function renderSheet(sheet, index) {
		var x = Number(sheet.getAttribute("x")) || 0;
		var y = Number(sheet.getAttribute("y")) || 0;
		var width = Number(sheet.getAttribute("width")) || 1;
		var height = Number(sheet.getAttribute("height")) || 1;
		var scale = Math.min(1, MAX_RENDER_DIMENSION / width, MAX_RENDER_DIMENSION / height);
		var canvasWidth = Math.max(1, Math.round(width * scale));
		var canvasHeight = Math.max(1, Math.round(height * scale));
		var clone = Tools.svg.cloneNode(true);
		var background = document.createElementNS(Tools.svg.namespaceURI, "rect");

		removeExportNoise(clone);
		clone.setAttribute("xmlns", Tools.svg.namespaceURI);
		clone.setAttribute("xmlns:xlink", xlinkNS);
		clone.setAttribute("width", canvasWidth);
		clone.setAttribute("height", canvasHeight);
		clone.setAttribute("viewBox", [x, y, width, height].join(" "));
		clone.setAttribute("preserveAspectRatio", "none");
		clone.style.background = "#fff";

		background.setAttribute("x", x);
		background.setAttribute("y", y);
		background.setAttribute("width", width);
		background.setAttribute("height", height);
		background.setAttribute("fill", "#fff");
		var firstDrawable = clone.querySelector("#layer-1");
		if (firstDrawable) firstDrawable.insertBefore(background, firstDrawable.firstChild);

		return inlineImages(clone).then(function () {
			return svgToJpeg(clone, canvasWidth, canvasHeight, index);
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
				reject(new Error("Не удалось отрендерить лист " + (index + 1)));
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
