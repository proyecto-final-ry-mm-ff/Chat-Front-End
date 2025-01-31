// webpack.config.js
const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv').config(); // lee .env y carga las variables


module.exports = {
  mode: 'development', // o 'production' si vas a compilar para producción
  entry: './loader.js',
  output: {
    path: path.resolve(__dirname, 'dist'), // carpeta de salida
    filename: 'loader.js',
  },
  devServer: {
    static: path.join(__dirname, 'dist'), // carpeta a servir
    port: 3000, // puerto donde correrá el dev server
    open: true, // abre el navegador automáticamente
  },
  plugins: [
    // DefinePlugin reemplaza "process.env" por los valores
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(dotenv.parsed),
      // Equivalente a:
      // "process.env": {
      //   "API_URL": JSON.stringify(process.env.API_URL),
      //   "MI_VARIABLE": JSON.stringify(process.env.MI_VARIABLE)
      // }
    }),
  ],
};
