import Model from './Model'
import { makeActionContext } from './util'
import writerState from './writerState'

let modelStore = {}
export default {
  Model: Model,
  reg (model) {
    if (!(model instanceof Model)) {
      return this.reg(new Model(model))
    }

    modelStore[model.modelName] = model
  },
  get (modelName) {
    return modelStore[modelName]
  },
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
        if (typeof model === 'string') {
          model = modelStore[model]
        }

        if (!states) states = []
        states.unshift(model.modelName)

        // action ({dispatch: Fuction(mutation, ...args), state, service})
        // convert action as Vue method
        let methods = {}
        states.forEach(function (state) {
          let mutations = model.getStateMutations(state)

          let dispatch = function (action) {
            let context = makeActionContext(
              mutations,
              vm.$get(state),
              dispatch
            )

            let args = Array.from(arguments)
            args.unshift(context)

            vm.$emit('modello:' + model.modelName + '.' + action + ':before')
            var result = model.applyAction(state, action, args)
            if (result && result.then) {
              return result.then(function () {
                vm.$emit('modello:' + model.modelName + '.' + action + ':after')
              })
            } else {
              vm.$emit('modello:' + model.modelName + '.' + action + ':after')
            }
          }

          let makeActionDispatcher = function (action) {
            return function () {
              return dispatch(action)
            }
          }

          let actions = model.getStateActions(state)
          Object.keys(actions).forEach(function (action) {
            methods[action] = makeActionDispatcher(action)
          })
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
        let model = option.model
        if (typeof model === 'string') {
          model = modelStore[model]
        }

        let states = option.states
        if (states) states.unshift(model.modelName)

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
        let states = option.states || []

        let modelName = option.model
        if (typeof modelName === 'object') modelName = model.modelName
        states.unshift(modelName)

        states.forEach(function (state) {
          let cb = function () {
            if (!writerState.isVModelDirWriting && !writerState.isMutationWriting) {
              console.warn('[vue-modello] update state directly is deprecated!')
            }
          }
          vm.$watch(state,  cb, {deep: true})
        }) // states.forEach
      }) // models.forEach
    } // created
  }
}
