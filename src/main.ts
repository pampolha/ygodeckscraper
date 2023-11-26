import Puppeteer, { Browser, Page } from "puppeteer";
import { Cluster } from "puppeteer-cluster";
import Yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import Os from "os";
import writeDeckToFile from "./writeFile";
import * as Ydke from "ydke";
import applyFilter, {
  DeckRange,
  SearchFilter,
  deckRangeArray,
} from "./searchFilter";

const deckSourceUrl =
  "https://ygoprodeck.com/deck-search/?&_sft_category=master%20duel%20decks&banlist=&offset=0";

const collectPageLinks = async (page: Page) => {
  return await page.evaluate(() => {
    const anchorList = document.querySelectorAll(
      "div.deck_article-card-container > a"
    );
    // @ts-ignore
    return Array.from(anchorList).map((el) => el.href);
  });
};

const findFailedDownloads = (decks: string[], downloaded: string[]) => {
  const failed = [];
  for (const deck of decks) {
    if (!downloaded.some((down) => down === deck)) failed.push(deck);
  }
  return failed;
};

const saveDeck = async (
  browser: Browser,
  url: string,
  downloadedUrlArray: string[],
  folderName = "decks"
) => {
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    const deckName = await page.evaluate(
      () =>
        document.querySelector("div.deck-metadata-container.deck-bgimg > h1")
          ?.textContent
    );
    const deckAuthor = await page.evaluate(
      () =>
        document.querySelector(
          "div.deck-metadata-container.deck-bgimg > div:nth-child(2) > span > a:nth-child(2)"
        )?.textContent
    );
    // @ts-ignore
    const ydke = (await page.evaluate(() => createYdkeUri())) as string;
    await writeDeckToFile(
      Ydke.parseURL(ydke),
      folderName,
      `${deckName} - ${deckAuthor}`
    );
    await page.close();
    downloadedUrlArray.push(url);
  } catch (err) {
    console.error(`Error occurred while downloading deck: ${url}.\n${err}`);
  }
};

async function getDecks(
  browser: Browser,
  cluster: Cluster,
  limit: number,
  filter: SearchFilter
) {
  const deckUrlArray: string[] = [];
  const downloadedUrlArray: string[] = [];
  const page = await browser.newPage();
  await page.goto(deckSourceUrl + applyFilter(filter), {
    waitUntil: "networkidle0",
  });
  while (deckUrlArray.length < limit) {
    try {
      let pageDeckUrlArray = await collectPageLinks(page);
      if (pageDeckUrlArray.length + deckUrlArray.length > limit) {
        pageDeckUrlArray = pageDeckUrlArray.slice(
          0,
          deckUrlArray.length + pageDeckUrlArray.length - limit
        );
      }
      deckUrlArray.push(...pageDeckUrlArray);
      for (const url of pageDeckUrlArray) {
        await cluster.queue(async () =>
          saveDeck(browser, url, downloadedUrlArray)
        );
      }
      await page.click("#pagination-elem > ul > li.page-item.prevDeck > a");

      await page.waitForSelector("div.deck_article-card-container > a", {
        visible: true,
      });
    } catch (err) {
      console.error(
        `Error occurred while searching for decks, execution will be stopped.\n${err}`
      );
      break;
    }
  }
  await page.close();
  return {
    deckUrls: deckUrlArray,
    downloaded: downloadedUrlArray,
  };
}

Puppeteer.launch().then(async (browser) => {
  try {
    const argv = await Yargs(hideBin(process.argv)).option({
      limit: { type: "number" },
      range: {
        type: "number",
        choices: [0, 1, 2, 3],
        describe: `Deck range options:\n
      0 - All decks\n
      1 - Featured builders\n
      2 - High quality deck primer\n
      3 - Premium supporter decks\n`,
      },
      initialDate: { type: "string" },
      finalDate: { type: "string" },
    }).argv;
    const deckLimit = argv.limit || 500;
    const filter: SearchFilter = {
      deckRange: argv.range ? deckRangeArray[argv.range] : DeckRange.AllDecks,
      initialDate: argv.initialDate || "null",
      finalDate: argv.finalDate || "null",
    };
    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: Os.cpus().length,
    });
    const decks = await getDecks(browser, cluster, deckLimit, filter);
    await cluster.idle();
    let failedArray = findFailedDownloads(decks.deckUrls, decks.downloaded);

    while (failedArray.length) {
      const retryArray: string[] = [];
      console.log(
        `${failedArray.length} decks failed to download, retrying...`
      );
      for (const deck of failedArray) {
        await cluster.queue(async () => saveDeck(browser, deck, retryArray));
      }
      await cluster.idle();
      failedArray = findFailedDownloads(failedArray, retryArray);
    }
    await cluster.idle();
    await cluster.close();
    console.log("Downloaded all decks");
    await browser.close();
  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
});
