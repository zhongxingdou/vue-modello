import should from 'should'
import sinon from 'sinon'
import { createModel } from '../src/Model'
import Modello from '../src/index'
import Vue from 'vue'

describe('Modello', function () {
  let modello = new Modello()

  it('should reg() normal', function () {
    let modelName = 'A'
    let A = {
      modelName: modelName
    }

    modello.reg(A)

    let a = modello.getModel(modelName)
    should(a).not.null()
    should(a.modelName).equal(modelName)
    should(a).instanceof(modello.Model)
  })

  it('should unReg() normal', function () {
    let modelName = 'A'
    let A = {
      modelName: modelName
    }

    modello.reg(A)
    modello.unReg(modelName)

    should(modello.getModel(modelName)).be.undefined()
  })

  it('on() normal', function () {
    let event = 'myEvent'
    let handler = sinon.spy()
    let args = ['p1', {}]
    let Model = createModel()

    Model.on(event, handler)
    Model.fire(event, ...args)

    sinon.assert.calledWith(handler, ...args)
  })

  it('should has different event map for each modello instance', function () {
    let m1 = new Modello()
    let m2 = new Modello()

    should(m1.Model).not.be.undefined()
    should(m2.Model).not.be.undefined()
    should(m1.Model).not.equal(m2.Model)
  })

  describe('modello option', function () {
    const rootFooBarVal = 'rootFooBar'
    const moduleBazVal = 'moduleBaz'
    const defaultModAction1 = function () {}
    const defaultModAction2 = function () {}
    const defaultModMutation1 = function () {}
    const defaultModMutation2 = function () {}
    const subModAction1 = function () {}
    const subModAction2 = function () {}
    const subModMutation1 = function () {}
    const subModMutation2 = function () {}

    let model = {
      modelName: 'TestModel',
      mixins: {
        subMod: {
          state () {
            return {
              baz: {
                msg: moduleBazVal
              }
            }
          },

          actions: {
            subModAction1,
            subModAction2
          },

          mutations: {
            subModMutation2,
            subModMutation1
          }
        }
      },

      state () {
        return {
          root: {
            foo: {
              bar: rootFooBarVal
            },
            foo2: {}
          },
          root2: {}
        }
      },

      actions: {
        defaultModAction1,
        defaultModAction2
      },

      mutations: {
        defaultModMutation1,
        defaultModMutation2
      }
    }
    modello.reg(model)

    it('state be an object dot path should normal', function () {
      let vm = new Vue({
        mixins: [ modello.vuePlugin ],
        modello: [{
          model: 'TestModel',
          states: ['default.root.foo.bar', 'subMod.baz.msg']
        }]
      })

      should(vm.TestModel.root.foo.bar).equal(rootFooBarVal)
      should(vm.TestModel.subMod.baz.msg).equal(moduleBazVal)
      should(vm.TestModel.root2).be.undefined()
      should(vm.TestModel.root.foo2).be.undefined()
    })

    it('getters should normal', function () {
      let vm = new Vue({
        mixins: [ modello.vuePlugin ],
        modello: [{
          model: 'TestModel',
          states: ['default', 'subMod'],
          getters: {
            bar: 'root.foo.bar',
            baz: 'subMod.baz.msg'
          }
        }]
      })

      should(vm.bar).be.equal(rootFooBarVal)
      should(vm.baz).be.equal(moduleBazVal)
    })

    describe('modello.actions', function () {
      it('should inject all actions if actions option not present', function () {
        let vm = new Vue({
          mixins: [ modello.vuePlugin ],
          modello: [{
            model: 'TestModel'
          }]
        })

        should(vm.$model.defaultModAction1).be.a.Function()
        should(vm.$model.defaultModAction2).be.a.Function()
        should(vm.$model.subModAction1).be.a.undefined()
        should(vm.$model.subModAction2).be.a.undefined()
      })
      
      it('should not inject actions if actions option be false', function () {
        let vm = new Vue({
          mixins: [ modello.vuePlugin ],
          modello: [{
            model: 'TestModel',
            actions: false
          }]
        })

        should(vm.$model.defaultModAction1).be.undefined()
        should(vm.$model.defaultModAction2).be.undefined()
        should(vm.$model.subModAction1).be.undefined()
        should(vm.$model.subModAction2).be.undefined()
      })

      describe('be an array', function () {
        it('should inject given actions', function () {
          let vm = new Vue({
            mixins: [ modello.vuePlugin ],
            modello: [{
              model: 'TestModel',
              states: ['default', 'subMod'],
              actions: ['defaultModAction1', 'subModAction1']
            }]
          })

          should(vm.$model.defaultModAction1).be.a.Function()
          should(vm.$model.defaultModAction2).be.undefined()
          should(vm.$model.subModAction1).be.a.Function()
          should(vm.$model.subModAction2).be.undefined()
        })



        it('should not inject given actions if its belongs module state not given', function () {
          let vm = new Vue({
            mixins: [ modello.vuePlugin ],
            modello: [{
              model: 'TestModel',
              actions: ['subModAction1']
            }]
          })

          should(vm.$model.subModAction1).be.undefined()
        })
      })

      describe('be an object', function () {
        it('should inject module actions if module not present', function () {
          let vm = new Vue({
            mixins: [ modello.vuePlugin ],
            modello: [{
              model: 'TestModel',
              states: ['default', 'subMod'],
              actions: {}
            }]
          })

          should(vm.$model.defaultModAction1).be.a.Function()
          should(vm.$model.defaultModAction2).be.a.Function()
          should(vm.$model.subModAction1).be.a.Function()
          should(vm.$model.subModAction2).be.a.Function()
        })

        it('should inject given actions', function () {
          let vm = new Vue({
            mixins: [ modello.vuePlugin ],
            modello: [{
              model: 'TestModel',
              states: ['default', 'subMod'],
              actions: {
                'default': ['defaultModAction1'],
                'subMod': ['subModAction1']
              }
            }]
          })

          should(vm.$model.defaultModAction1).be.a.Function()
          should(vm.$model.defaultModAction2).be.undefined()
          should(vm.$model.subModAction1).be.a.Function()
          should(vm.$model.subModAction2).be.undefined()
        })

        it('should not inject if module actions be false', function () {
          let vm = new Vue({
            mixins: [ modello.vuePlugin ],
            modello: [{
              model: 'TestModel',
              states: ['default', 'subMod'],
              actions: {
                'default': ['defaultModAction1'],
                'subMod': false
              }
            }]
          })

          should(vm.$model.defaultModAction1).be.a.Function()
          should(vm.$model.defaultModAction2).be.undefined()
          should(vm.$model.subModAction1).be.undefined()
          should(vm.$model.subModAction2).be.undefined()
        })

        it('should not inject given actions if its belongs module state not given', function () {
          let vm = new Vue({
            mixins: [ modello.vuePlugin ],
            modello: [{
              model: 'TestModel',
              actions: {
                subMod: ['subModAction1']
              }
            }]
          })

          should(vm.$model.defaultModAction1).be.a.Function()
          should(vm.$model.subModAction1).be.undefined()
        })
      })
    })

    it('modello.actionAlias should normal', function () {
      let vm = new Vue({
        mixins: [modello.vuePlugin],
        modello: [{
          model: 'TestModel',
          actionAlias: {
            defaultModAction1: 'newAction1'
          }
        }]
      })

      should(vm.$model.newAction1).be.a.Function()
    })

    describe('modello.mutations', function () {
      it('should inject given mutations if be array', function () {
        let vm = new Vue({
          mixins: [modello.vuePlugin],
          modello: [{
            model: 'TestModel',
            mutations: ['defaultModMutation1']
          }]
        })

        should(vm.$model.defaultModMutation1).be.a.Function()
        should(vm.$model.defaultModMutation2).be.undefined()
      })

      it('should not inject given mutations if its belongs state not given', function () {
        let vm = new Vue({
          mixins: [modello.vuePlugin],
          modello: [{
            model: 'TestModel',
            mutations: ['subModMutation1']
          }]
        })

        should(vm.$model.subModMutation1).be.undefined()
      })
    })
  })
})
