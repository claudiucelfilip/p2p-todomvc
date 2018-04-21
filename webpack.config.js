const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require('webpack');
const path = require('path');

module.exports = {
	devtool: 'cheap-module-source-map',
	entry: {
		bundle: [
			'react-hot-loader/patch', 
			'./client/index.js'
		]
	},
	resolve: {
		modules: [
			'node_modules',
			'css',
			'client'
		],
		extensions: ['.js', '.jsx', '.css']
	},
	output: {
		path: __dirname + '/dist',
		publicPath: '/',
		filename: '[name].js',
		// publicPath: 'http://localhost:3000/',
		hotUpdateChunkFilename: 'dist/[id].[hash].hot-update.js',
		hotUpdateMainFilename: 'dist/[hash].hot-update.json'

	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: ['babel-loader']
			},
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: 'css-loader'
				})
			}
		]
	},
	devServer: {
		contentBase: './dist',
		hot: true,
		inline: true
	},
	watch: false,
	plugins: [
		new CopyWebpackPlugin([
			'client/services/worker/sw.js'
		]),
		new CleanWebpackPlugin(['dist']),
		new ExtractTextPlugin('styles.css'),
		new HtmlWebpackPlugin({
			template: 'index.html'
		}),
		new webpack.HotModuleReplacementPlugin()
	]
};
