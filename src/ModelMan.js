import { makeActionContext, getObjByPath, setObjByPath } from './util'
import writerState from './writerState'
import hackVueModelDirPlugin from './hackVueModelDirPlugin'
import { createModel } from './Model'

function makeActionDispatcher (vm, model, state, statePath) {
  let mutations = model.getStateMutations(state)

  return function dispatch(action) {
    let context = makeActionContext(
      mutations,
      vm.$get(statePath),
      dispatch
    )

    let args = Array.from(arguments)
    args.shift()
    args.unshift(context)

    let result = model.applyAction(state, action, args)
    if (result && result.then) {
      return result
    }
  }
}

function parseOptionStates (option) {
  let simpleStates = []
  let partialStates = []
  let allStates = []
  let partialStateMap = {}

  let states = option.states || []
  if (states.length === 0) {
    simpleStates.unshift('default')
  } else {
    simpleStates = states.filter(s => typeof(s) === 'string')
    partialStateMap = states.filter(s => typeof s === 'object')[0] || {}
    partialStates = Object.keys(partialStateMap)
  }

  allStates = simpleStates.concat(partialStates)

  return {
    allStates,
    simpleStates,
    partialStates,
    partialStateMap
  }
}

export default class Modello {
  constructor () {
    this._ = {
      store: {},
      installed: false,
      model:createModel()
    }
  }

  get Model() {
    return this._.model
  }

  install (vue) {
    if (this._.installed) return

    vue.mixin(this.vueMixin())
    vue.use(hackVueModelDirPlugin)

    this._.installed = true
  }

  getModel (model) {
    return typeof model === 'string' ? this._.store[model] : model
  }

  use (plugin, ...args) {
    plugin.install(this, ...args)
  }

  reg (model) {
    let Model = this.Model
    if (!(model instanceof Model)) {
      return this.reg(new Model(model))
    }
    this._.store[model.modelName] = model
  }

  unReg (model) {
    let Model = this.Model
    if (model instanceof Model) {
      delete this._.store[model.modelName]
    } else if (typeof model === 'string') {
      delete this._.store[model]
    }
  }

  on (...args) {
    return this.Model.on(...args)
  }

  vueMixin () {
    let getModel = this.getModel.bind(this)
    return {
      init () {
        let vm = this
        let config = this.$options.modello
        if (!config) return

        let models = [].concat(config)

        let existsDefaultModel = false
        models.forEach((modelOption) => {
          let { model } = modelOption
          model = getModel(model)
          let states = parseOptionStates(modelOption).allStates
          let modelName = model.modelName

          // method ({commit(mutation, ...args), state, dispatch(action, ...args)}, ...args)
          // convert action as Vue method
          let methods = {}
          states.forEach(function (state) {
            let statePath = modelName
            if (state !== 'default') {
              statePath += '.' + state
            }

            let actions = model.getStateActions(state)

            if (Object.keys(actions).length) {
              let dispatch = makeActionDispatcher(vm, model, state, statePath)
              for(let action in actions) {
                methods[action] = dispatch.bind(null, action)
              }
            }
          })

          if((modelOption.default || models.length === 1)
              && !existsDefaultModel){
            existsDefaultModel = true
            vm.$model = Object.assign({}, methods)
          } else {
            for(let m in methods) {
              if (!vm.$model[m]) {
                vm.$model[m] = methods[m]
              }
            }
          }
          vm.$model[modelName] = methods
        })
      },

      data () {
        let config = this.$options.modello
        if (!config) return

        let models = [].concat(config)

        let result = {}
        models.forEach((option) => {
          let model = getModel(option.model)
          let modelState = result[model.modelName] = {}
          let { simpleStates, partialStateMap } = parseOptionStates(option)

          // states: [{newPage: ['workorder', 'xxxx'}]
          for(let mod in partialStateMap) {

            let modState = model.getState(mod)[mod]
            let filterState = {
              [mod]: {}
            }
            partialStateMap[mod].forEach(path => {
              let value = getObjByPath(modState, path)
              Object.assign(modelState, setObjByPath(filterState[mod], path, value, true))
            })
            Object.assign(modelState, filterState)
          }

          Object.assign(modelState, model.getState(simpleStates))
        })

        return result
      },

      created () {
        let config = this.$options.modello
        if (!config) return

        let models = [].concat(config)

        let vm = this

        models.forEach(function (option) {
          let model = getModel(option.model)
          let modelName = model.modelName
          let { allStates } = parseOptionStates(option)

          let showMutateWarning = function () {
            const isFirstMutate = arguments.length === 1
            if (isFirstMutate) return

            if (!writerState.isVModelDirWriting && !writerState.isMutationWriting) {
              console.warn('[vue-modello] Do not mutate modello state outside mutation handlers.!')
            }
          }

          vm.$watch(model.modelName, showMutateWarning, {
            deep: true,
            immediate: true,
            sync: true
          })

          // handle watch
          model.eachStateWatch(allStates, function (state, watchEach) {
            let statePath = modelName
            if (state !== 'default') {
              statePath += '.' + state
            }

            let dispatch = makeActionDispatcher(vm, model, state, statePath)

            let statePrefix = statePath + '.'
            let len = statePrefix.length

            watchEach(function (path, handler, option) {
              let listenOrWatch = vm.$listen ? '$listen' : '$watch'
              let watchPath = path === '$state' ? statePath : statePrefix + path

              vm[listenOrWatch](watchPath, function (val, oldVal, path) {
                let mutations = model.getStateMutations(state)
                let context = makeActionContext(
                  mutations,
                  vm.$get(statePath),
                  dispatch
                )

                if (path) {
                  path = {
                    absolute: path.absolute.substr(len),
                    relative: path.relative
                  }
                }

                handler(context, val, oldVal, path)
              }, option)
            }) // end for stateWatch
          }) // end eachWatch
        }) // models.forEach
      } // created
    }
  }
}

Modello.VModelDiretiveWriteState = hackVueModelDirPlugin
