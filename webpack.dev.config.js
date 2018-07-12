const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { spawn } = require('child_process');
const PACKAGE = require('./package.json');

// Config directories
const SRC_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'dist');

// Any directories you will be adding code/files into, need to be added to this array so webpack will pick them up
const defaultInclude = [SRC_DIR];

module.exports = {
	entry: {
		main: SRC_DIR + '/index.js',
		server: SRC_DIR + '/index_server.js'
	},
	output: {
		path: OUTPUT_DIR,
		publicPath: '',
		filename: '[name].js',
		globalObject: 'this'
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
				include: defaultInclude
			},
			{
				test: /\.jsx?$/,
				use: [{ loader: 'babel-loader' }],
				include: defaultInclude
			},
			{
				test: /\.(png|jpg|gif)$/,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 8192
						}
					}
				],
				include: defaultInclude
			},
			{
				test: /\.(eot|svg|ttf|woff|woff2)$/,
				use: [{ loader: 'file-loader?name=font/[name]__[hash:base64:5].[ext]' }],
				include: defaultInclude
			},
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
				include: defaultInclude
			}
		]
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js"]
	},
	target: 'electron-renderer',
	plugins: [
		new HtmlWebpackPlugin({
			title: 'Star Trek Timelines Crew Management v' + PACKAGE.version,
			chunks: ['main']
		}),
		new HtmlWebpackPlugin({
			filename: 'server.html',
			title: 'SERVER - Star Trek Timelines Crew Management v' + PACKAGE.version,
			chunks: ['server']
		}),
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('development')
		})
	],
	devtool: 'inline-source-map',
	devServer: {
		contentBase: OUTPUT_DIR,
		stats: {
			colors: true,
			chunks: false,
			children: false
		},
		before() {
			spawn(
				'electron',
				['.', '--remote-debugging-port=9222'],
				{ shell: true, env: process.env, stdio: 'inherit' }
			)
				.on('close', code => process.exit(0))
				.on('error', spawnError => console.error(spawnError));
		}
	}
};
