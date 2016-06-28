import babel from 'rollup-plugin-babel'
import babelrc from 'babelrc-rollup'

export default {
  entry: 'src/index.js',
  dest: 'dist/vueModel.js',
  format: 'umd',
  moduleName: 'VueModel',
  plugins: [ babel(babelrc()) ]
}
