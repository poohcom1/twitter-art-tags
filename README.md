# Twitter Art Tags

A Greasemonkey script for organizing artwork on Twitter.

This is a rework of [Twitter Art Collections](https://github.com/poohcom1/twitter-art-collection), which was shut down due to Twitter's new API costs.

## Installation

1. Install Greasemonkey or Violentmonkey extension on Firefox if not already installed.
2. Find the latest [release](https://github.com/poohcom1/twitter-art-tags/releases/latest).
3. Copy the script from the release and add it to Greasemonkey.

## Features

-   Tag tweets with photos to organize them into useful categories
-   View tagged tweets in a gallery, images are cached so you can view them all quickly
-   Download images as a zip archive
-   Sync tags so you can access them from different machines

![twitter-art-tags_example](https://github.com/poohcom1/twitter-art-tags/assets/74857873/f6ed7de0-01a2-4a4e-b1ce-11355a804b1e)

## Development

1. Install dependencies:

```sh
yarn
```

2. Run build in watch mode for live reload:

```sh
yarn dev
```

3. Compiled script will be at `dist/twitterArtTags.user.js`.
4. If you want to host your own supabase instance, checkout [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

### Dependencies

-   [poohcom1/vanilla-context-menu](https://github.com/poohcom1/vanilla-context-menu): Forked to support screen position normalization and hover with nested menu.

## Attribution

Special thanks to:

-   [vanilla-context-menu](https://github.com/GeorgianStan/vanilla-context-menu) by @GeorgianStan
-   [valibot](https://github.com/fabian-hiller/valibot) by @fabian-hiller
-   [zip.js](https://github.com/gildas-lormeau/zip.js) by @gildas-lormeau
-   [Ui Oval Interface Icons Collection](https://www.svgrepo.com/collection/ui-oval-interface-icons) from [svgrepo.com](https://www.svgrepo.com/)
