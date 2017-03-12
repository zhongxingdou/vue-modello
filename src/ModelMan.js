import { makeActionContext } from './util'
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
          let { model, states } = modelOption
          model = getModel(model)
          let modelName = model.modelName

          if (!states) {
            states = ['default']
          }

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
          let states = option.states || []
          if (states.length === 0) {
            states.unshift('default')
          }
          Object.assign(modelState, model.getState(states))
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

          let states = option.states || []
          if (states.length === 0) {
            states.unshift('default')
          }

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
          model.eachStateWatch(states, function (state, watchEach) {
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
