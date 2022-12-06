<template>
  <div class="flex justify-center">
    <About style="margin-right: 236px" class="hidden laptop:inline-block" />
    <div class="max-w-screen-laptop">
      <Header class="fixed container"/>
      <div style="margin-top: 62px" class="border-solid  border">
        <slot />
      </div>
      <Footer />
    </div>
  </div>
</template>
<script></script>
