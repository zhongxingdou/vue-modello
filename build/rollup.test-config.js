import babel from 'rollup-plugin-babel'
import babelrc from 'babelrc-rollup'
import istanbul from 'rollup-plugin-istanbul'

let pkg = require('../package.json')

export default {
  entry: 'src/index.js',
  plugins: [ 
    babel(babelrc()),
    istanbul({
      exclude: ['test/**/*', 'node_modules/**/*', 'demo/**/*']
    })
  ],
  targets: [
    {
      dest: pkg.main,
      format: 'umd',
      moduleName: 'vueModello',
      sourceMap: true
    },
    {
      dest: pkg.module,
      format: 'es',
      sourceMap: true
    }
  ]
}
