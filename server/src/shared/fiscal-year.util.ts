import NepaliDate from 'nepali-datetime';

/**
 * Returns the current Nepali Fiscal Year in the format "YYYY/YY" (e.g. "2081/82")
 * The Nepali fiscal year changes on Shrawan 1st (month index 3 since Baisakh is 0).
 */
export function getCurrentFiscalYear(date: Date = new Date()): string {
  const nepaliDate = new NepaliDate(date);
  const year = nepaliDate.getYear();
  const month = nepaliDate.getMonth(); // 0-indexed, where 0 is Baisakh, 3 is Shrawan.

  if (month >= 3) {
    return `${year}/${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}/${year.toString().slice(-2)}`;
  }
}

/**
 * Returns the BS date string in "YYYY-MM-DD" format.
 */
export function getBsDate(date: Date = new Date()): string {
  const nepaliDate = new NepaliDate(date);
  return nepaliDate.format('YYYY-MM-DD');
}
