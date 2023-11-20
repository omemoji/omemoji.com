<template>
  <div class="flex justify-center theme bg-menu min-h-screen">
    <Menu />
    <div class="max-w-screen-laptop web-body border-x w-full min-h-screen">
      <Header />
      <div class="p-6 bg-card">
        <slot />
      </div>
      <Footer />
    </div>
    <div class="hidden laptop:inline-block"></div>
  </div>
</template>
<script>
export default {
  mounted() {
    // header.vue
    const nav = document.querySelector("#nav");
    // menu.vue
    const menu = document.querySelector("#menu");
    const screen = document.querySelector("#screen");
    const home = document.querySelector("#home");
    const about = document.querySelector("#about");
    const artworks = document.querySelector("#artworks");
    const articles = document.querySelector("#articles");
    //function
    function openMenu() {
      screen.classList.remove("hidden");
      menu.classList.remove("hidden");
      setTimeout(function () {
        menu.classList.remove("opacity-0");
        screen.classList.remove("opacity-0");
        screen.classList.add("opacity-100");
        menu.classList.add("opacity-100");
      }, 0);
    }
    function closeMenu() {
      menu.classList.remove("opacity-100");
      screen.classList.remove("opacity-100");
      menu.classList.add("opacity-0");
      screen.classList.add("opacity-0");
      setTimeout(function () {
        screen.classList.add("hidden");
        menu.classList.add("hidden");
      }, 300);
    }
    //run
    nav.addEventListener("click", openMenu);
    screen.addEventListener("click", closeMenu);
    home.addEventListener("click", closeMenu);
    about.addEventListener("click", closeMenu);
    artworks.addEventListener("click", closeMenu);
    articles.addEventListener("click", closeMenu);
  },
};
</script>
