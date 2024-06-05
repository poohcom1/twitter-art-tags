const path = require('path');
const { UserscriptPlugin } = require('webpack-userscript');

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
    entry: './src/index.ts',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.svg/,
                type: 'asset/source',
            },
        ],
    },
    plugins: [
        new UserscriptPlugin({
            headers: {
                name: 'Twitter Art Collection',
                description: 'Tag artwork on twitter and view it in a gallery',
                version: '0.0.1',
                author: 'poohcom1',
                match: 'https://x.com/*',
                grant: [
                    'GM.setValue',
                    'GM.getValue',
                    'GM.deleteValue',
                    'GM.listValues',
                    'GM.registerMenuCommand',
                ],
            },
            pretty: true,
            strict: true,
        }),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'twitterArtCollection.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
