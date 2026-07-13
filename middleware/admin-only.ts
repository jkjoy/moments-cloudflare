import { useGlobalState } from '~/store'

export default defineNuxtRouteMiddleware(() => {
  const global = useGlobalState()

  if (global.value.userinfo.id !== 1) {
    return navigateTo('/')
  }
})
