import { Svg } from '../../common/Svg';

interface ContextMenuSvgProps {
    svg: string;
}

export const ContextMenuSvg = (props: ContextMenuSvgProps) => {
    return <Svg svg={props.svg} />;
};
