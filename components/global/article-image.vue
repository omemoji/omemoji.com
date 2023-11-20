<template>
  <ContentImage
    :width="width"
    :height="height"
    :quality="quality"
    :alt="alt"
    :src="src"
  ></ContentImage>
  <div style="text-align: right;">{{ date }}</div>
</template>
<script>
export default {
  props: ["width", "height", "quality", "src", "alt","date"],
  data() {
    return {

    };
  },
  methods: {

  },
};
</script>
