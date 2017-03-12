import { makeActionContext } from './util'

export function createModel () {
  let eventMap = {}
  return class Model {
    static on (event, handler) {
      eventMap[event] = eventMap[event] || []
      eventMap[event].push(handler)
    }

    static fire (event, ...args) {
      let observers = eventMap[event]
      if (observers) {
        observers.forEach(o => o(...args))
      }
    }

    constructor (option) {
      Model.fire('init', option)

      let _  = this._ = {
        option: option,
        actions: {},
        mutations: {},
        watch: {},
        actionModMap: {}
      }
      let { mixins } = option
      let { actions, actionModMap } = _

      // mix module
      let types = ['actions', 'mutations', 'watch']
      types.forEach(type => {
        // mix default module
        if (!option[type]) option[type] = {}
        _[type].default = option[type]

        // mix naming modules
        for(let name in mixins) {
          let mod = mixins[name]
          if (!mod[type]) mod[type] = {}
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

      _.defaultStateKeys = []
      let defaultState = this.getDefaultState()
      if (typeof(defaultState) === 'object' && defaultState) {
        _.defaultStateKeys = Object.keys(defaultState)
      }

      Model.fire('created', this)
    }

    get defaultStateKeys () {
      return this._.defaultStateKeys
    }

    get modelName () {
      return this._.option.modelName
    }

    getDefaultState () {
      let _state = this._.option.state
      return _state ? _state() : undefined
    }

    getModState (mod) {
      if (mod === 'default') {
        return this.getDefaultState()
      }

      let mixins = this._.option.mixins
      let modState = mixins[mod].state
      return modState ? modState() : undefined
    }

    // wrap all module state() in state
    state () {
      let result = this.getDefaultState()
      let mixins = this._.option.mixins

      for(let mod in mixins) {
        let modState = this.getModState(mod)
        if (modState !== undefined) {
          if (!result) result = {}
          result[mod] = modState
        }
      }

      return result
    }

    getStateActions (state) {
      return this._.actions[state]
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
            let handler = null
            let option = {}

            if (typeof val === 'function') {
              handler = val
            } else { // object
              option = {...val}
              handler = option.handler
              delete option.handler
            }

            eachWatcher(path, handler, option)
          }
        })
      }
    }

    applyAction (state, action, args) {
      let result = this._.actions[state][action].apply(null, args)
      if (result && result.then) {
        return result
      }
    }

    dispatch (action) {
      let stateKey = this._.actionModMap[action]
      let state = this.getState(stateKey)

      let context = makeActionContext(
        this.getStateMutations(stateKey),
        state[stateKey],
        this.dispatch.bind(this)
      )

      const BIZ_PARAM_INDEX = 1
      let args = Array.from(arguments).slice(BIZ_PARAM_INDEX)
      args.unshift(context)

      let result = this.applyAction(stateKey, action, args)
      if(result && result.then) {
        return result.then(() => {
          return state
        })
      }
    }

    dispatchAll (fn) {
      const BIZ_PARAM_INDEX = 1

      let callers = []
      let subStates = new Set()
      let actionModMap = this._.actionModMap

      function dispatch (action) {
        let stateKey = actionModMap[action]
        let args = Array.from(arguments).slice(BIZ_PARAM_INDEX)

        callers.push({ stateKey, action, args })
        subStates.add(stateKey)
      }

      fn(dispatch)

      let state = this.getState([...subStates])

      return Promise.all(callers.map(({ stateKey, action, args }) => {
        let context = makeActionContext(
          this.getStateMutations(stateKey),
          state[stateKey],
          this.dispatch.bind(this)
        )
        args.unshift(context)

        return this.applyAction(stateKey, action, args)
      })).then(() => { return state })
    }

    getStateMutations (state) {
      return this._.mutations[state]
    }

    getState (states) {
      if (!states) {
        return this.state()
      }

      if (!Array.isArray(states)){
        states = [states]
      }

      return states.reduce((result, mod) => {
        let modState = this.getModState(mod)
        if (modState !== undefined) {
          if (!result) result = {}
          if (mod === 'default') {
            Object.assign(result, modState)
          } else {
            result[mod] = modState
          }
        }
        return result
      }, undefined)
    }
  }
}
