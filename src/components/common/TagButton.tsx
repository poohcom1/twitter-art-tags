import { Show, createMemo } from 'solid-js';
import styles from './tag.module.scss';
import squareIcon from '/src/assets/square.svg';
import checkSquareIcon from '/src/assets/check-square.svg';
import { Svg } from './Svg';

export interface TagButtonProps {
    ref?: (el: HTMLButtonElement) => void;
    tag: string;
    displayText: string;
    active: boolean;
    showIcon?: boolean;
    onClick?: (e: MouseEvent) => void;
    onContextMenu?: (e: MouseEvent) => void;
}

export const TagButton = (props: TagButtonProps) => {
    const icon = createMemo(() =>
        props.active ? <Svg svg={checkSquareIcon} /> : <Svg svg={squareIcon} />
    );

    return (
        <button
            ref={props.ref}
            on:click={props.onClick}
            onContextMenu={props.onContextMenu}
            class={`${styles.tag} ${!props.active && styles.tagInactive}`}
        >
            <Show when={props.showIcon}>{icon()}</Show>
            <div>{props.displayText}</div>
        </button>
    );
};
