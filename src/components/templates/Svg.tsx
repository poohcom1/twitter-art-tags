import { template } from 'solid-js/web';

interface SvgProps {
    svg: string;
}

export const Svg = ({ svg }: SvgProps) => {
    const SvgTemplate = template(svg);
    return <SvgTemplate />;
};
