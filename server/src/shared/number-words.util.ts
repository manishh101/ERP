/**
 * Convert number to words for Nepal invoice footer
 * e.g. 73450 -> "Seventy Three Thousand Four Hundred Fifty Rupees Only"
 */

const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertLessThousand(n: number): string {
  if (n === 0) return "";
  let res = "";
  if (n >= 100) {
    res += units[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    res += tens[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n >= 10) {
    res += teens[n - 10] + " ";
    n = 0;
  }
  if (n > 0) {
    res += units[n] + " ";
  }
  return res.trim();
}

export function toEnglishWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  
  let integerPart = Math.floor(amount);
  let decimalPart = Math.round((amount - integerPart) * 100);

  let res = "";
  
  // Indian numbering system (Crore, Lakh, Thousand)
  if (integerPart >= 10000000) {
    res += convertLessThousand(Math.floor(integerPart / 10000000)) + " Crore ";
    integerPart %= 10000000;
  }
  if (integerPart >= 100000) {
    res += convertLessThousand(Math.floor(integerPart / 100000)) + " Lakh ";
    integerPart %= 100000;
  }
  if (integerPart >= 1000) {
    res += convertLessThousand(Math.floor(integerPart / 1000)) + " Thousand ";
    integerPart %= 1000;
  }
  res += convertLessThousand(integerPart);

  res = res.trim() + " Rupees";
  
  if (decimalPart > 0) {
    res += " and " + convertLessThousand(decimalPart) + " Paisa";
  }

  return res + " Only";
}

export function toNepaliWords(amount: number): string {
  // Skeleton implementation as per prompt requirement
  // Usually this would use a library or a complex map
  return toEnglishWords(amount); 
}
