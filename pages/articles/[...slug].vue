<template>
  <div class="card card-shadow p-6 m-3">
    <ContentDoc v-slot="{ doc }">
      <Head>
        <Title>{{ doc.title }}</Title>
        <Meta hid="description" name="description" :content="doc.description" />
        <Meta hid="og:type" property="og:type" content="article" />
        <Meta
          hid="og:url"
          property="og:url"
          :content="'https://omemoji.com' + path"
        />
        <Meta hid="og:title" property="og:title" :content="doc.title" />
        <Meta
          hid="og:description"
          property="og:description"
          :content="doc.description"
        />
      </Head>
      <p class="mb-3 text-xl break-all color-md">
        <nuxt-link class="hover:underline" to="/">omemoji.com</nuxt-link
        >/<nuxt-link class="hover:underline" to="/articles">articles</nuxt-link
        >/<nuxt-link class="underline" :to="path">{{ path_fixed }}</nuxt-link>
      </p>

      <p class="mb-3 text-xl break-all color-md">
        {{ doc.date }}
      </p>
      <ContentRenderer class="markdown-body" :value="doc" />
    </ContentDoc>
  </div>
</template>
<script setup>
const { path } = useRoute();
const path_fixed = path.substring(10);
</script>
