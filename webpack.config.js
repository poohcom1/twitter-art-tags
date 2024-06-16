const path = require('path');
const { UserscriptPlugin } = require('webpack-userscript');

const { version, author } = require('./package.json');
const Dotenv = require('dotenv-webpack');

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
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['solid'],
                        },
                    },
                    { loader: 'ts-loader' },
                ],
                exclude: [/node_modules/, /vanilla-context-menu/],
            },
            {
                test: /\.svg/,
                type: 'asset/source',
            },
            // html/css
            {
                test: /\.s?css$/i,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            esModule: false,
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: { implementation: require('sass') },
                    },
                ],
            },
            {
                test: /\.pug$/,
                use: {
                    loader: 'pug-loader',
                },
            },
        ],
    },
    plugins: [
        new Dotenv({
            systemvars: true,
        }),
        new UserscriptPlugin({
            headers: {
                name: 'Twitter Art Tags',
                description: 'Tag artwork on twitter and view it in a gallery.',
                homepageURL: 'https://github.com/poohcom1/twitter-art-tags',
                version,
                author,
                match: 'https://x.com/*',
                grant: [
                    'GM.setValue',
                    'GM.getValue',
                    'GM.deleteValue',
                    'GM.registerMenuCommand',
                    'GM.xmlHttpRequest',
                ],
                require: [
                    'https://github.com/poohcom1/vanilla-context-menu/releases/download/v1.10.0/vanilla-context-menu.js',
                    'https://raw.githubusercontent.com/gildas-lormeau/zip.js/969f6589f3a979a9ed7eb6c6dfa8e32f8c51a62a/dist/zip.min.js',
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
