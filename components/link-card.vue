<template>
  <div class="pb-1 text-black">
    <!-- <h2 class="text-center">Link</h2> -->

    <ul class="p-2 flex flex-wrap">
      <li v-for="item in items" class="flex justify-center w-1/4">
        <a
          target="_blank"
          rel="noopener noreferrer"
          :href="item.href"
          class="card w-12 h-12 flex justify-center transition-colors hover:bg-black/10 bg-white/80 p-2 m-1"
        >
          <img :src="item.icon" class="w-8 my-auto" :alt="item.name" />
        </a>
      </li>
      
    </ul>
  </div>
</template>
<script>
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
          icon: github,
          name: "GitHub",
          href: "https://github.com/omemoji",
        },
        {
          icon: twitter,
          name: "Twitter",
          href: "https://twitter.com/omemoji_itf",
        },
        {
          icon: zenn,
          name: "Zenn",
          href: "https://zenn.dev/omemoji/",
        },
        {
          icon: instagram,
          name: "Instagram",
          href: "https://instagram.com/omemoji",
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
