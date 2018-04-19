const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = {
	entry: [
		'react-hot-loader/patch',
		'./src/index.js'
	],
	resolve: {
		modules: [
			'node_modules',
			'css',
			'src'
		],
		extensions: ['.js', '.jsx', '.css']
	},
	output: {
		path: __dirname + '/dist',
		publicPath: '/',
		filename: 'bundle.js',
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
				use: [ 'style-loader', 'css-loader' ]
			}
		]
	},
	devServer: {
		historyApiFallback: true,
		contentBase: './dist',
		hot: true,
		inline: true
	},
	watch: false,
	plugins:[
		new CleanWebpackPlugin(['dist']),
		new HtmlWebpackPlugin({
			template: 'index.html'
		}),
		new webpack.HotModuleReplacementPlugin()
	]
};
