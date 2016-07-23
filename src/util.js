export function makeActionContext (mutations, state, service) {
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
