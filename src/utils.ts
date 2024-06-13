export const SANITIZE_INFO = {
    allowedChars: /^[a-zA-Z0-9 ]+$/,
    maxLength: 20,
};

export function verifyEvent(event: KeyboardEvent) {
    return (
        SANITIZE_INFO.allowedChars.test(event.key) ||
        event.key === 'Enter' ||
        event.key === 'Backspace' ||
        event.key === 'Delete'
    );
}

export function verifyTagName(tagName: string) {
    if (!tagName) return false;
    return SANITIZE_INFO.allowedChars.test(tagName);
}

export function formatTagName(tagName: string) {
    return tagName
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export async function waitForElement(selector: string, root: ParentNode = document) {
    return new Promise<HTMLElement | null>((resolve) => {
        {
            const element = root.querySelector(selector);
            if (element) {
                resolve(element as HTMLElement);
            }
        }
        const interval = setInterval(() => {
            const element = root.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element as HTMLElement);
            }
        }, 10);

        setTimeout(() => {
            clearInterval(interval);
            resolve(null);
        }, 5000);
    });
}

let parser: DOMParser | undefined;
export function parseHTML<T extends HTMLElement>(html: string): T {
    if (!parser) {
        parser = new DOMParser();
    }
    return parser.parseFromString(html, 'text/html').body.firstChild as T;
}

/** @see https://github.com/GeorgianStan/vanilla-context-menu/blob/master/src/util.functions.ts */
export function normalizePosition(
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

/**
 * Simple async wrapper around GM.xmlHttpRequest.
 */
export async function asyncXmlHttpRequest(
    params: Omit<GM.Request, 'onload' | 'onerror'>
): Promise<GM.Response<unknown>> {
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            ...params,
            onload: resolve,
            onerror: reject,
        });
    });
}

export function assertUi<T extends Element>(element: T | null, context: string): T {
    if (!element) {
        alert(
            `UI element (${context}) not found. Twitter's UI may have changed. Please report this issue.`
        );
        throw new Error('UI element not found');
    }
    return element;
}

export function saveFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}
