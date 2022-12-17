<template>
  <Head
    ><Title>Articles</Title>
    <Meta
      hid="description"
      name="description"
      content="Articles in omemoji.com"
    />
    <Meta hid="url" property="og:url" content="https://omemoji.com/Articles" />
    <Meta hid="og:title" property="og:title" content="Articles" />
    <Meta
      hid="og:description"
      property="og:description"
      content="Articles in omemoji.com"
    />
  </Head>
  <div class="card card-shadow p-6 m-3">
    <p class="mb-3 text-xl break-all text-black/40">
      <nuxt-link class="hover:color-md transition-colors" to="/"
        >omemoji.com</nuxt-link
      >/<nuxt-link to="/articles" class="color-md">articles</nuxt-link>
    </p>
    <h1 class="text-center">Articles</h1>
    <p class="text-center mt-3">記事は予告なく変更される可能性がある。</p>
    <main>
      <ContentList path="/articles">
        <div
          class="card mt-6 p-3 transition-colors hover:bg-black/10"
          v-for="article in limitContent"
          :key="article._path"
        >
          <nuxt-link :to="article._path">
            <div class="flex">
              <h2 class="mr-auto">{{ article.title }}</h2>
              <div class="" style="margin-top: 9px">{{ article.date }}</div>
            </div>

            <p>{{ article.description }}</p>
          </nuxt-link>
        </div>
      </ContentList>
    </main>
  </div>
</template>
<script lang="ts" setup>
const limitContent = await queryContent("/articles").sort({ date: -1 }).find();
</script>
