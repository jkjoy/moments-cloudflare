<template>
  <div
    v-if="
      images.length > 0 &&
      ($route.path.startsWith('/new') || $route.path.startsWith('/edit'))
    "
    ref="el"
    class="grid gap-2"
    :style="gridStyle"
  >
    <div
      v-for="img in images"
      :key="img"
      class="relative"
      :class="
        images.length === 1
          ? 'full-cover-image-single'
          : 'full-cover-image-mult'
      "
    >
      <img :src="img" class="cursor-move rounded" />
      <div
        class="absolute top-0 right-0 px-1 bg-white dark:bg-gray-900 m-2 rounded hover:text-red-500 cursor-pointer"
        @click="removeImage(img)"
      >
        <UIcon name="i-carbon-trash-can" />
      </div>
    </div>
  </div>

  <template v-else-if="props.imgConfigs && props.imgConfigs.length">
    <MyFancyBox :style="gridStyle">
      <div
        v-for="(imgConfig, z) in props.imgConfigs"
        :key="z"
        :href="imgConfig.url"
        :class="
          images.length === 1
            ? 'full-cover-image-single'
            : 'full-cover-image-mult'
        "
      >
        <img
          class="cursor-zoom-in rounded"
          :src="imgConfig.thumbUrl"
          :onerror="`javascript:this.src='${imgConfig.url}';this.onerror=null`"
        />
      </div>
    </MyFancyBox>
  </template>
</template>

<script setup lang="ts">
import { useSortable } from "@vueuse/integrations/useSortable";
import type { SysConfigVO } from "~/types";

interface ImgConfig {
  url: string;
  thumbUrl: string;
}

const sysConfig = useState<SysConfigVO>("sysConfig");
const route = useRoute();
const el = ref(null);
const props = defineProps<{ imgs?: string; imgConfigs?: ImgConfig[] }>();
const emit = defineEmits(["removeImage", "dragImage"]);
const images = ref<string[]>((props.imgs || "").split(",").filter(Boolean));

watch(props, () => {
  images.value = (props.imgs || "").split(",").filter(Boolean);
});

watch(images, () => {
  emit("dragImage", images.value);
});

const removeImage = async (img: string) => {
  await useMyFetch("/memo/removeImage", {
    img,
  });
  emit("removeImage", img);
};

onMounted(() => {
  if (route.path.startsWith("/new") || route.path.startsWith("/edit")) {
    setTimeout(() => {
      useSortable(el, images);
    }, 500);
  }
});

const gridStyle = computed(() => {
  let style = "max-width:100%; display:grid; gap: 0.5rem; align-items: start;"; // 确保内容顶部对齐
  switch (images.value.length) {
    case 1:
      style += "grid-template-columns: 1fr; max-width:60%;";
      break;
    case 2:
      style += "grid-template-columns: 1fr 1fr; aspect-ratio: 2 / 1;";
      break;
    case 3:
      style += "grid-template-columns: 1fr 1fr 1fr; aspect-ratio: 3 / 1;";
      break;
    case 4:
      style += "grid-template-columns: 1fr 1fr; aspect-ratio: 1;";
      break;
    default:
      style += "grid-template-columns: 1fr 1fr 1fr;";
  }
  return style;
});
</script>

<style scoped>
.full-cover-image-mult {
  width: 100%;
  max-height: 300px;
  aspect-ratio: 1 / 1;

  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
}

.full-cover-image-single {
  width: fit-content;

  > img {
    max-height: 300px;
    object-fit: cover;
    object-position: center;
  }
}
</style>
