<template>
  <NuxtLink
    :to="props.url"
    target="_blank"
    rel="noopener noreferrer"
    class="w-full fg-default"
  >
    <div
      class="card flex overflow-x-hidden mb-6 w-full hover:bg-gray-400/20 transition-colors h-24 xs:h-40"
    >
      <div class="pl-3 xs:pl-6 xs:pr-6 my-auto overflow-x-auto pr-3 pb-3">
        <p class="embed-title-small xs:embed-title xs:overflow-x-hidden">
          {{ title }}
        </p>
        <p class="inline embeded-url">{{ link }}</p>
      </div>
      <nuxt-img
        v-if="image != '/no-image.png'"
        :src="image"
        :alt="props.url"
        format="webp"
        quality="50"
        width="250"
        height="250"
        loading="lazy"
        class="ml-auto bg-black/10 float-right rounded-r-md max-h-40 w-auto aspect-square max-laptop:aspect-auto laptop:w-auto object-cover"
      />
    </div>
  </NuxtLink>
</template>

<script defer setup>
import * as cheerio from "cheerio";
const props = defineProps({ url: String });

let lurl = "";

const { data, pending, error, refresh } = await useLazyFetch(props.url, {
  method: "GET",
  initialCache: false,
});

const $ =  cheerio.load(typeof data.value == "string" ? data.value : "");

const detectTitle = () => {
  let t;
  if (typeof $("meta[property='og:title']").attr("content") == "string") {
    t = $("meta[property='og:title']").attr("content");
    lurl = props.url;
  } else if (typeof $("title").text() == "string") {
    t = $("title").text();
    lurl = props.url;
  } else {
    t = props.url;
  }
  return t;
};

const title = detectTitle();

const detectImage = () => {
  let imgurl;
  if (typeof $("meta[property='og:image']").attr("content") == "string") {
    imgurl = $("meta[property='og:image']").attr("content");
  } else if (
    typeof $("meta[property='og:image:url']").attr("content") == "string"
  ) {
    imgurl = $("meta[property='og:image:url']").attr("content");
  } else {
    imgurl = "/no-image.png";
  }
  if (imgurl != "/no-image.png" && imgurl.substring(0, 4) != "http") {
    let imgurl_minus_https = props.url.substring(props.url.indexOf("/") + 2);
    if (imgurl_minus_https.match("/")) {
      imgurl_minus_https = imgurl_minus_https.substring(
        0,
        imgurl_minus_https.indexOf("/")
      );
    }
    imgurl =
      props.url.substring(0, props.url.indexOf("/")) +
      "//" +
      imgurl_minus_https +
      imgurl;
  }
  return imgurl;
};

const image = detectImage();

const link = lurl;
</script>
