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
  vueMixin: {
    init () {
      let options = this.$options.model
      if (!options) return

      let { model, actions, dataPath } = options

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
        }
      }

      // action ({dispatch: Fuction(mutation, ...args)})
      // convert action as Vue method
      let methods = {}
      for (let name of actions) {
        let action = model.actions[name]
        methods[name] = (function () {
          let args = Array.from(arguments)

          setModel(this.$get(dataPath))
          args.unshift(Dispatcher)

          return action.apply(null, args)
        }).bind(this)
      }

      this.$model = methods;
    }
    // created () {
    //   let options = this.$options.model
    //   if (!options) return

    //   let { model, dataPath } = options
    //   this.$set(dataPath, model.defaults())
    // }
  }
}
