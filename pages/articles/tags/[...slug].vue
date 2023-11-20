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
  <h2 class="font-bold"># {{ path_fixed }}</h2>
  <main>
    <ContentList path="/articles">
      <ArticlesList :content="limitContent_tag" />
    </ContentList>
  </main>
</template>
<script lang="ts" setup>
const { path } = useRoute();
let path_fixed = path.substring(15);
const limitContent_tag = await queryContent("/articles")
  .sort({ date: -1 })
  .where({ tags: { $contains: path_fixed } })
  .find();
</script>
