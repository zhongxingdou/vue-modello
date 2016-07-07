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
  service: {
    getProvinces () {
      return $.post('/path/to/provinces')
    }
  },
  actions: {
    student: {
      uploadAvatar: function (model, avatarPhoto) {
        let formData = new FormData()
        formData.append('image', avatarPhoto)

        $.post('/path/to/uploadPhoto', formData).then((response) => {
          model.dispatch('updateAvatar', response.imageUrl)
        })
      }
    },
    studentList: {
      loadStudentByPage: function (model, pager) {
        $.post('/path/to/student', pager).then((response) => {
          model.dispatch('updateStudentList', response.total, response.students)
        })
      }
    }
  },
  mutations: {
    student: {
      updateAvatar: function (state, avatarUrl) {
        state.avatar = avatarUrl
      }
    }
    studentList: {
      updateStudentList: function (state, total, students) {
        state.total = total
        state.records = students
      }
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
    states: ['student'],
    dataPath: 'state'
  },
  data: {
    provinces: [],
    student: StudentModel.defaults(),
    state: StudentModel.getState(['student'])
  },
  created () {
    this.$model.getProvinces().then(res => {this.provinces = res.provinces})
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
    states: ['studentList'],
    dataPath: 'state'
  },
  data: {
    pager: {
      total: 0,
      pageIndex: 1
    },
    provinces: [],
    state: StudentModel.getState(['studentList'])
  },
  created () {
    this.$model.loadStudentByPage(this.pager)
    this.$model.getProvinces().then(res => {this.provinces = res.provinces})
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
