// convert 100000 to 100,000
export function formatNumberWithCommas(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}