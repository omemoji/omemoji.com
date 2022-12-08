<template>
  <div class="flex justify-center bg-white">
    <Menu
      id="menu"
      class="hidden opacity-0 laptop:inline-block laptop:opacity-100 z-50 laptop:mr-60 transition-opacity duration-300"
    />
    <div
      id="screen"
      class="hidden opacity-0 fixed w-full h-full z-40 bg-black/40 backdrop-blur-md transition-opacity duration-300"
    ></div>
    <div class="max-w-screen-laptop border-r border-l">
      <div class="laptop:hidden fixed w-16 h-16 z-10 flex justify-center">
        <button class="w-8 h-5 my-auto" id="nav">
          <img src="@/assets/logo/nav-bar.svg" class="" alt="navigation bar" />
        </button>
      </div>

      <header
        class="top-0 flex justify-center sticky backdrop-blur-md bg-white/50 h-16 header-shadow border-b"
      >
        <div class="no-underline my-auto font-bold text-2xl">
          <NuxtLink to="/" class="no-underline text-black">
            omemoji.com</NuxtLink
          >
        </div>
      </header>

      <slot />
      <Contents />
      <Footer />
    </div>
  </div>
</template>
<script>
export default {
  mounted() {
    const menu = document.querySelector("#menu");
    const nav = document.querySelector("#nav");
    const screen = document.querySelector("#screen");

    function openMenu() {
      console.log("reveal");
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
      console.log("hide");
      menu.classList.remove("opacity-100");
      screen.classList.remove("opacity-100");
      menu.classList.add("opacity-0");
      screen.classList.add("opacity-0");
      setTimeout(function () {
        screen.classList.add("hidden");
        menu.classList.add("hidden");
      }, 300);
    }

    nav.addEventListener("click", openMenu);
    screen.addEventListener("click", closeMenu);
  },
};
</script>
