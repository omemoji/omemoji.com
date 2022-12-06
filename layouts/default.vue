<template>
  <div class="flex justify-center">
    <About  />
    <div class="max-w-screen-laptop border-solid border-t-0 border-b-0 border-r border-l">
      <Header class="" />
      <div class="">
        <slot />
      </div>
      <Footer />
    </div>
  </div>
</template>
<script>
</script>
