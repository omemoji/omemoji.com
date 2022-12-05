<template>
  <header class="omemoji-color p-0 m-0 top-0 w-full fixed header-shadow">
    <NuxtLink to="/" class="no-underline"
      ><h1 class="no-underline text-white text-center m-0 p-2">
        創作物紹介
      </h1></NuxtLink
    >
  </header>

  <div class="flex justify-center">
    <About />
    <slot />
  </div>
  <footer class="bg-black bottom-0 w-full">
    <p class="text-white text-center m-0 p-1">
      &copy; {{ new Date().getFullYear() }} omemoji
    </p>
  </footer>
</template>
<script>
export default {
  data() {
    return {
      isShow: true,
    };
  },
};
</script>
