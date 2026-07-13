<template>
  <Icon :name="name" :class="uiClass" />
</template>

<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true
  },
  class: {
    type: String,
    default: ''
  }
})

const uiClass = computed(() => props.class)
</script>
