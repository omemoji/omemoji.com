import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import { getPlaiceholder } from "plaiceholder";

interface Metadata {
  url: string;
  title: string;
  description: string;
  image: { url: string; width: number; height: number };
}

const getImageMeta = async (src: string) => {
  if (src === "" || src === undefined) {
    return { img: { url: "", width: 0, height: 0 } };
  } else {
    const buffer: Buffer = await fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buffer) => Buffer.from(buffer));
    const bufferExists = buffer.length > 0;
    const {
      metadata: { width, height },
    } = bufferExists
      ? await getPlaiceholder(buffer)
      : {
          metadata: { width: 0, height: 0 },
        };
    const url = bufferExists ? src : "";
    return {
      img: { url: url, width, height },
    };
  }
};

const metadataCache = new Map<string, Metadata>();

const detectTitle = ($: CheerioAPI, url: string) => {
  let t =
    $('meta[property="og:title"]').attr("content") ??
    $("title").text() ??
    $('meta[name="title"]').attr("content") ??
    url;
  return t;
};

const detectImage = async ($: CheerioAPI, url: string) => {
  let tmp =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[property="og:image:url"]').attr("content") ??
    $('meta[itemprop="image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content") ??
    $('link[rel="apple-touch-icon"]').attr("href") ??
    "";
  let imgUrl = tmp;

  if (imgUrl !== "" && !imgUrl.startsWith("http")) {
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
  return (await getImageMeta(imgUrl)).img;
};

const detectDescription = ($: CheerioAPI) => {
  let t =
    $('meta[property="og:description"]').attr("content") ??
    $('meta[name="description"]').attr("content") ??
    "";
  return t;
};

export default async function fetchMeta(url: string) {
  const cachedMetadata: Metadata | undefined = metadataCache.get(url);
  if (cachedMetadata) {
    return cachedMetadata;
  }
  const req: Request = new Request(url, { headers: { "User-Agent": "bot" } });
  const metaDataEmpty: Metadata = {
    url: url,
    title: "",
    description: "",
    image: { url: "", width: 0, height: 0 },
  };
  const metaData: Metadata = await fetch(req)
    .then(async (res) => res.text())
    .then(async (text) => {
      const $ = load(text);
      const meta = {
        url: url,
        title: detectTitle($, url),
        description: detectDescription($),
        image: await detectImage($, url),
      };
      metadataCache.set(url, meta);
      return meta;
    })
    .catch((e) => {
      return metaDataEmpty;
    });
  return metaData;
}
