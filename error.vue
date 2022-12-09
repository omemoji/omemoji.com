<template>
  <NuxtLayout>
    <div class="card card-shadow m-3 p-3 bg-white">
      <div class="card">
        <nuxt-img
          width="800"
          class="title-image"
          src="/title.png"
          alt="創作物紹介 omemoji"
        />
      </div>
      <h1 v-if="error.statusCode === 404" class="text-center my-3">
        {{ pageNotFound }}
      </h1>
      <h1 v-else class="text-center my-3">
        {{ otherError }}
      </h1>
      <NuxtLink to="/" class="flex justify-center">
        <p
          class="card text-center mb-3 p-2 inline transition-colors hover:bg-black/10"
        >
          Home
        </p>
      </NuxtLink>
    </div>
  </NuxtLayout>
</template>

<script>
export default {
  name: "EmptyLayout",
  layout: "empty",
  props: {
    error: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      pageNotFound: "404 Not Found",
      otherError: "An error occurred",
    };
  },
  head() {
    const title =
      this.error.statusCode === 404 ? this.pageNotFound : this.otherError;
    return {
      title,
    };
  },
};
</script>
