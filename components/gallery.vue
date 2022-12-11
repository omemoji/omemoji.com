<template>
  <div class="card card-shadow bg-white m-3 p-3">
    <h2 class="text-center">Gallery</h2>
    <div class="card mt-3 p-3" style="font-size: 0">
      <div class="aspect-square overflow-y-auto over-contain card">
        <div
          v-for="(artwork, i) in artworks"
          :key="i"
          class="w-1/3 inline-block mb-0 border border-white"
        >
          <nuxt-link v-if="i <= 8" :to="'/Artworks/' + artwork.id">
            <nuxt-img
              :src="artwork.image"
              width="250"
              class="object-cover aspect-square"
            />
          </nuxt-link>
          <nuxt-link v-if="i > 8" :to="'/Artworks/' + artwork.id">
            <nuxt-img
              :src="artwork.image"
              width="250"
              class="object-cover aspect-square"
              loading="lazy"
            />
          </nuxt-link>
        </div>
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
