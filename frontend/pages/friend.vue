<template>
  <Header v-bind:user="currentUser" @add-friend="showAddModal = true" />
  <div class="bg-white dark:bg-neutral-800">
    <div class="grid sm:grid-cols-2 grid-cols gap-4 p-4">
      <div
        v-for="friend in friendList"
        :key="friend.id"
        class="bg-neutral-100 dark:bg-neutral-700 rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105 duration-300 relative"
        @mouseenter="onMouseEnter(friend.id)"
        @mouseleave="onMouseLeave(friend.id)"
      >
        <a :href="friend.url" target="_blank" class="block p-4">
          <div class="flex items-center gap-2 mb-2">
            <img
              :src="friend.icon"
              alt="Friend Avatar"
              class="w-8 h-8 rounded-full"
            />
            <span class="text font-semibold">{{ friend.name }}</span>
          </div>
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            {{ friend.desc || "暂无描述" }}
          </p>
        </a>
        <div
          v-if="globalState.userinfo.id === 1 && hoverFriendId === friend.id"
          class="absolute top-0 right-0 px-1 bg-white dark:bg-gray-900 m-2 rounded hover:text-red-500 cursor-pointer"
          @click="showConfirmModal(friend.id)"
        >
          <UIcon name="i-carbon-trash-can" />
        </div>
      </div>
    </div>
    <div
      class="flex justify-center items-center text-sm text-gray-400 pt-4 pb-10"
    >
      <span v-if="friendList && friendList.length">
        共 {{ friendList.length }} 个朋友
      </span>
      <span v-else class="text-gray-600 dark:text-gray-300 font-semibold">
        空空如也{{ globalState.userinfo.id === 1 ? '，请点击右上角添加' : '' }}
      </span>
    </div>
  </div>

  <UModal
    v-model="showAddModal"
    :ui="{
      container:
        'fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center backdrop-blur',
    }"
  >
    <div class="p-4">
      <p class="text-center text-lg font-bold mb-2">添加友情链接</p>
      <UForm class="space-y-4" size="sm" :state="friend">
        <UFormGroup
          label="名称"
          name="name"
          required
          :ui="{ label: { base: 'font-bold' } }"
        >
          <UInput v-model="friend.name" class="mb-2" required />
        </UFormGroup>
        <UFormGroup
          label="图标"
          name="icon"
          required
          :ui="{ label: { base: 'font-bold' } }"
        >
          <UInput v-model="friend.icon" class="mb-2" />
        </UFormGroup>
        <UFormGroup
          label="网址"
          name="url"
          required
          :ui="{ label: { base: 'font-bold' } }"
        >
          <UInput
            v-model="friend.url"
            class="mb-2"
            placeholder="必须以 http(s):// 开头"
          />
        </UFormGroup>
        <UFormGroup
          label="描述"
          name="desc"
          :ui="{ label: { base: 'font-bold' } }"
        >
          <UInput v-model="friend.desc" class="mb-2" />
        </UFormGroup>
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="white" @click="showAddModal = false">取消</UButton>
          <UButton @click="addFriend">确认添加</UButton>
        </div>
      </UForm>
    </div>
  </UModal>

  <UModal
    v-model="showDeleteModal"
    :ui="{
      container:
        'fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center',
    }"
  >
    <div class="p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-md">
      <p class="text-center text-lg font-bold mb-2">确认删除</p>
      <p class="text-gray-600 mb-4">你确定要删除这个友情链接吗？</p>
      <div class="flex justify-end gap-2 mt-4">
        <UButton color="white" @click="cancelDelete">取消</UButton>
        <UButton @click="deleteFriend(friendIdToDelete)">确认删除</UButton>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import type { Friend, UserVO } from "~/types";
import { toast } from "vue-sonner";
import { useGlobalState } from "~/store";

const DEFAULT_FRIEND = {
  name: "",
  icon: "",
  url: "",
  desc: "",
};

const globalState = useGlobalState();
const currentUser = useState<UserVO>("userinfo");

const friendList = ref<Friend[]>([]);

const showAddModal = ref(false);
const friend = ref({ ...DEFAULT_FRIEND });

const hoverFriendId = ref<number>(0);
const showDeleteModal = ref(false);
const friendIdToDelete = ref<number>(0);

const addFriend = async () => {
  if (!friend.value.name) {
    toast.warning("名称不能为空");
    return;
  }

  if (!friend.value.icon) {
    toast.warning("图标地址不能为空");
    return;
  }

  if (!friend.value.url) {
    toast.warning("网址不能为空");
    return;
  }

  if (
    !/^https?:\/\//.test(friend.value.url) ||
    !/^https?:\/\//.test(friend.value.icon)
  ) {
    toast.warning("地址必须以 http 或 https 开头");
    return;
  }

  try {
    const response = await useMyFetch("/friend/add", friend.value);
    toast.success("友情链接添加成功");
    await getFriendList();
    showAddModal.value = false;
    friend.value = { ...DEFAULT_FRIEND };
  } catch (error) {
    toast.error(`${message}` || "添加友情链接失败");
  }
};

const getFriendList = async () => {
  try {
    const response = await useMyFetch("/friend/list");
    friendList.value = response.list as Friend[];
  } catch (error) {
    friendList.value = [];
  }
};

const onMouseEnter = (id: number) => {
  hoverFriendId.value = id;
};

const onMouseLeave = (id: number) => {
  hoverFriendId.value = 0;
};

const showConfirmModal = (id: number) => {
  friendIdToDelete.value = id;
  showDeleteModal.value = true;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
};

const deleteFriend = async (id: number) => {
  try {
    await useMyFetch(`/friend/delete?id=${id}`);
    toast.success("友情链接删除成功");

    await getFriendList();
    showDeleteModal.value = false;
  } catch (error) {
    toast.error(`${message}` || "删除友情链接失败");
  }
};

onMounted(() => {
  getFriendList();
});
</script>

<style scoped></style>
