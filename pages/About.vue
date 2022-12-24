<template>
  <Head
    ><Title>About</Title>
    <Meta hid="description" name="description" content="omemoji's profile" />
    <Meta hid="og:type" property="og:type" content="article" />
    <Meta hid="og:url" property="og:url" content="https://omemoji.com/about" />
    <Meta hid="og:title" property="og:title" content="About" />
    <Meta
      hid="og:description"
      property="og:description"
      content="omemoji's profile"
    />
  </Head>
  <div class="card card-shadow p-6 m-3">
    <p class="mb-3 text-xl break-all color-md">
      <nuxt-link class="hover:underline transition-all" to="/"
        >omemoji.com</nuxt-link
      >/<nuxt-link to="/about" class="underline">about</nuxt-link>
    </p>
    <ContentDoc path="/about" class="markdown-body" />
  </div>
</template>
<script>
export default {};
</script>
