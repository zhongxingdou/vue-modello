import modelDirective from './modelDirective'
import { createModel } from './Model'
import makeVueMixin from './makeVueMixin'

const MODEL_EVENTS = [
  'init',
  'created',
  'addModule'
]

export default class Modello {
  constructor () {
    this._ = {
      store: {},
      installed: false,
      model:createModel(),
      vuePlugin: makeVueMixin(this.getModel.bind(this)),
      events: new Map()
    }

    let events = this._.events

    this._fire = function (event, ...args) {
      if (events.has(event)) {
        let handlers = events.get(event)
        handlers.forEach(function (handler) {
          handler(...args)
        })
      }
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
    vue.use(modelDirective)

    this._.installed = true
  }

  getModel (model) {
    return this._.store[model]
  }

  use (plugin, ...args) {
    plugin.install(this, ...args)
  }

  reg (model) {
    let Model = this.Model

    if (!(model instanceof Model)) {

      model.events = {}
      MODEL_EVENTS.forEach(event => {
        model.events[event] = this._fire.bind(null, event)
      })

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

  on (event, handler) {
    if (event === 'mixed') {
      event = 'addModule'
    }

    let events = this._.events

    if (!events.has(event)) {
      /* eslint-disable no-undef */
      events.set(event, new Set())
    }

    let observers = events.get(event)
    observers.add(handler)
  }

  off (event, handler) {
    let events = this._.events

    if (events.has(event)) {
      let handlers = events.get(event)
      if (handlers.has(handler)) {
        handlers.delete(handler)
      }
    }
  }
}
