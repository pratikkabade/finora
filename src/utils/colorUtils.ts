export const intToHex = (num: number): string => {
    const unsigned = num >>> 0;
    const hex = (unsigned & 0xFFFFFF).toString(16);
    return `#${(`000000${hex}`).slice(-6).toUpperCase()}`;
};

export const hexToRgba = (hex: string, alpha: number): string => {
    const normalized = hex.replace('#', '');
    const isShortHex = normalized.length === 3;
    const fullHex = isShortHex
        ? normalized.split('').map(char => char + char).join('')
        : normalized;

    const red = parseInt(fullHex.slice(0, 2), 16);
    const green = parseInt(fullHex.slice(2, 4), 16);
    const blue = parseInt(fullHex.slice(4, 6), 16);
    const clampedAlpha = Math.max(0, Math.min(1, alpha));

    return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
};
