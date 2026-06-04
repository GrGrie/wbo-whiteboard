var  sockets = require('./sockets.js')
	, log = require("./log.js").log
	, path = require('path')
	, url = require('url')
	, fs = require("fs")
	, crypto = require("crypto")
	, serveStatic = require("serve-static")
	, createSVG = require("./createSVG.js")
	, templating = require("./templating.js")
	, config = require("./configuration.js")
	, boardPaths = require("./boardPaths.js");

var https;

if(config.HTTPS){
	https = {
		key : fs.readFileSync(path.join(__dirname, config.PRIVATE_KEY_PATH)),
		cert : fs.readFileSync(path.join(__dirname, config.CERTIFICATE_PATH)),
		ca : fs.readFileSync(path.join(__dirname, config.CA_BUNDLE_PATH))
	}
};

var app =(config.HTTPS ? require('https').createServer(https,handler) : require('http').createServer(handler));

var MIN_NODE_VERSION = 10.0;

if (parseFloat(process.versions.node) < MIN_NODE_VERSION) {
	console.warn(
		"!!! You are using node " + process.version +
		", wbo requires at least " + MIN_NODE_VERSION + " !!!");
}

var io = sockets.start(app);

app.listen(config.PORT);
log("server started", { port: config.PORT });

var CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:";

var fileserver = serveStatic(config.WEBROOT, {
	maxAge: 2 * 3600 * 1000,
	setHeaders: function (res) {
		res.setHeader("X-UA-Compatible", "IE=Edge");
		//res.setHeader("Content-Security-Policy", CSP);
	}
});

var errorPage = fs.readFileSync(path.join(config.WEBROOT, "error.html"));
function serveError(request, response) {
	return function (err) {
		log("error", { "error": err, "url": request.url });
		response.writeHead(err ? 500 : 404, { "Content-Length": errorPage.length });
		response.end(errorPage);
	}
}

function logRequest(request) {
	log('connection', {
		ip: request.connection.remoteAddress,
		original_ip: request.headers['x-forwarded-for'] || request.headers['forwarded'],
		user_agent: request.headers['user-agent'],
		referer: request.headers['referer'],
		language: request.headers['accept-language'],
		url: request.url,
	});
}

function handler(request, response) {
	try {
		handleRequest(request, response);
	} catch (err) {
		console.trace(err);
		response.writeHead(500, { 'Content-Type': 'text/plain' });
		response.end(err.toString());
	}
}

const boardTemplate = new templating.BoardTemplate(path.join(config.WEBROOT, 'board.html'));
const indexTemplate = new templating.Template(path.join(config.WEBROOT, 'index.html'));
const appRoot = path.dirname(__dirname);
const secrets = readSecrets(path.join(appRoot, ".secrets"));

function readSecrets(file) {
	var values = {};
	try {
		var text = fs.readFileSync(file, "utf8");
		text.split(/\r?\n/).forEach(function (line) {
			var match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
			if (match) values[match[1].toUpperCase()] = match[2];
		});
	} catch (err) {
		console.warn("Unable to read .secrets. New board creation will require configured credentials.");
	}
	return values;
}

function boardFile(name) {
	return boardPaths.boardFile(name);
}

function boardExists(name) {
	if (!name || name === "anonymous") return true;
	return fs.existsSync(boardPaths.boardFile(name)) || fs.existsSync(boardPaths.legacyBoardFile(name));
}

function isAuthorized(query) {
	return secrets.LOGIN &&
		secrets.PASSWORD &&
		query &&
		query.login === secrets.LOGIN &&
		query.password === secrets.PASSWORD;
}

function serveUnauthorized(response) {
	response.writeHead(302, { Location: "/?auth=failed" });
	response.end();
}

function ensureBoardFile(name) {
	if (!config.SAVE_BOARDS || boardExists(name)) return;
	fs.mkdirSync(boardPaths.assetsDir(name), { recursive: true });
	fs.writeFileSync(boardPaths.boardFile(name), "{}");
}

function ensureBoardStorage(name) {
	if (!config.SAVE_BOARDS) return;
	fs.mkdirSync(boardPaths.assetsDir(name), { recursive: true });
	if (!fs.existsSync(boardPaths.boardFile(name))) {
		if (fs.existsSync(boardPaths.legacyBoardFile(name))) {
			fs.copyFileSync(boardPaths.legacyBoardFile(name), boardPaths.boardFile(name));
		} else {
			fs.writeFileSync(boardPaths.boardFile(name), "{}");
		}
	}
}

function serveAsset(parts, response) {
	var boardName = decodeURIComponent(parts[1] || "");
	var fileName = parts[2] || "";
	if (!boardExists(boardName) || !/^[0-9A-Za-z_.-]+$/.test(fileName)) return serveUnauthorized(response);
	var assetFile = path.join(boardPaths.assetsDir(boardName), fileName);
	if (path.resolve(path.dirname(assetFile)) !== path.resolve(boardPaths.assetsDir(boardName))) return serveUnauthorized(response);
	var ext = path.extname(fileName).toLowerCase();
	var type = {
		".gif": "image/gif",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".png": "image/png",
		".webp": "image/webp"
	}[ext] || "application/octet-stream";
	fs.readFile(assetFile, function (err, data) {
		if (err) return serveError({ url: "/board-assets" }, response)(err);
		response.writeHead(200, {
			"Content-Type": type,
			"Cache-Control": "public, max-age=31536000",
			"Content-Length": data.length
		});
		response.end(data);
	});
}

