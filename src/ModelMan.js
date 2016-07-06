import Model from './Model'

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
      let options = this.$options.model
      if (!options) return

      let models = options
      if (!Array.isArray(options)) {
        models = [options]
      }

      let existsDefaultModel = false
      models.forEach((modelOption) => {
        let { model, dataPath, states } = modelOption

        if (!states) states = []

        function makeActionContext (mutations, state, service) {
          return {
            state,
            service,
            dispatch (mutationName) {
              if (mutations.hasOwnProperty(mutationName)) {
                let args = Array.from(arguments)
                args.shift() // mutation name
                args.unshift(state)

                return mutations[mutationName].apply(null, args)
              }
            }
          }
        }

        // action ({dispatch: Fuction(mutation, ...args), state, service})
        // convert action as Vue method
        let methods = {}
        states.forEach(function (state) {
          let actions = model.getActions(state)
          let mutations = model.getMutations(state)
          for (let name in actions) {
            let stateAction = actions[name]
            methods[name] = function () {
              let context = makeActionContext(
                mutations,
                vm.$get(dataPath + '.' + state),
                model.service
              )

              let args = Array.from(arguments)
              args.unshift(context)

              return stateAction.apply(null, args)
            }
          }
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
    }
  }
}
