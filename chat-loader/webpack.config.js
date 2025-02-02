const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Agregar este plugin
const dotenv = require('dotenv').config();

module.exports = {
  mode: 'production', // o 'development' para pruebas
  entry: './loader.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'loader.js',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(dotenv.parsed),
    }),
    new HtmlWebpackPlugin({
      template: 'index.html', // Asegura que index.html sea copiado a dist
      filename: 'index.html',
      inject: 'body',
    }),
  ],
};
