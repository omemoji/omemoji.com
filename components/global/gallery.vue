<template>
  <div
    class="aspect-square bg-gallery over-contain laptop:rounded-b-md"
    style="font-size: 0"
  >
    <div
      v-for="(artwork, i) in artworks"
      :key="i"
      class="w-1/3 inline-block mb-0 hover:opacity-80 transition-opacity"
    >
      <nuxt-link :to="'/artworks/' + artwork.id" :title="artwork.title">
        <nuxt-img
          :alt="artwork.title"
          :src="artwork.image"
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
