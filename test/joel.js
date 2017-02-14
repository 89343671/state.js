var state = require('../lib/node/state.js');

var oldLogger = state.logger;
state.setLogger(console);


var model = new state.StateMachine('model');
var initial = new state.PseudoState('initial', model, state.PseudoStateKind.Initial);
var a = new state.State('a', model);
var b = new state.State('b', model);
var aa = new state.State('aa', a);
var aChoice = new state.PseudoState('aChoice', a, state.PseudoStateKind.Choice);

initial.to(aa);
aa.to(aChoice);
aChoice.to(b);

var instance = new state.DictionaryInstance('instance');

model.initialise(instance);

state.setLogger(oldLogger);