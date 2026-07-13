import { useGlobalState } from '~/store'

export default defineNuxtRouteMiddleware(() => {
  const global = useGlobalState()

  if (!global.value.userinfo.token) {
    return navigateTo('/user/login')
  }
})
