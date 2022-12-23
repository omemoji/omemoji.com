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

  <div class="card card-shadow m-3 pb-6">
    <nuxt-img
      provider="ipx_fixed"
      :width="
        Math.min(768, Math.floor((500 * artwork.aspect_w) / artwork.aspect_h))
      "
      :height="
        Math.min(500, Math.floor((768 * artwork.aspect_h) / artwork.aspect_w))
      "
      quality="80"
      class="w-full content-image rounded-b-none border-b"
      :src="artwork.image"
      :alt="artwork.title"
    />

    <h1 class="text-center m-6">{{ artwork.title }}</h1>

    <ul class="m-6 mb-0 p-6 card">
      <li>
        <p style="font-size: 21px; font-weight: 500">Category</p>
        Artwork
      </li>
      <li>
        <p style="font-size: 21px; font-weight: 500">Tools</p>
        {{ artwork.tool }}
      </li>
      <li>
        <p style="font-size: 21px; font-weight: 500">Description</p>
        <p>{{ artwork.caption }}</p>
      </li>
      <li>
        <p style="font-size: 21px; font-weight: 500">Link</p>
        <a
          :href="artwork.href"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-700 break-all"
          >{{ artwork.href }}
        </a>
      </li>
    </ul>
  </div>

  <Gallery />
</template>
<script>
import jsonData from "@/assets/json/artworks.json";

export default {
  data() {
    return {
      // jsonArray: JSON.parse(JSON.stringify(jsonData)),
      artwork: JSON.parse(JSON.stringify(jsonData)).filter((artwork) => {
        return artwork.id === this.$route.params.id;
      })[0],
    };
  },
};
</script>
