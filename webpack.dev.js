const { merge } = require('webpack-merge');
const path = require('path');
const prod = require('./webpack.prod.js');

module.exports = merge(prod, {
    mode: 'development',
    output: {
        filename: 'twitterArtTags.js',
        path: path.resolve(__dirname, 'dist'),
    },
});
