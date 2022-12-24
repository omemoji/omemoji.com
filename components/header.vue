<template>
    <header class="top-0 flex justify-center sticky backdrop-blur-md bg-white/80 h-16 header-shadow border-b">
        <div class="w-16 h-16 z-10 flex justify-center mr-auto">
            <div class="w-8 h-5 my-auto laptop:hidden cursor-pointer" id="nav">
                <img src="@/assets/logo/nav-bar.svg" class="w-8 h-5" alt="navigation bar" />
            </div>
        </div>
        <div class="no-underline my-auto font-bold text-2xl">
            <NuxtLink to="/" class="no-underline text-black">
                omemoji.com</NuxtLink>
        </div>
        <div class="w-16 h-16 z-10 flex justify-center ml-auto">
            <div class="my-auto laptop:hidden"></div>
        </div>
    </header>
</template>