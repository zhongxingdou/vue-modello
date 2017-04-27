import {
  makeActionContext,
  parseOptionStates,
  makeCommitFn,
  getObjByPath,
  setObjByPath
} from './util'

import writerState from './writerState'

const DEFAULT_MODULE = 'default'

function makeActionDispatcher (vm, model, state, statePath) {
  let mutations = model.getStateMutations(state)

  return function dispatch(action) {
    let context = makeActionContext(
      mutations,
      vm.$get(statePath),
      dispatch
    )

    let args = Array.from(arguments)
    args.shift()
    args.unshift(context)

    let result = model.applyAction(state, action, args)
    if (result && result.then) {
      return result
    }
  }
}

export default function (getModel) {
    return {
      init () {
        let vm = this
        let config = this.$options.modello
        let computed = this.$options.computed || (this.$options.computed = {})
        if (!config) return

        let models = [].concat(config)

        let existsDefaultModel = false
        models.forEach((modelOption) => {
          let { model, actions, mutations=[], getters={}, actionAlias={}, mutationAlias={} } = modelOption

          model = getModel(model)
          let states = modelOption.states
          if (!modelOption.states) {
            states = [DEFAULT_MODULE]
          } else {
            states = parseOptionStates(modelOption.states).allStates
          }
          
          let modelName = model.modelName

          // inject computed
          if (getters) {
            for(let computedName in getters) {
              computed[computedName] = new Function('return this.' + modelName + '.' + getters[computedName])
            }
          }
          // actionMethod ({commit(mutation, ...args), state, dispatch(action, ...args)}, ...args)
          // mutationMethod (state, ...args)
          // inject actions and mutations as Vue method
          let methods = {}
          states.forEach(function (state) {
            let statePath = modelName
            if (state !== DEFAULT_MODULE) {
              statePath += '.' + state
            }

            // inject actions
            // all mudule actions will auto inject if no givens
            if (actions !== false) {
              let stateAllActions = Object.keys(model.getStateActions(state))
              let injectActions = stateAllActions

              if (Array.isArray(actions)) {
                injectActions = actions.filter(_ => stateAllActions.includes(_))
              } else if(typeof actions === 'object' && actions.hasOwnProperty(state)) {
                let stateActions = actions[state]
                if(Array.isArray(stateActions)) {
                  injectActions = stateActions.filter(_ => stateAllActions.includes(_))
                } else if(stateActions === false) {
                  injectActions = []
                }
              }
 
              if (injectActions.length) {
                let dispatch = makeActionDispatcher(vm, model, state, statePath)

                injectActions.forEach(action => {
                  let methodName = actionAlias[action] || action
                  methods[methodName] = dispatch.bind(null, action)
                })
              }
            }

            // inject mutations
            // mutation wont auto inject if no given
            if (Array.isArray(mutations) && mutations.length) {
              let stateMutations = model.getStateMutations(state)
              let stateMutationsNames = Object.keys(stateMutations)
              let injectMutations = mutations.filter(_ => stateMutationsNames.includes(_))

              if (injectMutations.length) {
                let stateCommit = function (...args) {
                  makeCommitFn(vm.$get(statePath), stateMutations)(...args)
                }
                injectMutations.forEach(mutation => {
                  if (!methods.hasOwnProperty(mutation)) {
                    let methodName = mutationAlias[mutation] || mutation
                    methods[methodName] = stateCommit.bind(null, mutation)
                  }
                })
              }
            }
          })

          if((modelOption.default || models.length === 1)
              && !existsDefaultModel){
            existsDefaultModel = true
            vm.$model = Object.assign({}, methods)
          } else {
            for(let m in methods) {
              if (!vm.$model[m]) {
                vm.$model[m] = methods[m]
              }
            }
          }
          vm.$model[modelName] = methods
        })
      },

      data () {
        let config = this.$options.modello
        if (!config) return

        let models = [].concat(config)

        let result = {}
        models.forEach((option) => {
          let model = getModel(option.model)
          let modelState = result[model.modelName] = {}
          let optionStates = option.states || [DEFAULT_MODULE]
          let { simpleStates, partialStateMap } = parseOptionStates(optionStates)

          // states: [{newPage: ['workorder', 'xxxx'}]
          for(let mod in partialStateMap) {
            let isDefaultMod = mod === DEFAULT_MODULE
            let modState, filterState, setTarget

            if (isDefaultMod) {
              modState = model.getState(DEFAULT_MODULE)
              setTarget = filterState = {}
            } else {
              modState = model.getState(mod)[mod]
              filterState = {
                [mod]: {}
              }
              setTarget = filterState[mod]
            }

            partialStateMap[mod].forEach(path => {
              let value = getObjByPath(modState, path)
              setObjByPath(setTarget, path, value, true)
            })

            Object.assign(modelState, filterState)
          }

          Object.assign(modelState, model.getState(simpleStates))
        })

        return result
      },

      created () {
        let config = this.$options.modello
        if (!config) return

        let models = [].concat(config)

        let vm = this

        models.forEach(function (option) {
          let model = getModel(option.model)
          let modelName = model.modelName
          let optionStates = option.states || [DEFAULT_MODULE]
          let { allStates } = parseOptionStates(optionStates)

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
          model.eachStateWatch(allStates, function (state, watchEach) {
            let statePath = modelName
            if (state !== DEFAULT_MODULE) {
              statePath += '.' + state
            }

            let dispatch = makeActionDispatcher(vm, model, state, statePath)

            let statePrefix = statePath + '.'
            let len = statePrefix.length

            watchEach(function (path, handler, option) {
              let listenOrWatch = vm.$listen ? '$listen' : '$watch'
              let watchPath = path === '$state' ? statePath : statePrefix + path

              vm[listenOrWatch](watchPath, function (val, oldVal, path) {
                let mutations = model.getStateMutations(state)
                let context = makeActionContext(
                  mutations,
                  vm.$get(statePath),
                  dispatch
                )

                if (path) {
                  path = {
                    absolute: path.absolute.substr(len),
                    relative: path.relative
                  }
                }

                handler(context, val, oldVal, path)
              }, option)
            }) // end for stateWatch
          }) // end eachWatch
        }) // models.forEach
      } // created
    }
  }