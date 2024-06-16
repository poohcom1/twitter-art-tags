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
    buffer: NodeBuffer | null;
}

interface ImageDataSucces {
    name: string;
    buffer: NodeBuffer;
}

interface ImageDataFailed {
    name: string;
    buffer: null;
}

// Utility functions
async function downloadImage(url: string, retry: number = 0): Promise<NodeBuffer | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image from ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer) as NodeBuffer;
    } catch (e) {
        if (retry < 3) {
            console.warn(
                `Failed to download image from ${url}. Error ${e}.Retrying... ${retry + 1}`
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
            return downloadImage(url, retry + 1);
        }
        return null;
    }
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
    const validImages = images.filter((image): image is ImageDataSucces => image.buffer !== null);
    const failedImages = images.filter((image): image is ImageDataFailed => image.buffer === null);
    for (const { name, buffer } of validImages) {
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
            'x-failed-images': failedImages.length.toString(),
        },
    });
});
