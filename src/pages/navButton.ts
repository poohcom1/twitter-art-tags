import { waitForElement } from '../utils';
import tagIcon from '../assets/tag.svg';
import { CUSTOM_PAGE_PATH, HOVER_COLOR_MAP } from '../constants';

const ID = 'tagsPageButton';

export async function renderNavButton() {
    const nav = await waitForElement('nav');

    if (!nav) {
        return;
    }

    const dropdownObserver = new MutationObserver((mutationsList) => {
        mutationsList.forEach(async (mutation) => {
            if (mutation.addedNodes.length > 0) {
                const rootNode = mutation.addedNodes[0] as ParentNode;
                const dropdown = await waitForElement('div[data-testid="Dropdown"]', rootNode);
                if (!dropdown) {
                    return;
                }

                if (dropdown.querySelector(`#${ID}`)) {
                    return;
                }

                const menu = rootNode.querySelector('div[role="menu"]');
                const hoverColor = HOVER_COLOR_MAP[window.getComputedStyle(menu!).backgroundColor];

                const settingsAnchor = dropdown.querySelector('a[href="/settings"]');
                const settingsButton = settingsAnchor?.parentElement as HTMLDivElement;
                if (!settingsAnchor || !settingsButton) {
                    return;
                }

                const tagsButton = settingsButton.cloneNode(true) as HTMLDivElement;
                tagsButton.id = ID;
                tagsButton.querySelector('a')!.href = CUSTOM_PAGE_PATH;
                tagsButton.querySelector('a')!.style.backgroundColor = 'transparent';
                tagsButton.querySelector('a')!.onmouseenter = () =>
                    (tagsButton.querySelector('a')!.style.backgroundColor = hoverColor ?? '');
                tagsButton.querySelector('a')!.onmouseleave = () =>
                    (tagsButton.querySelector('a')!.style.backgroundColor = 'transparent');
                tagsButton.querySelector('svg')!.innerHTML = tagIcon;
                tagsButton.querySelector('svg')!.style.stroke = 'currentcolor';
                tagsButton.querySelector('span')!.innerText = 'Tags';

                settingsButton.parentElement!.prepend(tagsButton);
            }
        });
    });

    dropdownObserver.observe(document.getElementById('layers')!, {
        childList: true,
    });
}
