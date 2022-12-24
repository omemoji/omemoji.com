<template>
  <Head>
    <Title>{{ data.title }}</Title>
    <Meta hid="description" name="description" :content="data.description" />
    <Meta hid="og:type" property="og:type" content="article" />
    <Meta
      hid="og:url"
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
    <ContentDoc v-slot="{ doc }">
      <p class="mb-3 text-xl break-all text-black/40">
        <nuxt-link class="hover:color-md transition-colors" to="/"
          >omemoji.com</nuxt-link
        >/<nuxt-link class="hover:color-md transition-colors" to="/articles"
          >articles</nuxt-link
        >/<nuxt-link class="color-md" :to="data._path">{{
          data._path.substr(data._path.indexOf("/articles") + 10)
        }}</nuxt-link>
      </p>

      <p class="mb-3 text-xl break-all color-md">
        {{ data.date }}
      </p>
      <ContentRenderer class="markdown-body" :value="doc" />
    </ContentDoc>
  </div>
</template>
<script setup>
const { path } = useRoute();
const { data } = useAsyncData("articles", () => {
  return queryContent("/articles")
    .where({ _path: path })
    .only(["title", "_path", "description", "date"])
    .findOne();
});
</script>
