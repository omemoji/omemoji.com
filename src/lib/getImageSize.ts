import fs from "fs/promises";
import path from "path";

import { getPlaiceholder } from "plaiceholder";

const getImageSize = async (src: string) => {
  if (src === "" || src === undefined) {
    return { img: { url: "", width: 0, height: 0 } };
  }
  const buffer = !src.startsWith("http")
    ? await fs.readFile(path.join("./public", src))
    : await fetch(src).then(async (res) =>
        Buffer.from(await res.arrayBuffer())
      );
  const {
    metadata: { height, width },
  } = await getPlaiceholder(buffer);
  const url = src;
  return {
    img: { url, width, height },
  };
};

export default getImageSize;
