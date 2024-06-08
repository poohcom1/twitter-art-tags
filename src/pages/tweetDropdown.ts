import { waitForElement } from '../utils';
import tagIcon from '../assets/tag.svg';
import tagGalleryIcon from '../assets/tags.svg';
import { CUSTOM_PAGE_PATH } from '../constants';
import TagModal from '../components/TagModal';

function getTweetImages(tweetId: string): string[] {
    return Array.from(document.querySelectorAll('a'))
        .filter((a) => a.href.includes(tweetId))
        .flatMap((a) => Array.from(a.querySelectorAll('img')))
        .map((img) => img.src);
}

export async function renderTweetDropdown(tagModal: TagModal) {
    let tagButton: HTMLElement | null = null;
    let viewTagsButton: HTMLElement | null = null;

    // Create tag button
    function renderTagButtons(dropdown: HTMLElement, tagId: string, images: string[]) {
        if (tagButton === null || viewTagsButton === null) {
            tagButton = dropdown.childNodes[0].cloneNode(true) as HTMLElement;
            viewTagsButton = tagButton.cloneNode(true) as HTMLElement;

            const svgClasslist = tagButton.querySelector('svg')!.classList;
            tagButton.querySelector('span')!.innerText = 'Tag Tweet';
            tagButton.querySelector('svg')!.outerHTML = tagIcon;
            tagButton.querySelector('svg')!.classList.add(...svgClasslist);
            tagButton.querySelector('svg')!.style.stroke = 'currentColor';
            tagButton.querySelector('svg')!.style.fill = 'transparent';

            viewTagsButton.querySelector('span')!.innerText = 'View Tags';
            viewTagsButton.querySelector('svg')!.outerHTML = tagGalleryIcon;
            viewTagsButton.querySelector('svg')!.classList.add(...svgClasslist);
            viewTagsButton.querySelector('svg')!.style.stroke = 'currentColor';
            viewTagsButton.querySelector('svg')!.style.fill = 'transparent';
            viewTagsButton.querySelector('svg')!.style.height = '20px';
            viewTagsButton.querySelector('svg')!.style.width = '20px';
            viewTagsButton.addEventListener('click', async () => {
                window.location.href = window.location.origin + CUSTOM_PAGE_PATH;
            });
        }

        tagButton.id = tagId;
        tagButton.addEventListener('click', () => {
            const rect = tagButton!.getBoundingClientRect();
            tagModal.show(tagId, images, { top: rect.top, left: rect.right + 10 });
        });

        dropdown.prepend(viewTagsButton);
        dropdown.prepend(tagButton);
    }

    await waitForElement('#layers');

    const dropdownObserver = new MutationObserver((mutationsList) => {
        mutationsList.forEach(async (mutation) => {
            if (mutation.addedNodes.length > 0) {
                waitForElement('div[role="menu"]', mutation.addedNodes[0] as ParentNode).then(
                    (menu) => {
                        if (!menu) {
                            return;
                        }
                        const menuStyles = window.getComputedStyle(menu);
                        tagModal.setStyles({
                            border: menuStyles.border,
                            borderRadius: menuStyles.borderRadius,
                            backgroundColor: menuStyles.backgroundColor,
                            color: menuStyles.color,
                            boxShadow: menuStyles.boxShadow,
                        });
                    }
                );

                const dropdown = await waitForElement(
                    'div[data-testid="Dropdown"]',
                    mutation.addedNodes[0] as ParentNode
                );
                if (!dropdown) {
                    return;
                }
                // Find id
                let id = '';

                const anchors = dropdown.querySelectorAll('a');
                for (const anchor of anchors) {
                    if (anchor.href.includes('/status/')) {
                        id = anchor.href.split('/')[5];
                        break;
                    }
                }

                if (!id) {
                    return;
                }

                if (document.getElementById(id + '_tagButton')) {
                    // Already added
                    return;
                }

                // Find images
                const images = getTweetImages(id);

                if (images.length === 0) {
                    return;
                }

                renderTagButtons(dropdown, id, images);
            } else if (mutation.removedNodes.length > 0) {
                tagModal.hide();
            }
        });
    });

    dropdownObserver.observe(document.getElementById('layers')!, {
        childList: true,
    });
}
