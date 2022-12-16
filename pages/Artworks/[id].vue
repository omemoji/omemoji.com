<template>
  <Head>
    <Title>{{ artwork.title }}</Title>
    <Meta
      hid="description"
      name="description"
      :content="`${artwork.caption}`"
    />
    <Meta
      hid="url"
      property="og:url"
      :content="`https://omemoji.com/Artworks/${artwork.id}`"
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

  <div class="card card-shadow m-3 p-3">
    <div class="card">
      <nuxt-img
        provider="ipx_fixed"
        width="720"
        quality="100"
        class="w-full content-image"
        :src="artwork.image"
        :alt="artwork.title"
      />
    </div>

    <h1 class="text-center my-3 p-3">{{ artwork.title }}</h1>

    <ul class="p-3 pl-6 card">
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
