# obj-validation

## Document
Visit [document](http://zhongxingdou.github.io/obj-validation/)

## Usage
```javascript
var ObjValidation = require('obj-validation')

var rules = {
    name: {
        type: String,
        length:  8
    },
    age: {
        type: Number,
        max: 150
    }
}

var obj = {
    name: 'hal.zhong',
    age: 10000
}

var validator = new ObjValidation(rules, obj)

if(!validator.validate()){
    var errors = validator.getErrors()
    errors.forEach(function(msg){
        console.error(msg)
    })
    // =>
    // should at least 8 characters
    // should less than or equal to 150
}
```


## Development
### install global tools
`npm install rollup mocha -g`

### install npm for development
`npm install`

### build
`npm run build`

### run a auto build service
`npm run dev`

### run test
`npm test`
