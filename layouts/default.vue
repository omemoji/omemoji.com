<template>
  <div class="flex justify-center bg-white">

    <div
      id="menu"
      class="hidden laptop:mr-60 laptop:inline-block laptop:opacity-100 z-40 transition-opacity duration-300"
    >
      <div class="fixed text-center overflow-y-auto h-full bg-white w-60">
        <div class="py-3 m-3">
          <div class="">
            <nuxt-img
              width="160"
              :modifiers="{}"
              src="/omemoji.png"
              class="rounded-full m-auto"
              alt="omemoji"
            />
          </div>
        </div>
        <h2 class="my-3">Menu</h2>
        <ul class="">
          <li id="home" class="transition-colors hover:bg-black/10 border-y">
            <NuxtLink to="/">
              <h3 class="py-2">Home</h3>
            </NuxtLink>
          </li>
          <li id="about" class="transition-colors hover:bg-black/10 border-b">
            <NuxtLink to="/About">
              <h3 class="py-2">About</h3>
            </NuxtLink>
          </li>
        </ul>
        <h2 class="mt-9">Link</h2>
        <LinkCard />

        <!-- <LinkCard /> -->
      </div>
    </div>

    <div
      id="screen"
      class="hidden opacity-0 fixed w-full h-full z-30 bg-black/40 backdrop-blur-md transition-opacity duration-300"
    ></div>
    <div class="max-w-screen-laptop border-r border-l bg-black/10">
      <header
        class="top-0 flex justify-center sticky backdrop-blur-md bg-white/80 h-16 header-shadow border-b"
      >
        <div class="w-16 h-16 z-10 flex justify-center mr-auto">
          <div class="w-8 h-5 my-auto laptop:hidden cursor-pointer" id="nav">
            <img
              src="@/assets/logo/nav-bar.svg"
              class=""
              alt="navigation bar"
            />
          </div>
        </div>
        <div class="no-underline my-auto font-bold text-2xl">
          <NuxtLink to="/" class="no-underline text-black">
            omemoji.com</NuxtLink
          >
        </div>
        <div class="w-16 h-16 z-10 flex justify-center ml-auto">
          <div class="my-auto laptop:hidden"></div>
        </div>
      </header>

      <slot />
      <Gallery />
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
    const home = document.querySelector("#home");
    const about = document.querySelector("#about");

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

    nav.addEventListener("click", openMenu);
    screen.addEventListener("click", closeMenu);
    home.addEventListener("click", closeMenu);
    about.addEventListener("click", closeMenu);
  },
};
</script>
