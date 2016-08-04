import Model from './Model'
import { makeActionContext } from './util'

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

        if (!states) states = []


        // action ({dispatch: Fuction(mutation, ...args), state, service})
        // convert action as Vue method
        let methods = {}
        states.forEach(function (state) {
          let actions = model.getStateActions(state)
          let mutations = model.getStateMutations(state)
          Object.keys(actions).forEach(function (action) {
            methods[action] = function () {
              let context = makeActionContext(
                mutations,
                vm.$get(state),
                model.service
              )

              let args = Array.from(arguments)
              args.unshift(context)

              vm.$emit('modello:' + model.modelName + '.' + action + ':before')
              var result = model.applyAction(state, action, args)
              if (result && result.then){
                return result.then(function () {
                  vm.$emit('modello:' + model.modelName + '.' + action + ':after')
                })
              } else {
                vm.$emit('modello:' + model.modelName + '.' + action + ':after')
              }
            }
          })
        })

        let service = model.service
        for(let name in service) {
          methods[name] = service[name]
        }

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
        Object.assign(result, option.model.getState(option.states))
      })

      return result
    }
  }
}
