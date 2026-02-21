/** @jsxImportSource react */
/** @jsxRuntime automatic */

import { readFile } from "node:fs/promises";
import satori from "satori";
import sharp from "sharp";

const ogArtworkImage = async (src: string) => {
  console.log(src);
  const [ArtworkBuffer] = await Promise.all([readFile(`.${src}`)]);
  const artworkBase64 = await sharp(Buffer.from(ArtworkBuffer))
    .toFormat("png")
    .toBuffer();

  const svg = await satori(
    <div
      style={{
        fontFamily:
          "Noto Sans CJK JP, Noto Sans CJK JP, Noto Color Emoji, sans-serif",
        backgroundColor: "#d50000",
        display: "flex",
        color: "black",
        height: "100%",
        width: "100%",
      }}
    >
      <img
        src={`data:image/png;base64,${artworkBase64.toString("base64")}`}
        alt=""
        style={{
          height: "100%",
          width: "100%",
          objectFit: "contain",
          backgroundColor: "#555555",
        }}
      />
    </div>,
    {
      // debug: true,
      width: 1200,
      height: 630,
      fonts: [],
    },
  );
  const imgBuffer = sharp(Buffer.from(svg))
    .png({
      quality: 60,
    })
    .toBuffer();
  return imgBuffer;
};

export default ogArtworkImage;
