/**
 * Types from https://github.com/poohcom1/vanilla-context-menu
 * Library is included via @require in user script, so this file needs to be kept in sync with the library.
 * This is set in webpack.prod.js.
 */

/* eslint-disable no-unused-private-class-members */
interface CoreOptions {
    transformOrigin: [string, string];
}
interface DefaultOptions {
    transitionDuration: number;
    theme: 'black' | 'white';
    normalizePosition?: boolean;
    customNormalizeScope?: HTMLElement;
}
interface ConfigurableOptions extends Partial<DefaultOptions> {
    scope: HTMLElement;
    menuItems: MenuItem[];
    customClass?: string;
    customThemeClass?: string;
    openSubMenuOnHover?: boolean;
    preventCloseOnClick?: boolean;
    onClose?: () => void;
}
interface Options extends ConfigurableOptions, CoreOptions {}
interface BaseMenuOption {
    label: string;
    callback?: (contextEvent: MouseEvent, optionEvent: MouseEvent) => unknown;
    /**
     * @deprecated This property was replaced by the new iconHTML property
     */
    iconClass?: string;
    iconHTML?: string;
    preventCloseOnClick?: boolean;
}
interface MenuOption extends BaseMenuOption {
    nestedMenu?: NestedMenuItem[];
}
type MenuItem = MenuOption | 'hr';
type NestedMenuItem = BaseMenuOption | 'hr';

declare class BaseContextMenu {
    #private;
    options: Options;
    initialContextMenuEvent: MouseEvent | undefined;
    applyStyleOnContextMenu: (
        contextMenu: HTMLElement,
        outOfBoundsOnX: boolean,
        outOfBoundsOnY: boolean
    ) => void;
    /**
     * Interpolate the state variables inside the pug element and create an HTML Element
     */
    buildContextMenu: () => HTMLElement;
    updateOptions(configurableOptions: Partial<ConfigurableOptions>): void;
    getNormalizedPosition: (
        mouseX: number,
        mouseY: number,
        contextMenu: HTMLElement
    ) => {
        normalizedX: number;
        normalizedY: number;
    };
}
declare class VanillaContextMenu extends BaseContextMenu {
    #private;
    constructor(configurableOptions: ConfigurableOptions);
    /**
     * Remove all the event listeners that were registered for this feature
     */
    off(): void;
    /**
     * Close the context menu
     */
    close(): void;
}
