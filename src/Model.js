import ModelMan from './ModelMan'
import { makeActionContext } from './util'

function regDefaultDesc (modelDesc, type) {
  let desc = modelDesc[type]
  let modelName = modelDesc.modelName
  let defaults = desc[modelName] || (desc[modelName] = {})
  for(let name in desc) {
    if (typeof desc[name] === 'function') {
      defaults[name] = desc[name]
      delete desc[name]
    }
  }
}

let eventMap = {}
export default class Model {
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

  constructor (modelDesc) {
    Model.fire('init', modelDesc)

    let { mixins } = modelDesc
    if (modelDesc.state) {
      let _state = modelDesc.state
      modelDesc.state = function () {
        let state = {}
        state[modelDesc.modelName] = _state()
        return state
      }
    }

    if (modelDesc.actions) {
      regDefaultDesc(modelDesc, 'actions')
    }
    if (modelDesc.mutations) {
      regDefaultDesc(modelDesc, 'mutations')
    }
    if (modelDesc.watch) {
      regDefaultDesc(modelDesc, 'watch')
    }

    if (!modelDesc.state) modelDesc.state = function () { return {} }
    if (!modelDesc.actions) modelDesc.actions = {}
    if (!modelDesc.mutations) modelDesc.mutations = {}
    if (!modelDesc.watch) modelDesc.watch = {}

    // collect defaults
    let defaultState = {}

    let mixinState = {}
    if (mixins) {
      for(let regState in mixins) {
        let module = mixins[regState]
        mixinState[regState] = module.state
        modelDesc.actions[regState] = module.actions
        modelDesc.mutations[regState] = module.mutations
        modelDesc.watch[regState] = module.watch
      }
    }

    let actionStateMap = {}
    for(let state in modelDesc.actions) {
      Object.keys(modelDesc.actions[state]).forEach((name) => {
        actionStateMap[name] = state
      })
    }

    let oldState = modelDesc.state
    modelDesc.state = function () {
      let result = oldState()
      for(let regState in mixinState) {
        result[regState] = mixinState[regState]()
      }
      return result
    }

    this.modelName = modelDesc.modelName

    this.getStateActions = function (state) {
      return modelDesc.actions[state]
    }

    this.eachStateWatch = function (handle) {
      for(let state in modelDesc.watch) {
        let stateWatch = modelDesc.watch[state]
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

    this.applyAction = function (state, action, args) {
      let result = modelDesc.actions[state][action].apply(null, args)
      if (result && result.then) {
        return result
      }
    }

    this.dispatch = function (action) {
      let stateKey = actionStateMap[action]
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

    this.dispatchAll = function (fn) {
      const BIZ_PARAM_INDEX = 1

      let callers = []
      let subStates = new Set()

      function dispatch (action) {
        let stateKey = actionStateMap[action]
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

    this.getStateMutations = function (state) {
      return modelDesc.mutations[state]
    }

    this.getState = function (states) {
      let allState = modelDesc.state()
      if (!states) {
        return allState
      }

      let result = {}
      if (typeof states === 'string') {
        states = [states]
      }
      states.forEach(s => result[s] = allState[s])
      return result
    }

    Model.fire('created', this)
  }
}
