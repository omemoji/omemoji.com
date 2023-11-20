<template>
  <Head
    ><Title>Articles</Title>
    <Meta
      hid="description"
      name="description"
      content="Articles in omemoji.com"
    />
    <Meta hid="url" property="og:url" content="https://omemoji.com/articles" />
    <Meta hid="og:title" property="og:title" content="Articles" />
    <Meta
      hid="og:description"
      property="og:description"
      content="Articles in omemoji.com"
    />
  </Head>

  <h1 class="">Articles</h1>
  <main>
    <ContentList path="/articles">
      <ArticlesList :content="limitContent" /> 
    </ContentList>
  </main>
</template>
<script lang="ts" setup>
const limitContent = await queryContent("/articles").sort({ date: -1 }).find();
</script>

