var path = require("path")
	, config = require("./configuration.js");

function boardSlug(name) {
	return encodeURIComponent(name || "anonymous");
}

function boardDir(name) {
	return path.join(config.HISTORY_DIR, boardSlug(name));
}

function boardFile(name) {
	return path.join(boardDir(name), "board.json");
}

function legacyBoardFile(name) {
	return path.join(config.HISTORY_DIR, "board-" + boardSlug(name) + ".json");
}

function assetsDir(name) {
	return path.join(boardDir(name), "assets");
}

module.exports = {
	boardSlug: boardSlug,
	boardDir: boardDir,
	boardFile: boardFile,
	legacyBoardFile: legacyBoardFile,
	assetsDir: assetsDir
};
