<template>
  <div class="laptop:flex py-3">
    <NuxtLink to="/about" class="w-full laptop:w-1/2 laptop:mr-3 fg-default">
      <div
        class="card p-6 py-3 hover:bg-gray-400/20 transition-colors mb-6 laptop:mb-0"
      >
        <div class="hover:no-underline">
          <h2>👤About</h2>

          <p class="">omemoji's profile</p>
        </div>
      </div>
    </NuxtLink>
    <NuxtLink to="/articles" class="w-full laptop:w-1/2 laptop:ml-3 fg-default">
      <div class="card p-6 py-3 hover:bg-gray-400/20 transition-colors">
        <div>
          <h2>✒Articles</h2>

          <p class="">日記や技術的な記事など</p>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
<script>
export default {};
</script>
