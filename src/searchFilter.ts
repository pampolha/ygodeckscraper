import { isValid, format, parseISO } from "date-fns";

export enum DeckRange {
  AllDecks = "null",
  FeaturedBuilders = "featured",
  HighQualityDeckPrimer = "deckprimer",
  PremiumSupporterDecks = "premium",
}
export const deckRangeArray = Object.values(DeckRange);

type DateRange = string;
export function parseDate(date: string): DateRange {
  if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(date)) {
    throw new Error(
      `Date ${date} is not a valid date. Use the yyyy-MM-dd format`
    );
  }
  const isoDate = parseISO(date);
  if (!isValid(isoDate)) {
    throw new Error(`Date ${date} is not a valid date.`);
  }
  return format(isoDate, "yyyy-MM-dd");
}

export interface SearchFilter {
  deckRange: DeckRange;
  initialDate: DateRange;
  finalDate: DateRange;
}

function applyFilter(searchFilter: SearchFilter) {
  const queries = {
    deckRange: `&range=${searchFilter.deckRange}`,
    initialDate: `&from=${searchFilter.initialDate}`,
    finalDate: `&to=${searchFilter.finalDate}`,
  };
  return Object.values(queries).join("");
}

export default applyFilter;
