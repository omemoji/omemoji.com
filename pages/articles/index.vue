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
  <div class="card card-shadow p-6 m-3">
    <p class="mb-3 text-xl break-all color-md">
      <nuxt-link class="hover:underline" to="/">omemoji.com</nuxt-link
      >/<nuxt-link to="/articles" class="underline">articles</nuxt-link>
    </p>
    <h1 class="text-center">Articles</h1>
    <main>
      <ContentList path="/articles">
        <nuxt-link
          :to="article._path"
          v-for="article in limitContent"
          :key="article._path"
        >
          <div class="card mt-6 p-3 transition-colors hover:bg-black/10">
            <div class="flex">
              <h2 class="mb-3">{{ article.title }}</h2>
            </div>
            <div class="flex">
              <p class="mr-6">{{ article.description }}</p>
              <p class="ml-auto">{{ article.date }}</p>
            </div>
          </div>
        </nuxt-link>
      </ContentList>
    </main>
  </div>
</template>
<script lang="ts" setup>
const limitContent = await queryContent("/articles")
  .sort({ date: -1 })
  .find();
</script>
