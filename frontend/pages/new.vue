<template>
  <div>
    <Header v-if="currentUser" v-bind:user="currentUser"/>
    <MemoEdit/>

  </div>
</template>

<script setup lang="ts">
import type {UserVO} from "~/types";
import MemoEdit from "~/components/MemoEdit.vue";

definePageMeta({
  middleware: "auth-only",
})

const currentUser = useState<UserVO>('userinfo')

</script>

<style scoped>

</style>
