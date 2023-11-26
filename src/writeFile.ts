import { writeFile, mkdir } from "fs/promises";
import { TypedDeck } from "ydke";
import Path from "path";

async function writeDeckToFile(
  deck: TypedDeck,
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
  return await writeFile(
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
