Execution example:

`npm run start -- --limit=200` -> *fetches 200 decks*

*not passing any arguments will default to 500 decks*

---
The scraper will save decks "on-the-fly". The deck-scraping will be parallel to to other decks being scraped and concurrent to the deck search/crawl.

It should also be able to detect failed decks and retry them.

---
**Warning**: Due to the YGOPro's deck API inner workings and/or design, further pages increase in load time, meaning that the more decks you fetch, the longer it will take, not following a linear time complexity.
