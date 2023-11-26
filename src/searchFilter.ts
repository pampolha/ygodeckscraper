import { isValid, format, parseISO } from "date-fns";

export enum DeckRange {
  AllDecks = "null",
  FeaturedBuilders = "featured",
  HighQualityDeckPrimer = "deckprimer",
  PremiumSupporterDecks = "premium",
}

type DateRange = string;
export function parseDate(date: string): DateRange {
  if (!isValid(date)) {
    throw new Error(`Date ${date} is not a valid date`);
  }
  const isoDate = parseISO(date);
  return format(isoDate, "YYYY-MM-DD");
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
