// webpack.config.js
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const dotenv = require('dotenv').config(); // lee .env y carga las variables

module.exports = {
    mode: 'development', // o 'production' si vas a compilar para producción
    entry: './code.js',
    output: {
        path: path.resolve(__dirname, 'dist'), // carpeta de salida
        filename: 'code.js',
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
        }),
        // Genera el index.html final en dist
        new HtmlWebpackPlugin({
            template: './index.html', // ruta a tu index.html original
        }),
    ],
};
