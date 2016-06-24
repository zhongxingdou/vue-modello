export default class Model {
  constructor (modelDesc) {
    let { properties, rules } = modelDesc

    let defaultState = {}
    let labels = {}

    for (let prop in properties) {
      let propDesc = properties[prop]

      labels[prop] = propDesc.label

      let Type = propDesc.type
      if (propDesc.hasOwnProperty('defaultValue')) {
        defaultState[prop] = propDesc.defaultValue
      } else {
        if (Array.isArray(Type)) {
          defaultState[prop] = []
        } else {
          defaultState[prop] = new Type()
        }
      }
    }

    this.defaults = function () {
      return { ...defaultState }
    }

    this.getRules = function (prop) {
      if (prop) {
        return rules[prop]
      }

      return { ...rules }
    }

    this.getLabels = function (prop) {
      if (prop) {
        return labels[prop]
      }

      return { ...labels }
    }

    this.modelName = modelDesc.modelName
    this.mutations = modelDesc.mutations
    this.actions = modelDesc.actions
  }
}
