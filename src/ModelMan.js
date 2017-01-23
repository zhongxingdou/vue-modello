import Model from './Model'
import { makeActionContext } from './util'
import writerState from './writerState'
import hackVueModelDirPlugin from './hackVueModelDirPlugin'

let modelStore = {}

function getModel (model) {
  return typeof model === 'string' ? modelStore[model] : model
}

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

    // vm.$emit('modello:' + model.modelName + '.' + action + ':before')
    var result = model.applyAction(state, action, args)
    if (result && result.then) {
      return result
    }
  }
}

export default {
  install (vue) {
    vue.mixin(this.vueMixin)
    vue.use(hackVueModelDirPlugin)
  },
  on: Model.on.bind(Model),
  Model: Model,
  wrapVueModelDiriective: hackVueModelDirPlugin,
  use (plugin) {
    plugin.install(this)
  },
  reg (model) {
    if (!(model instanceof Model)) {
      return this.reg(new Model(model))
    }
    modelStore[model.modelName] = model
  },
  get: getModel,
  unReg (model) {
    if (model instanceof Model) {
      delete modelStore[model.modelName]
    } else if (typeof model === 'string') {
      delete modelStore[model]
    }
  },
  vueMixin: {
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

        // action ({dispatch: Fuction(mutation, ...args), state, service})
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

        let cb = function () {
          if (arguments.length === 1) return
          if (!writerState.isVModelDirWriting && !writerState.isMutationWriting) {
            console.warn('[vue-modello] Do not mutate modello state outside mutation handlers.!')
          }
        }
        states.forEach(state => {
          vm.$watch(state,  cb, {deep: true, immediate: true, sync: true})
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
