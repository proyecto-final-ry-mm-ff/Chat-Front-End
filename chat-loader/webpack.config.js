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
      'process.env.API_URL': JSON.stringify(process.env.API_URL || dotenv.parsed.API_URL),
      'process.env.SIGNALR_URL': JSON.stringify(process.env.SIGNALR_URL || dotenv.parsed.SIGNALR_URL),
      'process.env.WIDGET_URL': JSON.stringify(process.env.WIDGET_URL || dotenv.parsed.WIDGET_URL),
    }),
    new HtmlWebpackPlugin({
      template: 'index.html', // Asegura que index.html sea copiado a dist
      filename: 'index.html',
      inject: 'body',
    }),
  ],
};
