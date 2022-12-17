<template>
  <Head>
    <Title>創作物紹介</Title>
  </Head>

  <div class="card card-shadow m-3 p-6">
    <div class="card">
      <nuxt-img
        provider="ipx_fixed"
        width="720"
        height="450"
        quality="100"
        class="title-image w-full h-auto"
        src="/title.png"
        alt="創作物紹介 omemoji"
      />
    </div>
    <h1 class="text-center my-3 p-3">創作物紹介</h1>
    <div class="text-center mb-3">
      創作物紹介 is omemoji's portfolio website.
    </div>
  </div>
  <Gallery />
</template>

<script setup>
useHead({
  titleTemplate: "",
});
</script>
