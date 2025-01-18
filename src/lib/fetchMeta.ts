import sharp from "sharp";
import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import getImageSize from "@/lib/getImageSize";
import { sha256 } from "@noble/hashes/sha2";
import fs from "fs";
import path from "path";

const detectTitle = ($: CheerioAPI, url: string) => {
  let t =
    $('meta[property="og:title"]').attr("content") ??
    $("title").text() ??
    $('meta[name="title"]').attr("content") ??
    url;
  return t;
};

const detectImage = ($: CheerioAPI, url: string) => {
  let tmp =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[property="og:image:url"]').attr("content") ??
    $('meta[itemprop="image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content") ??
    $('link[rel="apple-touch-icon"]').attr("href") ??
    "";

  let imgUrl = tmp;
  if (imgUrl != "" && !imgUrl.startsWith("http")) {
    let imgurl_minus_https = url.substring(url.indexOf("/") + 2);
    if (imgurl_minus_https.match("/")) {
      imgurl_minus_https = imgurl_minus_https.substring(
        0,
        imgurl_minus_https.indexOf("/")
      );
    }
    imgUrl =
      url.substring(0, url.indexOf("/")) + "//" + imgurl_minus_https + imgUrl;
  }
  return imgUrl;
};

const getImg = async (
  src: string,
  useOptimize: boolean,
  transform: { height: number }
) => {
  if (src == "") {
    return { url: "", w: 0, h: 0 };
  }
  const url = `${path.join(
    "./public/og",
    `${sha256(src).toString().replace(/,/g, "") + ".png"}`
  )}`;
  if (!fs.existsSync(url)) {
    let imgBuffer: Buffer | undefined = await fetch(src).then(async (res) =>
      res.ok ? Buffer.from(await res.arrayBuffer()) : undefined
    );
    const {
      img: { width, height },
    } = await getImageSize(src);
    const aspect = width / height;
    const h = transform?.height ?? 0;
    const w = Math.round(h * aspect) ?? 0;
    if (imgBuffer && useOptimize) {
      imgBuffer =
        (await sharp(imgBuffer)
          .resize(w, h)
          .toFormat("png", { quality: 20 })
          .toBuffer()) ?? undefined;
    }
    const base64: string = imgBuffer ? imgBuffer.toString("base64") : "";

    fs.promises.writeFile(url, base64, {
      encoding: "base64",
    });

    return { url, w, h };
  } else {
    const path = url.replace("public", "");
    return {
      url: url,
      w: (await getImageSize(path)).img.width,
      h: (await getImageSize(path)).img.height,
    };
  }
};

const detectDescription = ($: CheerioAPI) => {
  let t =
    $('meta[property="og:description"]').attr("content") ??
    $('meta[name="description"]').attr("content") ??
    "";
  return t;
};

export default async function fetchMeta(url: string) {
  const req = new Request(url, { headers: { "User-Agent": "bot" } });
  const metas = await fetch(req)
    .then((res) => res.text())
    .then(async (text) => {
      const metaData = {
        url: url,
        title: "",
        description: "",
        image: { url: "", w: 0, h: 0 },
      };
      const $ = load(text);
      metaData.title = detectTitle($, url);
      metaData.description = detectDescription($);
      const image = await getImg(detectImage($, url), true, { height: 120 });
      image.url = image.url.replace("public", "");
      metaData.image = image;
      return metaData;
    });
  return metas;
}
