import ModelMan from './ModelMan'
import { makeActionContext } from './util'

export default class Model {
  constructor (modelDesc) {
    let { properties, rules, mixins } = modelDesc
    let binding = modelDesc.binding
    let bindingMap = binding ? binding.propMap : {}

    if (!modelDesc.state) modelDesc.state = function () { return {} }
    if (!modelDesc.actions) modelDesc.actions = {}
    if (!modelDesc.mutations) modelDesc.mutations = {}

    // collect defaults and labels
    let defaultState = {}
    let labels = {}

    let mixinState = {}
    if (mixins) {
      for(let regState in mixins) {
        let module = mixins[regState]
        mixinState[regState] = module.state
        modelDesc.actions[regState] = module.actions
        modelDesc.mutations[regState] = module.mutations
        // add meta __state__ to action
        // let actions = module.actions
        // Object.keys(actions).forEach((name) => {
        //   Object.defineProperty(actions[name], '__state__', {
        //     value: regState,
        //     enumerable: false,
        //     writable: false,
        //     configurable: false
        //   })
        // })
      }
    }

    let oldState = modelDesc.state
    modelDesc.state = function () {
      let result = oldState()
      for(let regState in mixinState) {
        result[regState] = mixinState[regState]()
      }
      return result
    }

    let getBindingModel = function () {
      return binding ? ModelMan.get(binding.modelName) : null
    }

    for (let prop in properties) {
      let propDesc = properties[prop]

      labels[prop] = propDesc.label || ''

      let Type = propDesc.type
      if (propDesc.hasOwnProperty('defaultValue')) {
        defaultState[prop] = propDesc.defaultValue
      } else if(!bindingMap.hasOwnProperty(prop)){
        if (Array.isArray(Type)) {
          defaultState[prop] = []
        } else {
          let value = undefined
          switch (Type) {
            case String:
              value = ''
              break
            case Number:
              value = 0
              break
            case Boolean:
              value = true
              break
          }
          if (value !== undefined) {
            defaultState[prop] = value
          }
        }
      }
    }

    // methods for rule
    this.getPropRule = function (prop) {
      let rule = rules ? rules[prop] : undefined

      let mapProp = bindingMap[prop]
      if (mapProp) {
        let bindingModel = getBindingModel()
        if (bindingModel) {
          let bindingRule = bindingModel.getPropRule(mapProp)
          if (bindingRule) {
            return { ...bindingRule, ...rule }
          }
        }
      }

      return rule
    }

    this.getRules = function (props) {
      if (typeof props === 'string') props = [props]
      if (!Array.isArray(props)) props = Object.keys(properties)
      let rules = {}
      props.forEach((prop) => {
        rules[prop] = this.getPropRule(prop)
      })
      return rules
    }

    // methods for label
    this.getPropLabel = function (prop) {
      let label = labels[prop]
      if (label) return label

      let mapProp = bindingMap[prop]
      if (mapProp) {
        let bindingModel = getBindingModel()
        if (bindingModel) {
          return bindingModel.getPropLabel(mapProp)
        }
      }

      return ''
    }

    this.getLabels = function () {
      return Object.keys(properties).map((prop) => this.getPropLabel(prop))
    }

    // methods for defaults
    // priority: self defined > model binding > auto make
    this.getPropDefaults = function (prop) {
      let propDesc = properties[prop]
      if (propDesc.hasOwnProperty('defaultValue')) {
        return propDesc.defaultValue
      }

      let mapProp = bindingMap[prop]
      if (mapProp) {
        let bindingModel = getBindingModel()
        if (bindingModel) {
          let defaults = bindingModel.getPropDefaults(mapProp)
          if (defaults !== undefined) return defaults
        }
      }

      if (prop in defaultState) {
        return defaultState[prop]
      }

      return undefined
    }

    this.defaults = function () {
      let defaults = {}
      Object.keys(properties).forEach((prop) => {
        defaults[prop] = this.getPropDefaults(prop)
      })
      return defaults
    }

    // add property member
    this.modelName = modelDesc.modelName
    this.service = modelDesc.service

    this.getStateActions = function (state) {
      return modelDesc.actions[state]
    }

    let beforeDispatchHanlers = []
    this.beforeDispatch = function (handler) {
      beforeDispatchHanlers.push(handler)
    }

    function fireBeforeDispatch () {
      let args = arguments
      beforeDispatchHanlers.forEach(function () {
        handler.apply(null, args)
      })
    }

    this.applyAction = function (state, action, args) {
      fireBeforeDispatch(state, action, args)
      return modelDesc.actions[state][action].apply(null, args)
    }

    this.dispatch = function (stateAction) {
      let temp = stateAction.split('.')
      let stateKey = temp[0]
      let action = temp[1]
      let state = this.getState(stateKey)

      let context = makeActionContext(
        this.getStateMutations(stateKey),
        state[stateKey],
        this.service
      )

      const BIZ_PARAM_INDEX = 1
      let args = Array.from(arguments).slice(BIZ_PARAM_INDEX)
      args.unshift(context)

      return this.applyAction(stateKey, action, args).then(() => {
        return state
      })
    }

    this.dispatchAll = function (fn) {
      const BIZ_PARAM_INDEX = 1

      let callers = []
      let subStates = new Set()

      function dispatch (stateAction) {
        let temp = stateAction.split('.')
        let stateKey = temp[0]
        let action = temp[1]
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
          this.service
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
  }
}
