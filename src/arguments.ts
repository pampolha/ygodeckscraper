import Yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const loadArguments = async () =>
  await Yargs(hideBin(process.argv)).option({
    limit: {
      type: "number",
      describe: "The nonnegative number of decks to be fetched and saved.",
    },
    range: {
      type: "number",
      choices: [0, 1, 2, 3],
      describe: `The type of deck to search for.
      Deck range options:
      0 - All decks
      1 - Featured builders
      2 - High quality deck primer
      3 - Premium supporter decks`,
    },
    initialDate: {
      type: "string",
      describe: `The starting date of the time range in which to search the deck for.
      Must be in yyyy-MM-dd format.`,
    },
    finalDate: {
      type: "string",
      describe: `The final date of the time range in which to search the deck for.
      Must be in yyyy-MM-dd format.`,
    },
  }).argv;

export default loadArguments;
