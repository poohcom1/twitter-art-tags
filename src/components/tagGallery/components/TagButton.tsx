import { createEffect, createMemo, splitProps } from 'solid-js';
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

export const TagButton = (props: TagProps) => {
    const onClick = (e: MouseEvent) => {
        if (e.shiftKey) {
            props.onShiftSelect();
        } else {
            props.onSelect();
        }
    };

    let tagRef: HTMLButtonElement;

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

    const icon = createMemo(() =>
        props.active ? <Svg svg={checkSquareIcon} /> : <Svg svg={squareIcon} />
    );

    return (
        <button
            ref={(el) => (tagRef = el)}
            onClick={onClick}
            class={`${styles.tag} ${!props.active && styles.tagInactive}`}
        >
            {icon()}
            <div>{props.displayText}</div>
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
