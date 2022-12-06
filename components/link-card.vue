<template>
  <div class="card">
    <h2 class="text-center">Link</h2>
    <ul class="flex-wrap flex">
      <li v-for="item in items" class="w-1/3">
        <a
          target="_blank"
          rel="noopener noreferrer"
          :href="item.href"
          class="flex justify-center xs:justify-start p-2 my-2 rounded-md border hover:bg-gray-200 m-1 my-1"
        >
          <img :src="item.icon" class="w-8 h-8 my-auto" :alt="item.name" />
          <p class="hidden xs:block xs:my-auto xs:mx-3">{{ item.name }}</p>
        </a>
      </li>
    </ul>
  </div>
</template>
<script>
import omemoji from "@/assets/logo/omemoji-icon.png";
import github from "@/assets/logo/github.svg";
import twitter from "@/assets/logo/twitter.svg";
import instagram from "@/assets/logo/instagram.svg";
import inkscape from "@/assets/logo/inkscape.svg";
import zenn from "@/assets/logo/zenn.svg";
import krita from "@/assets/logo/krita.svg";
export default {
  data() {
    return {
      items: [
        {
          icon: omemoji,
          name: "Home",
          href: "/",
        },
        {
          icon: github,
          name: "GitHub",
          href: "https://github.com/Omemoji",
        },
        {
          icon: twitter,
          name: "Twitter",
          href: "https://twitter.com/omemoji_itf",
        },
        {
          icon: instagram,
          name: "Instagram",
          href: "https://instagram.com/omemoji",
        },
        {
          icon: zenn,
          name: "Zenn",
          href: "https://zenn.dev/omemoji/",
        },
        {
          icon: inkscape,
          name: "Inkscape",
          href: "https://inkscape.org/~omemoji/",
        },

        {
          icon: krita,
          name: "Krita",
          href: "https://krita-artists.org/u/omemoji/summary",
        },
      ],
    };
  },
};
</script>
