declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.html' {
    const content: string;
    export default content;
}

declare module '*.pug' {
    type TemplateFunction = (data?: Record<string, unknown>) => string;
    const template: TemplateFunction;
    export default template;
}
