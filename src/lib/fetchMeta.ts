import { metadata } from "app/layout";
import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";

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
    "";

  let imgurl = tmp;
  if (imgurl != "" && !imgurl.startsWith("http")) {
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
    .then((text) => {
      const metaData = {
        url: url,
        title: "",
        description: "",
        og: "",
      };
      const $ = load(text);
      metaData.title = detectTitle($, url);
      metaData.description = detectDescription($);
      metaData.og = detectImage($, url);
      return metaData;
    });
  return metas;
}
