<template>
  <IconWrapper :name="name" :class="class" />
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  class: {
    type: String,
    default: ''
  }
})
</script>
