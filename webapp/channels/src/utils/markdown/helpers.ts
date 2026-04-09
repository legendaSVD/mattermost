export function parseImageDimensions(input: string): {href: string; height: string; width: string} {
    const match = (/ =(\d*)(?:x(\d+))?$/).exec(input);
    if (!match) {
        return {
            href: input,
            height: '',
            width: '',
        };
    }
    let width = match[1];
    let height = match[2];
    if (!width && !height) {
        return {
            href: input,
            height: '',
            width: '',
        };
    }
    if (width && !height) {
        height = 'auto';
    } else if (height && !width) {
        width = 'auto';
    }
    return {
        href: input.substring(0, input.length - match[0].length),
        height,
        width,
    };
}