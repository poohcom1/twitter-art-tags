const path = require('path');
const { UserscriptPlugin } = require('webpack-userscript');

const { version, author } = require('./package.json');
const { webpack } = require('webpack');

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
    entry: './src/index.ts',
    mode: 'production',
    optimization: {
        usedExports: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: [/node_modules/, /vanilla-context-menu/],
            },
            {
                test: /\.svg/,
                type: 'asset/source',
            },
            // html/css
            {
                test: /\.css$/,
                use: 'css-loader',
            },
            {
                test: /\.html$/,
                use: 'html-loader',
            },
            // Tree shaking
            {
                include: path.resolve(__dirname, 'node_modules/valibot'),
                sideEffects: false,
            },
        ],
    },
    plugins: [
        new UserscriptPlugin({
            headers: {
                name: 'Twitter Art Tags',
                description:
                    'Tag artwork on twitter and view it in a gallery. https://github.com/poohcom1/twitter-art-tags',
                version,
                author,
                match: 'https://x.com/*',
                grant: [
                    'GM.setValue',
                    'GM.getValue',
                    'GM.deleteValue',
                    'GM.listValues',
                    'GM.registerMenuCommand',
                ],
                require: [
                    'https://github.com/poohcom1/vanilla-context-menu/releases/download/v1.8.2/vanilla-context-menu.js',
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
        filename: 'twitterArtTags.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
