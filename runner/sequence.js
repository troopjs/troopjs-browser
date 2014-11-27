/**
 * @license MIT http://troopjs.mit-license.org/
 */
define([
	"mu-selector-set",
	"jquery",
	"poly/array"
], function (SelectorSet, $) {
	"use strict";

	/**
	 * @class dom.runner.sequence
	 * @implement core.event.emitter.runner
	 * @private
	 * @static
	 * @alias feature.runner
	 */

	var UNDEFINED;
	var FALSE = false;
	var LEFT_BUTTON = 0;

	function map (match) {
		return match[1];
	}

	// Use `$.find.matchesSelector` for wider browser support
	SelectorSet.prototype.matchesSelector = $.find.matchesSelector;

	/**
	 * @method constructor
	 * @inheritdoc
	 * @localdoc Runner that executes DOM candidates in sequence without overlap
	 * @return {*} Result from last handler
	 */
	return function sequence(event, handlers, args) {

		var result = UNDEFINED;
		var direct = handlers.direct;
		var delegated = handlers.delegated;
		var reduce = function (result, handler) {
			// If immediate propagation is stopped we should just return last result
			if ($event.isImmediatePropagationStopped()) {
				return result;
			}

			// If the previous handler return false we should stopPropagation and preventDefault
			if (result === FALSE) {
				$event.stopPropagation();
				$event.preventDefault();
			}

			return handler.apply(handler.context, args);
		};

		var $event = args[0];
		var $delegate = $event.delegateTarget;
		var $target = $event.target;
		var $document = $target.ownerDocument;
		var $notClick = $event.type !== "click";

		// Bubble the event up the dom if
		// ... this is not a black-holed element (jQuery #13180)
		// ... and this is the left button or it's a not a click event (jQuery #3861)
		var $bubble = $target.nodeType !== UNDEFINED && ($event.button === LEFT_BUTTON || $notClick);

		// Loop ...
		do {
			// Don't process clicks on disabled elements (jQuery #6911, #8165, #11382, #11764)
			if ($target.disabled !== true || $notClick) {
				// Run delegated handlers which match this element
				result = delegated
					.matches($event.currentTarget = $target)
					.map(map)
					.reduce(reduce, result);
			}

			// Bubble if ...
			$bubble = $bubble
				// ... we were not told to stop propagation
				&& !$event.isPropagationStopped()
				// ... we are not at the delegate element
				&& $target !== $delegate
				// ... we have a parent node
				&& ($target = $target.parentNode) !== null
				// ... the new target is not the document
				&& $target !== $document;
		}
		// ... while we are still bubbling
		while ($bubble);

		// Run all the direct (non-delegated) handlers of the root element
		if (result !== FALSE) {
			result = direct.reduce(reduce, result);
		}

		return result;
	}
});