import writerState from './writerState'

export default class ModelloModule {
  constructor ({actions, mutations, watch, state}) {
    this._ = {
      state: new Function,
      actions: new Map(),
      mutations: new Map(),
      watchers: new Map()
    }

    for(let key in actions) {
      this.addAction(key, actions[key])
    }

    for(let key in mutations) {
      this.addMutation(key, mutations[key])
    }

    for(let path in watch) {
      this.addWatcher(path, watch[path])
    }

    this.state = state
  }

  get state() {
    return this._.state
  }

  set state(state) {
    this._.state = state
  }

  addAction (key, action) {
    if (!this._.actions.has(key)) {
      this._.actions.set(key, action)
    }
  }

  removeAction (key) {
    this._.actions.delete(key)
  }

  getActions () {
    return this._.actions.keys()
  }

  addMutation (key, mutation) {
    if (!this._.mutations.has(key)) {
      this._.mutations.set(key, mutation)
    }
  }

  removeMutation (key) {
    this._.mutations.delete(key)
  }

  getMutations () {
    return this._.mutations.keys()
  }

  addWatch (path, option) {
    if (!this._.watchers.has(path)) {
      if (typeof option === 'function') {
        option = { handler: option }
      }

      this._.watchers.set(path, option)
    }
  }

  eachWatch (eachHandler) {
    this._.watchers.forEach((option, path) => {
      eachHandler(path, option)
    })
  }

  applyAction (action, args) {
    // @todo: warning if action be undefined
    return this._.actions[action].apply(null, args)
  }

  commit (getState, mutation, ...args) {
    try {
      writerState.isMutationWriting = true
      // @todo: warning if mutation be undefined
      this._.mutations[mutation].call(null, getState(), ...args)
    } finally {
      writerState.isMutationWriting = false
    }
  }

  dispatch (getState, action, ...args) {
    let context = {
      state: getState(),
      commit: this.commit.bind(this, getState),
      dispatch: this.dispatch.bind(this, getState)
    }
    return this.applyAction(action, context, ...args)
  }
}
