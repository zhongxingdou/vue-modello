const DEFAULT_MODULE = 'default'

import ModelloModule from './module'

const MODEL_OPTION_KEYS = [
  'modelName',
  'modules',
  'mixins',
  'events'
]

export default class Model {
  constructor (option) {
    let events = option.events || {}
    events.init && events.init(this, option)

    this._ = {
      name: option.modelName,
      option: option,
      modules: new Map()
    }

    let { modules, mixins } = option
    if (!modules && mixins) {
      modules = mixins
    }
    if (!modules) modules = {}

    let defaultModuleOption = { ...option }
    MODEL_OPTION_KEYS.forEach(_ => {
      delete defaultModuleOption[_]
    })
    modules[DEFAULT_MODULE] = defaultModuleOption

    for (let moduleName in modules) {
      let moduleOption = modules[moduleName]

      if (events.addModule) {
        events.addModule(this, moduleName, moduleOption)
      }

      this.addModule(moduleName, moduleOption)
    }

    events.created && events.created(this)
  }

  get modelName () {
    return this._.name
  }

  get moduleNames () {
    return this._.modules.keys()
  }

  addModule (moduleName, option) {
    let module = new ModelloModule(option)
    if (!this._.modules.has(moduleName)) {
      this._.modules.set(moduleName, module)
    }
  }

  getModule (moduleName) {
    return this._.modules.get(moduleName)
  }
}
