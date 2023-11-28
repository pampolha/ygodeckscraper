Execution example:

`npm run start -- --limit=200 --range 2 --initialDate 2023-01-01 --finalDate 2024-01-01` -> *fetches 200 decks, from the "high quality deck primer" range, that have been created between 2023 and 2024*

Running `npm run start -- --help` displays arguments descriptions.

---
The scraper will collect decks and then attempt to concurrently save them.

It should also be able to detect failed save attempts and retry them.

---
**Warning**: Due to the YGOPro's deck API inner workings and/or design, further pages increase in load time, meaning that the more decks you fetch, the longer it will take, not following a linear time complexity.
