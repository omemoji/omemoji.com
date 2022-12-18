<template>
  <NuxtLayout>
    <Head><Title>Error</Title></Head>
    <div class="card card-shadow m-3 pb-6 bg-white">
      <nuxt-img
        provider="ipx_fixed"
        width="768"
        height="480"
        quality="100"
        class="title-image w-full h-auto rounded-b-none border-b"
        src="/title.png"
        alt="創作物紹介 omemoji"
      />

      <h1 class="text-center my-3 break-all">
        {{ error.statusCode }} {{ error.message }}
      </h1>
      <NuxtLink to="/" class="flex justify-center">
        <p
          class="card text-center p-2 inline transition-colors hover:bg-black/10"
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
