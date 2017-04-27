import { makeActionContext } from './util'
import modelDirective from './modelDirective'
import { createModel } from './Model'
import makeVueMixin from './makeVueMixin'

export default class Modello {
  constructor () {
    this._ = {
      store: {},
      installed: false,
      model:createModel(),
      vuePlugin: makeVueMixin(this.getModel.bind(this))
    }
  }

  static modelDirective () {
    return modelDirective
  }

  get vuePlugin() {
    return this._.vuePlugin
  }

  get Model() {
    return this._.model
  }

  install (vue) {
    if (this._.installed) return

    vue.mixin(this.vuePlugin)
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
}
