/*
 * Minimal jQuery compatibility layer for the whiteboard UI.
 * It supports only the methods used in this project so the app
 * can boot without fetching jQuery from third-party CDNs.
 */
(function (global) {
	"use strict";

	function toArray(value) {
		return Array.prototype.slice.call(value || []);
	}

	function normalizeContent(content) {
		if (content instanceof Wrapper) return content.elements;
		if (Array.isArray(content)) return content;
		if (content && (content.nodeType || content === window || content === document)) return [content];
		if (typeof content === "string") return toArray(document.querySelectorAll(content));
		return [];
	}

	function parseDuration(duration) {
		if (duration === "fast") return 200;
		if (duration === "slow") return 600;
		return typeof duration === "number" ? duration : 400;
	}

	function Wrapper(elements) {
		this.elements = elements || [];
		this.length = this.elements.length;
		for (var i = 0; i < this.elements.length; i++) this[i] = this.elements[i];
	}

	Wrapper.prototype.each = function (callback) {
		this.elements.forEach(function (el, index) {
			callback.call(el, index, el);
		});
		return this;
	};

	Wrapper.prototype.on = function (eventName, handler) {
		return this.each(function () {
			this.addEventListener(eventName, handler, false);
		});
	};

	Wrapper.prototype.ready = function (handler) {
		if (!this.elements.length || this.elements[0] !== document) return this;
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", handler, { once: true });
		} else {
			handler();
		}
		return this;
	};

	Wrapper.prototype.resize = function (handler) {
		return this.on("resize", handler);
	};

	Wrapper.prototype.tooltip = function () { return this; };
	Wrapper.prototype.modal = function () { return this; };

	Wrapper.prototype.hide = function () {
		return this.each(function () {
			this.style.display = "none";
		});
	};

	Wrapper.prototype.show = function () {
		return this.each(function () {
			this.style.display = "";
		});
	};

	Wrapper.prototype.stop = function () {
		return this;
	};

	Wrapper.prototype.css = function (styles) {
		return this.each(function () {
			for (var key in styles) {
				if (Object.prototype.hasOwnProperty.call(styles, key)) {
					this.style[key] = styles[key];
				}
			}
		});
	};

	Wrapper.prototype.addClass = function (className) {
		var classes = String(className || "").split(/\s+/).filter(Boolean);
		return this.each(function () {
			this.classList.add.apply(this.classList, classes);
		});
	};

	Wrapper.prototype.removeClass = function (className) {
		var classes = String(className || "").split(/\s+/).filter(Boolean);
		return this.each(function () {
			this.classList.remove.apply(this.classList, classes);
		});
	};

	Wrapper.prototype.fadeTo = function (duration, opacity) {
		duration = parseDuration(duration);
		return this.each(function () {
			this.style.transition = "opacity " + duration + "ms ease";
			this.style.opacity = String(opacity);
		});
	};

	Wrapper.prototype.fadeIn = function (duration) {
		duration = parseDuration(duration);
		return this.each(function () {
			this.style.display = "";
			this.style.transition = "opacity " + duration + "ms ease";
			this.style.opacity = "1";
		});
	};

	Wrapper.prototype.fadeOut = function (duration) {
		duration = parseDuration(duration);
		return this.each(function () {
			this.style.transition = "opacity " + duration + "ms ease";
			this.style.opacity = "0";
			var el = this;
			window.setTimeout(function () {
				if (el.style.opacity === "0") el.style.display = "none";
			}, duration);
		});
	};

	Wrapper.prototype.animate = function (props) {
		return this.each(function () {
			this.style.transition = "all 200ms ease";
			for (var key in props) {
				if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
				var value = props[key];
				this.style[key] = typeof value === "number" ? value + "px" : String(value);
			}
		});
	};

	Wrapper.prototype.height = function () {
		var el = this.elements[0];
		if (!el) return 0;
		return el.getBoundingClientRect ? el.getBoundingClientRect().height : el.offsetHeight || 0;
	};

	Wrapper.prototype.width = function () {
		var el = this.elements[0];
		if (!el) return 0;
		return el.getBoundingClientRect ? el.getBoundingClientRect().width : el.offsetWidth || 0;
	};

	Wrapper.prototype.position = function () {
		var el = this.elements[0];
		return el ? { top: el.offsetTop || 0, left: el.offsetLeft || 0 } : { top: 0, left: 0 };
	};

	Wrapper.prototype.offset = function () {
		var el = this.elements[0];
		if (!el || !el.getBoundingClientRect) return { top: 0, left: 0 };
		var rect = el.getBoundingClientRect();
		return {
			top: rect.top + window.pageYOffset,
			left: rect.left + window.pageXOffset
		};
	};

	Wrapper.prototype.closest = function (selector) {
		var matches = [];
		this.each(function () {
			var match = this.closest ? this.closest(selector) : null;
			if (match && matches.indexOf(match) === -1) matches.push(match);
		});
		return new Wrapper(matches);
	};

	Wrapper.prototype.find = function (selectorOrElement) {
		var matches = [];
		this.each(function () {
			if (typeof selectorOrElement === "string") {
				toArray(this.querySelectorAll(selectorOrElement)).forEach(function (node) {
					if (matches.indexOf(node) === -1) matches.push(node);
				});
				return;
			}
			if (selectorOrElement && selectorOrElement.nodeType && this.contains(selectorOrElement)) {
				matches.push(selectorOrElement);
			}
		});
		return new Wrapper(matches);
	};

	Wrapper.prototype.is = function (target) {
		var el = this.elements[0];
		if (!el) return false;
		if (typeof target === "string") return !!(el.matches && el.matches(target));
		if (target instanceof Wrapper) {
			return target.elements.some(function (candidate) { return candidate === el; });
		}
		return !!target && el === target;
	};

	function $(value) {
		if (value instanceof Wrapper) return value;
		if (typeof value === "function") return $(document).ready(value);
		if (typeof value === "string") return new Wrapper(toArray(document.querySelectorAll(value)));
		if (value === window || value === document || (value && value.nodeType)) return new Wrapper([value]);
		if (value && typeof value.length === "number") return new Wrapper(toArray(value));
		return new Wrapper([]);
	}

	global.$ = global.jQuery = $;
	$.fn = Wrapper.prototype;
})(window);
