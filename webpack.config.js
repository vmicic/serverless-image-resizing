const webpack = require('webpack');

module.exports = {
  context: __dirname,
  target: 'webworker',
  entry: './index.js',
  mode: 'production',
  plugins: [
    new webpack.ProvidePlugin({
      _: 'lodash',
      aws4fetch: 'aws4fetch',
    }),
  ],
};
