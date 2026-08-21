import fs from "node:fs";
import path from "node:path";
import { loadDefaultJapaneseParser } from "budoux";
import satori from "satori";

/** 描く文字を持つ OGP のパラメータ。作品の額装（generate.ts）とは別物 */
export const OG_TEXT_PARAMS = {
  /** 外枠の色。移植元と同じ */
  frame: "#d50000",
  card: "#ffffff",
  text: "#000000",
} as const;

const fontFile = path.join(import.meta.dirname, "../../assets/NotoSansCJKjp-Bold.woff");
const iconFile = path.join(import.meta.dirname, "../../../public/omemoji.png");

/**
 * フォント（567 KB）とアイコンは重いので、実際に描くときだけ読む。
 * import しただけでは何も起こさない（マニフェストと同じ方針）
 */
let assets: { font: Buffer; icon: string } | undefined;

function loadAssets(): { font: Buffer; icon: string } {
  assets ??= {
    font: fs.readFileSync(fontFile),
    icon: fs.readFileSync(iconFile).toString("base64"),
  };
  return assets;
}

/** キャッシュのキーに混ぜる。フォントやアイコンを差し替えたら値が変わる */
export function textAssetsKey(): string {
  const { font, icon } = loadAssets();
  return `${font.byteLength}:${icon.length}`;
}

const parser = loadDefaultJapaneseParser();

/**
 * タイトルを載せた OGP の SVG。移植元の絵柄をそのまま持ってきている。
 *
 * **日本語は budoux で文節に分けて `display: block` の span に包む。**
 * satori には禁則処理が無く、そのまま流すと単語の途中で改行される
 */
export async function renderTitleSvg(
  title: string,
  { width, height }: { width: number; height: number }
): Promise<string> {
  const { font, icon } = loadAssets();

  // 同じ文節が何度も出るため、キーには先頭からの位置を混ぜる
  let offset = 0;
  const chunks = parser.parse(title).map((text) => {
    const key = `${offset}:${text}`;
    offset += text.length;
    return { key, text };
  });

  return await satori(
    <div
      style={{
        fontFamily: "Noto Sans CJK JP, sans-serif",
        backgroundColor: OG_TEXT_PARAMS.frame,
        color: OG_TEXT_PARAMS.text,
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
          backgroundColor: OG_TEXT_PARAMS.card,
          width: "100%",
          height: "100%",
          padding: "3rem",
        }}
      >
        <div
          style={{
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
          {chunks.map(({ key, text }) => (
            <span key={key} style={{ display: "block" }}>
              {text}
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
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={`data:image/png;base64,${icon}`}
              alt="omemoji"
              width={100}
              height={100}
              style={{ borderRadius: "9999px", marginRight: "1.25rem" }}
            />
            <span style={{ fontSize: "2.5rem" }}>omemoji</span>
          </div>
          <span style={{ display: "flex", fontSize: "2.5rem" }}>創作物紹介</span>
        </div>
      </div>
    </div>,
    {
      width,
      height,
      fonts: [{ name: "Noto Sans CJK JP", data: font, weight: 700, style: "normal" }],
    }
  );
}
