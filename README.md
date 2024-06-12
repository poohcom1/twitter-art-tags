# Twitter Art Tags

A Greasemonkey script for X/Twitter for caching and tagging images.

## Installation

0. Install Greasemonkey or Violentmonkey extension on Firefox if not already added.
1. Find the latest [release](https://github.com/poohcom1/twitter-art-tags/releases).
2. Copy the script from the release and add it to Greasemonkey.

## Usage

-   Only tweets with images can be tagged.
-   Images are cached for fast load.
-   Use the sync feature to sync tags across different machines. This is completely optional; everything is stored locally otherwise.

![twitter-art-tags_example](https://github.com/poohcom1/twitter-art-tags/assets/74857873/dcf52dd9-2334-4c7c-a982-ab66bf759585)

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
4. If you need want to host your own supabase instance, checkout [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

### Dependencies

-   [vanilla-context-menu](https://github.com/poohcom1/vanilla-context-menu): Forked to support screen position normalization and hover with nested menu.

## Attribution

Special thanks to:

-   [vanilla-context-menu](https://github.com/GeorgianStan/vanilla-context-menu) by @GeorgianStan
-   [valibot](https://github.com/fabian-hiller/valibot) by @fabian-hiller
-   [Ui Oval Interface Icons Collection](https://www.svgrepo.com/collection/ui-oval-interface-icons) from [svgrepo.com](https://www.svgrepo.com/)
