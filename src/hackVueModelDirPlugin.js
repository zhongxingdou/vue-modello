import writerState from './writerState'

let installed = false
export default {
  install: function  (Vue) {
    if (installed) return
    installed = true

    var directive = Vue.directive('model')
    var _bind = directive.bind

    directive.bind = function () {
      _bind.call(this)

      let _setter = this.set
      this.set = function (...args) {
        try {
          writerState.isVModelDirWriting = true
          _setter.call(this, ...args)
        } finally {
          writerState.isVModelDirWriting = false
        }
      }
    }
  }
}
