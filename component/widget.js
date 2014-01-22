/*
 * TroopJS browser/component/widget
 * @license MIT http://troopjs.mit-license.org/ © Mikael Karon mailto:mikael@karon.se
 */
define([ "troopjs-core/component/gadget", "jquery", "../loom/config", "../loom/weave", "../loom/unweave", "../loom/plugin", "troopjs-jquery/destroy" ], function WidgetModule(Gadget, $, config, weave, unweave) {
	"use strict";

	var UNDEFINED;
	var ARRAY_SLICE = Array.prototype.slice;
	var $GET = $.fn.get;
	var TYPEOF_FUNCTION = "function";
	var $ELEMENT = "$element";
	var $HANDLERS = "$handlers";
	var FEATURES = "features";
	var TYPE = "type";
	var VALUE = "value";
	var PROXY = "proxy";
	var GUID = "guid";
	var LENGTH = "length";
	var $WEFT = config["$weft"];
	var SELECTOR_WEAVE = "[" + config["weave"] + "]";
	var SELECTOR_WOVEN = "[" + config["woven"] + "]";


	/*
	 * Creates a proxy that executes 'handler' in 'widget' scope
	 * @private
	 * @param {Object} widget target widget
	 * @param {Function} handler target handler
	 * @returns {Function} proxied handler
	 */
	function eventProxy(widget, handler) {
		/*
		 * Creates a proxy of the outer method 'handler' that first adds 'topic' to the arguments passed
		 * @returns result of proxied hanlder invocation
		 */
		return function handlerProxy() {
			// Apply with shifted arguments to handler
			return handler.apply(widget, arguments);
		};
	}

	/*
	 * Creates a proxy of the inner method 'render' with the '$fn' parameter set
	 * @private
	 * @param $fn jQuery method
	 * @returns {Function} proxied render
	 */
	function renderProxy($fn) {
		/*
		 * Renders contents into element
		 * @private
		 * @param {Function|String} contents Template/String to render
		 * @param {Object..} [data] If contents is a template - template data
		 * @returns {Object} me
		 */
		function render(contents, data) {
			/*jshint validthis:true*/
			var me = this;
			var args = ARRAY_SLICE.call(arguments, 1);

			// Call render with contents (or result of contents if it's a function)
			return weave.call($fn.call(me[$ELEMENT],
				typeof contents === TYPEOF_FUNCTION ? contents.apply(me,args) : contents
			).find(SELECTOR_WEAVE));
		}

		return render;
	}

	/**
	 * Base DOM component attached to an element, that takes care of widget instantiation.
	 * @class browser.component.widget
	 */
	return Gadget.extend(function ($element, displayName) {
		var me = this;
		var $get;

		// No $element
		if ($element === UNDEFINED) {
			throw new Error("No $element provided");
		}
		// Is _not_ a jQuery element
		else if (!$element.jquery) {
			// From a plain dom node
			if ($element.nodeType)
				$element = $($element);
			else {
				throw new Error("Unsupported widget element");
			}
		}
		// Element from a different jQuery instance
		else if (($get = $element.get) !== $GET) {
			$element = $($get.call($element, 0));
		}

		me[$ELEMENT] = $element;
		me[$HANDLERS] = [];

		if (displayName !== UNDEFINED) {
			me.displayName = displayName;
		}
	}, {
		"displayName" : "browser/component/widget",

		"sig/initialize" : function onInitialize() {
			var me = this;
			var $element = me[$ELEMENT];
			var $handler;
			var $handlers = me[$HANDLERS];
			var special;
			var specials = me.constructor.specials.dom;
			var type;
			var features;
			var value;
			var proxy;
			var i;
			var iMax;

			// Iterate specials
			for (i = 0, iMax = specials ? specials[LENGTH] : 0; i < iMax; i++) {
				// Get special
				special = specials[i];

				// Create $handler
				$handler = $handlers[i] = {};

				// Set $handler properties
				$handler[TYPE] = type = special[TYPE];
				$handler[FEATURES] = features = special[FEATURES];
				$handler[VALUE] = value = special[VALUE];
				$handler[PROXY] = proxy = eventProxy(me, value);

				// Attach proxy
				$element.on(type, features, me, proxy);

				// Copy GUID from proxy to value (so you can use .off to remove it)
				value[GUID] = proxy[GUID];
			}
		},

		"sig/finalize" : function onFinalize() {
			var me = this;
			var $element = me[$ELEMENT];
			var $handler;
			var $handlers = me[$HANDLERS];
			var i;
			var iMax;

			// Iterate $handlers
			for (i = 0, iMax = $handlers[LENGTH]; i < iMax; i++) {
				// Get $handler
				$handler = $handlers[i];

				// Leave the "destroy" event as the last handler, for jQuery to remove when removing the element.
				if ($handler[TYPE] === "destroy")
					continue;

				// Detach event handler
				$element.off($handler[TYPE], $handler[FEATURES], $handler[PROXY]);
			}
		},

		"sig/task" : function onTask(task) {
			this[$ELEMENT].trigger("task", [ task ]);
		},

		/**
		 * Weaves all children of $element
		 * @returns {Promise} from weave
		 */
		"weave" : function () {
			return weave.apply(this[$ELEMENT].find(SELECTOR_WEAVE), arguments);
		},

		/**
		 * Unweaves all woven children widgets including the widget itself.
		 * @returns {Promise} Promise of completeness of unweaving all widgets.
		 */
		"unweave" : function () {
			var woven = this[$ELEMENT].find(SELECTOR_WOVEN);

			// Unweave myself only if I am woven.
			if(this[$WEFT]) {
				woven = woven.addBack();
			}

			return unweave.apply(woven, arguments);
		},

		/**
		 * Destroy DOM handler
		 */
		"dom/destroy" : function () {
			this.unweave();
		},

		/**
		 * Renders content and inserts it before $element
		 * @method
		 */
		"before" : renderProxy($.fn.before),

		/**
		 * Renders content and inserts it after $element
		 * @method
		 */
		"after" : renderProxy($.fn.after),

		/**
		 * Renders content and replaces $element contents
		 * @method
		 */
		"html" : renderProxy($.fn.html),

		/**
		 * Renders content and replaces $element contents
		 * @method
		 */
		"text" : renderProxy($.fn.text),

		/**
		 * Renders content and appends it to $element
		 * @method
		 */
		"append" : renderProxy($.fn.append),

		/**
		 * Renders content and prepends it to $element
		 * @method
		 */
		"prepend" : renderProxy($.fn.prepend)
	});
});
