import { Portal } from 'solid-js/web';
import { Svg } from '../templates/Svg';
import styles from './image-modal.module.scss';
import leftArrow from '/src/assets/arrow-left.svg';
import rightArrow from '/src/assets/arrow-right.svg';
import close from '/src/assets/x-close.svg';
import { createEffect } from 'solid-js';

interface ImageModalProps {
    visible: boolean;
    images: string[];
    index: number;
    onClose: () => void;
    onLeft?: () => void;
    onRight?: () => void;
}

export const ImageModal = (props: ImageModalProps) => {
    createEffect(() => {
        if (props.visible) {
            document.documentElement.style.overflowY = 'hidden';
        } else {
            document.documentElement.style.overflowY = 'scroll';
        }

        return () => (document.documentElement.style.overflowY = 'scroll');
    });

    return (
        <Portal>
            <div class={`${styles.modalContainer} ${props.visible && styles.modalContainerShow}`}>
                <div class={styles.overlay} onClick={props.onClose} />
                <div
                    class={`${styles.arrowContainer} ${styles.arrowContainerLeft}`}
                    style={props.index <= 0 ? { opacity: 0.5 } : {}}
                    onClick={props.onLeft}
                >
                    <Svg svg={leftArrow} />
                </div>

                <img class={styles.image} src={props.images[props.index]} />
                <div class={styles.closeButton} onClick={props.onClose}>
                    <Svg svg={close} />
                </div>

                <div
                    class={`${styles.arrowContainer} ${styles.arrowContainerRight}`}
                    style={props.index >= props.images.length - 1 ? { opacity: 0.5 } : {}}
                    onClick={props.onRight}
                >
                    <Svg svg={rightArrow} />
                </div>
            </div>
        </Portal>
    );
};
