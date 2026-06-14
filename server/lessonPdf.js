var fs = require("fs"),
	path = require("path");

function sanitizeFilePart(value) {
	return String(value || "lesson")
		.toLowerCase()
		.replace(/[^0-9a-zа-яё._-]+/gi, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80) || "lesson";
}

function pdfEscape(value) {
	return String(value || "")
		.replace(/\\/g, "\\\\")
		.replace(/\(/g, "\\(")
		.replace(/\)/g, "\\)");
}

function jpegFromDataUrl(dataUrl) {
	var match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
	if (!match) throw new Error("Only JPEG lesson pages are supported.");
	return Buffer.from(match[1], "base64");
}

function pageSize(width, height) {
	var ratio = width / height;
	var landscape = ratio >= 1;
	var maxLong = 842;
	var maxShort = 595;
	var pageWidth = landscape ? maxLong : maxShort;
	var pageHeight = pageWidth / ratio;

	if (pageHeight > (landscape ? maxShort : maxLong)) {
		pageHeight = landscape ? maxShort : maxLong;
		pageWidth = pageHeight * ratio;
	}

	return {
		width: Math.round(pageWidth * 100) / 100,
		height: Math.round(pageHeight * 100) / 100
	};
}

function createPdf(pages, title) {
	if (!Array.isArray(pages) || !pages.length) throw new Error("No lesson pages were provided.");

	var objects = [];
	var pageRefs = [];
	var imageIndex = 1;

	function addObject(parts) {
		objects.push(parts);
		return objects.length;
	}

	addObject(["<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /FitWindow true >> >>"]);
	addObject([""]);

	for (var i = 0; i < pages.length; i++) {
		var page = pages[i];
		var width = Math.max(1, page.width | 0);
		var height = Math.max(1, page.height | 0);
		var size = pageSize(width, height);
		var imageData = jpegFromDataUrl(page.dataUrl);
		var imageName = "Im" + imageIndex++;
		var pageObj = objects.length + 1;
		var imageObj = pageObj + 1;
		var contentObj = pageObj + 2;
		var content = [
			"q",
			size.width + " 0 0 " + size.height + " 0 0 cm",
			"/" + imageName + " Do",
			"Q"
		].join("\n");

		pageRefs.push(pageObj + " 0 R");
		addObject([
			"<< /Type /Page /Parent 2 0 R",
			"/MediaBox [0 0 " + size.width + " " + size.height + "]",
			"/Resources << /ProcSet [/PDF /ImageC] /XObject << /" + imageName + " " + imageObj + " 0 R >> >>",
			"/Contents " + contentObj + " 0 R >>"
		]);
		addObject([
			"<< /Type /XObject /Subtype /Image",
			"/Width " + width,
			"/Height " + height,
			"/ColorSpace /DeviceRGB /BitsPerComponent 8",
			"/Filter /DCTDecode /Length " + imageData.length + " >>\nstream\n",
			imageData,
			"\nendstream"
		]);
		addObject([
			"<< /Length " + Buffer.byteLength(content) + " >>\nstream\n",
			content,
			"\nendstream"
		]);
	}

	objects[1] = [
		"<< /Type /Pages /Kids [" + pageRefs.join(" ") + "] /Count " + pageRefs.length + " >>"
	];

	var chunks = [];
	var offsets = [0];
	var length = 0;

	function append(part) {
		var chunk = Buffer.isBuffer(part) ? part : Buffer.from(String(part), "binary");
		chunks.push(chunk);
		length += chunk.length;
	}

	append("%PDF-1.4\n% lesson export\n");
	for (var j = 0; j < objects.length; j++) {
		offsets[j + 1] = length;
		append((j + 1) + " 0 obj\n");
		objects[j].forEach(append);
		append("\nendobj\n");
	}

	var xrefOffset = length;
	append("xref\n0 " + (objects.length + 1) + "\n");
	append("0000000000 65535 f \n");
	for (var k = 1; k < offsets.length; k++) {
		append(("0000000000" + offsets[k]).slice(-10) + " 00000 n \n");
	}
	append("trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R /Info << /Title (" + pdfEscape(title) + ") >> >>\n");
	append("startxref\n" + xrefOffset + "\n%%EOF\n");

	return Buffer.concat(chunks, length);
}

function saveLesson(baseDir, boardName, payload) {
	var createdAt = new Date();
	var title = String(payload.title || "Lesson").trim() || "Lesson";
	var boardSlug = sanitizeFilePart(boardName || "anonymous");
	var timestamp = createdAt.toISOString().replace(/[:.]/g, "-");
	var filename = timestamp + "-" + sanitizeFilePart(title) + ".pdf";
	var lessonDir = path.join(baseDir, boardSlug);
	var pdfPath = path.join(lessonDir, filename);
	var pdf = createPdf(payload.pages, title);

	fs.mkdirSync(lessonDir, { recursive: true });
	fs.writeFileSync(pdfPath, pdf);
	fs.writeFileSync(pdfPath.replace(/\.pdf$/i, ".json"), JSON.stringify({
		title: title,
		board: boardName || "anonymous",
		student: payload.student || "",
		topic: payload.topic || "",
		notes: payload.notes || "",
		pages: payload.pages.length,
		createdAt: createdAt.toISOString(),
		file: filename
	}, null, 2));

	return {
		filename: filename,
		path: pdfPath,
		size: pdf.length
	};
}

module.exports = {
	createPdf: createPdf,
	saveLesson: saveLesson,
	sanitizeFilePart: sanitizeFilePart
};
