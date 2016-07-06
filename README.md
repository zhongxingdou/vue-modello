# Vue-modello

## Install
```bash
npm install vue-modello --save
```

## Usage

### define model
Student.js
```javascript
export default {
  modelName: 'Student',
  state: function () {
    return {
      student: {},
      studentList: {
        total: 0,
        records: []
      }
    }
  },
  properties: {
    name: {
      label: 'Full name',
      type: String,
      defaultValue: ''
    },
    birthday: {
      label: 'Birthday',
      type: Date,
      defaultValue: null
    },
    avatar: {
      label: 'Avatar',
      type: String,
      defaultValue: ''
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

      $.post('/path/to/uploadPhoto', formData).then((response) => {
        model.dispatch('updateAvatar', response.imageUrl)
      })
    },
    loadStudentByPage: function (model, pager) {
      $.post('/path/to/uploadPhoto', pager).then((response) => {
        model.dispatch('updateStudentList', response.total, response.students)
      })
    }
  },
  mutations: {
    updateAvatar: function (state, avatarUrl) {
      state.student.avatar = avatarUrl
    },
    updateStudentList: function (state, total, students) {
      state.studentList.total = total
      state.studentList.records = students
    }
  }
}
```

### register model
```javascript
import VueModel from 'vue-modello'
import Student from './path/to/Student'

VueModel.reg(Student)
```

### use model in edit page
```javascript
import VueModel from 'vue-modello'
let StudentModel = VueModel.get('Student')

export default {
  mixins: [VueModel.vueMixin],
  model: {
    model: StudentModel,
    actions: ['uploadAvatar'],
    dataPath: 'state'
  },
  data: {
    student: StudentModel.defaults()
    state: StudentModel.getState(['student'])
  },
  methods: {
    uploadAvatar () {
      let avatarPhoto = this.$els.avatar.files[0]
      this.$model.uploadAvatar(avatarPhoto)
    }
  }
}
```

### use model in list page
```javascript
import VueModel from 'vue-modello'
let StudentModel = VueModel.get('Student')

export default {
  mixins: [VueModel.vueMixin],
  model: {
    model: StudentModel,
    actions: ['loadStudentByPage'],
    dataPath: 'state'
  },
  data: {
    pager: {
      total: 0,
      pageIndex: 1
    },
    state: StudentModel.getState(['studentList'])
  },
  created () {
    this.$model.loadStudentByPage(this.pager)
  }
}
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
