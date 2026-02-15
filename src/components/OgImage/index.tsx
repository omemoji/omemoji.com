/** @jsxImportSource react */
/** @jsxRuntime automatic */

import { loadDefaultJapaneseParser } from "budoux";
import satori from "satori";
import sharp from "sharp";

const parser = loadDefaultJapaneseParser();

const [notoFontData, iconBuffer] = await Promise.all([
  Bun.file("./src/assets/NotoSansCJKjp-Bold.woff").arrayBuffer(),
  Bun.file("./src/assets/omemoji.png").arrayBuffer(),
]);

const icon = Buffer.from(iconBuffer).toString("base64");

const ogImage = async (text: string) => {
  console.log("Generating og image");
  const svg = await satori(
    <div
      style={{
        fontFamily: "Noto Sans CJK JP, Noto Sans CJK JP, Noto Color Emoji, sans-serif",
        backgroundColor: "#d50000",
        color: "black",
        display: "flex",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "1rem",
          backgroundColor: "white",
          width: "100%",
          height: "100%",
          padding: "3rem",
        }}
      >
        <div
          style={{
            marginTop: 0,
            fontSize: "4rem",
            width: "100%",
            flexGrow: 1,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            alignContent: "center",
            justifyContent: "center",
            lineHeight: "1.2",
          }}
        >
          {parser.parse(text).map((word) => (
            <span key={word} style={{ display: "block" }}>
              {word}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={`data:image/png;base64,${icon}`}
              alt="omemoji"
              width={100}
              height={100}
              style={{
                borderRadius: "9999px",
                marginRight: "1.25rem",
              }}
            />
            <h2
              style={{
                marginRight: "1.25rem",
                fontFamily: "Noto Sans CJK JP",
                fontSize: "2.5rem",
              }}
            >
              {"omemoji"}
            </h2>
          </div>
          <div style={{ display: "flex" }}>
            <h2
              style={{
                fontFamily: "Noto Sans CJK JP",
                fontSize: "2.5rem",
              }}
            >
              <p>創作物紹介</p>
            </h2>
          </div>
        </div>
      </div>
    </div>,
    {
      // debug: true,
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Noto Sans CJK JP",
          data: notoFontData,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
  const imgBuffer = sharp(Buffer.from(svg))
    .png({
      quality: 60,
    })
    .toBuffer();
  return imgBuffer;
};

export default ogImage;
