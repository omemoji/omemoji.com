import fs from "fs/promises";
import path from "path";

import { getPlaiceholder } from "plaiceholder";

const getImageSize = async (src: string) => {
  const buffer = !src.startsWith("http")
    ? await fs.readFile(path.join("./public", src))
    : await fetch(src).then(async (res) =>
        Buffer.from(await res.arrayBuffer())
      );
  const {
    metadata: { height, width },
  } = await getPlaiceholder(buffer);

  return {
    img: { src, height, width },
  };
};

export default getImageSize;
