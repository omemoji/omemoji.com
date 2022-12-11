<template>
 <Head
    ><Title>About</Title>
    <Meta
      hid="description"
      name="description"
      content="omemoji's profile"
    />
    <Meta
      hid="url"
      property="og:url"
      content="https://omemoji.com/About"
    />
    <Meta hid="og:title" property="og:title" content="About" />
    <Meta
      hid="og:description"
      property="og:description"
      content="omemoji's profile"
    />
  </Head>
  <div class="card card-shadow p-10 m-3">
    <ContentDoc path="/about" class="markdown-body" />
  </div>
</template>
<script>
export default {};
</script>
