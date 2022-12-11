<template>
  <Head
    ><Title>{{ artwork.title }}</Title>
    <Meta name="description" :content="`${artwork.caption}`" />
    <Meta property="og:site_name" content="創作物紹介" />
    <Meta property="og:type" content="website" />
    <Meta property="og:url" :content="`https://omemoji.com/${$route.path}`" />
    <Meta property="og:title" :content="`${artwork.title}`"/>
    <Meta property="og:description" :content="`${artwork.caption}`"/>
    <Meta property="og:image" :content="`${artwork.image}`"/>
    <Meta name="twitter:card" content="summary" />
    <Meta name="twitter:image" :content="`${artwork.image}`" />
  </Head>

  <div class="card card-shadow m-3 p-3">
    <div class="card bg-white/40 p-3">
      <div class="card">
        <a :href="artwork.image">
          <nuxt-img
            width="760"
            class="content-image"
            :src="artwork.image"
            :alt="artwork.id"
          />
        </a>
      </div>
      <div class="my-3 p-3">
        <h1 class="text-center">{{ artwork.title }}</h1>
      </div>
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
  </div>
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

  head() {
    return {
      meta: [
        {
          hid: "description",
          name: "description",
          content: this.artwork.caption,
        },
        {
          hid: "og:site_name",
          property: "og:site_name",
          content: "創作物紹介",
        },
        { hid: "og:type", property: "og:type", content: "website" },
        {
          hid: "og:url",
          content: "https://omemoji.com/" + `${this.$route.path}`,
        },
        {
          hid: "og:title",
          property: "og:title",
          content: this.artwork.title + " | 創作物紹介",
        },
        {
          hid: "og:description",
          property: "og:description",
          content: this.artwork.caption,
        },
        {
          hid: "og:image",
          property: "og:image",
          content: "https://omemoji.com/omemoji.png",
        },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
};
</script>
