<script setup lang="ts">
type FancyboxApi = typeof import('@fancyapps/ui/dist/index.esm.js').Fancybox;

const props = defineProps({
  options: Object,
});
const container = ref<HTMLElement | null>(null);
let fancyboxApi: FancyboxApi | null = null;
let fancyboxPromise: Promise<FancyboxApi> | null = null;

const randomId = randomHexStr();

const getFancybox = async () => {
  if (fancyboxApi) {
    return fancyboxApi;
  }

  if (!fancyboxPromise) {
    fancyboxPromise = import('@fancyapps/ui/dist/index.esm.js').then((module) => {
      fancyboxApi = module.Fancybox;
      return module.Fancybox;
    });
  }

  return fancyboxPromise;
};

const bindFancybox = async () => {
  await nextTick();
  if (!container.value) {
    return;
  }

  const fancybox = await getFancybox();

  Array.from(container.value.children).forEach((el) => {
    if (el instanceof HTMLElement) {
      el.setAttribute('data-fancybox', `gallery-${randomId}`);
    }
  });

  fancybox.unbind(container.value);
  fancybox.close();
  fancybox.bind(`[data-fancybox="gallery-${randomId}"]`, {
    Thumbs: {
      type: 'modern',
    },
    ...(props.options || {}),
  });
};

onMounted(() => {
  void bindFancybox();
});

onUpdated(() => {
  void bindFancybox();
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
  if (!fancyboxApi || !container.value) {
    return;
  }

  fancyboxApi.unbind(container.value);
  fancyboxApi.close();
});
</script>

<template>
  <div ref="container">
    <slot></slot>
  </div>
</template>

<style></style>
