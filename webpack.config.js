const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const pkg = require('./package.json');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

let libraryName = pkg.name;

module.exports = (env, argv) => {
  const production = argv.mode === 'production';

  return {
    devtool: !production ? 'cheap-module-source-map' : '',
    entry: {
      main: ['./src/index.js'],
    },
    output: {
      path: `${__dirname}/dist`,
      filename: `index.js`,
      library: libraryName,
      libraryTarget: 'umd',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
      ],
    },
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          sourceMap: true,
        }),
      ],
      nodeEnv: argv.mode,
    },
    plugins: [new BundleAnalyzerPlugin({ analyzerMode: 'disabled' })],
    externals: ['js-cookie'],
  };
};
