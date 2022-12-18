<template>
  <Head>
    <Title>創作物紹介</Title>
  </Head>

  <div class="card card-shadow m-3 pb-6">
    <nuxt-img
      provider="ipx_fixed"
      width="768"
      height="480"
      quality="100"
      class="title-image w-full h-auto rounded-b-none border-b"
      src="/title.png"
      alt="創作物紹介 omemoji"
    />

    <h1 class="text-center my-3 p-3 px-6">創作物紹介</h1>
    <div class="text-center mx-6">
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
