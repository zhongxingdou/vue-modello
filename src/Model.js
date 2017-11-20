import writerState from './writerState'

const DEFAULT_MODULE = 'default'

export function createModel () {
  let eventMap = {}
  class Model {
    constructor (option) {
      Model.fire('init', option)

      let _  = this._ = {
        option: option,
        actions: {},
        mutations: {},
        watch: {},
        actionModMap: {},
        mutationModMap: {},
        moduleNames: [DEFAULT_MODULE]
      }

      let { modules, mixins } = option
      mixins = {...mixins, ...modules}

      let {
        actions,
        actionModMap,
        mutationModMap,
        mutations
      } = _

      // mix module
      let types = ['actions', 'mutations', 'watch']
      types.forEach(type => {
        // mix default module
        if (!option.hasOwnProperty(type)) {
          option[type] = {}
        }
        _[type].default = option[type]

        // mix naming modules
        for(let name in mixins) {
          _.moduleNames.push(name)
          let mod = mixins[name]
          if (!mod.hasOwnProperty(type)) mod[type] = {}
          _[type][name] = mod[type]
        }
      })

      Model.fire('mixed', function (handler) {
        handler(_.option)

        for(let mod in mixins) {
          handler(mixins[mod])
        }
      }, this)

      // build action-->mod map
      for(let mod in actions) {
        Object.keys(actions[mod]).forEach((action) => {
          actionModMap[action] = mod
        })
      }

      // build mutation-->mod map
      for(let mod in mutations) {
        Object.keys(mutations[mod]).forEach((mutation) => {
          mutationModMap[mutation] = mod
        })
      }

      Model.fire('created', this)
    }

    get modelName () {
      return this._.option.modelName
    }

    get moduleNames () {
      return this._.moduleNames.concat([])
    }

    getDefaultModuleState () {
      let _state = this._.option.state
      return _state ? _state() : undefined
    }

    getModuleState (module) {
      if (module === DEFAULT_MODULE) {
        return this.getDefaultModuleState()
      }

      let mixins = this._.option.mixins
      let moduleState = mixins[module].state
      return moduleState ? moduleState() : undefined
    }

    // wrap all module state() in state
    state () {
      let result = this.getDefaultModuleState()
      let mixins = this._.option.mixins

      for(let module in mixins) {
        let moduleState = this.getModuleState(module)
        if (moduleState !== undefined) {
          if (!result) result = {}
          result[module] = moduleState
        }
      }

      return result
    }

    getActionModule (action) {
      return this._.actionModMap[action]
    }

    getMutationModule (mutation) {
      return this._.mutationModMap[mutation]
    }

    getMuduleActions (module) {
      return this._.actions[module]
    }

    eachStateWatch (states, handle) {
      let watch = this._.watch
      for(let state in watch) {
        if (!states.includes(state)) continue

        let stateWatch = watch[state]
        if (!stateWatch) continue
        handle(state, function (eachWatcher) {
          for(let path in stateWatch) {
            let val = stateWatch[path]

            let option = {...val}
            delete option.handler

            eachWatcher(path, val.handler, option)
          }
        })
      }
    }

    applyAction (action, args) {
      let module = this.getActionModule(action)
      // todo: warnig if action be undefined
      return this.getMuduleActions[module][action].apply(null, args)
    }

    commit (getState, mutation, ...args) {
      let module = this.getMutationModule(mutation)
      try {
        writerState.isMutationWriting = true
        // todo: warnig if mutation be undefined
        this.getModuleMutations(module)[mutation].call(null, getState(), ...args)
      } finally {
        writerState.isMutationWriting = false
      }
    }

    dispatch (getState, action, ...args) {
      let context = {
        state: getState(),
        commit: this.commit.bind(this, getState),
        dispatch: this.dispatch.bind(this, getState)
      }
      return this.applyAction(action, context, ...args)
    }

    getModuleMutations (state) {
      return this._.mutations[state]
    }

    getStateOfMutations (mutations) {
      if (!mutations) {
        return this.state()
      }

      if (!Array.isArray(mutations)){
        mutations = [mutations]
      }

      return mutations.reduce((result, module) => {
        let moduleState = this.getModuleState(module)

        if (moduleState !== undefined) {
          if (!result) result = {}

          if (module === DEFAULT_MODULE) {
            Object.assign(result, moduleState)
          } else {
            result[module] = moduleState
          }
        }

        return result
      }, undefined)
    }
  }

  Model.on = function (event, handler) {
    eventMap[event] = eventMap[event] || []
    eventMap[event].push(handler)
  }

  Model.fire = function (event, ...args) {
    let observers = eventMap[event]
    if (observers) {
      observers.forEach(o => o(...args))
    }
  }

  return Model
}
