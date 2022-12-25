<template>
  <NuxtLayout>
    <Head><Title>Error</Title></Head>
    <div class="card card-shadow m-3 pb-6 bg-white text-center">
      <nuxt-img
        provider="ipx_fixed"
        width="768"
        height="480"
        quality="100"
        class="title-image w-full h-auto rounded-b-none border-b"
        src="/title.png"
        alt="創作物紹介 omemoji"
      />
      <h1 class="my-3 p-3 px-6">{{ error.statusCode }} {{ error.message }}</h1>
      <hr class="mx-6 mb-3" />
      <NuxtLink
        to="/"
        class="card p-2 mt-3 inline-block transition-colors hover:bg-black/10"
      >
        <p class="transition-colors">Home</p>
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
