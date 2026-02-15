/**
 * Formats a number into a compact string representation.
 * Example: 1500 -> 1.5K, 1200000 -> 1.2M
 */
export function formatCompactNumber(number) {
    if (number === null || number === undefined) return '0';

    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(number);
}
