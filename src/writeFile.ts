import { writeFile, mkdir } from "fs/promises";
import Path from "path";

interface Deck {
  main: Uint32Array;
  extra: Uint32Array;
  side: Uint32Array;
}

async function writeDeckToFile(
  deck: Deck,
  folderName: string,
  fileName: string
) {
  let ydkContent = "";

  ydkContent += "#main\n";
  ydkContent += deck.main.join("\n") + "\n";

  ydkContent += "#extra\n";
  ydkContent += deck.extra.join("\n") + "\n";

  ydkContent += "!side\n";
  ydkContent += deck.side.join("\n") + "\n";

  await mkdir(folderName, { recursive: true });
  await writeFile(
    `${Path.resolve(
      folderName,
      fileName.trim().replace(/[<>:"\/\\|?*\x00-\x1F]/g, "s")
    )}.ydk`,
    ydkContent,
    {
      flag: "w",
    }
  );
}

export default writeDeckToFile;