function receiveBoardAsset(request, response, boardName) {
	if (!boardExists(boardName)) return serveUnauthorized(response);
	var body = "";
	request.on("data", function (chunk) {
		body += chunk;
		if (body.length > config.MAX_DOUMENT_SIZE * 2) request.connection.destroy();
	});
	request.on("end", function () {
		try {
			var payload = JSON.parse(body);
			var match = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(payload.dataUrl || "");
			if (!match) throw new Error("Unsupported image payload.");
			var ext = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" }[match[1]];
			var data = Buffer.from(match[2], "base64");
			if (!data.length || data.length > config.MAX_DOUMENT_SIZE) throw new Error("Image is too large.");
			ensureBoardStorage(boardName);
			var id = String(payload.id || crypto.randomBytes(12).toString("hex")).replace(/[^0-9A-Za-z_.-]/g, "");
			var fileName = id + "." + ext;
			fs.writeFileSync(path.join(boardPaths.assetsDir(boardName), fileName), data);
			response.writeHead(200, { "Content-Type": "application/json" });
			response.end(JSON.stringify({ src: "/board-assets/" + encodeURIComponent(boardName) + "/" + fileName }));
		} catch (err) {
			response.writeHead(400, { "Content-Type": "application/json" });
			response.end(JSON.stringify({ error: err.message }));
		}
	});
}

function cleanBoardRedirect(response, boardName) {
	response.writeHead(302, { Location: "/board.html?board=" + encodeURIComponent(boardName) });
	response.end();
}

function handleRequest(request, response) {
	var parsedUrl = url.parse(request.url, true);
	var parts = parsedUrl.pathname.split('/');
	if (parts[0] === '') parts.shift();
	var boardName = parsedUrl.query.board;

	if (parts[0] === "board-assets" && request.method === "POST") {
		return receiveBoardAsset(request, response, boardName || "anonymous");
	}

	if (parts[0] === "board-assets" && request.method === "GET") {
		return serveAsset(parts, response);
	}

	if (parts[0] === "board.html" && boardName) {
		if (!boardExists(boardName)) {
			if (!isAuthorized(parsedUrl.query)) return serveUnauthorized(response);
			ensureBoardFile(boardName);
			return cleanBoardRedirect(response, boardName);
		}
		if (parsedUrl.query.login || parsedUrl.query.password) {
			return cleanBoardRedirect(response, boardName);
		}
	}

	if (parts[0] === "boards") {
		// "boards" refers to the root directory
		if (parts.length === 1 && parsedUrl.query.board) {
			// '/boards?board=...' This allows html forms to point to boards
			if (!boardExists(parsedUrl.query.board)) {
				if (!isAuthorized(parsedUrl.query)) return serveUnauthorized(response);
				ensureBoardFile(parsedUrl.query.board);
			}
			var headers = { Location: 'boards/' + encodeURIComponent(parsedUrl.query.board) };
			response.writeHead(301, headers);
			response.end();
		} else if (parts.length === 2 && request.url.indexOf('.') === -1) {
			// If there is no dot and no directory, parts[1] is the board name
			var routedBoardName = decodeURIComponent(parts[1]);
			if (!boardExists(routedBoardName)) return serveUnauthorized(response);
			boardTemplate.serve(request, response);
		} else { // Else, it's a resource
			request.url = "/" + parts.slice(1).join('/');
			fileserver(request, response, serveError(request, response));
		}
	} else if (parts[0] === "download") {
		var boardName = encodeURIComponent(parts[1]),
			history_file = fs.existsSync(boardPaths.boardFile(decodeURIComponent(parts[1]))) ?
				boardPaths.boardFile(decodeURIComponent(parts[1])) :
				boardPaths.legacyBoardFile(decodeURIComponent(parts[1]));
		if (parts.length > 2 && /^[0-9A-Za-z.\-]+$/.test(parts[2])) {
			history_file += '.' + parts[2] + '.bak';
		}
		log("download", { "file": history_file });
		fs.readFile(history_file, function (err, data) {
			if (err) return serveError(request, response)(err);
			response.writeHead(200, {
				"Content-Type": "application/json",
				"Content-Disposition": 'attachment; filename="' + boardName + '.wbo"',
				"Content-Length": data.length,
			});
			response.end(data);
		});
	} else if (parts[0] === "preview") {
		var boardName = encodeURIComponent(parts[1]),
			history_file = fs.existsSync(boardPaths.boardFile(decodeURIComponent(parts[1]))) ?
				boardPaths.boardFile(decodeURIComponent(parts[1])) :
				boardPaths.legacyBoardFile(decodeURIComponent(parts[1]));
		createSVG.renderBoard(history_file, function (err, svg) {
			if (err) {
				log(err);
				response.writeHead(404, { 'Content-Type': 'application/json' });
				return response.end(JSON.stringify(err));
			}
			response.writeHead(200, {
				"Content-Type": "image/svg+xml",
				"Content-Security-Policy": CSP,
				'Content-Length': Buffer.byteLength(svg),
			});
			response.end(svg);
		});
	} else if (parts[0] === "random") {
		var name = crypto.randomBytes(32).toString('base64').replace(/[^\w]/g, '-');
		response.writeHead(307, { 'Location': '/boards/' + name });
		response.end(name);

	} else if (parts[0] === "") { // Index page
		logRequest(request);
		indexTemplate.serve(request, response);
	} else {
		fileserver(request, response, serveError(request, response));
	}
}
