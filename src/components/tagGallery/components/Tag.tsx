import { createEffect } from 'solid-js';
import styles from '../tag-gallery.module.scss';
import pencilIcon from '/src/assets/pencil.svg';
import trashIcon from '/src/assets/trash.svg';
import squareIcon from '/src/assets/square.svg';
import checkSquareIcon from '/src/assets/check-square.svg';
import { Svg } from '../../templates/Svg';
import { formatTagName, parseHTML, verifyTagName } from '../../../utils';
import { deleteTag, renameTag } from '../../../services/storage';

interface TagProps {
    tag: string;
    displayText: string;
    active: boolean;
    onSelect: () => void;
    onShiftSelect: () => void;
    onDeselectAll: () => void;
}

export const Tag = ({
    tag,
    displayText,
    active,
    onSelect,
    onShiftSelect,
    onDeselectAll,
}: TagProps) => {
    const onClick = (e: MouseEvent) => {
        if (e.shiftKey) {
            onShiftSelect();
        } else {
            onSelect();
        }
    };

    let tagRef: HTMLButtonElement;

    createEffect(() => {
        new VanillaContextMenu({
            scope: tagRef,
            customClass: active ? styles.contextMenuWide : styles.contextMenu,
            normalizePosition: false,
            transitionDuration: 0,
            menuItems: [
                {
                    label: active ? 'Deselect' : 'Select',
                    iconHTML: createContextMenuIcon(active ? squareIcon : checkSquareIcon),
                    callback: onSelect,
                },
                {
                    label: active ? 'Remove from selection' : 'Add to selection',
                    iconHTML: createNoIcon(),
                    callback: onShiftSelect,
                },
                {
                    label: 'Deselect all',
                    iconHTML: createNoIcon(),
                    callback: onDeselectAll,
                },
                'hr',
                {
                    label: 'Rename',
                    iconHTML: createContextMenuIcon(pencilIcon),
                    callback: async () => {
                        let newTagName;
                        while (true) {
                            newTagName = prompt('Enter new tag name:', formatTagName(tag));
                            if (!newTagName) {
                                return;
                            }
                            if (verifyTagName(newTagName)) {
                                break;
                            } else {
                                alert(
                                    'Invalid tag name! Tag names can only contain letters, numbers, and spaces.'
                                );
                            }
                        }
                        await renameTag(tag, newTagName);
                    },
                },
                {
                    label: 'Delete',
                    iconHTML: createContextMenuIcon(trashIcon),
                    callback: async () => {
                        if (!confirm('Are you sure you want to delete this tag?')) {
                            return;
                        }
                        await deleteTag(tag);
                    },
                },
            ],
        });
    });

    return (
        <button
            ref={(el) => (tagRef = el)}
            onClick={onClick}
            class={`${styles.tag} ${!active && styles.tagInactive}`}
        >
            <Svg svg={active ? checkSquareIcon : squareIcon} />
            <div>{displayText}</div>
        </button>
    );
};

// TODO: Refactor to use jsx
function createContextMenuIcon(iconSvg: string): string {
    const icon = parseHTML(iconSvg);
    icon.classList.add(styles.contextMenuIcon);
    return icon.outerHTML;
}

function createNoIcon(): string {
    const icon = parseHTML('<div />');
    icon.classList.add(styles.contextMenuIcon);
    return icon.outerHTML;
}
