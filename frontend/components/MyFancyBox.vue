<script setup>
import { Fancybox } from '@fancyapps/ui/dist/index.esm.js';

const props = defineProps({
  options: Object,
});
const container = ref(null);

const randomId = randomHexStr();
onMounted(() => {
  Array.from(container.value.children).map((el) => {
    el.setAttribute('data-fancybox', `gallery-${randomId}`);
  });
  Fancybox.bind(`[data-fancybox="gallery-${randomId}"]`, {
    Thumbs: {
      type: 'modern',
    },
    ...(props.options || {}),
  });
});

nextTick(() => {
  Fancybox.unbind(container.value);
  Fancybox.close();

  Fancybox.bind(`[data-fancybox="gallery-${randomId}"]`, {
    Thumbs: {
      type: 'modern',
    },
    ...(props.options || {}),
  });
});

function randomHexStr(len = 16, chars = '0123456789abcdefghijklmnopqrstuvwxyz') {
  let str = '';
  let length = chars.length;
  while (len > 0) {
    str += chars[Math.floor(Math.random() * length)];
    len--;
  }
  return str;
}

onUnmounted(() => {
  Fancybox.destroy();
});
</script>

<template>
  <div ref="container">
    <slot></slot>
  </div>
</template>

<style></style>
