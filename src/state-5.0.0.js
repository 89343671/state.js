/**
 * @title state v5 finite state machine library
 * @author http://www.steelbreeze.net/state.cs
 * @copyright (c) 2014-5 Steelbreeze Limited
 * @license MIT and GPL v3 licences
 */
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
 * Default namespace for the state.js classes.
 * @module fsm
 */
var fsm;
(function (fsm) {
    /**
     * An abstract class used as the base for the Region and Vertex classes.
     * An element is any part of the tree structure that represents a composite state machine model.
     * @class Element
     */
    var Element = (function () {
        function Element(name) {
            this.name = name;
            this.leave = [];
            this.beginEnter = [];
            this.endEnter = [];
            this.enter = [];
        }
        Element.prototype.parent = function () {
            return;
        };
        Element.prototype.root = function () {
            return this.parent().root();
        };
        Element.prototype.ancestors = function () {
            return (this.parent() ? this.parent().ancestors() : []).concat(this);
        };
        Element.prototype.reset = function () {
            this.leave = [];
            this.beginEnter = [];
            this.endEnter = [];
            this.enter = [];
        };
        Element.prototype.bootstrap = function (deepHistoryAbove) {
            // Put these lines back for debugging
            //this.leave.push((message: any, context: IContext) => { console.log(context + " leave " + this); });
            //this.beginEnter.push((message: any, context: IContext) => { console.log(context + " enter " + this); });
            this.enter = this.beginEnter.concat(this.endEnter);
        };
        Element.prototype.bootstrapEnter = function (add, next) {
            add(this.beginEnter);
        };
        /**
         * Returns a the element name as a fully qualified namespace.
         * @method toString
         * @returns {string}
         */
        Element.prototype.toString = function () {
            return this.ancestors().map(function (e) {
                return e.name;
            }).join(Element.namespaceSeperator); // NOTE: while this may look costly, only used at runtime rarely if ever
        };
        /**
         * The symbol used to separate element names within a fully qualified name.
         * Change this static member to create different styles of qualified name generated by the toString method.
         * @member {string}
         */
        Element.namespaceSeperator = ".";
        return Element;
    })();
    fsm.Element = Element;
    /**
     * An element within a state machine model that is a container of Vertices.
     *
     * Regions are implicitly inserted into composite state machines as a containner for vertices.
     * They only need to be explicitly defined if orthogonal states are required.
     *
     * Region extends the Element class and inherits its public interface.
     * @class Region
     * @augments Element
     */
    var Region = (function (_super) {
        __extends(Region, _super);
        /**
         * Creates a new instance of the Region class.
         * @param {string} name The name of the region.
         * @param {State} state The parent state that this region will be a child of.
         */
        function Region(name, state) {
            _super.call(this, name);
            this.state = state;
            this.vertices = [];
            state.regions.push(this);
            state.root().clean = false;
        }
        Region.prototype.parent = function () {
            return this.state;
        };
        /**
         * Tests a region to determine if it is deemed to be complete.
         * A region is complete if its current state is final (a state having on outbound transitions).
         * @method isComplete
         * @param {IContext} context The object representing a particular state machine instance.
         * @returns {boolean} True if the region is deemed to be complete.
         */
        Region.prototype.isComplete = function (context) {
            return context.getCurrent(this).isFinal();
        };
        Region.prototype.bootstrap = function (deepHistoryAbove) {
            var _this = this;
            for (var i = 0, l = this.vertices.length; i < l; i++) {
                this.vertices[i].reset();
                this.vertices[i].bootstrap(deepHistoryAbove || (this.initial && this.initial.kind === 4 /* DeepHistory */));
            }
            this.leave.push(function (message, context, history) {
                var current = context.getCurrent(_this);
                if (current.leave) {
                    invoke(current.leave, message, context, history);
                }
            });
            if (deepHistoryAbove || !this.initial || this.initial.isHistory()) {
                this.endEnter.push(function (message, context, history) {
                    var ini = _this.initial;
                    if (history || _this.initial.isHistory()) {
                        ini = context.getCurrent(_this) || _this.initial;
                    }
                    invoke(ini.enter, message, context, history || (_this.initial.kind === 4 /* DeepHistory */));
                });
            }
            else {
                this.endEnter = this.endEnter.concat(this.initial.enter);
            }
            _super.prototype.bootstrap.call(this, deepHistoryAbove);
        };
        Region.prototype.bootstrapTransitions = function () {
            for (var i = 0, l = this.vertices.length; i < l; i++) {
                this.vertices[i].bootstrapTransitions();
            }
        };
        Region.prototype.evaluate = function (message, context) {
            return context.getCurrent(this).evaluate(message, context);
        };
        /**
         * The name given to regions that are are created automatically when a state is passed as a vertex's parent.
         * Regions are automatically inserted into state machine models as the composite structure is built; they are named using this static member.
         * Update this static member to use a different name for default regions.
         * @member {string}
         */
        Region.defaultName = "default";
        return Region;
    })(Element);
    fsm.Region = Region;
    /**
     * An abstract element within a state machine model that can be the source or target of a transition (states and pseudo states).
     *
     * Vertex extends the Element class and inherits its public interface.
     * @class Vertex
     * @augments Element
     */
    var Vertex = (function (_super) {
        __extends(Vertex, _super);
        function Vertex(name, element, selector) {
            _super.call(this, name);
            this.transitions = [];
            this.selector = selector;
            if (element instanceof Region) {
                this.region = element;
            }
            else if (element instanceof State) {
                this.region = element.defaultRegion();
            }
            if (this.region) {
                this.region.vertices.push(this);
                this.region.root().clean = false;
            }
        }
        Vertex.prototype.parent = function () {
            return this.region;
        };
        /**
         * Tests the vertex to determine if it is deemed to be complete.
         * Pseudo states and simple states are always deemed to be complete.
         * Composite states are deemed to be complete when all its child regions all are complete.
         * @method isComplete
         * @param {IContext} context The object representing a particular state machine instance.
         * @returns {boolean} True if the vertex is deemed to be complete.
         */
        Vertex.prototype.isComplete = function (context) {
            return true;
        };
        /**
         * Creates a new transition from this vertex.
         * Newly created transitions are completion transitions; they will be evaluated after a vertex has been entered if it is deemed to be complete.
         * Transitions can be converted to be event triggered by adding a guard condition via the transitions `where` method.
         * @method to
         * @param {Vertex} target The destination of the transition; omit for internal transitions.
         * @returns {Transition} The new transition object.
         */
        Vertex.prototype.to = function (target) {
            var transition = new Transition(this, target);
            this.transitions.push(transition);
            this.root().clean = false;
            return transition;
        };
        Vertex.prototype.bootstrap = function (deepHistoryAbove) {
            var _this = this;
            _super.prototype.bootstrap.call(this, deepHistoryAbove);
            this.endEnter.push(function (message, context, history) {
                _this.evaluateCompletions(message, context, history);
            });
            this.enter = this.beginEnter.concat(this.endEnter);
        };
        Vertex.prototype.bootstrapTransitions = function () {
            for (var i = 0, l = this.transitions.length; i < l; i++) {
                this.transitions[i].bootstrap();
            }
        };
        Vertex.prototype.evaluateCompletions = function (message, context, history) {
            if (this.isComplete(context)) {
                this.evaluate(this, context);
            }
        };
        Vertex.prototype.evaluate = function (message, context) {
            var transition = this.selector(this.transitions, message, context);
            if (!transition) {
                return false;
            }
            invoke(transition.traverse, message, context, false);
            return true;
        };
        return Vertex;
    })(Element);
    fsm.Vertex = Vertex;
    /**
     * An enumeration of static constants that dictates the precise behaviour of pseudo states.
     *
     * Use these constants as the `kind` parameter when creating new `PseudoState` instances.
     * @class PseudoStateKind
     */
    (function (PseudoStateKind) {
        PseudoStateKind[PseudoStateKind["Choice"] = 0] = "Choice";
        /**
         * Used for pseudo states that are always the staring point when entering their parent region.
         * @member {number} Initial
         */
        PseudoStateKind[PseudoStateKind["Initial"] = 1] = "Initial";
        PseudoStateKind[PseudoStateKind["Junction"] = 2] = "Junction";
        /**
         * Used for pseudo states that are the the starting point when entering their parent region for the first time; subsequent entries will start at the last known state.
         * @member {number} ShallowHistory
         */
        PseudoStateKind[PseudoStateKind["ShallowHistory"] = 3] = "ShallowHistory";
        /**
         * As per `ShallowHistory` but the history semantic cascades through all child regions irrespective of their initial pseudo state kind.
         * @member {number} DeepHistory
         */
        PseudoStateKind[PseudoStateKind["DeepHistory"] = 4] = "DeepHistory";
        PseudoStateKind[PseudoStateKind["Terminate"] = 5] = "Terminate";
    })(fsm.PseudoStateKind || (fsm.PseudoStateKind = {}));
    var PseudoStateKind = fsm.PseudoStateKind;
    /**
     * An element within a state machine model that represents an transitory Vertex within the state machine model.
     *
     * Pseudo states are required in all state machine models; at the very least, an `Initial` pseudo state is the default stating state when the parent region is entered.
     * Other types of pseudo state are available; typically for defining history semantics or to facilitate more complex transitions.
     * A `Terminate` pseudo state kind is also available to immediately terminate processing within the entire state machine instance.
     *
     * PseudoState extends the Vertex class and inherits its public interface.
     * @class PseudoState
     * @augments Vertex
     */
    var PseudoState = (function (_super) {
        __extends(PseudoState, _super);
        /**
         * Creates a new instance of the PseudoState class.
         * @param {string} name The name of the pseudo state.
         * @param {Element} state The parent element that this pseudo state will be a child of.
         * @param {PseudoStateKind} kind Determines the behaviour of the PseudoState.
         */
        function PseudoState(name, element, kind) {
            _super.call(this, name, element, pseudoState(kind));
            this.kind = kind;
            if (this.isInitial()) {
                this.region.initial = this;
            }
        }
        PseudoState.prototype.isHistory = function () {
            return this.kind === 4 /* DeepHistory */ || this.kind === 3 /* ShallowHistory */;
        };
        PseudoState.prototype.isInitial = function () {
            return this.kind === 1 /* Initial */ || this.isHistory();
        };
        PseudoState.prototype.bootstrap = function (deepHistoryAbove) {
            _super.prototype.bootstrap.call(this, deepHistoryAbove);
            if (this.kind === 5 /* Terminate */) {
                this.enter.push(function (message, context, history) {
                    context.isTerminated = true;
                });
            }
        };
        return PseudoState;
    })(Vertex);
    fsm.PseudoState = PseudoState;
    /**
     * An element within a state machine model that represents an invariant condition within the life of the state machine instance.
     *
     * States are one of the fundamental building blocks of the state machine model.
     * Behaviour can be defined for both state entry and state exit.
     *
     * State extends the Vertex class and inherits its public interface.
     * @class State
     * @augments Vertex
     */
    var State = (function (_super) {
        __extends(State, _super);
        /**
         * Creates a new instance of the State class.
         * @param {string} name The name of the state.
         * @param {Element} element The parent state that owns the state.
         */
        function State(name, element) {
            _super.call(this, name, element, State.selector);
            this.regions = [];
            this.exitBehavior = [];
            this.entryBehavior = [];
        }
        State.selector = function (transitions, message, context) {
            var result;
            for (var i = 0, l = transitions.length; i < l; i++) {
                if (transitions[i].guard(message, context)) {
                    if (result) {
                        throw "Multiple outbound transitions evaluated true";
                    }
                    result = transitions[i];
                }
            }
            return result;
        };
        State.prototype.defaultRegion = function () {
            var region;
            for (var i = 0, l = this.regions.length; i < l; i++) {
                if (this.regions[i].name === Region.defaultName) {
                    region = this.regions[i];
                }
            }
            if (!region) {
                region = new Region(Region.defaultName, this);
            }
            return region;
        };
        /**
         * Tests the state to see if it is a final state;
         * a final state is one that has no outbound transitions.
         * @method isFinal
         * @returns {boolean} True if the state is a final state.
         */
        State.prototype.isFinal = function () {
            return this.transitions.length === 0;
        };
        /**
         * Tests the state to see if it is a simple state;
         * a simple state is one that has no child regions.
         * @method isSimple
         * @returns {boolean} True if the state is a simple state.
         */
        State.prototype.isSimple = function () {
            return this.regions.length === 0;
        };
        /**
         * Tests the state to see if it is a composite state;
         * a composite state is one that has one or more child regions.
         * @method isComposite
         * @returns {boolean} True if the state is a composite state.
         */
        State.prototype.isComposite = function () {
            return this.regions.length > 0;
        };
        /**
         * Tests the state to see if it is an orthogonal state;
         * an orthogonal state is one that has two or more child regions.
         * @method isOrthogonal
         * @returns {boolean} True if the state is an orthogonal state.
         */
        State.prototype.isOrthogonal = function () {
            return this.regions.length > 1;
        };
        /**
         * Adds behaviour to a state that is executed each time the state is exited.
         * @method exit
         * @param {Action} exitAction The action to add to the state's exit behaviour.
         * @returns {State} Returns the state to allow a fluent style API.
         */
        State.prototype.exit = function (exitAction) {
            this.exitBehavior.push(exitAction);
            this.root().clean = false;
            return this;
        };
        /**
         * Adds behaviour to a state that is executed each time the state is entered.
         * @method entry
         * @param {Action} entryAction The action to add to the state's entry behaviour.
         * @returns {State} Returns the state to allow a fluent style API.
         */
        State.prototype.entry = function (entryAction) {
            this.entryBehavior.push(entryAction);
            this.root().clean = false;
            return this;
        };
        State.prototype.bootstrap = function (deepHistoryAbove) {
            var _this = this;
            for (var i = 0, l = this.regions.length; i < l; i++) {
                var region = this.regions[i]; // regadless of TypeScript, still need this in this instance
                region.reset();
                region.bootstrap(deepHistoryAbove);
                this.leave.push(function (message, context, history) {
                    invoke(region.leave, message, context, history);
                });
                this.endEnter = this.endEnter.concat(region.enter);
            }
            _super.prototype.bootstrap.call(this, deepHistoryAbove);
            this.leave = this.leave.concat(this.exitBehavior);
            this.beginEnter = this.beginEnter.concat(this.entryBehavior);
            this.beginEnter.push(function (message, context, history) {
                if (_this.region) {
                    context.setCurrent(_this.region, _this);
                }
            });
            this.enter = this.beginEnter.concat(this.endEnter);
        };
        State.prototype.bootstrapTransitions = function () {
            for (var i = 0, l = this.regions.length; i < l; i++) {
                this.regions[i].bootstrapTransitions();
            }
            _super.prototype.bootstrapTransitions.call(this);
        };
        State.prototype.bootstrapEnter = function (add, next) {
            _super.prototype.bootstrapEnter.call(this, add, next);
            for (var i = 0, l = this.regions.length; i < l; i++) {
                if (this.regions[i] !== next) {
                    add(this.regions[i].enter);
                }
            }
        };
        State.prototype.evaluate = function (message, context) {
            var processed = false;
            for (var i = 0, l = this.regions.length; i < l; i++) {
                if (this.regions[i].evaluate(message, context)) {
                    processed = true;
                }
            }
            if (processed === false) {
                processed = _super.prototype.evaluate.call(this, message, context);
            }
            if (processed === true && message !== this) {
                this.evaluateCompletions(this, context, false);
            }
            return processed;
        };
        return State;
    })(Vertex);
    fsm.State = State;
    /**
     * An element within a state machine model that represents completion of the life of the containing Region within the state machine instance.
     *
     * A final state cannot have outbound transitions.
     *
     * FinalState extends the State class and inherits its public interface.
     * @class FinalState
     * @augments State
     */
    var FinalState = (function (_super) {
        __extends(FinalState, _super);
        /**
         * Creates a new instance of the FinalState class.
         * @param {string} name The name of the final state.
         * @param {Element} element The parent element that owns the final state.
         */
        function FinalState(name, element) {
            _super.call(this, name, element);
        }
        FinalState.prototype.to = function (target) {
            throw "A FinalState cannot be the source of a transition.";
        };
        return FinalState;
    })(State);
    fsm.FinalState = FinalState;
    /**
     * An element within a state machine model that represents the root of the state machine model.
     *
     * StateMachine extends the State class and inherits its public interface.
     * @class StateMachine
     * @augments State
     */
    var StateMachine = (function (_super) {
        __extends(StateMachine, _super);
        /**
         * Creates a new instance of the StateMachine class.
         * @param {string} name The name of the state machine.
         */
        function StateMachine(name) {
            _super.call(this, name, undefined);
            this.clean = true;
        }
        StateMachine.prototype.root = function () {
            return this;
        };
        /**
         * Bootstraps the state machine model; precompiles the actions to take during transition traversal.
         *
         * Bootstrapping a state machine model pre-calculates all the actions required for each transition within the state machine model.
         * The actions will exit all states as appropriate, perform transition behaviour, enter all states as appropriate and update the current state.
         *
         * This is only required if you are dynamically changing the state machine model and want to manually control when the model is bootstrapped.
         * @method bootstrap
         */
        StateMachine.prototype.bootstrap = function (deepHistoryAbove) {
            _super.prototype.reset.call(this);
            this.clean = true;
            _super.prototype.bootstrap.call(this, deepHistoryAbove);
            _super.prototype.bootstrapTransitions.call(this);
        };
        /**
         * Initialises an instance of the state machine and enters its initial pseudo state.
         * Entering the initial pseudo state may cause a chain of other completion transitions.
         * @method initialise
         * @param {IContext} context The object representing a particular state machine instance.
         * @param {boolean} autoBootstrap Set to false to manually control when bootstrapping occurs.
         */
        StateMachine.prototype.initialise = function (context, autoBootstrap) {
            if (autoBootstrap === void 0) { autoBootstrap = true; }
            if (autoBootstrap && this.clean === false) {
                this.bootstrap(false);
            }
            invoke(this.enter, undefined, context, false);
        };
        /**
         * Passes a message to a state machine instance for evaluation.
         *
         * The message will cause the guard conditions of outbound transitions from the current state to be evaluated; if a single guard evaluates true, it will trigger transition traversal.
         * Transition traversal may cause a chain of transitions to be traversed.
         * @method evaluate
         * @param {any} message A message to pass to a state machine instance for evaluation that may cause a state transition.
         * @param {IContext} context The object representing a particular state machine instance.
         * @param {boolean} autoBootstrap Set to false to manually control when bootstrapping occurs.
         * @returns {boolean} True if the method caused a state transition.
         */
        StateMachine.prototype.evaluate = function (message, context, autoBootstrap) {
            if (autoBootstrap === void 0) { autoBootstrap = true; }
            if (autoBootstrap && this.clean === false) {
                this.bootstrap(false);
            }
            if (context.isTerminated) {
                return false;
            }
            return _super.prototype.evaluate.call(this, message, context);
        };
        return StateMachine;
    })(State);
    fsm.StateMachine = StateMachine;
    /**
     * A transition between vertices (states or pseudo states) that may be traversed in response to a message.
     *
     * Transitions come in a variety of types:
     * internal transitions respond to messages but do not cause a state transition, they only have behaviour;
     * local transitions are contained within a single region therefore the source vertex is exited, the transition traversed, and the target state entered;
     * external transitions are more complex in nature as they cross region boundaries, all elements up to but not not including the common ancestor are exited and entered.
     *
     * Entering a composite state will cause the entry of the child regions within the composite state; this in turn may trigger more transitions.
     * @class Transition
     */
    var Transition = (function () {
        /**
         * Creates a new instance of the Transition class.
         * @param {Vertex} source The source of the transition.
         * @param {Vertex} source The target of the transition.
         */
        function Transition(source, target) {
            this.source = source;
            this.target = target;
            this.transitionBehavior = [];
            this.traverse = [];
            this.completion(); // default the transition to a completion transition
        }
        /**
         * Turns a transition into a completion transition.
         * @method completion
         * @returns {Transition} Returns the transition object to enable the fluent API.
         */
        Transition.prototype.completion = function () {
            var _this = this;
            this.guard = function (message, context) {
                return message === _this.source;
            };
            return this;
        };
        /**
         * Turns a transition into an else transition.
         *
         * Else transitions can be used at `Junction` or `Choice` pseudo states if no other transition guards evaluate true, an Else transition if present will be traversed.
         * @method else
         * @returns {Transition} Returns the transition object to enable the fluent API.
         */
        Transition.prototype.else = function () {
            this.guard = Transition.isElse;
            return this;
        };
        /**
         * Defines the guard condition for the transition.
         * @method when
         * @param {Guard} guard The guard condition that must evaluate true for the transition to be traversed.
         * @returns {Transition} Returns the transition object to enable the fluent API.
         */
        Transition.prototype.when = function (guard) {
            this.guard = guard;
            return this;
        };
        /**
         * Add behaviour to a transition.
         * @method effect
         * @param {Action} transitionAction The action to add to the transitions traversal behaviour.
         * @returns {Transition} Returns the transition object to enable the fluent API.
         */
        Transition.prototype.effect = function (transitionAction) {
            this.transitionBehavior.push(transitionAction);
            this.source.root().clean = false;
            return this;
        };
        Transition.prototype.bootstrap = function () {
            var _this = this;
            // internal transitions: just perform the actions; no exiting or entering states
            if (this.target === null) {
                this.traverse = this.transitionBehavior;
            }
            else if (this.target.parent() === this.source.parent()) {
                this.traverse = this.source.leave.concat(this.transitionBehavior).concat(this.target.enter);
            }
            else {
                var sourceAncestors = this.source.ancestors();
                var targetAncestors = this.target.ancestors();
                var sourceAncestorsLength = sourceAncestors.length;
                var targetAncestorsLength = targetAncestors.length;
                var i = 0, l = Math.min(sourceAncestorsLength, targetAncestorsLength);
                while ((i < l) && (sourceAncestors[i] === targetAncestors[i])) {
                    i++;
                }
                // validate transition does not cross sibling regions boundaries
                assert(!(sourceAncestors[i] instanceof Region), "Transitions may not cross sibling orthogonal region boundaries");
                // leave the first uncommon ancestor
                this.traverse = (i < sourceAncestorsLength ? sourceAncestors[i] : this.source).leave.slice(0);
                // perform the transition action
                this.traverse = this.traverse.concat(this.transitionBehavior);
                if (i >= targetAncestorsLength) {
                    this.traverse = this.traverse.concat(this.target.beginEnter);
                }
                while (i < targetAncestorsLength) {
                    targetAncestors[i++].bootstrapEnter(function (additional) {
                        _this.traverse = _this.traverse.concat(additional);
                    }, targetAncestors[i]);
                }
                // trigger cascade
                this.traverse = this.traverse.concat(this.target.endEnter);
            }
        };
        Transition.isElse = function (message, context) {
            return false;
        };
        return Transition;
    })();
    fsm.Transition = Transition;
    function pseudoState(kind) {
        switch (kind) {
            case 1 /* Initial */:
            case 4 /* DeepHistory */:
            case 3 /* ShallowHistory */:
                return initial;
            case 2 /* Junction */:
                return junction;
            case 0 /* Choice */:
                return choice;
            case 5 /* Terminate */:
                return terminate;
        }
    }
    function initial(transitions, message, context) {
        if (transitions.length === 1) {
            return transitions[0];
        }
        else {
            throw "Initial transition must have a single outbound transition";
        }
    }
    function junction(transitions, message, context) {
        var result, i, l = transitions.length;
        for (i = 0; i < l; i++) {
            if (transitions[i].guard(message, context) === true) {
                if (result) {
                    throw "Multiple outbound transitions evaluated true";
                }
                result = transitions[i];
            }
        }
        if (!result) {
            for (i = 0; i < l; i++) {
                if (transitions[i].guard === Transition.isElse) {
                    if (result) {
                        throw "Multiple outbound transitions evaluated true";
                    }
                    result = transitions[i];
                }
            }
        }
        return result;
    }
    function choice(transitions, message, context) {
        var results = [], result, i, l = transitions.length;
        for (i = 0; i < l; i++) {
            if (transitions[i].guard(message, context) === true) {
                results.push(transitions[i]);
            }
        }
        if (results.length !== 0) {
            result = results[Math.round((results.length - 1) * Math.random())];
        }
        if (!result) {
            for (i = 0; i < l; i++) {
                if (transitions[i].guard === Transition.isElse) {
                    if (result) {
                        throw "Multiple outbound transitions evaluated true";
                    }
                    result = transitions[i];
                }
            }
        }
        return result;
    }
    function terminate(transitions, message, context) {
        return;
    }
    function invoke(behavior, message, context, history) {
        for (var i = 0, l = behavior.length; i < l; i++) {
            behavior[i](message, context, history);
        }
    }
    function assert(condition, error) {
        if (!condition) {
            throw error;
        }
    }
    /**
     * Default working implementation of a state machine context class.
     *
     * Implements the `IContext` interface.
     * It is possible to create other custom context classes to manage state machine state in any way (e.g. as serialisable JSON); just implement the same members and methods as this class.
     * @class Context
     * @implements IContext
     */
    var Context = (function () {
        function Context() {
            this.isTerminated = false;
            this.last = {};
        }
        /**
         * Updates the last known state for a given region.
         * @method setCurrent
         * @param {Region} region The region to update the last known state for.
         * @param {State} state The last known state for the given region.
         */
        Context.prototype.setCurrent = function (region, state) {
            this.last[region.toString()] = state;
        };
        /**
         * Returns the last known state for a given region.
         * @method getCurrent
         * @param {Region} region The region to update the last known state for.
         * @returns {State} The last known state for the given region.
         */
        Context.prototype.getCurrent = function (region) {
            return this.last[region.toString()];
        };
        return Context;
    })();
    fsm.Context = Context;
})(fsm || (fsm = {}));
