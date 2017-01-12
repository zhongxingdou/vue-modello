(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.VueModello = factory());
}(this, function () { 'use strict';

  var writerState = {
    isVModelDirWriting: false,
    isMutationWriting: false
  };

  function makeActionContext(mutations, state, dispatch) {
    return {
      state: state,
      dispatch: dispatch,
      commit: function commit(mutationName) {
        if (mutations.hasOwnProperty(mutationName)) {
          var args = Array.from(arguments);
          args.shift(); // mutation name
          args.unshift(state);

          var result = null;
          try {
            writerState.isMutationWriting = true;
            result = mutations[mutationName].apply(null, args);
          } finally {
            writerState.isMutationWriting = false;
          }

          return result;
        }
      }
    };
  }

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
  };

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  function regDefaultDesc(modelDesc, type) {
    var desc = modelDesc[type];
    var modelName = modelDesc.modelName;
    var defaults = desc[modelName] || (desc[modelName] = {});
    for (var name in desc) {
      if (typeof desc[name] === 'function') {
        defaults[name] = desc[name];
        delete desc[name];
      }
    }
  }

  var Model = function Model(modelDesc) {
    classCallCheck(this, Model);
    var properties = modelDesc.properties;
    var rules = modelDesc.rules;
    var mixins = modelDesc.mixins;

    var binding = modelDesc.binding;
    var bindingMap = binding ? binding.propMap : {};

    if (modelDesc.state) {
      (function () {
        var _state = modelDesc.state;
        modelDesc.state = function () {
          var state = {};
          state[modelDesc.modelName] = _state();
          return state;
        };
      })();
    }

    if (modelDesc.actions) {
      regDefaultDesc(modelDesc, 'actions');
    }
    if (modelDesc.mutations) {
      regDefaultDesc(modelDesc, 'mutations');
    }

    if (!modelDesc.state) modelDesc.state = function () {
      return {};
    };
    if (!modelDesc.actions) modelDesc.actions = {};
    if (!modelDesc.mutations) modelDesc.mutations = {};

    // collect defaults and labels
    var defaultState = {};
    var labels = {};

    var mixinState = {};
    if (mixins) {
      for (var regState in mixins) {
        var module = mixins[regState];
        mixinState[regState] = module.state;
        modelDesc.actions[regState] = module.actions;
        modelDesc.mutations[regState] = module.mutations;
      }
    }

    var actionStateMap = {};

    var _loop = function _loop(state) {
      Object.keys(modelDesc.actions[state]).forEach(function (name) {
        actionStateMap[name] = state;
      });
    };

    for (var state in modelDesc.actions) {
      _loop(state);
    }

    var oldState = modelDesc.state;
    modelDesc.state = function () {
      var result = oldState();
      for (var _regState in mixinState) {
        result[_regState] = mixinState[_regState]();
      }
      return result;
    };

    var getBindingModel = function getBindingModel() {
      return binding ? ModelMan.get(binding.modelName) : null;
    };

    for (var prop in properties) {
      var propDesc = properties[prop];

      labels[prop] = propDesc.label || '';

      var Type = propDesc.type;
      if (propDesc.hasOwnProperty('defaultValue')) {
        defaultState[prop] = propDesc.defaultValue;
      } else if (!bindingMap.hasOwnProperty(prop)) {
        if (Array.isArray(Type)) {
          defaultState[prop] = [];
        } else {
          var value = undefined;
          switch (Type) {
            case String:
              value = '';
              break;
            case Number:
              value = 0;
              break;
            case Boolean:
              value = true;
              break;
          }
          if (value !== undefined) {
            defaultState[prop] = value;
          }
        }
      }
    }

    // methods for rule
    this.getPropRule = function (prop) {
      var rule = rules ? rules[prop] : undefined;

      var mapProp = bindingMap[prop];
      if (mapProp) {
        var bindingModel = getBindingModel();
        if (bindingModel) {
          var bindingRule = bindingModel.getPropRule(mapProp);
          if (bindingRule) {
            return _extends({}, bindingRule, rule);
          }
        }
      }

      return rule;
    };

    this.getRules = function (props) {
      var _this = this;

      if (typeof props === 'string') props = [props];
      if (!Array.isArray(props)) props = Object.keys(properties);
      var rules = {};
      props.forEach(function (prop) {
        rules[prop] = _this.getPropRule(prop);
      });
      return rules;
    };

    // methods for label
    this.getPropLabel = function (prop) {
      var label = labels[prop];
      if (label) return label;

      var mapProp = bindingMap[prop];
      if (mapProp) {
        var bindingModel = getBindingModel();
        if (bindingModel) {
          return bindingModel.getPropLabel(mapProp);
        }
      }

      return '';
    };

    this.getLabels = function () {
      var _this2 = this;

      return Object.keys(properties).map(function (prop) {
        return _this2.getPropLabel(prop);
      });
    };

    // methods for defaults
    // priority: self defined > model binding > auto make
    this.getPropDefaults = function (prop) {
      var propDesc = properties[prop];
      if (propDesc.hasOwnProperty('defaultValue')) {
        return propDesc.defaultValue;
      }

      var mapProp = bindingMap[prop];
      if (mapProp) {
        var bindingModel = getBindingModel();
        if (bindingModel) {
          var defaults = bindingModel.getPropDefaults(mapProp);
          if (defaults !== undefined) return defaults;
        }
      }

      if (prop in defaultState) {
        return defaultState[prop];
      }

      return undefined;
    };

    this.defaults = function () {
      var _this3 = this;

      var defaults = {};
      Object.keys(properties).forEach(function (prop) {
        defaults[prop] = _this3.getPropDefaults(prop);
      });
      return defaults;
    };

    // add property member
    this.modelName = modelDesc.modelName;

    this.getStateActions = function (state) {
      return modelDesc.actions[state];
    };

    var beforeDispatchHanlers = [];
    this.beforeDispatch = function (handler) {
      beforeDispatchHanlers.push(handler);
    };

    function fireBeforeDispatch() {
      var args = arguments;
      beforeDispatchHanlers.forEach(function () {
        handler.apply(null, args);
      });
    }

    this.applyAction = function (state, action, args) {
      fireBeforeDispatch(state, action, args);
      var result = modelDesc.actions[state][action].apply(null, args);
      if (result && result.then) {
        return result;
      }
    };

    this.dispatch = function (action) {
      var stateKey = actionStateMap[action];
      var state = this.getState(stateKey);

      var context = makeActionContext(this.getStateMutations(stateKey), state[stateKey], this.dispatch.bind(this));

      var BIZ_PARAM_INDEX = 1;
      var args = Array.from(arguments).slice(BIZ_PARAM_INDEX);
      args.unshift(context);

      var result = this.applyAction(stateKey, action, args);
      if (result && result.then) {
        return result.then(function () {
          return state;
        });
      }
    };

    this.dispatchAll = function (fn) {
      var _this4 = this;

      var BIZ_PARAM_INDEX = 1;

      var callers = [];
      var subStates = new Set();

      function dispatch(action) {
        var stateKey = actionStateMap[action];
        var args = Array.from(arguments).slice(BIZ_PARAM_INDEX);

        callers.push({ stateKey: stateKey, action: action, args: args });
        subStates.add(stateKey);
      }

      fn(dispatch);

      var state = this.getState([].concat(toConsumableArray(subStates)));

      return Promise.all(callers.map(function (_ref) {
        var stateKey = _ref.stateKey;
        var action = _ref.action;
        var args = _ref.args;

        var context = makeActionContext(_this4.getStateMutations(stateKey), state[stateKey], _this4.dispatch.bind(_this4));
        args.unshift(context);

        return _this4.applyAction(stateKey, action, args);
      })).then(function () {
        return state;
      });
    };

    this.getStateMutations = function (state) {
      return modelDesc.mutations[state];
    };

    this.getState = function (states) {
      var allState = modelDesc.state();
      if (!states) {
        return allState;
      }

      var result = {};
      if (typeof states === 'string') {
        states = [states];
      }
      states.forEach(function (s) {
        return result[s] = allState[s];
      });
      return result;
    };
  };

  var modelStore = {};
  var ModelMan = {
    Model: Model,
    reg: function reg(model) {
      if (!(model instanceof Model)) {
        return this.reg(new Model(model));
      }

      modelStore[model.modelName] = model;
    },
    get: function get(modelName) {
      return modelStore[modelName];
    },
    unReg: function unReg(model) {
      if (model instanceof Model) {
        delete modelStore[model.modelName];
      } else if (typeof model === 'string') {
        delete modelStore[model];
      }
    },

    vueMixin: {
      init: function init() {
        var _this = this;

        var vm = this;
        var config = this.$options.modello;
        if (!config) return;

        var models = [].concat(config);

        var existsDefaultModel = false;
        models.forEach(function (modelOption) {
          var model = modelOption.model;
          var states = modelOption.states;

          if (typeof model === 'string') {
            model = modelStore[model];
          }

          if (!states) states = [model.modelName];

          // action ({dispatch: Fuction(mutation, ...args), state, service})
          // convert action as Vue method
          var methods = {};
          states.forEach(function (state) {
            var mutations = model.getStateMutations(state);

            var dispatch = function dispatch(action) {
              var context = makeActionContext(mutations, vm.$get(state), dispatch);

              var args = Array.from(arguments);
              args.unshift(context);

              vm.$emit('modello:' + model.modelName + '.' + action + ':before');
              var result = model.applyAction(state, action, args);
              if (result && result.then) {
                return result.then(function () {
                  vm.$emit('modello:' + model.modelName + '.' + action + ':after');
                });
              } else {
                vm.$emit('modello:' + model.modelName + '.' + action + ':after');
              }
            };

            var makeActionDispatcher = function makeActionDispatcher(action) {
              return function () {
                return dispatch(action);
              };
            };

            var actions = model.getStateActions(state);
            Object.keys(actions).forEach(function (action) {
              methods[action] = makeActionDispatcher(action);
            });
          });

          if ((modelOption.default || models.length === 1) && !existsDefaultModel) {
            existsDefaultModel = true;
            _this.$model = methods;
          } else {
            _this[model.modelName] = methods;
          }
        });
      },
      data: function data() {
        var config = this.$options.modello;
        if (!config) return;

        var models = [].concat(config);

        var result = {};
        models.forEach(function (option) {
          var model = option.model;
          if (typeof model === 'string') {
            model = modelStore[model];
          }
          Object.assign(result, model.getState(option.states));
        });

        return result;
      },
      created: function created() {
        var config = this.$options.modello;
        if (!config) return;

        var models = [].concat(config);

        var vm = this;

        models.forEach(function (option) {
          var states = option.states;
          if (!states) {
            var modelName = option.model;
            if ((typeof modelName === 'undefined' ? 'undefined' : _typeof(modelName)) === 'object') modelName = model.modelName;
            states = [modelName];
          }

          states.forEach(function (state) {
            var cb = function cb() {
              if (!writerState.isVModelDirWriting && !writerState.isMutationWriting) {
                console.warn('[vue-modello] update state directly is deprecated!');
              }
            };
            vm.$watch(state, cb, { deep: true });
          }); // states.forEach
        }); // models.forEach
      } // created

    }
  };

  return ModelMan;

}));