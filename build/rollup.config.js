import babel from 'rollup-plugin-babel'
import babelrc from 'babelrc-rollup'

export default {
  entry: 'src/index.js',
  dest: 'dist/vueModello.js',
  format: 'umd',
  moduleName: 'VueModello',
  plugins: [ babel(babelrc()) ]
}
