import { template } from 'solid-js/web';

interface SvgProps {
    svg: string;
}

export const Svg = (props: SvgProps) => {
    const SvgTemplate = template(props.svg);
    return <SvgTemplate />;
};
