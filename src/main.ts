import Puppeteer, { Browser, Page } from "puppeteer";
import { Cluster } from "puppeteer-cluster";
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

const collectPageLinks = async (page: Page) => {
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
    const deckIdentifier = url.match(/\d+$/)?.[0] || 'noIdentifier';
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

async function getDecks(
  browser: Browser,
  cluster: Cluster,
  limit: number,
  filter: SearchFilter
) {
  try {
    const deckUrlArray: string[] = [];
    const page = (await browser.pages())[0];
    await page.goto(deckSourceUrl + applyFilter(filter), {
      waitUntil: "networkidle0",
    });
    while (deckUrlArray.length < limit) {
      const pageDeckUrlArray = await collectPageLinks(page);
      deckUrlArray.push(...pageDeckUrlArray);
      if (deckUrlArray.length > limit) deckUrlArray.splice(limit);
      for (const url of pageDeckUrlArray) {
        cluster.queue(url);
      }
      await page.click("#pagination-elem > ul > li.page-item.prevDeck > a");
      await page.waitForSelector("div.deck_article-card-container > a");
    }
    await browser.close();
    console.log(`Finished fetching ${deckUrlArray.length} decks`);
    return deckUrlArray;
  } catch (err) {
    console.error(
      `Error occurred while searching for decks: ${err}\n Stopped deck search`
    );
    if (browser) await browser.close();
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
    await getDecks(browser, cluster, deckLimit, filter);
    await cluster.idle();
    await cluster.close();
    console.log("Downloaded all decks");
  } catch (err) {
    await browser?.close();
    throw err;
  }
});
