import Puppeteer, { Browser, Page } from "puppeteer";
import writeDeckToFile from "./writeFile";
import * as Ydke from "ydke";
import applyFilter, {
  DeckRange,
  SearchFilter,
  deckRangeArray,
  parseDate,
} from "./searchFilter";
import loadArguments from "./arguments";
import loadCluster from "./cluster";

const deckSourceUrl =
  "https://ygoprodeck.com/deck-search/?&_sft_category=master%20duel%20decks&banlist=&offset=0";

const pruneObsoleteDecks = (deckArray: string[]) => {
  deckArray.sort();
  for (let index = 1; index < deckArray.length; index++) {
    const nameAt = (index: number) => deckArray[index].split(/\d+$/)[0];
    if (nameAt(index - 1) === nameAt(index)) deckArray.splice(index - 1, 1);
  }
};

const collectDecks = async (page: Page) => {
  await page.waitForSelector("div.deck_article-card-container > a");
  return await page.evaluate(() => {
    const anchorList = document.querySelectorAll(
      "div.deck_article-card-container > a"
    );
    // @ts-ignore
    return Array.from(anchorList).map((el) => el.href);
  });
};

const saveDeck = async (page: Page, url: string, folderName = "decks") => {
  try {
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("div.deck-metadata-container.deck-bgimg > h1");
    const deckName = await page.evaluate(
      () =>
        document.querySelector("div.deck-metadata-container.deck-bgimg > h1")
          ?.textContent
    );
    await page.waitForSelector(
      "div.deck-metadata-container.deck-bgimg > div:nth-child(2) > span > a:nth-child(2)"
    );
    const deckAuthor = await page.evaluate(
      () =>
        document.querySelector(
          "div.deck-metadata-container.deck-bgimg > div:nth-child(2) > span > a:nth-child(2)"
        )?.textContent
    );
    const deckIdentifier = url.match(/\d+$/)?.[0] || "noIdentifier";
    // @ts-ignore
    const ydke = (await page.evaluate(() => createYdkeUri())) as string;
    await writeDeckToFile(
      Ydke.parseURL(ydke),
      folderName,
      `${deckName} - ${deckAuthor} - ${deckIdentifier}`
    );
    await page.close();
  } catch (err) {
    if (!page.isClosed()) await page.close();
    throw err;
  }
};

async function getDecks(browser: Browser, limit: number, filter: SearchFilter) {
  const deckUrlArray: string[] = [];
  try {
    const page = (await browser.pages())[0];
    await page.goto(deckSourceUrl + applyFilter(filter), {
      waitUntil: "networkidle0",
    });
    while (deckUrlArray.length < limit) {
      deckUrlArray.push(...(await collectDecks(page)));
      pruneObsoleteDecks(deckUrlArray);
      if (deckUrlArray.length > limit) {
        deckUrlArray.splice(limit);
        break;
      }
      await page.click("#pagination-elem > ul > li.page-item.prevDeck > a");
      await page.waitForSelector("div.deck_article-card-container > a");
    }
    await browser.close();
  } catch (err) {
    console.error(
      `Error occurred while searching for decks: ${err}\n Stopped deck search`
    );
    if (browser) await browser.close();
  } finally {
    console.log(`Collected ${deckUrlArray.length} decks`);
    return deckUrlArray;
  }
}

Puppeteer.launch().then(async (browser) => {
  try {
    const argv = await loadArguments();
    const deckLimit = argv.limit || 500;
    const filter: SearchFilter = {
      deckRange: argv.range ? deckRangeArray[argv.range] : DeckRange.AllDecks,
      initialDate: argv.initialDate ? parseDate(argv.initialDate) : "null",
      finalDate: argv.finalDate ? parseDate(argv.finalDate) : "null",
    };
    const cluster = await loadCluster();
    cluster.task(async ({ page, data: url }) => saveDeck(page, url));
    console.log(`Starting deck collect. Limit: ${deckLimit}`);
    const decks = await getDecks(browser, deckLimit, filter);
    console.log(`Starting deck save jobs`);
    for (const deck of decks) cluster.queue(deck);
    await cluster.idle();
    await cluster.close();
    console.log("Finished execution.");
  } catch (err) {
    await browser?.close();
    throw err;
  }
});
