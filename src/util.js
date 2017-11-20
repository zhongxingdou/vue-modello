export function makeError(msg) {
  return new Error('[vue-modello]' + msg)
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

export function parseStatesOption (states = []) {
  let fullInjectModules = []
  let needInjectModules = []
  let partialInjectPathesMap = {}
  let statePathes = []

  states.forEach(s => {
    let type = typeof(s)
    if (type === 'string') {
      if (s.includes('.')) {
        statePathes.push(s)
      } else {
        fullInjectModules.push(s)
      }
    } else if (s && type === 'object') {
      Object.assign(partialInjectPathesMap, s)
    }
  })

  statePathes.forEach(s => {
    let pathes = s.split('.')
    let moduleName = pathes.shift()

    if (!fullInjectModules.includes(moduleName)) {
      let moduleStates = partialInjectPathesMap[moduleName] || (partialInjectPathesMap[moduleName]=[])
      moduleStates.push(pathes.join('.'))
    }
  })

  Object.keys(partialInjectPathesMap).forEach(module => {
    if (fullInjectModules.includes(module)) {
      delete partialInjectPathesMap[module]
    } else {
      needInjectModules.push(module)
    }
  })

  needInjectModules = needInjectModules.concat(fullInjectModules)

  return {
    needInjectModules,
    fullInjectModules,
    partialInjectPathesMap
  }
}
