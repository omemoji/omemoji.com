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
        height="720"
        fit="inside"
        quality="100"
        class="w-full content-image"
        :src="artwork.image"
        :alt="artwork.title"
      />
    </div>

    <h1 class="text-center my-3 p-3">{{ artwork.title }}</h1>

    <ul class="p-3 pl-6 card">
      <li>
        <h3>Category</h3>
        Artwork
      </li>
      <li>
        <h3>Tools</h3>
        {{ artwork.tool }}
      </li>
      <li>
        <h3>Description</h3>
        <p>{{ artwork.caption }}</p>
      </li>
      <li>
        <h3>Link</h3>
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
