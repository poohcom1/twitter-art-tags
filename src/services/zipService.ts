import { saveFile } from '../utils';
import { getUserData } from './storage';

interface ImageData {
    blob: Blob;
    filename: string;
}

export async function createImageArchive() {
    try {
        // Gather data
        const { tags, tweets } = await getUserData();

        // Create zip
        const zipFileWriter = new zip.BlobWriter();
        const zipWriter = new zip.ZipWriter(zipFileWriter);

        // - Images
        const imagePromises: Promise<ImageData>[] = [];

        for (const tweetId in tweets) {
            const images = tweets[tweetId].images;
            for (let i = 0; i < images.length; i++) {
                const imageSrc = tweets[tweetId].images[i];

                const imageBlobPromise = getImageBlob(imageSrc);

                const url = new URL(imageSrc);
                const ext = url.searchParams.get('format') ?? 'png';

                let name = 'twitter-art-tag_images/' + tweetId + '.' + ext;
                if (images.length > 1) {
                    name = 'twitter-art-tag_images/' + tweetId + '_' + i + '.' + ext;
                }

                imagePromises.push(imageBlobPromise.then((blob) => ({ blob, filename: name })));
            }
        }

        const imageDatas = await Promise.all(imagePromises);
        for (const { blob, filename } of imageDatas) {
            zipWriter.add(filename, new zip.BlobReader(blob));
        }

        // - CSV
        const rowData: Record<string, { link: string; imageTags: string[] }> = {};

        const tagNames = Object.keys(tags);
        tagNames.sort();
        for (const tagName of tagNames) {
            for (const tweetId of tags[tagName].tweets) {
                if (tweetId in rowData) {
                    rowData[tweetId].imageTags.push(tagName);
                } else {
                    rowData[tweetId] = {
                        link: `https://x.com/x/status/${tweetId}`,
                        imageTags: [tagName],
                    };
                }
            }
        }
        const csvWriter = new zip.TextReader(
            [
                'Tweet Link,Tags',
                ...Object.values(rowData).map(
                    ({ link, imageTags }) => `${link},"${imageTags.join('; ')}"`
                ),
            ].join('\n')
        );
        zipWriter.add('Tags.csv', csvWriter);

        zipWriter.close();

        const blob = await zipFileWriter.getData();

        saveFile(blob, 'twitter-art-tag_images.zip');
        return true;
    } catch (error) {
        alert('Failed to create image archive');
        console.warn(error);
        return false;
    }
}

function getImageBlob(image: string) {
    return fetch(image).then((response) => response.blob());
}
