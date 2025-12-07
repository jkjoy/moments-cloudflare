<template>
  <iframe
    v-if="url"
    :src="videoUrl"
    class="w-full h-[250px] rounded"
    title="Video player iframe"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  >
  </iframe>
</template>

<script setup lang="ts">
const props = defineProps<{ url: string }>()

const videoUrl = computed(() => {
  const url = new URL(props.url)
  url.searchParams.set("autoplay", "0")
  return url.toString()
})
</script>

<style scoped></style>
