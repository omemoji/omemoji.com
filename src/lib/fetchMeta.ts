import sharp from "sharp";
import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import getImageSize from "lib/getImageSize";

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
    undefined;

  let imgurl = tmp;
  if (imgurl != undefined && !imgurl.startsWith("http")) {
    let imgurl_minus_https = url.substring(url.indexOf("/") + 2);
    if (imgurl_minus_https.match("/")) {
      imgurl_minus_https = imgurl_minus_https.substring(
        0,
        imgurl_minus_https.indexOf("/")
      );
    }
    imgurl =
      url.substring(0, url.indexOf("/")) + "//" + imgurl_minus_https + imgurl;
  }
  return imgurl;
};

const imgCache = new Map<string, string | undefined>();

const getImg = async (
  src: string,
  useOptimize: boolean,
  transform: { width: number }
) => {
  const cached = imgCache.get(src);
  if (cached) {
    return cached;
  } else {
    let imgBuffer: Buffer | undefined = await fetch(src).then(async (res) =>
      res.ok ? Buffer.from(await res.arrayBuffer()) : undefined
    );

    const {
      img: { height, width },
    } = await getImageSize(src);
    if (imgBuffer && useOptimize) {
      const aspect = height / width;
      const w = transform?.width;
      const h = Math.round(w * aspect);
      imgBuffer =
        (await sharp(imgBuffer).resize(w, h).webp().toBuffer()) ?? undefined;
    }
    const base64 = imgBuffer
      ? "data:image/webp;base64," + Buffer.from(imgBuffer).toString("base64")
      : undefined;
    imgCache.set(src, base64);
    return base64;
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
  const metas = await fetch(url)
    .then((res) => res.text())
    .then(async (text) => {
      const metaData = {
        url: url,
        title: "",
        description: "",
        og: "",
      };
      const $ = load(text);

      metaData.title = detectTitle($, url);
      metaData.description = detectDescription($);
      const base64url = detectImage($, url)
        ? await getImg(detectImage($, url) ?? "", true, { width: 240 })
        : undefined;
      const imgUrl = base64url ?? detectImage($, url);

      metaData.og = imgUrl ?? "";

      return metaData;
    });
  return metas;
}
