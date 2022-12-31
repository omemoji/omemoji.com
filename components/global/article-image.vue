<template>
  <nuxt-img
    provider="ipx_fixed"
    quality="40"
    :width="width"
    :height="height"
    :src="src"
    class="mb-4"
    format="webp"
  ></nuxt-img>
</template>
<script>
export default {
  props: ["width", "height", "src"],
};
</script>
