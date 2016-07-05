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
      let options = this.$options.model
      if (!options) return

      let models = options
      if (!Array.isArray(options)) {
        models = [options]
      }

      let existsDefaultModel = false
      models.forEach((modelOption) => {
        let { model, actions, dataPath } = modelOption

        // 声明在 vue data 中的 model
        let vueModel = null
        function setModel (model) {
          vueModel = model
        }
        function getModel (model) {
          return vueModel
        }

        let Dispatcher = {
          dispatch (mutation) {
            let mutations = model.mutations
            if (mutations.hasOwnProperty(mutation)) {
              let args = Array.from(arguments)
              args.shift() // mutation name
              args.unshift(getModel())

              return mutations[mutation].apply(null, args)
            }
          },
          state: null
        }

        // action ({dispatch: Fuction(mutation, ...args)})
        // convert action as Vue method
        let methods = {}
        for (let name of actions) {
          let action = model.actions[name]
          methods[name] = (function () {
            let args = Array.from(arguments)

            if (dataPath) setModel(this.$get(dataPath))
            Dispatcher.state = getModel()
            args.unshift(Dispatcher)

            return action.apply(null, args)
          }).bind(this)
        }

        if(modelOption.default && !existsDefaultModel){
          existsDefaultModel = true
          this.$model = methods
        } else {
          this[model.modelName] = methods
        }
      })
    }
  }
}
