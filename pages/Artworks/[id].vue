<template>
  <Head>
    <Title>{{ artwork.title }}</Title>
    <Meta
      hid="description"
      name="description"
      :content="`${artwork.caption}`"
    />
    <Meta hid="og:type" property="og:type" content="article" />
    <Meta
      hid="og:url"
      property="og:url"
      :content="`https://omemoji.com/artworks/${artwork.id}`"
    />
    <Meta hid="og:title" property="og:title" :content="`${artwork.title}`" />
    <Meta
      hid="og:description"
      property="og:description"
      :content="`${artwork.caption}`"
    />
    <Meta
      hid="og:image"
      property="og:image"
      :content="`https://omemoji.com${artwork.image}`"
    />
    <Meta
      hid="twitter:image"
      name="twitter:image"
      :content="`https://omemoji.com${artwork.image}`"
    />
  </Head>

  <h1 class="">{{ artwork.title }}</h1>

  <ContentImage
    :width="
      Math.min(768, Math.floor((500 * artwork.aspect_w) / artwork.aspect_h))
    "
    :height="
      Math.min(500, Math.floor((768 * artwork.aspect_h) / artwork.aspect_w))
    "
    quality="90"
    :src="artwork.image"
    :alt="artwork.title"
  />

  <div class="">
    <h2>Tools</h2>
    <p class="">{{ artwork.tool }}</p>
    <h2>Description</h2>
    <p class="">{{ artwork.caption }}</p>
    <h2>Link</h2>
    <p class="">
      <a :href="artwork.href">{{ artwork.href }}</a>
    </p>
  </div>
  <h2>Artworks</h2>
  <Gallery class="overflow-y-scroll" />
</template>
<script>
import jsonData from "@/assets/json/artworks.json";

export default {
  data() {
    let artwork = JSON.parse(JSON.stringify(jsonData)).filter((artwork) => {
      return artwork.id === this.$route.params.id;
    })[0];
    if (artwork === undefined) {
      artwork = {
        id: "",
        image: "/title.png",
        title: "Not Found",
        tool: "",
        href: "",
        caption: "",
        aspect_h: 1,
        aspect_w: 1.6,
      };
    }

    return {
      artwork: artwork,
      // jsonArray: JSON.parse(JSON.stringify(jsonData)),
    };
  },
};
</script>
