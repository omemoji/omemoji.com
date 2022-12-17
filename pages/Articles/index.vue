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
    <h1 class="text-center">Articles</h1>

    <main>
      <ContentList path="/articles" v-slot="{ list }">
        <div
          class="card mt-6 p-3 transition-colors hover:bg-black/10"
          v-for="article in (list.slice().reverse())"
          :key="article._path"
        >
          <nuxt-link
            :to="{
              path: article._path,
            }"
          >
            <div class="flex">
              <h2 class="mr-auto">{{ article.title }}</h2>
              <div class="mt-3">{{ article.date }}</div>
            </div>

            <p>{{ article.description }}</p>
          </nuxt-link>
        </div>
      </ContentList>
    </main>
  </div>
</template>
<script lang="ts" setup>
const props = defineProps({
  max: {
    type: Number,
    default: -1,
  },
});

const limitedContent = await queryContent("/articles")
  .sort({ date: -1 })
  .limit(props.max)
  .find();
</script>
