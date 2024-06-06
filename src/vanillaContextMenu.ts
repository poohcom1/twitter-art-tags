export function setupContextMenu() {
    VanillaContextMenu.prototype.getNormalizedPosition = function (mouseX, mouseY, contextMenu) {
        let normalizedX = mouseX;
        let normalizedY = mouseY;

        // Check if normalization is required
        if (this.options.normalizePosition) {
            const normalizedPosition = normalizePozition(
                { x: mouseX, y: mouseY },
                contextMenu,
                document.documentElement
            );
            normalizedX = normalizedPosition.normalizedX;
            normalizedY = normalizedPosition.normalizedY;
        }

        return { normalizedX, normalizedY };
    };
}

/** @see https://github.com/GeorgianStan/vanilla-context-menu/blob/master/src/util.functions.ts */
function normalizePozition(
    mouse: {
        x: number;
        y: number;
    },
    target: HTMLElement,
    scope: HTMLElement
): { normalizedX: number; normalizedY: number } {
    const { x: mouseX, y: mouseY } = mouse;

    // compute what is the mouse position relative to the container element (scope)
    const { left: scopeOffsetX, top: scopeOffsetY } = scope.getBoundingClientRect();

    const scopeX: number = mouseX - scopeOffsetX;
    const scopeY: number = mouseY - scopeOffsetY;

    // check if the element will go out of bounds
    const outOfBoundsOnX: boolean = scopeX + target.clientWidth > scope.clientWidth;

    const outOfBoundsOnY: boolean = scopeY + target.clientHeight > scope.clientHeight;

    let normalizedX: number = mouseX;
    let normalizedY: number = mouseY;

    // normalzie on X
    if (outOfBoundsOnX) {
        normalizedX = scopeOffsetX + scope.clientWidth - target.clientWidth;
    }

    // normalize on Y
    if (outOfBoundsOnY) {
        normalizedY = scopeOffsetY + scope.clientHeight - target.clientHeight;
    }

    return { normalizedX, normalizedY };
}
