<template>
  <header
    class="top-0 flex justify-center sticky h-16 border-b bg-header backdrop-blur-md"
  >
    <div class="w-16 h-16 z-10 flex justify-center mr-auto">
      <div class="w-8 h-5 my-auto laptop:hidden cursor-pointer" id="nav">
        <NavigationBar />
      </div>
    </div>
    <div class="no-underline my-auto font-bold text-2xl">
      <NuxtLink to="/" class="no-underline fg-default"> omemoji.com</NuxtLink>
    </div>
    <div class="w-16 h-16 z-10 flex justify-center ml-auto">
      <div class="my-auto laptop:hidden"></div>
    </div>
  </header>
</template>
