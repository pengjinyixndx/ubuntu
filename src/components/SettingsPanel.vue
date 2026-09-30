<template>
  <PanelShell title="设置" @close="emit('close')">
    <!-- 我是 -->
    <section class="block">
      <h3 class="block-title">我是</h3>
      <p class="hint">决定首页里对方叫「他」还是「她」，也决定信上盖的是螃蟹还是银杏叶</p>
      <div class="choices">
        <button
          type="button"
          class="choice"
          :class="{ on: gender === 'male' }"
          @click="gender = 'male'"
        >
          <Critter kind="crab" :size="34" still />
          <span class="choice-name">男生</span>
        </button>
        <button
          type="button"
          class="choice"
          :class="{ on: gender === 'female' }"
          @click="gender = 'female'"
        >
          <Critter kind="ginkgo" :size="34" still />
          <span class="choice-name">女生</span>
        </button>
      </div>
    </section>

    <!-- 昵称 -->
    <section class="block">
      <h3 class="block-title">叫我什么</h3>
      <input v-model="displayName" class="input" maxlength="12" placeholder="写个昵称" />
    </section>

    <button type="button" class="save" :disabled="busy" @click="save">
      {{ busy ? '保存中…' : '保存' }}
    </button>
    <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
  </PanelShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Gender } from '../types/domain'
import { getFeedSource } from '../lib/dataSource'
import { useFeed } from '../composables/useFeed'
import PanelShell from './PanelShell.vue'
import Critter from './Critter.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()

const gender = ref<Gender>('male')
const displayName = ref('')
const busy = ref(false)
const msg = ref('')
const isErr = ref(false)

onMounted(() => {
  gender.value = myProfile.value?.gender ?? 'male'
  displayName.value = myProfile.value?.display_name ?? ''
})

async function save() {
  busy.value = true
  msg.value = ''
  isErr.value = false

  const src = await getFeedSource()
  const { error } = await src.updateProfile({
    gender: gender.value,
    display_name: displayName.value.trim()
  })
  busy.value = false

  if (error) {
    isErr.value = true
    msg.value = '没保存上，再试一次'
    return
  }

  // 本地档案立刻跟上，首页称呼马上变
  if (myProfile.value) {
    myProfile.value = {
      ...myProfile.value,
      gender: gender.value,
      display_name: displayName.value.trim()
    }
  }
  msg.value = '保存好了'
}
</script>

<style scoped>
.block {
  padding: 14px 15px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.block-title {
  margin: 0 0 8px;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  font-weight: 400;
  letter-spacing: 1px;
  color: var(--ink);
}
.hint {
  margin: 0 0 12px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--muted);
}

.choices {
  display: flex;
  gap: 12px;
}
.choice {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  color: var(--caramel);
  background-color: var(--paper);
  border: var(--border);
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: transform 0.15s ease;
}
.choice:active {
  transform: scale(0.97);
}
.choice.on {
  border-color: var(--brick);
  box-shadow: inset 0 0 0 1.5px var(--brick);
  color: var(--brick);
}
.choice-name {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--ink);
}

.input {
  width: 100%;
  padding: 8px 2px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--line-strong);
  font-family: var(--font-song);
  font-size: var(--fs-base);
  color: var(--ink);
}
.input::placeholder {
  color: var(--faint);
}
.input:focus {
  outline: none;
  border-bottom-color: var(--caramel);
}

.save {
  padding: 12px;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  letter-spacing: 3px;
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
  cursor: pointer;
}
.save:disabled {
  background-color: var(--faint);
  box-shadow: none;
  cursor: not-allowed;
}

.msg {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--caramel);
  text-align: center;
}
.msg.err {
  color: var(--brick);
}
</style>
