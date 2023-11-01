const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const _ = require('lodash');
const slsw = require('serverless-webpack');
require('source-map-support').install();

const rootDir = path.join(__dirname, '.');

const defaults = {
    entry: slsw.lib.entries,
    target: 'node',
    mode: 'production',
    externals: nodeExternals(),
    plugins: [],
    optimization: {
        nodeEnv: false,
    },
    resolve: {
        modules: ['src', 'node_modules'],
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        alias: {},
    },
    output: {
        libraryTarget: 'commonjs',
        path: path.join(rootDir, '.webpack'),
        filename: '[name].js',
    },
    module: {
        rules: [{
            test: /\.ts(x?)$/,
            loader: 'ts-loader',
        },
        ],
    },
};

module.exports = _.merge(
    {}, defaults
);