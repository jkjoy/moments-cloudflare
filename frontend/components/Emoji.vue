<template>
  <UTabs class="mt-2" :items="tabItems"
         :ui="{wrapper: 'space-y-0', list: {height: 'h-8', tab: {height: 'h-6', padding: 'px-1'}}}">
    <template #item="{ item: tabItem }">
      <div class="flex flex-wrap gap-0.5 text-lg rounded border p-2 shadow-lg select-none mt-2 *:cursor-pointer">
        <div v-for="icon in tabItem.icons" @click="selectEmoji">{{ icon }}</div>
      </div>
    </template>
  </UTabs>
</template>

<script setup lang="ts">
const emit = defineEmits(['selected'])
const selectEmoji = (event:Event)=>{
  const value = (event.target as HTMLDivElement).innerHTML
  emit('selected',value)
}
const tabItems = [
  {
    key: 'common',
    label: '常用',
    icons: [...'😀😁😂😄😅😆😉😊😋😎😍😘😗😙😚😇😐😑😶😏😣😥😮😯😪😫😴😌😛😜😝😒😓😔😕😲😷😖😞😟😤😢😭😦😧😨😬😰😱😳😵😡😠👻👽💘💓💔💕💖💞💰💯']
  },
  {
    key: 'character',
    label: '人物',
    icons: [...'👦👧🎅🙅🙆💁🙋🙌🙏👤👥🏃👯💏👪💪👈👆👌👍✊👏📶👣👖👗👔👜👠💄💍🌂🌏☔🌟⛲🐵🐶🐕😿🐈🐆🐮🐷🐗🐏🐘🐇🐻🐼🐔🐣🐸🐍🐉🐳🐟🐡🐙🐚🐛🐝🦋']
  },
  {
    key: 'food',
    label: '食物',
    icons: [...'🍇🍈🍉🍊🍋🍌🍍🍎🍏🍐🍑🍒🍓🍅🍆🌽🍄🌰🍞🍖🍗🍔🍟🍕🍳🍲🍱🍘🍙🍚🍛🍜🍝🍠🍢🍣🍤🍥🍡🍦🍧🍨🍩🍪🎂🍰🍫🍬🍭🍮🍯🍼☕🍵🍶🍷🍸🍹🍺🍻🍴']
  },
  {
    key: 'thing',
    label: '物品',
    icons: [...'💌💎💈🚪🚿🛁⌛⏰🎈🎉🎎🎏🎐🎀🎁📱☎📞📟📠🔋🔌💻💾💿📺📷📼🔍🔬🔭📡💡📃📰💰📧📨📦📫📭✏📝📂📅📇📈📊📋📌📍📏📐🔓🔏🔑🔨🔫🔗💉💊🚩💦']
  },
  {
    key: 'logo',
    label: '标志',
    icons: [...'♠♥♦♣🀄🎴🔇🔈🔉🔊📢📣💤💢💬💭♨🌀🔔🔕✡✝🔯📛🔰🔱⭕✅❌➕➖➗➰➿〽✳✴❇‼⁉❓❔🎦🔠🔤🅰🆎🅱🆑🆒🆔🆖🆗🆙🆚🈁🈶🈯🉐🈹🈚🈲🉑🈸🈴🈳🈺🈵']
  }
]
</script>

<style scoped>

</style>