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

export function getObjByPath (obj, path) {
  let names = path.split('.')
  let firstName = names.shift()
  let member = obj[firstName]
  if (member && names.length) {
    return getObjByPath(member, names.join('.'))
  }
  return member
}

export function createPathIfNone (obj, path) {
  let names = path.split('.')
  let firstName = names.shift()
  let member = obj[firstName]
  if (!member) member = obj[firstName] = {}
  if (names.length) {
    return createPathIfNone(member, names.join('.'))
  }
  return member
}

export function setObjByPath (obj, path, val, createPath) {
  let names = path.split('.')
  let lastName = names.pop()
  let parent = obj

  if (names.length) {
    let parentPath = names.join('.')
    parent = createPath === true
      ? createPathIfNone(obj, parentPath)
      : getObjByPath(obj, parentPath)
  }

  if (parent) {
    parent[lastName] = val
  }
}
