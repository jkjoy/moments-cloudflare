<script setup lang="ts">
import { DatePicker as VCalendarDatePicker } from 'v-calendar'
import 'v-calendar/dist/style.css'

type CalendarDateValue = Date | string | number
type CalendarRangeValue = {
  start: CalendarDateValue
  end: CalendarDateValue
}
type CalendarValue = CalendarDateValue | CalendarRangeValue | null

const props = withDefaults(defineProps<{
  modelValue?: CalendarValue
}>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:model-value': [value: CalendarValue]
  close: []
}>()

const isRangeValue = (value: CalendarValue): value is CalendarRangeValue => {
  return value !== null
    && typeof value === 'object'
    && 'start' in value
    && 'end' in value
}

const date = computed({
  get: () => {
    let value = props.modelValue
    if (!value) {
      value = new Date()
      emit('update:model-value', value)
    }

    return value
  },
  set: (value) => {
    emit('update:model-value', value)
  }
})

const isRangeDate = computed(() => isRangeValue(date.value))

const attrs = {
  transparent: true,
  borderless: true,
  color: 'primary',
  'is-dark': { selector: 'html', darkClass: 'dark' },
  'first-day-of-week': 2,
}

const columns = import.meta.client && document.body.clientWidth < 520 ? 1 : 2

</script>

<template>
  <VCalendarDatePicker v-if="isRangeDate" v-model.range="date" :columns="columns" v-bind="{ ...attrs, ...$attrs }" />
  <VCalendarDatePicker v-else v-model="date" v-bind="{ ...attrs, ...$attrs }" />
</template>

<style>
:root {
  --vc-gray-50: rgb(var(--color-gray-50));
  --vc-gray-100: rgb(var(--color-gray-100));
  --vc-gray-200: rgb(var(--color-gray-200));
  --vc-gray-300: rgb(var(--color-gray-300));
  --vc-gray-400: rgb(var(--color-gray-400));
  --vc-gray-500: rgb(var(--color-gray-500));
  --vc-gray-600: rgb(var(--color-gray-600));
  --vc-gray-700: rgb(var(--color-gray-700));
  --vc-gray-800: rgb(var(--color-gray-800));
  --vc-gray-900: rgb(var(--color-gray-900));
}

.vc-primary {
  --vc-accent-50: rgb(var(--color-primary-50));
  --vc-accent-100: rgb(var(--color-primary-100));
  --vc-accent-200: rgb(var(--color-primary-200));
  --vc-accent-300: rgb(var(--color-primary-300));
  --vc-accent-400: rgb(var(--color-primary-400));
  --vc-accent-500: rgb(var(--color-primary-500));
  --vc-accent-600: rgb(var(--color-primary-600));
  --vc-accent-700: rgb(var(--color-primary-700));
  --vc-accent-800: rgb(var(--color-primary-800));
  --vc-accent-900: rgb(var(--color-primary-900));
}

.vc-container{
  width: 100%;
}
</style>
