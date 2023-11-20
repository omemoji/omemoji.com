<template>
  <div class="">
    <h2 class="menu-header text-center">Accounts</h2>
    <ul class="link-list-ul p-0">
      <li v-for="item in items" class="block w-full m-0">
        <a
          :href="item.href"
          class="fg-default"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h3
            class="transition-colors bg-gray-400/10 hover:bg-gray-400/50 py-3 px-12"
          >
            {{ item.name }}
          </h3>
        </a>
      </li>
    </ul>
  </div>
</template>
<script>
export default {
  data() {
    return {
      items: [
        {
          // icon: github,
          name: "GitHub",
          href: "https://github.com/omemoji",
        },
        {
          // icon: twitter,
          name: "Twitter",
          href: "https://twitter.com/omemoji_art",
        },
        {
          // icon: instagram,
          name: "Instagram",
          href: "https://instagram.com/omemoji",
        },
        {
          // icon: zenn,
          name: "Zenn",
          href: "https://zenn.dev/omemoji/",
        },
        {
          name: "Keybase",
          href: "https://keybase.io/omemoji",
        },
      ],
    };
  },
};
</script>
