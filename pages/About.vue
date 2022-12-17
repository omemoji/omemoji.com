<template>
  <Head
    ><Title>About</Title>
    <Meta hid="description" name="description" content="omemoji's profile" />
    <Meta hid="url" property="og:url" content="https://omemoji.com/About" />
    <Meta hid="og:title" property="og:title" content="About" />
    <Meta
      hid="og:description"
      property="og:description"
      content="omemoji's profile"
    />
  </Head>
  <div class="card card-shadow p-6 m-3">
    <p class="mb-3 text-xl break-all text-black/40">
      <nuxt-link class="hover:color-md transition-colors" to="/"
        >omemoji.com</nuxt-link
      >/<nuxt-link to="/about" class="color-md">about</nuxt-link>
    </p>
    <ContentDoc path="/about" class="markdown-body" />
  </div>
</template>
<script>
export default {};
</script>
