<template>
  <NuxtLayout>
    <Head><Title>Error</Title></Head>
    <h1 class="p-6">{{ error.statusCode }} {{ error.message }}</h1>
    <div class="text-center">
      <ContentImage
        width="720"
        height="450"
        src="/title.png"
        quality="100"
        alt="創作物紹介 omemoji"
      >
      </ContentImage>
    </div>
  </NuxtLayout>
</template>

<script setup>
const error = useError();
</script>
