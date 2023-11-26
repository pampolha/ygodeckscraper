import Yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const loadArguments = async () =>
  await Yargs(hideBin(process.argv)).option({
    limit: {
      type: "number",
      describe: `The nonnegative number of decks to be fetched and saved.
      
      This defaults to 500 decks.`,
    },
    range: {
      type: "number",
      choices: [0, 1, 2, 3],
      describe: `The type of deck to search for.
      Deck range options:
      0 - All decks
      1 - Featured builders
      2 - High quality deck primer
      3 - Premium supporter decks
      
      This defaults to all decks.`,
    },
    initialDate: {
      type: "string",
      describe: `The starting date of the time range in which to search the deck for.
      Must be in yyyy-MM-dd format.
      
      This defaults to no initial range.`,
    },
    finalDate: {
      type: "string",
      describe: `The final date of the time range in which to search the deck for.
      Must be in yyyy-MM-dd format.
      
      This defaults to no final range.`,
    },
  }).argv;

export default loadArguments;
