import Puppeteer, { Browser, Page } from "puppeteer";
import { Cluster } from "puppeteer-cluster";
import Path from "path";
import Yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import Os from "os";

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

const configureDownloadBehaviour = async (page: Page, folderName: string) => {
  const cdp = await page.createCDPSession();
  await cdp.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: Path.resolve(folderName),
  });
};

const findFailedDownloads = (decks: string[], downloaded: string[]) => {
  const failed = [];
  for (const deck of decks) {
    if (!downloaded.some((down) => down === deck)) failed.push(deck);
  }
  return failed;
};

const downloadDeck = async (
  browser: Browser,
  url: string,
  downloadedUrlArray: string[],
  folderName = "decks"
) => {
  try {
    const page = await browser.newPage();
    await configureDownloadBehaviour(page, folderName);
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.click("#dropdownMenuButton");
    await page.click('a[onclick~="downloadYDK()"]');
    await page.waitForNetworkIdle({ timeout: 5000 });
    await page.close();
    downloadedUrlArray.push(url);
  } catch (err) {
    console.error(`Error occurred while downloading deck: ${url}.\n${err}`);
  }
};

async function getDecks(browser: Browser, cluster: Cluster, limit: number) {
  const deckUrlArray: string[] = [];
  const downloadedUrlArray: string[] = [];
  const page = await browser.newPage();
  await page.goto(deckSourceUrl, { waitUntil: "networkidle0" });
  while (deckUrlArray.length < limit) {
    try {
      const pageDeckUrlArray = await collectPageLinks(page);
      deckUrlArray.push(...pageDeckUrlArray);
      for (const url of pageDeckUrlArray) {
        cluster.queue(async () =>
          downloadDeck(browser, url, downloadedUrlArray)
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
  if (deckUrlArray.length > limit) return deckUrlArray.slice(0, limit);
  return {
    deckUrls: deckUrlArray,
    downloaded: downloadedUrlArray,
  };
}

Puppeteer.launch().then(async (browser) => {
  const argv = await Yargs(hideBin(process.argv)).option({
    limit: { type: "number" },
  }).argv;
  const deckLimit = argv.limit || 500;
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: Os.cpus().length,
  });
  const decks = await getDecks(browser, cluster, deckLimit);
  await cluster.idle();
  await cluster.close();
  console.log("Downloaded all decks");
  await browser.close();
});
