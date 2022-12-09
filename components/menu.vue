<template>
  <div>
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
        <li class="transition-colors hover:bg-black/10 border-y">
          <NuxtLink to="/">
            <h3 class="py-2">Gallery</h3>
          </NuxtLink>
        </li>
        <li class="transition-colors hover:bg-black/10 border-b">
          <NuxtLink to="/">
            <h3 class="py-2">About</h3>
          </NuxtLink>
        </li>
      </ul>
      <h2 class="mt-9">Link</h2>
      <LinkCard />

      <!-- <LinkCard /> -->
    </div>
  </div>
</template>
<script></script>
