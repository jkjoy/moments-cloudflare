<template>
  <div class="px-4 py-2 flex flex-col gap-2 mt-2" v-if="currentCommentBox === pid">
    <div class="relative">
      <UTextarea :rows="4" autofocus :placeholder="replyTo ? `回复给${replyTo}` : ''" v-model="state.content"/>
      <div class="flex gap-2 absolute right-3 bottom-2">
        <UIcon v-if="!global.userinfo.token" class="text-[#9fc84a] w-6 h-6 cursor-pointer" name="i-carbon-user-avatar" @click="toggleUser"/>
        <UIcon class="text-[#9fc84a] w-6 h-6 cursor-pointer select-none" name="i-carbon-face-satisfied" @click="toggleEmoji"/>
        <UButton
          class="cursor-pointer text-xs"
          color="white"
          :loading="submitting"
          :disabled="submitting || turnstileMisconfigured || (needsTurnstile && !turnstileToken)"
          @click="comment"
        >
          发送
        </UButton>
      </div>
    </div>
    <Emoji v-if="emojiShow" @selected="emojiSelected"/>
    <div v-if="userShow" class="flex gap-1">
      <template v-if="!global.userinfo.token">
        <UInput placeholder="姓名" v-model="state.username"/>
        <UInput placeholder="网站" v-model="state.website"/>
        <UInput placeholder="邮箱" v-model="state.email"/>
      </template>
    </div>
    <div v-if="needsTurnstile" class="flex flex-col gap-2">
      <div ref="turnstileRef" class="min-h-[65px]"></div>
      <div v-if="turnstileError" class="text-xs text-red-500">{{ turnstileError }}</div>
    </div>
    <div v-else-if="turnstileMisconfigured" class="text-xs text-red-500">
      评论验证未配置完成，请联系站点管理员。
    </div>
  </div>
</template>

<script setup lang="ts">
import {toast} from "vue-sonner";
import {memoChangedEvent} from "~/event";
import Emoji from "~/components/Emoji.vue";
import {useGlobalState} from "~/store";
import {useStorage} from '@vueuse/core'
import type {AddCommentDTO, SysConfigVO} from "~/types";

const props = defineProps<{
  commentId: number
  memoId: number
  replyTo?: string
  replyEmail?: string
}>()
const pid = computed(() => {
  return `${props.memoId}#${props.commentId}`
})
const global = useGlobalState()
const localCommentUserinfo = useStorage('localCommentUserinfo', {
  username: "",
  website: "",
  email: "",
})
const userShow = ref(false)
const emojiShow = ref(false)
const currentCommentBox = useState('currentCommentBox')
const sysConfig = useState<SysConfigVO>('sysConfig')
const submitting = ref(false)
const turnstileRef = ref<HTMLElement | null>(null)
const turnstileWidgetId = ref<string | null>(null)
const turnstileToken = ref('')
const turnstileError = ref('')
const state = reactive<AddCommentDTO>({
  content: "",
  memoId: props.memoId,
  replyTo: props.replyTo,
  replyEmail: props.replyEmail,
  username: localCommentUserinfo.value.username,
  website: localCommentUserinfo.value.website,
  email: localCommentUserinfo.value.email,
})
const needsTurnstile = computed(() => {
  return !global.value.userinfo.token
    && Boolean(sysConfig.value?.enableTurnstile)
    && Boolean(sysConfig.value?.turnstileSiteKey)
})
const turnstileMisconfigured = computed(() => {
  return !global.value.userinfo.token
    && Boolean(sysConfig.value?.enableTurnstile)
    && !sysConfig.value?.turnstileSiteKey
})

const comment = async () => {
  if (submitting.value) {
    return
  }

  submitting.value = true
  try {
    await doComment()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '评论失败，请重试')
  } finally {
    submitting.value = false
  }
}

const doComment = async () => {
  if (!global.value.userinfo.token) {
    localCommentUserinfo.value = {
      username: state.username || '',
      website: state.website || '',
      email: state.email || '',
    }
  }
  if (state.content.length > sysConfig.value.maxCommentLength) {
    toast.error("评论字数超过限制长度:" + sysConfig.value.maxCommentLength)
    return
  }

  if (turnstileMisconfigured.value) {
    throw new Error('评论验证未配置完成，请联系站点管理员')
  }

  if (needsTurnstile.value && !turnstileToken.value) {
    throw new Error('请先完成人机验证')
  }

  let usedTurnstileToken = false
  try {
    usedTurnstileToken = needsTurnstile.value
    await useMyFetch(`/comment/add`, {
      ...state,
      turnstileToken: turnstileToken.value || undefined,
    })
  } finally {
    if (usedTurnstileToken) {
      resetTurnstileWidget()
    }
  }

  toast.success("评论成功!")
  currentCommentBox.value = ''
  state.content = ''  // 只清空评论内容，保留用户信息方便下次使用
  memoChangedEvent.emit(props.memoId)
}

const toggleUser = () => {
  userShow.value = !userShow.value
}
const toggleEmoji = () => {
  emojiShow.value = !emojiShow.value
}
const emojiSelected = (emoji: string) => {
  state.content = state.content + emoji
}

const resetTurnstileWidget = () => {
  if (!turnstileWidgetId.value || !window.turnstile) {
    turnstileToken.value = ''
    return
  }

  window.turnstile.reset(turnstileWidgetId.value)
  turnstileToken.value = ''
}

const removeTurnstileWidget = () => {
  if (turnstileWidgetId.value && window.turnstile) {
    window.turnstile.remove(turnstileWidgetId.value)
  }

  turnstileWidgetId.value = null
  turnstileToken.value = ''
  turnstileError.value = ''
}

const renderTurnstileWidget = async () => {
  if (!needsTurnstile.value) {
    removeTurnstileWidget()
    return
  }

  await nextTick()
  if (!turnstileRef.value || turnstileWidgetId.value) {
    return
  }

  turnstileError.value = ''

  try {
    const turnstile = await useTurnstile()
    if (!turnstileRef.value || turnstileWidgetId.value) {
      return
    }

    turnstileWidgetId.value = turnstile.render(turnstileRef.value, {
      sitekey: sysConfig.value?.turnstileSiteKey || '',
      action: 'comment',
      callback: (token: string) => {
        turnstileToken.value = token
        turnstileError.value = ''
      },
      'expired-callback': () => {
        turnstileToken.value = ''
        turnstileError.value = '验证已过期，请重新完成验证'
      },
      'error-callback': () => {
        turnstileToken.value = ''
        turnstileError.value = '验证加载失败，请稍后重试'
      },
    })
  } catch (error) {
    turnstileError.value = error instanceof Error ? error.message : '验证加载失败，请稍后重试'
  }
}

watch(
  [() => currentCommentBox.value === pid.value, needsTurnstile],
  async ([isOpen, enabled]) => {
    if (isOpen && enabled) {
      await renderTurnstileWidget()
      return
    }

    removeTurnstileWidget()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  removeTurnstileWidget()
})
</script>

<style scoped>

</style>
