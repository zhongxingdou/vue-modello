import writerState from './writerState'

const DEFAULT_MODULE = 'default'

export function makeActionContext (mutations, state, dispatch) {
  let commit = makeCommitFn(state, mutations)
  return {
    state,
    dispatch,
    commit
  }
}

export function makeCommitFn (state, mutations) {
  return function (mutationName) {
    if (mutations.hasOwnProperty(mutationName)) {
      let args = Array.from(arguments)
      args.shift() // mutation name
      args.unshift(state)

      try {
        writerState.isMutationWriting = true
        mutations[mutationName].apply(null, args)
      } finally {
        writerState.isMutationWriting = false
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

export function parseOptionStates (states = []) {
  let simpleStates = []
  let partialStates = []
  let allStates = []
  let partialStateMap = {}

  if (states.length === 0) {
    simpleStates.unshift(DEFAULT_MODULE)
  } else {
    simpleStates = states.filter(s => {
      let isString = typeof(s) === 'string'
      return isString && !s.includes('.')
    })

    states.forEach(s => {
      let sType = typeof(s)
      if (sType === 'object') {
        Object.assign(partialStateMap, s)
      } else if(sType === 'string' && s.includes('.')) {
        let pathes = s.split('.')
        let moduleName = pathes.shift()
        let moduleStates = partialStateMap[moduleName] || (partialStateMap[moduleName]=[])
        moduleStates.push(pathes.join('.'))
      }
    })

    partialStates = Object.keys(partialStateMap)
  }

  allStates = simpleStates.concat(partialStates)

  return {
    allStates,
    simpleStates,
    partialStates,
    partialStateMap
  }
}