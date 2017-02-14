/* global describe, it */
var assert = require("assert"),
	state = require("../lib/node/state");

var oldLogger = state.logger;
state.setLogger(console);

var model = new state.StateMachine("model");
var initial = new state.PseudoState("initial", model, state.PseudoStateKind.Initial);
var junction1 = new state.PseudoState("junction1", model, state.PseudoStateKind.Junction);
var junction2 = new state.PseudoState("junction2", model, state.PseudoStateKind.Junction);

var pass = new state.State("success", model);
var fail = new state.State("error", model);

initial.to(junction1);

junction1.to(junction2).when(function (message, instance) { return instance.counter === 0; }).effect(function (message, instance) { return instance.counter++; });
junction1.to(fail).else();
junction2.to(pass).when(function (message, instance) { return instance.counter === 0; }).effect(function (message, instance) { return instance.counter++; });
junction2.to(fail).else();

var instance = new state.DictionaryInstance();
instance.counter = 0;

describe("test/static.js", function () {
	it("Junction transitions implement a static conditional branch", function () {
		model.initialise(instance);

		assert.equal(pass, instance.getCurrent(model.getDefaultRegion()));
	});

	it("Junction transitions call all transition behavior after guards have been tested", function () {

		assert.equal(2, instance.counter);
	});
});

state.setLogger(oldLogger);