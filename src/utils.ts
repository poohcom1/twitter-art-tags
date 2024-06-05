export function sanitizeTagName(tagName: string) {
    return tagName.trim().toLowerCase();
}

export function verifyTagName(tagName: string) {
    const allowedChars = /^[a-zA-Z0-9 ]+$/;
    return allowedChars.test(tagName);
}

export function formatTagName(tagName: string) {
    return tagName
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export async function waitForElement(selector: string, root: ParentNode = document) {
    return new Promise<HTMLElement>((resolve) => {
        const element = root.querySelector(selector);
        if (element) {
            resolve(element as HTMLElement);
        }
        const interval = setInterval(() => {
            const element = root.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element as HTMLElement);
            }
        }, 100);
    });
}

/**
 * https://sourceforge.net/p/greasemonkey/wiki/GM_addStyle/
 */
export function GM_addStyle(aCss: string) {
    let head = document.getElementsByTagName('head')[0];
    if (head) {
        let style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.textContent = aCss;
        head.appendChild(style);
        return style;
    }
    return null;
}

const parser = new DOMParser();

export function parseHTML<T extends HTMLElement>(html: string): T {
    return parser.parseFromString(html, 'text/html').body.firstChild as T;
}
