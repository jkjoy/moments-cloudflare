<template>
  <IconWrapper :name="name" />
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true
  }
})
</script>
