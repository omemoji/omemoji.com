<template>
  <div class="card card-shadow bg-white m-3 pt-3">
    <h2 class="text-center mb-3">Gallery</h2>

    <div
      class="aspect-square overflow-y-auto over-contain rounded-b-md border-t"
      style="font-size: 0"
    >
      <div
        v-for="(artwork, i) in artworks"
        :key="i"
        class="w-1/3 inline-block mb-0 border border-white"
      >
        <nuxt-link :to="'/artworks/' + artwork.id" :title="artwork.title">
          <nuxt-img
            :alt="artwork.title"
            :src="artwork.image"
            provider="ipx_fixed"
            format="webp"
            quality="50"
            width="250"
            height="250"
            loading="lazy"
            class="object-cover aspect-square w-full"
          />
        </nuxt-link>
      </div>
    </div>
  </div>
</template>
<script>
import artworks from "@/assets/json/artworks.json";
export default {
  data() {
    return {
      artworks: artworks,
    };
  },
};
</script>
