import template from './image-modal.pug';
import styles from './image-modal.module.scss';
import { parseHTML } from '../../utils';

const IDS = {
    image: 'image',
};

export default class ImageModal {
    private modalContainer: HTMLElement;

    constructor() {
        this.modalContainer = parseHTML(template({ styles, ids: IDS }));
        document.body.appendChild(this.modalContainer);
        this.modalContainer.onclick = (e) => e.stopPropagation();

        // Overlay
        const overlay = this.modalContainer.querySelector<HTMLElement>(`.${styles.overlay}`)!;
        overlay.onscroll = (e) => e.stopPropagation();
        overlay.onclick = () => this.hide();
    }

    // Modal
    public show(images: string[], index: number) {
        const image = this.modalContainer.querySelector<HTMLImageElement>(`#${IDS.image}`)!;
        image.src = images[index];

        const left = this.modalContainer.querySelector<HTMLElement>(
            `.${styles.arrowContainerLeft}`
        )!;
        if (index === 0) {
            left.querySelector('svg')!.style.opacity = '0.5';
            left.onclick = null;
        } else {
            left.querySelector('svg')!.style.opacity = '1';
            left.onclick = () => this.show(images, index - 1);
        }

        const right = this.modalContainer.querySelector<HTMLElement>(
            `.${styles.arrowContainerRight}`
        )!;

        if (index === images.length - 1) {
            right.querySelector('svg')!.style.opacity = '0.5';
            right.onclick = null;
        } else {
            right.querySelector('svg')!.style.opacity = '1';
            right.onclick = () => this.show(images, index + 1);
        }

        this.modalContainer.classList.add(styles.modalContainerShow);
        document.body.classList.add(styles.modalOpen);
    }

    public hide() {
        this.modalContainer.classList.remove(styles.modalContainerShow);
        document.body.classList.remove(styles.modalOpen);
    }
}
