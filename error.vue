<template>
  <NuxtLayout>
    <Head><Title>Error</Title></Head>
    <div class="card card-shadow m-3 p-3 bg-white">
      <div class="card">
        <nuxt-img
          width="720"
          height="450"
          class="title-image w-full h-auto"
          src="/title.png"
          alt="創作物紹介 omemoji"
        />
      </div>

      <h1 class="text-center my-3">
        {{ error.statusCode }} {{ error.message }}
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
    return {};
  },
  head() {
    return {};
  },
};
</script>
