<template>
  <div class="card card-shadow m-3 p-3">
    <div class="card bg-white/40 p-3">
      <div class="card">
        <nuxt-img
          width="800"
          class="content-image"
          :src="artwork.image"
          :alt="artwork.id"
        />
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
          <a :href="artwork.href">{{ artwork.href }}</a>
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
      jsonArray: JSON.parse(JSON.stringify(jsonData)),
    };
  },
  mounted() {},
  computed: {
    artwork() {
      const artwork = this.jsonArray.filter((artwork) => {
        return artwork.id === this.$route.params.id;
      });
      return artwork[0];
    },
  },
};
</script>
