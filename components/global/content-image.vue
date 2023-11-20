<template>
  <div class="mb-6">
    <nuxt-img
      :width="width"
      :height="height"
      :quality="quality"
      format="webp"
      class="w-full content-image h-auto cursor-pointer"
      :src="src"
      :alt="alt"
      @click="() => showImg()"
    />
    <vue-easy-lightbox
      :visible="visible"
      :imgs="src"
      @hide="handleHide"
    ></vue-easy-lightbox>
  </div>
</template>
<script>
export default {
  props: ["width", "height", "quality", "src", "alt"],
  data() {
    return {
      visible: false,
    };
  },
  methods: {
    showImg() {
      this.visible = true;
    },
    handleHide() {
      this.visible = false;
    },
  },
};
</script>
