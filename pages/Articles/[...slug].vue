<template>
  <Head>
    <Title>{{ data.title }}</Title>
    <Meta hid="description" name="description" :content="data.description" />
    <Meta
      hid="url"
      property="og:url"
      :content="'https://omemoji.com' + data._path"
    />
    <Meta hid="og:title" property="og:title" :content="data.title" />
    <Meta
      hid="og:description"
      property="og:description"
      :content="data.description"
    />
  </Head>
  <div class="card card-shadow p-6 m-3">
    <ContentDoc class="markdown-body" />
  </div>
</template>
<script setup>
const { path } = useRoute();
const { data } = await useAsyncData("articles", () => {
  return queryContent("/articles")
    .where({ _path: path })
    .only(["title", "_path", "description"])
    .findOne();
});
</script>
