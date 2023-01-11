<template>
  <nuxt-img
    provider="ipx_fixed"
    quality="40"
    :width="width"
    :height="height"
    :src="src"
    :alt="alt"
    class="article-image"
    format="webp"
  ></nuxt-img>
</template>
<script>
export default {
  props: ["width", "height", "src","alt"],
};
</script>
