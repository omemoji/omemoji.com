<template>
  <div class="card" style="margin: 0px; margin-top: 8px;">
    <h3 class="text-center">Link</h3>
    <ul class="block">
      <li v-for="item in items">
        <a target="_blank" rel="noopener noreferrer" :href="item.href"
          class="flex p-2 my-2 rounded-md border hover:bg-gray-200">
          <img :src="`/logo/${item.icon}`" class="w-8" :alt="item.name">
          <p class="my-auto mx-3">{{ item.name }}</p>
        </a>
      </li>
    </ul>
  </div>
</template>
<script >
export default {
  data() {
    return {
      items: [
        {
          icon: "GitHub.png",
          name: "GitHub",
          href: "https://github.com/Omemoji",
        },
        {
          icon: "Twitter.png",
          name: "Twitter",
          href: "https://twitter.com/omemoji_itf",
        },
      ]
    }
  }
}

</script>