<template>
  <Head>
    <Title>創作物紹介</Title>
  </Head>

  <div class="card card-shadow m-3 pb-6 text-center">
    <nuxt-img
      provider="ipx_fixed"
      width="768"
      height="480"
      quality="100"
      class="title-image w-full h-auto rounded-b-none border-b"
      src="/title.png"
      alt="創作物紹介 omemoji"
    />

    <h1 class="my-3 p-3 px-6">創作物紹介</h1>
    <hr class="mx-6 mb-3" />
    <div class="mx-6">創作物紹介 is omemoji's portfolio website.</div>
    <NuxtLink
      to="/about"
      class="card p-2 mt-3 inline-block transition-colors hover:bg-black/10"
    >
      <p class="transition-colors">About me</p>
    </NuxtLink>
  </div>
  <Gallery />
</template>

<script setup>
useHead({
  titleTemplate: "",
});
</script>
