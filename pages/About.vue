<template>
  <Head
    ><Title>About</Title>
    <Meta name="description" content="omemoji's profile" />
    <Meta property="og:site_name" content="創作物紹介" />
    <Meta property="og:type" content="website" />
    <Meta property="og:url" content="`https://omemoji.com/About`" />
    <Meta property="og:title" content="About"/>
    <Meta property="og:description" content="omemoji's profile"/>
    <Meta property="og:image" content="https://omemoji.com/omemoji.png"/>
    <Meta name="twitter:card" content="summary" />
  </Head>
  <div class="card card-shadow p-10 m-3">
    <ContentDoc path="/about" class="markdown-body" />
  </div>
</template>
<script>
export default {};
</script>
