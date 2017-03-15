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

  var installed = false;
  var hackVueModelDirPlugin = {
    install: function install(Vue) {
      if (installed) return;
      installed = true;

      var directive = Vue.directive('model');
      var _bind = directive.bind;

      directive.bind = function () {
        _bind.call(this);

        var _setter = this.set;
        this.set = function () {
          try {
            writerState.isVModelDirWriting = true;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            _setter.call.apply(_setter, [this].concat(args));
          } finally {
            writerState.isVModelDirWriting = false;
          }
        };
      };
    }
  };

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

  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  function createModel() {
    var eventMap = {};

    var Model = function () {
      function Model(option) {
        classCallCheck(this, Model);

        Model.fire('init', option);

        var _ = this._ = {
          option: option,
          actions: {},
          mutations: {},
          watch: {},
          actionModMap: {}
        };
        var mixins = option.mixins;
        var actions = _.actions;
        var actionModMap = _.actionModMap;

        // mix module

        var types = ['actions', 'mutations', 'watch'];
        types.forEach(function (type) {
          // mix default module
          if (!option.hasOwnProperty(type)) {
            option[type] = {};
          }
          _[type].default = option[type];

          // mix naming modules
          for (var name in mixins) {
            var mod = mixins[name];
            if (!mod.hasOwnProperty(type)) mod[type] = {};
            _[type][name] = mod[type];
          }
        });

        Model.fire('mixed', function (handler) {
          handler(_.option);

          for (var mod in mixins) {
            handler(mixins[mod]);
          }
        }, this);

        // build action-->mod map

        var _loop = function _loop(mod) {
          Object.keys(actions[mod]).forEach(function (action) {
            actionModMap[action] = mod;
          });
        };

        for (var mod in actions) {
          _loop(mod);
        }

        _.defaultStateKeys = [];
        var defaultState = this.getDefaultState();
        if ((typeof defaultState === 'undefined' ? 'undefined' : _typeof(defaultState)) === 'object' && defaultState) {
          _.defaultStateKeys = Object.keys(defaultState);
        }

        Model.fire('created', this);
      }

      createClass(Model, [{
        key: 'getDefaultState',
        value: function getDefaultState() {
          var _state = this._.option.state;
          return _state ? _state() : undefined;
        }
      }, {
        key: 'getModState',
        value: function getModState(mod) {
          if (mod === 'default') {
            return this.getDefaultState();
          }

          var mixins = this._.option.mixins;
          var modState = mixins[mod].state;
          return modState ? modState() : undefined;
        }

        // wrap all module state() in state

      }, {
        key: 'state',
        value: function state() {
          var result = this.getDefaultState();
          var mixins = this._.option.mixins;

          for (var mod in mixins) {
            var modState = this.getModState(mod);
            if (modState !== undefined) {
              if (!result) result = {};
              result[mod] = modState;
            }
          }

          return result;
        }
      }, {
        key: 'getStateActions',
        value: function getStateActions(state) {
          return this._.actions[state];
        }
      }, {
        key: 'eachStateWatch',
        value: function eachStateWatch(states, handle) {
          var watch = this._.watch;

          var _loop2 = function _loop2(state) {
            if (!states.includes(state)) return 'continue';

            var stateWatch = watch[state];
            if (!stateWatch) return 'continue';
            handle(state, function (eachWatcher) {
              for (var path in stateWatch) {
                var val = stateWatch[path];
                var handler = null;
                var option = {};

                if (typeof val === 'function') {
                  handler = val;
                } else {
                  // object
                  option = _extends({}, val);
                  handler = option.handler;
                  delete option.handler;
                }

                eachWatcher(path, handler, option);
              }
            });
          };

          for (var state in watch) {
            var _ret2 = _loop2(state);

            if (_ret2 === 'continue') continue;
          }
        }
      }, {
        key: 'applyAction',
        value: function applyAction(state, action, args) {
          var result = this._.actions[state][action].apply(null, args);
          if (result && result.then) {
            return result;
          }
        }
      }, {
        key: 'dispatch',
        value: function dispatch(action) {
          var stateKey = this._.actionModMap[action];
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
        }
      }, {
        key: 'dispatchAll',
        value: function dispatchAll(fn) {
          var _this = this;

          var BIZ_PARAM_INDEX = 1;

          var callers = [];
          var subStates = new Set();
          var actionModMap = this._.actionModMap;

          function dispatch(action) {
            var stateKey = actionModMap[action];
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

            var context = makeActionContext(_this.getStateMutations(stateKey), state[stateKey], _this.dispatch.bind(_this));
            args.unshift(context);

            return _this.applyAction(stateKey, action, args);
          })).then(function () {
            return state;
          });
        }
      }, {
        key: 'getStateMutations',
        value: function getStateMutations(state) {
          return this._.mutations[state];
        }
      }, {
        key: 'getState',
        value: function getState(states) {
          var _this2 = this;

          if (!states) {
            return this.state();
          }

          if (!Array.isArray(states)) {
            states = [states];
          }

          return states.reduce(function (result, mod) {
            var modState = _this2.getModState(mod);
            if (modState !== undefined) {
              if (!result) result = {};
              if (mod === 'default') {
                Object.assign(result, modState);
              } else {
                result[mod] = modState;
              }
            }
            return result;
          }, undefined);
        }
      }, {
        key: 'defaultStateKeys',
        get: function get() {
          return this._.defaultStateKeys;
        }
      }, {
        key: 'modelName',
        get: function get() {
          return this._.option.modelName;
        }
      }]);
      return Model;
    }();

    Model.on = function (event, handler) {
      eventMap[event] = eventMap[event] || [];
      eventMap[event].push(handler);
    };

    Model.fire = function (event) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var observers = eventMap[event];
      if (observers) {
        observers.forEach(function (o) {
          return o.apply(undefined, args);
        });
      }
    };

    return Model;
  }

  function makeActionDispatcher(vm, model, state, statePath) {
    var mutations = model.getStateMutations(state);

    return function dispatch(action) {
      var context = makeActionContext(mutations, vm.$get(statePath), dispatch);

      var args = Array.from(arguments);
      args.shift();
      args.unshift(context);

      var result = model.applyAction(state, action, args);
      if (result && result.then) {
        return result;
      }
    };
  }

  var Modello = function () {
    function Modello() {
      classCallCheck(this, Modello);

      this._ = {
        store: {},
        installed: false,
        model: createModel()
      };
    }

    createClass(Modello, [{
      key: 'install',
      value: function install(vue) {
        if (this._.installed) return;

        vue.mixin(this.vueMixin());
        vue.use(hackVueModelDirPlugin);

        this._.installed = true;
      }
    }, {
      key: 'getModel',
      value: function getModel(model) {
        return typeof model === 'string' ? this._.store[model] : model;
      }
    }, {
      key: 'use',
      value: function use(plugin) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        plugin.install.apply(plugin, [this].concat(args));
      }
    }, {
      key: 'reg',
      value: function reg(model) {
        var Model = this.Model;
        if (!(model instanceof Model)) {
          return this.reg(new Model(model));
        }
        this._.store[model.modelName] = model;
      }
    }, {
      key: 'unReg',
      value: function unReg(model) {
        var Model = this.Model;
        if (model instanceof Model) {
          delete this._.store[model.modelName];
        } else if (typeof model === 'string') {
          delete this._.store[model];
        }
      }
    }, {
      key: 'on',
      value: function on() {
        var _Model;

        return (_Model = this.Model).on.apply(_Model, arguments);
      }
    }, {
      key: 'vueMixin',
      value: function vueMixin() {
        var getModel = this.getModel.bind(this);
        return {
          init: function init() {
            var vm = this;
            var config = this.$options.modello;
            if (!config) return;

            var models = [].concat(config);

            var existsDefaultModel = false;
            models.forEach(function (modelOption) {
              var model = modelOption.model;
              var states = modelOption.states;

              model = getModel(model);
              var modelName = model.modelName;

              if (!states) {
                states = ['default'];
              }

              // method ({commit(mutation, ...args), state, dispatch(action, ...args)}, ...args)
              // convert action as Vue method
              var methods = {};
              states.forEach(function (state) {
                var statePath = modelName;
                if (state !== 'default') {
                  statePath += '.' + state;
                }

                var actions = model.getStateActions(state);

                if (Object.keys(actions).length) {
                  var dispatch = makeActionDispatcher(vm, model, state, statePath);
                  for (var action in actions) {
                    methods[action] = dispatch.bind(null, action);
                  }
                }
              });

              if ((modelOption.default || models.length === 1) && !existsDefaultModel) {
                existsDefaultModel = true;
                vm.$model = Object.assign({}, methods);
              } else {
                for (var m in methods) {
                  if (!vm.$model[m]) {
                    vm.$model[m] = methods[m];
                  }
                }
              }
              vm.$model[modelName] = methods;
            });
          },
          data: function data() {
            var config = this.$options.modello;
            if (!config) return;

            var models = [].concat(config);

            var result = {};
            models.forEach(function (option) {
              var model = getModel(option.model);
              var modelState = result[model.modelName] = {};
              var states = option.states || [];
              if (states.length === 0) {
                states.unshift('default');
              }
              Object.assign(modelState, model.getState(states));
            });

            return result;
          },
          created: function created() {
            var config = this.$options.modello;
            if (!config) return;

            var models = [].concat(config);

            var vm = this;

            models.forEach(function (option) {
              var model = getModel(option.model);
              var modelName = model.modelName;

              var states = option.states || [];
              if (states.length === 0) {
                states.unshift('default');
              }

              var showMutateWarning = function showMutateWarning() {
                var isFirstMutate = arguments.length === 1;
                if (isFirstMutate) return;

                if (!writerState.isVModelDirWriting && !writerState.isMutationWriting) {
                  console.warn('[vue-modello] Do not mutate modello state outside mutation handlers.!');
                }
              };

              vm.$watch(model.modelName, showMutateWarning, {
                deep: true,
                immediate: true,
                sync: true
              });

              // handle watch
              model.eachStateWatch(states, function (state, watchEach) {
                var statePath = modelName;
                if (state !== 'default') {
                  statePath += '.' + state;
                }

                var dispatch = makeActionDispatcher(vm, model, state, statePath);

                var statePrefix = statePath + '.';
                var len = statePrefix.length;

                watchEach(function (path, handler, option) {
                  var listenOrWatch = vm.$listen ? '$listen' : '$watch';
                  var watchPath = path === '$state' ? statePath : statePrefix + path;

                  vm[listenOrWatch](watchPath, function (val, oldVal, path) {
                    var mutations = model.getStateMutations(state);
                    var context = makeActionContext(mutations, vm.$get(statePath), dispatch);

                    if (path) {
                      path = {
                        absolute: path.absolute.substr(len),
                        relative: path.relative
                      };
                    }

                    handler(context, val, oldVal, path);
                  }, option);
                }); // end for stateWatch
              }); // end eachWatch
            }); // models.forEach
          } // created

        };
      }
    }, {
      key: 'Model',
      get: function get() {
        return this._.model;
      }
    }]);
    return Modello;
  }();

  Modello.VModelDiretiveWriteState = hackVueModelDirPlugin;

  return Modello;

}));