import should from 'should'
import sinon from 'sinon'
import { createModel } from '../src/Model'
import Modello from '../src/index'
import Vue from 'vue'

describe('Modello', function () {
  let modello = new Modello()
  let modelloMixin = modello.vueMixin()

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
    modello.reg({
      modelName: 'TestModel',
      mixins: {
        subMod: {
          state () {
            return {
              baz: {
                msg: moduleBazVal
              }
            }
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
      }
    })

    it('state be an object dot path should normal', function (done) {
      let vm = new Vue({
        mixins: [ modelloMixin ],
        modello: [{
          model: 'TestModel',
          states: ['default.root.foo.bar', 'subMod.baz.msg']
        }]
      })

      setTimeout(function () {
        should(vm.TestModel.root.foo.bar).equal(rootFooBarVal)
        should(vm.TestModel.subMod.baz.msg).equal(moduleBazVal)
        should(vm.TestModel.root2).be.undefined()
        should(vm.TestModel.root.foo2).be.undefined()
        vm = null
        done()
      })
    })

    it('getters should normal', function (done) {
      let vm = new Vue({
        mixins: [ modelloMixin ],
        modello: [{
          model: 'TestModel',
          states: ['default', 'subMod'],
          getters: {
            bar: 'root.foo.bar',
            baz: 'subMod.baz.msg'
          }
        }]
      })

      setTimeout(function () {
        should(vm.bar).equal(rootFooBarVal)
        should(vm.baz).equal(moduleBazVal)
        vm = null
        done()
      })
    })
  })
})
