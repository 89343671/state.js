/* global describe, it */
var assert = require("assert"),
	tree = require("../lib/node/tree");

var root = { name: "root" };
var left = { name: "left", parent: root };
var right = { name: "right", parent: root };
var rightLeft = { name: "rightLeft", parent: right };
var rightRight = { name: "rightRight", parent: right };
var other = { name: "other" };

describe("test/tree.js", function () {
	it("ancestors count", function () {
		assert.equal(1, tree.ancestors(root).length);
		assert.equal(2, tree.ancestors(left).length);
		assert.equal(2, tree.ancestors(right).length);
		assert.equal(3, tree.ancestors(rightLeft).length);
		assert.equal(3, tree.ancestors(rightRight).length);
		assert.equal(1, tree.ancestors(other).length);
	});

	it("Common ancestor", function () {
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(root), tree.ancestors(root)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(root), tree.ancestors(left)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(root), tree.ancestors(right)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(root), tree.ancestors(rightLeft)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(root), tree.ancestors(rightRight)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(root), tree.ancestors(other)));

		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(left), tree.ancestors(root)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(left), tree.ancestors(left)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(left), tree.ancestors(right)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(left), tree.ancestors(rightLeft)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(left), tree.ancestors(rightRight)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(left), tree.ancestors(other)));

		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(right), tree.ancestors(root)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(right), tree.ancestors(left)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(right), tree.ancestors(right)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(right), tree.ancestors(rightLeft)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(right), tree.ancestors(rightRight)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(right), tree.ancestors(other)));

		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(rightLeft), tree.ancestors(root)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(rightLeft), tree.ancestors(left)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(rightLeft), tree.ancestors(right)));
		assert.equal(2, tree.lowestCommonAncestorIndex(tree.ancestors(rightLeft), tree.ancestors(rightLeft)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(rightLeft), tree.ancestors(rightRight)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(rightLeft), tree.ancestors(other)));

		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(rightRight), tree.ancestors(root)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(rightRight), tree.ancestors(left)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(rightRight), tree.ancestors(right)));
		assert.equal(1, tree.lowestCommonAncestorIndex(tree.ancestors(rightRight), tree.ancestors(rightLeft)));
		assert.equal(2, tree.lowestCommonAncestorIndex(tree.ancestors(rightRight), tree.ancestors(rightRight)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(rightRight), tree.ancestors(other)));

		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(other), tree.ancestors(root)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(other), tree.ancestors(left)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(other), tree.ancestors(right)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(other), tree.ancestors(rightLeft)));
		assert.equal(-1, tree.lowestCommonAncestorIndex(tree.ancestors(other), tree.ancestors(rightRight)));
		assert.equal(0, tree.lowestCommonAncestorIndex(tree.ancestors(other), tree.ancestors(other)));
	});

	it("isChild", function () {
		assert.equal(false, tree.isChild(root, root));
		assert.equal(true, tree.isChild(left, root));
		assert.equal(true, tree.isChild(rightLeft, root));
		assert.equal(true, tree.isChild(rightRight, root));
		assert.equal(false, tree.isChild(other, root));

		assert.equal(false, tree.isChild(rightLeft, left));
		assert.equal(true, tree.isChild(rightLeft, right));
	});
});

