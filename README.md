# Vue-modello

## Install
```bash
npm install vue-modello --save
```

## Usage

### define model

#### define student list sub module of model

studentList.js
```javascript
export default {
  state: function () {
    return {
      total: 0,
      records: []
    }
  },
  actions: {
    loadStudentByPage: function ({ dispatch }, pager) {
      $.post('/path/to/student', pager).then((response) => {
        dispatch('updateStudentList', response.total, response.students)
      })
    }
  },
  mutations: {
    updateStudentList: function (state, total, students) {
      state.total = total
      state.records = students
    }
  }
}
```

#### define student sub module of model

student.js
```javascript
export default {
  state: function () {
    return {
      name: '',
      gender: 0,
      birthday: null
    }
  },
  actions: {
    uploadAvatar: function ({dispatch, service}, avatarPhoto) {
      service.uploadImage(avatarPhoto).then((imageUrl) => {
        dispatch('updateAvatar', imageUrl)
      })
    }
  },
  mutations: {
    updateAvatar: function (state, avatarUrl) {
      state.avatar = avatarUrl
    }
  }
}
```

### define model and mixin sub modules

model.js
```javascript
import student from './student'
import studentList from './studentList'

export default {
  modelName: 'Student',
  mixins: {
    student: student,
    studentList: studentList
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
    },
    uploadImage (image) {
      let data = new FormData()
      data.append({image: image})
      return $.post('/path/to/upload', data).then((response) => {
        return response.imageUrl
      })
    }
  }
}
```

### register model
```javascript
import VueModello from 'vue-modello'
import Student from './path/to/models/student/model'

VueModello.reg(Student)
```

### use model in edit page
```javascript
import VueModello from 'vue-modello'
let StudentModel = VueModello.get('Student')

export default {
  mixins: [VueModello.vueMixin],
  model: {
    model: StudentModel,
    states: ['student'],
    dataPath: 'state'
  },
  data: {
    provinces: [],
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
import VueModello from 'vue-modello'
let StudentModel = VueModello.get('Student')

export default {
  mixins: [VueModello.vueMixin],
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
