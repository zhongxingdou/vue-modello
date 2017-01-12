import writerState from './writerState'

export function makeActionContext (mutations, state, dispatch) {
  return {
    state,
    dispatch,
    commit (mutationName) {
      if (mutations.hasOwnProperty(mutationName)) {
        let args = Array.from(arguments)
        args.shift() // mutation name
        args.unshift(state)

        let result = null
        try {
          writerState.isMutationWriting = true
          result = mutations[mutationName].apply(null, args)
        } finally {
          writerState.isMutationWriting = false
        }

        return result
      }
    }
  }
}
