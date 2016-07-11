(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.VueModello = factory());
}(this, function () { 'use strict';

  var jsx = function () {
    var REACT_ELEMENT_TYPE = typeof Symbol === "function" && Symbol.for && Symbol.for("react.element") || 0xeac7;
    return function createRawReactElement(type, props, key, children) {
      var defaultProps = type && type.defaultProps;
      var childrenLength = arguments.length - 3;

      if (!props && childrenLength !== 0) {
        props = {};
      }

      if (props && defaultProps) {
        for (var propName in defaultProps) {
          if (props[propName] === void 0) {
            props[propName] = defaultProps[propName];
          }
        }
      } else if (!props) {
        props = defaultProps || {};
      }

      if (childrenLength === 1) {
        props.children = children;
      } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);

        for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 3];
        }

        props.children = childArray;
      }

      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type: type,
        key: key === undefined ? null : '' + key,
        ref: null,
        props: props,
        _owner: null
      };
    };
  }();

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

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

  var slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  var Model = function Model(modelDesc) {
    classCallCheck(this, Model);
    var properties = modelDesc.properties;
    var rules = modelDesc.rules;
    var mixins = modelDesc.mixins;

    var binding = modelDesc.binding;
    var bindingMap = binding ? binding.propMap : {};

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
    this.service = modelDesc.service;

    this.getActions = function (state) {
      return modelDesc.actions[state];
    };

    this.getMutations = function (state) {
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
        var options = this.$options.model;
        if (!options) return;

        var models = options;
        if (!Array.isArray(options)) {
          models = [options];
        }

        var existsDefaultModel = false;
        models.forEach(function (modelOption) {
          var model = modelOption.model;
          var dataPath = modelOption.dataPath;
          var states = modelOption.states;


          if (!states) states = [];

          function makeActionContext(mutations, state, service) {
            return {
              state: state,
              service: service,
              dispatch: function dispatch(mutationName) {
                if (mutations.hasOwnProperty(mutationName)) {
                  var args = Array.from(arguments);
                  args.shift(); // mutation name
                  args.unshift(state);

                  return mutations[mutationName].apply(null, args);
                }
              }
            };
          }

          // action ({dispatch: Fuction(mutation, ...args), state, service})
          // convert action as Vue method
          var methods = {};
          states.forEach(function (state) {
            var actions = model.getActions(state);
            var mutations = model.getMutations(state);

            var _loop = function _loop(name) {
              var stateAction = actions[name];
              methods[name] = function () {
                var context = makeActionContext(mutations, vm.$get(dataPath + '.' + state), model.service);

                var args = Array.from(arguments);
                args.unshift(context);

                return stateAction.apply(null, args);
              };
            };

            for (var name in actions) {
              _loop(name);
            }
          });

          var service = model.service;
          for (var name in service) {
            methods[name] = service[name];
          }

          if ((modelOption.default || models.length === 1) && !existsDefaultModel) {
            existsDefaultModel = true;
            _this.$model = methods;
          } else {
            _this[model.modelName] = methods;
          }
        });
      }
    }
  };

  return ModelMan;

}));