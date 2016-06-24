# Vue-model

## Install
```bash
npm install vue-model --save
```

## Usage

### define model

Student.js
```javascript
export default {
  modelName: 'Student',
  properties: {
    name: {
      label: 'Full name',
      type: String
    },
    birthday: {
      label: 'Birthday',
      type: Date
    },
    avatar: {
      label: 'Avatar',
      type: String
    }
  },
  rules: {
    name: {
      required: true,
      length: {
        min: 5,
        max: 100
      }
    },
    birthday: {
      required: true
    }
  },
  actions: {
    uploadAvatar: function (model, avatarPhoto) {
      let formData = new FormData()
      formData.append('image', avatarPhoto)
      
      $.ajax({
        type: 'post',
        url: '/path/to/uploadPhoto',
        data: formData
      }).then((response) => {
        model.dispatch('updateAvatar', response.imageUrl)
      })
    }
  },
  mutations: {
    updateAvatar: function (model, avatarUrl) {
      model.avatar = avatarUrl
    }
  }
}
```

### register model
```javascript
import VueModel from 'vue-model'
import Student from './path/to/Student'

VueModel.reg(Student)
```

### use model in Vue component
```javascript
import VueModel from 'vue-model'
let StudentModel = VueModel.get('Student')

new Vue({
  mixins: [VueModel.vueMixin],
  model: {
    model: StudentModel,
    actions: ['uploadAvatar'],
    dataPath: 'student'
  },
  el: '#demo',
  data: {
    student: StudentModel.defaults()
  },
  methods: {
    uploadAvatar () {
      let avatarPhoto = this.$els.avatar.files[0]
      this.$model.uploadAvatar(avatarPhoto)
    }
  }
})
```

## Development
### install global tools
`npm install rollup mocha -g`

### install npm for development
`npm install`

### build
`npm run build`

### run test
`npm test`
