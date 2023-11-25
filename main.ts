import Puppeteer, { Browser, Page } from "puppeteer";
import { Cluster } from "puppeteer-cluster";
import Path from "path";
import { argv } from "yargs";

const decksUrl =
  "https://ygoprodeck.com/deck-search/?&_sft_category=master%20duel%20decks&banlist=&offset=0";

const collectUrls = async (page: Page) => {
  const deckUrlArray = await page.evaluate(() => {
    const anchorList = document.querySelectorAll(
      "div.deck_article-card-container > a"
    );
    // @ts-ignore
    return Array.from(anchorList).map((el) => el.href);
  });

  return deckUrlArray;
};

async function getDecks(browser: Browser, limit: number) {
  const deckUrls = [];
  const page = await browser.newPage();
  await page.goto(decksUrl, { waitUntil: "networkidle0" });
  while (deckUrls.length < limit) {
    deckUrls.push(...(await collectUrls(page)));
    await page.click("#pagination-elem > ul > li.page-item.prevDeck > a");
    try {
      await page.waitForSelector("div.deck_article-card-container > a", {
        visible: true,
      });
    } catch {
      console.log("Did not find any decks in the page. Ending search loop.");
      break;
    }
  }
  await page.close();
  if (deckUrls.length > limit) return deckUrls.slice(0, limit);
  return deckUrls;
}

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

async function downloadDecks(
  browser: Browser,
  decks: string[],
  maxConcurrency = 5,
  folderName = "decks"
) {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency,
  });
  const downloaded: string[] = [];
  for (const deckUrl of decks) {
    const page = await browser.newPage();
    cluster.queue(async () => {
      await configureDownloadBehaviour(page, folderName);
      await page.goto(deckUrl, { waitUntil: "networkidle0" });
      await page.click("#dropdownMenuButton");
      await page.click('a[onclick~="downloadYDK()"]');
      await page.waitForNetworkIdle({ timeout: 5000 });
      downloaded.push(deckUrl);
      await page.close;
    });
  }
  await cluster.idle();
  await cluster.close();
  return downloaded;
}

Puppeteer.launch().then(async (browser) => {
  // @ts-ignore
  const deckLimit = (await argv.limit) || 500;
  const decks = await getDecks(browser, deckLimit);
  console.log(`Got ${decks.length} decks, attempting to download them...`);
  const downloaded = await downloadDecks(browser, decks);
  let failed = findFailedDownloads(decks, downloaded);
  while (failed.length) {
    console.log(`Some decks have failed to download: ${failed}.\nRetrying...`);
    const retryDownloaded = await downloadDecks(browser, failed);
    failed = findFailedDownloads(failed, retryDownloaded);
  }
  console.log("Downloaded all decks");
  await browser.close();
});
