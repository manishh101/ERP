const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n: number): string {
  if (n === 0) return "";
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  return (tens[Math.floor(n / 10)] + " " + units[n % 10]).trim();
}

/**
 * Converts a number to its Indian/Nepali formatting string representation in words.
 */
export function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";

  // Handle decimals
  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  const str = wholePart.toString().padStart(9, "0");
  const crores = parseInt(str.substring(0, 2), 10);
  const lakhs = parseInt(str.substring(2, 4), 10);
  const thousands = parseInt(str.substring(4, 6), 10);
  const hundreds = parseInt(str.substring(6, 7), 10);
  const remainder = parseInt(str.substring(7, 9), 10);

  const words = [];

  if (crores > 0) words.push(twoDigitWords(crores) + " Crore");
  if (lakhs > 0) words.push(twoDigitWords(lakhs) + " Lakh");
  if (thousands > 0) words.push(twoDigitWords(thousands) + " Thousand");
  if (hundreds > 0) words.push(units[hundreds] + " Hundred");

  if (remainder > 0) {
    words.push(twoDigitWords(remainder));
  }

  let result = words.join(" ");

  if (decimalPart > 0) {
    result += ` and ${twoDigitWords(decimalPart)} Paisa`;
  }

  return result.trim() + " Only";
}
