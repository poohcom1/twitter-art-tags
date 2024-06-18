import { createMemo } from 'solid-js';
import { parseHTML } from '../../utils';

interface SvgProps {
    svg: string;
    class?: string;
}

export const Svg = (props: SvgProps) => {
    const SvgElement = createMemo(() => {
        const element = parseHTML(props.svg);
        if (props.class) {
            element.classList.add(...props.class.split(' '));
        }
        return element;
    });

    return <SvgElement />;
};
