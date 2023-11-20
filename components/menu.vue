<template>
  <div
    id="menu"
    class="hidden laptop:mr-60 laptop:inline-block laptop:opacity-100 z-40 transition-opacity bg-default duration-300"
  >
    <div class="fixed  bg-menu overflow-y-auto h-full w-60">
      <div class="py-3 m-3">
        <OmemojiIcon class="m-auto" />
      </div>
      <h2 class="menu-header text-center">Menu</h2>
      <div v-for="i in link">
        <NuxtLink :to="i.to" class="fg-default">
          <h3
            :id="i.id"
            class="transition-colors bg-gray-400/10 hover:bg-gray-400/50 py-3 px-12"
          >
            {{ i.name }}
            <span class="float-right">{{ i.icon }}</span>
          </h3>
        </NuxtLink>
      </div>
      <LinkList class="" />
    </div>
  </div>
  <div
    id="screen"
    class="hidden opacity-0 fixed w-full h-full z-30 bg-black/60 backdrop-blur-md transition-opacity duration-300"
  ></div>
</template>
<script>
export default {
  data() {
    return {
      link: [
        {
          id: "home",
          name: "Home",
          to: "/",
          icon: "🏠"
        },
        {
          id: "about",
          name: "About",
          to: "/about",
          icon: "👤"
        },
        {
          id: "artworks",
          name: "Artworks",
          to: "/artworks",
          icon: "🎨"
        },
        {
          id: "articles",
          name: "Articles",
          to: "/articles",
          icon: "✒"
        },
      ],
    };
  },
};
</script>
