<template>
  <div
    id="menu"
    class="hidden laptop:mr-60 laptop:inline-block laptop:opacity-100 z-40 transition-opacity duration-300"
  >
    <div class="fixed text-center overflow-y-auto h-full bg-white w-60 border-r">
      <div class="py-3 m-3">
        <div class="">
          <nuxt-img
            width="160"
            :modifiers="{}"
            src="/omemoji.png"
            class="rounded-full m-auto w-40 h-40"
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
          <NuxtLink to="/about">
            <h3 class="py-2">About</h3>
          </NuxtLink>
        </li>
        <li id="articles" class="transition-colors hover:bg-black/10 border-b">
          <NuxtLink to="/articles">
            <h3 class="py-2">Articles</h3>
          </NuxtLink>
        </li>
      </ul>
      <LinkCard class="mt-9" />
    </div>
  </div>
  <div
    id="screen"
    class="hidden opacity-0 fixed w-full h-full z-30 bg-black/40 backdrop-blur-md transition-opacity duration-300"
  ></div>
</template>
<script>
export default {
  data() {
    return {};
  },
};
</script>
