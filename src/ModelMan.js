import { makeActionContext } from './util'
import writerState from './writerState'
import hackVueModelDirPlugin from './hackVueModelDirPlugin'
import { createModel } from './Model'

function makeActionDispatcher (vm, model, state) {
  let mutations = model.getStateMutations(state)

  return function dispatch(action) {
    let context = makeActionContext(
      mutations,
      vm.$get(state),
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

          if (!states) states = []
          states.unshift(model.modelName)

          // method ({commit(mutation, ...args), state, dispatch(action, ...args)}, ...args)
          // convert action as Vue method
          let methods = {}
          states.forEach(function (state) {
            let dispatch = makeActionDispatcher(vm, model, state)
            let actions = model.getStateActions(state)
            for(let action in actions) {
              methods[action] = dispatch.bind(null, action)
            }
          })

          if((modelOption.default || models.length === 1)
              && !existsDefaultModel){
            existsDefaultModel = true
            this.$model = methods
          } else {
            this[model.modelName] = methods
          }
        })
      },

      data () {
        let config = this.$options.modello
        if (!config) return

        let models = [].concat(config)

        let result = {}
        models.forEach((option) => {
          let model = getModel(option.model)
          let states = option.states || []

          states.unshift(model.modelName)

          Object.assign(result, model.getState(states))
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

          // warning if data change is not from mutation
          let states = option.states || []
          states.unshift(model.modelName)

          let showMutateWarning = function () {
            const isFirstMutate = arguments.length === 1
            if (isFirstMutate) return

            if (!writerState.isVModelDirWriting && !writerState.isMutationWriting) {
              console.warn('[vue-modello] Do not mutate modello state outside mutation handlers.!')
            }
          }

          states.forEach(state => {
            vm.$watch(state, showMutateWarning, {
              deep: true,
              immediate: true,
              sync: true
            })
          })

          // handle watch
          model.eachStateWatch(function (state, watchEach) {
            let dispatch = makeActionDispatcher(vm, model, state)
            let statePrefix = state + '.'
            let len = statePrefix.length

            watchEach(function (path, handler, option) {
              let listenOrWatch = vm.$listen ? '$listen' : '$watch'
              vm[listenOrWatch](statePrefix + path, function (val, oldVal, path) {
                let mutations = model.getStateMutations(state)
                let context = makeActionContext(
                  mutations,
                  vm.$get(state),
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
