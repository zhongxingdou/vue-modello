import babel from 'rollup-plugin-babel'

export default {
  entry: 'src/index.js',
  dest: 'dist/vueModel.js',
  format: 'umd',
  moduleName: 'VueModel',
  plugins: [ babel() ]
}
