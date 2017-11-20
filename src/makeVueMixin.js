import {
  parseStatesOption,
  getObjByPath,
  setObjByPath,
  makeError
} from './util'

import writerState from './writerState'

const DEFAULT_MODULE = 'default'

const DOT = '.'

export default function (getModel) {
  return {
    init() {
      let vm = this
      let config = vm.$options.modello
      if (!config) return

      let models = [].concat(config)

      let computed = vm.$options.computed
      if (!computed) {
        computed = vm.$options.computed = {}
      }

      let existsDefaultModel = false

      models.forEach((modelOption) => {
        let {
          model,
          actions,
          mutations = [],
          getters = {},
          actionAlias = {},
          mutationAlias = {}
        } = modelOption

        let modelName = model
        model = getModel(modelName)

        if (model === undefined) {
          throw makeError(`model "${modelName}" unregistered!`)
        }

        // inject computed
        if (getters) {
          for (let computedName in getters) {
            let path = getters[computedName]
            computed[computedName] =
              new Function(
                `return this.${modelName}.${path}`
              )
          }
        }

        let needInjectModules = modelOption.states
        if (!modelOption.states) {
          needInjectModules = [DEFAULT_MODULE]
        } else {
          needInjectModules =
            parseStatesOption(modelOption.states).needInjectModules
        }

        // inject actions and mutations to vm.$model
        let methods = {}
        needInjectModules.forEach(function (moduleName) {
          let module = model.getModule(moduleName)
          let statePath = modelName
          if (moduleName !== DEFAULT_MODULE) {
            statePath += DOT + moduleName
          }

          let getState = function () {
            return vm.$get(statePath)
          }
          // all mudule actio

          // inject actionsns will auto inject if no givens
          if (actions !== false) {
            let modelActions = model.getActions()
            let injectActions = []

            let muduleActions = Array.isArray(actions)
              ? actions : actions[moduleName]

            let type = Array.isArray(muduleActions)
              ? 'array' : typeof(muduleActions)

            switch(type) {
              case 'array':
                injectActions = actions
                break
              case 'boolean':
                if (muduleActions === false) {
                  injectActions = []
                }
                break
            }

            injectActions = injectActions.filter(_ => modelActions.includes(_))

            if (injectActions.length) {
              injectActions.forEach(action => {
                let methodName = actionAlias[action] || action
                if (methods.hasOwnProperty(methodName)) {
                  throw makeError('exists $model.' + methodName + ', please alias it.')
                } else {
                  methods[methodName] = model.dispatch.bind(model, getState, action)
                }
              })
            }
          }

          // inject mutations
          // mutation wont auto inject if no given
          if (Array.isArray(mutations) && mutations.length) {
            let moduleMutations = module.getMutations()
            let injectMutations = mutations.filter(_ => moduleMutations.includes(_))

            if (injectMutations.length) {
              injectMutations.forEach(mutation => {
                let methodName = mutationAlias[mutation] || mutation
                if (methods.hasOwnProperty(methodName)) {
                  throw makeError('exists $model.' + methodName + ', please alias it.')
                } else {
                  methods[methodName] = model.commit.bind(model, getState, mutation)
                }
              })
            }
          }
        })

        if ((modelOption.default || models.length === 1)
          && !existsDefaultModel) {
          existsDefaultModel = true
          vm.$model = Object.assign({}, methods)
        } else {
          for (let m in methods) {
            if (vm.$model.hasOwnProperty(m)) {
              throw makeError('exists $model.' + m + ', please alias it.')
            } else {
              vm.$model[m] = methods[m]
            }
          }
        }
      })
    },

    data() {
      let config = this.$options.modello
      if (!config) return

      let models = [].concat(config)

      let result = {}
      models.forEach((option) => {
        let model = getModel(option.model)
        let modelState = result[model.modelName] = {}
        let optionStates = option.states || [DEFAULT_MODULE]
        let { fullInjectModules, partialInjectPathesMap } = parseStatesOption(optionStates)

        // states: [{newPage: ['workorder', 'xxxx'}]
        for (let module in partialInjectPathesMap) {
          let isDefaultMod = module === DEFAULT_MODULE
          let modState, filterState, setTarget

          if (isDefaultMod) {
            modState = model.getDefaultModuleState()
            setTarget = filterState = {}
          } else {
            modState = model.getModuleState(module)
            filterState = {
              [module]: {}
            }
            setTarget = filterState[module]
          }

          partialInjectPathesMap[module].forEach(path => {
            let value = getObjByPath(modState, path)
            setObjByPath(setTarget, path, value, true)
          })

          Object.assign(modelState, filterState)
        }

        Object.assign(modelState, model.getStateOfMutations(fullInjectModules))
      })

      return result
    },

    created() {
      let config = this.$options.modello
      if (!config) return

      let models = [].concat(config)

      let vm = this

      models.forEach(function (option) {
        let model = getModel(option.model)
        let modelName = model.modelName
        let optionStates = option.states || [DEFAULT_MODULE]
        let { needInjectModules } = parseStatesOption(optionStates)

        let showMutateWarning = function () {
          const isFirstMutate = arguments.length === 1
          if (isFirstMutate) return

          if (!writerState.isVModelDirWriting && !writerState.isMutationWriting) {
            console.warn('[vue-modello] Do not mutate modello state outside mutation handlers!')
          }
        }

        vm.$watch(model.modelName, showMutateWarning, {
          deep: true,
          immediate: true,
          sync: true
        })

        // handle watch
        model.eachStateWatch(needInjectModules, function (state, watchEach) {
          let statePath = modelName
          if (state !== DEFAULT_MODULE) {
            statePath += '.' + state
          }

          let statePrefix = statePath + '.'
          let len = statePrefix.length

          watchEach(function (path, action, option) {
            let listenOrWatch = vm.$listen ? '$listen' : '$watch'
            let watchPath = path === '$state' ? statePath : statePrefix + path

            vm[listenOrWatch](watchPath, function (val, oldVal, path) {
              if (path) {
                path = {
                  absolute: path.absolute.substr(len),
                  relative: path.relative
                }
              }

              let getState = () => {
                return this.$get(statePath)
              }

              model.dispatch(getState, action, val, oldVal, path)
            }, option)
          }) // end for stateWatch
        }) // end eachWatch
      }) // models.forEach
    } // created
  }
}
