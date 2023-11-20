<template>
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
    <ContentRenderer :value="doc" />
  </ContentDoc>
</template>

<script setup>

const { path } = useRoute();

</script>


