<template>
  <main>
    <ContentList path="/articles">
      <div
        v-for="article in content"
        :key="article._path"
        class="card mt-6 p-6 pb-3 transition-colors"
      >
        <div class="">
          <p class="">{{ article.date }}</p>

          <h2>
            <nuxt-link :to="article._path" class="hover:underline">{{
              article.title
            }}</nuxt-link>
          </h2>
        </div>
        <p class="">{{ article.description }}</p>
        <p class="">
          <span class="inline-block" v-for="tag in article.tags">
            <NuxtLink :to="'/articles/tags/' + tag" class="mr-3"
              >#{{ tag }}</NuxtLink
            >
          </span>
        </p>
      </div>
    </ContentList>
  </main>
</template>
<script>
export default {
  props: ["content"],
};
</script>
