import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import getImageSize from "@/lib/getImageSize";

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
        image: { url: "", width: 0, height: 0 },
      };
      const $ = load(text);
      metaData.title = detectTitle($, url);
      metaData.description = detectDescription($);
      const image = getImageSize(detectImage($, url));
      metaData.image = (await image).img;
      return metaData;
    });
  return metas;
}
