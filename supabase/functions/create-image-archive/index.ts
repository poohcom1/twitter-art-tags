/// <reference lib="deno.ns" />
/// <reference types="npm:@types/node" />

// @deno-types="npm:@types/adm-zip@^0.5"
import AdmZip from 'npm:adm-zip@^0.5';
import { Buffer } from 'https://deno.land/std@0.100.0/node/buffer.ts';
import type { UserData } from '../../../src/models.ts';

const zip = new AdmZip();

type NodeBuffer = Parameters<typeof zip.addFile>[1];

interface ImageData {
    name: string;
    buffer: NodeBuffer;
}

// Utility functions
async function downloadImage(url: string): Promise<NodeBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image from ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer) as NodeBuffer;
}

function getImageExt(url: string) {
    const params = new URL(url).searchParams;
    return params.get('format') ?? 'png';
}

// Main
Deno.serve(async (req) => {
    const userData = (await req.json()) as UserData;

    // Get Images
    const imagePromises: Promise<ImageData>[] = [];

    for (const id in userData.tweets) {
        for (let i = 0; i < userData.tweets[id].images.length; i++) {
            const src = userData.tweets[id].images[i];
            const buffer = downloadImage(src);

            let name = id;
            if (userData.tweets[id].images.length > 1) {
                name += `_${i + 1}`;
            }
            name += `.${getImageExt(src)}`;

            imagePromises.push(buffer.then((buffer) => ({ name, buffer })));
        }
    }

    const images = await Promise.all(imagePromises);
    for (const { name, buffer } of images) {
        zip.addFile(name, buffer);
    }

    // Create csv
    const rowData: Record<string, { link: string; tags: string[] }> = {};

    const tags = Object.keys(userData.tags);
    tags.sort();
    for (const tagName of tags) {
        for (const tweetId of userData.tags[tagName].tweets) {
            if (tweetId in rowData) {
                rowData[tweetId].tags.push(tagName);
            } else {
                rowData[tweetId] = {
                    link: `https://x.com/x/status/${tweetId}`,
                    tags: [tagName],
                };
            }
        }
    }
    zip.addFile(
        'tags.csv',
        Buffer.from(
            [
                'Tweet Link,Tags',
                ...Object.values(rowData).map(({ link, tags }) => `${link},"${tags.join('; ')}"`),
            ].join('\n')
        ) as NodeBuffer
    );

    return new Response(zip.toBuffer(), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename=tagged_images.zip',
        },
    });
});
