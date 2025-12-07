<template>
  <UPopover :popper="{ arrow: true }" mode="click">
    <UIcon name="i-carbon-image" class="cursor-pointer w-6 h-6" />
    <template #panel="{ close }">
      <div class="p-4 flex flex-col gap-2">
        <div class="text-xs text-gray-400">本地上传</div>
        <UInput type="file" size="sm" icon="i-heroicons-folder" accept="image/*" @change="upload" multiple />

        <template v-for="img, i in imgList" :key="img">
          <div class="flex flex-wrap justify-between items-center">
            <UInput class="flex-1 mr-[6px]" :modelValue="img" />
            <UIcon name="i-heroicons-x-mark-16-solid" class="w-6 h-6" @click="removeImg(i)" />
          </div>
        </template>

        <div class="flex flex-wrap justify-between items-center">
          <UInput class="flex-1 mr-[6px]" v-model="imgUrlToAdd" />
          <UIcon name="i-heroicons-plus-16-solid" class="w-6 h-6" @click="addImg" />
        </div>

        <p v-if="filename" class="text-xs text-gray-400">正在上传({{ current }}/{{ total }})</p>
        <p v-if="filename" class="text-xs text-gray-400">{{ filename }}</p>
        <UProgress :value="progress" v-if="progress > 0" indicator />

        <UButtonGroup class="w-fit">
          <UButton @click="close()">确定</UButton>
          <UButton color="white" @click="clear(close)">清空并关闭</UButton>
        </UButtonGroup>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { useUpload } from "~/utils";
import { toast } from "vue-sonner";

const imgs = defineModel<string>('imgs')
const progress = ref(0)
const filename = ref('')
const total = ref(0)
const current = ref(0)
const imgUrlToAdd = ref("")

const imgList = computed(() => {
  return imgs.value.split(',').filter(Boolean)
})

const upload = async (files: FileList) => {
  const containsOtherFile = [...files].some(file => !file.type.startsWith('image/'))
  if (containsOtherFile) {
    toast.error("只能上传图片");
    return
  }

  const result = await useUpload(files, (totalSize: number, index: number, name: string, p: number) => {
    progress.value = Math.round(p * 100)
    filename.value = name
    total.value = totalSize
    current.value = index
  })
  if (result && result.length) {
    toast.success("上传成功")
    imgs.value = [imgs.value, ...result].filter(Boolean).join(',')
  }
}

const addImg = () => {
  if (!imgUrlToAdd.value) {
    return
  }

  const imgsArr = imgs.value.split(',').filter(Boolean)
  if (imgsArr.includes(imgUrlToAdd.value)) {
    toast.error("不能使用重复的图片地址");
    return
  }

  imgs.value += `,${imgUrlToAdd.value}`
  imgUrlToAdd.value = ''
}

const removeImg = (index) => {
  const imgsArr = imgs.value.split(',').filter(Boolean)
  imgsArr.splice(index, 1)
  imgs.value = imgsArr.join(',')
}

const clear = (close: Function) => {
  imgs.value = ''
  close()
}
</script>

<style scoped></style>
