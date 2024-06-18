import { createEffect } from 'solid-js';
import { renameTag, deleteTag } from '../../../services/storage';
import { formatTagName, verifyTagName, parseHTML } from '../../../utils';
import { TagButton, TagButtonProps } from '../../common/tagButton/TagButton';
import squareIcon from '/src/assets/square.svg';
import checkSquareIcon from '/src/assets/check-square.svg';
import pencilIcon from '/src/assets/pencil.svg';
import trashIcon from '/src/assets/trash.svg';
import styles from '../tag-gallery.module.scss';

interface TagEditProps extends TagButtonProps {
    onSelect: () => void;
    onShiftSelect: () => void;
    onDeselectAll: () => void;
}

export const TagEdit = (props: TagEditProps) => {
    let tagRef: HTMLButtonElement;

    const handleClick = (e: MouseEvent) => {
        if (e.shiftKey) {
            props.onShiftSelect();
        } else {
            props.onSelect();
        }
    };

    createEffect(() => {
        new VanillaContextMenu({
            scope: tagRef,
            customClass: props.active ? styles.contextMenuWide : styles.contextMenu,
            normalizePosition: false,
            transitionDuration: 0,
            menuItems: [
                {
                    label: props.active ? 'Deselect' : 'Select',
                    iconHTML: createContextMenuIcon(props.active ? squareIcon : checkSquareIcon),
                    callback: props.onSelect,
                },
                {
                    label: props.active ? 'Remove from selection' : 'Add to selection',
                    iconHTML: createNoIcon(),
                    callback: props.onShiftSelect,
                },
                {
                    label: 'Deselect all',
                    iconHTML: createNoIcon(),
                    callback: props.onDeselectAll,
                },
                'hr',
                {
                    label: 'Rename',
                    iconHTML: createContextMenuIcon(pencilIcon),
                    callback: async () => {
                        let newTagName;
                        while (true) {
                            newTagName = prompt('Enter new tag name:', formatTagName(props.tag));
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
                        await renameTag(props.tag, newTagName);
                    },
                },
                {
                    label: 'Delete',
                    iconHTML: createContextMenuIcon(trashIcon),
                    callback: async () => {
                        if (!confirm('Are you sure you want to delete this tag?')) {
                            return;
                        }
                        await deleteTag(props.tag);
                    },
                },
            ],
        });
    });

    return <TagButton {...props} ref={(el) => (tagRef = el)} onClick={handleClick} />;
};

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
