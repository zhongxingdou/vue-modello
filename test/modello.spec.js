import should from 'should'
import sinon from 'sinon'
import { createModel } from '../src/Model'
import Modello from '../src/index'

describe('Modello', function () {
  let modello = new Modello()
  describe.skip('Binding', function () {
    const bindingModelName = 'A'
    const modelBName = 'B'
    const prop = 'prop'
    const prop2 = 'prop2'

    it('should merge binding rule', function () {
      const rule1 = { required: true }
      const rules1 = { ...rule1 }

      const ruleInA = { required: true }
      const rules2 = { ...ruleInA}

      const ruleInB = { length: 5}
      const rules3 = { ...ruleInB}


      let ModelA = {
        modelName: bindingModelName,
        properties: {
          [prop]: {
            type: String
          },
          [prop2]: {
            type: Number
          }
        },
        rules: {
          [prop]: rules1,
          [prop2]: rules2
        }
      }
      modello.reg(ModelA)

      let ModelB = {
        modelName: modelBName,
        properties: {
          [prop]: {
            type: String
          },
          [prop2]: {
            type: Number
          }
        },
        rules: {
          [prop2]: rules3
        },
        binding: {
          modelName: bindingModelName,
          propMap: {
            [prop]: prop,
            [prop2]: prop2
          }
        }
      }
      modello.reg(ModelB)

      let a = modello.get(bindingModelName)
      let aRule = a.getPropRule(prop)
      aRule.should.eql(rule1)

      let b = modello.get(modelBName)
      let bRule = b.getPropRule(prop)
      bRule.should.eql(aRule)

      let bRule2 = b.getPropRule(prop2)
      bRule2.should.have.properties(Object.keys(ruleInA))
      bRule2.should.have.properties(Object.keys(ruleInB))
    })

    it('should not merge unbinding rule', function () {
      const prop3 = 'prop3'
      const bindingModelName = 'A'
      const modelBName = 'B'

      const rule1 = { required: true }
      const rules1 = { ...rule1 }

      let ModelA = {
        modelName: bindingModelName,
        properties: {
          [prop3]: {
            type: Date
          }
        },
        rules: {
          [prop3]: rules1
        }
      }
      modello.reg(ModelA)

      let ModelB = {
        modelName: modelBName,
        properties: {},
        rules: {},
        binding: {
          modelName: bindingModelName,
          propMap: {}
        }
      }
      modello.reg(ModelB)

      let b = modello.get(modelBName)
      let cRule = b.getPropRule(prop3)
      should(cRule).be.undefined()
    })

    it('should binding label', function () {
      const propLabel = 'label1'
      let ModelA = {
        modelName: bindingModelName,
        properties: {
          [prop]: {
            label: propLabel,
            type: String
          }
        }
      }
      modello.reg(ModelA)

      let ModelB = {
        modelName: modelBName,
        properties: {
          [prop]: {
            type: String
          }
        },
        binding: {
          modelName: bindingModelName,
          propMap: {
            [prop]: prop
          }
        }
      }
      modello.reg(ModelB)

      let b = modello.get(modelBName)
      should(b.getPropLabel(prop)).equal(propLabel)
    })

    it('should not binding label if defined by self', function () {
      const propLabel = 'label1'
      let ModelA = {
        modelName: bindingModelName,
        properties: {
          [prop]: {
            label: propLabel,
            type: String
          }
        }
      }
      modello.reg(ModelA)

      const modelCName = 'C'
      const propLabelInC = 'CPropLabel'
      let ModelC = {
        modelName: modelCName,
        properties: {
          [prop]: {
            label: propLabelInC,
            type: String
          }
        },
        binding: {
          modelName: bindingModelName,
          propMap: {
            [prop]: prop
          }
        }
      }
      modello.reg(ModelC)

      let c = modello.get(modelCName)
      should(c.getPropLabel(prop)).equal(propLabelInC)

      modello.unReg(modelCName)
    })

    it('should merge binding defaults', function () {
      const strDefaults = 'defaults'
      const key1 = 'key1'
      const key2 = 'key2'

      let objDefaults = {
        [key1]: key1
      }
      let objDefaults2 = {
        [key2]: key2
      }

      let ModelA = {
        modelName: bindingModelName,
        properties: {
          [prop]: {
            type: String,
            defaultValue: strDefaults
          },
          [prop2]: {
            type: Object,
            defaultValue: objDefaults
          }
        }
      }
      modello.reg(ModelA)

      let ModelB = {
        modelName: modelBName,
        properties: {
          [prop]: {
            type: String
          },
          [prop2]: {
            type: Object,
            defaultValue: objDefaults2
          }
        },
        binding: {
          modelName: bindingModelName,
          propMap: {
            [prop]: prop,
            [prop2]: prop2
          }
        }
      }
      modello.reg(ModelB)

      let b = modello.get(modelBName)
      should(b.getPropDefaults(prop)).equal(strDefaults)

      should(b.getPropDefaults(prop2)).eql(objDefaults2)
    })

    afterEach(function () {
      modello.unReg(bindingModelName)
      modello.unReg(modelBName)
    })
  })

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

  it.skip('auto set defaults for value types property', function () {
    let desc = {
      properties: {
        'name': {
          type: String
        },
        'gender': {
          type: Boolean
        },
        'age': {
          type: Number
        }
      }
    }

    let A = new Model(desc)
    should(A.getPropDefaults('name')).equal('')
    should(A.getPropDefaults('gender')).equal(true)
    should(A.getPropDefaults('age')).equal(0)
  })

  it('applyAction() normal', function () {
    let action = sinon.spy()
    let option = {
      modelName: 'Student',
      actions: {
        bar: action
      }
    }
    let Model = createModel()

    let A = new Model(option)

    let args = ['a', 'b']
    A.applyAction('default', 'bar', args)

    action.calledWith(...args).should.be.true()
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
})
