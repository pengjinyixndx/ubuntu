<template>
  <!-- ============ 登录 ============ -->
  <div v-if="!ready" class="login-page">
    <form class="login-box" @submit.prevent="doLogin">
      <h1 class="login-title">管理后台</h1>
      <p class="login-sub">独立账号。用你自己在 Supabase 建的那个邮箱和密码登录。</p>

      <label class="field">
        <span class="field-label">账号</span>
        <input
          v-model="email"
          class="field-input"
          type="email"
          autocomplete="username"
          placeholder="邮箱"
        />
      </label>

      <label class="field">
        <span class="field-label">密码</span>
        <input
          v-model="password"
          class="field-input"
          type="password"
          autocomplete="current-password"
          placeholder="密码"
        />
      </label>

      <button class="btn primary" type="submit" :disabled="busy || !canLogin">
        {{ busy ? '登录中…' : '登录' }}
      </button>

      <p v-if="msg" class="msg err">{{ msg }}</p>
    </form>
  </div>

  <!-- ============ 记录列表 ============ -->
  <div v-else class="admin-page">
    <header class="bar">
      <h1 class="bar-title">全部记录</h1>
      <div class="bar-right">
        <span class="stat">共 {{ rows.length }} 条 · 已撤销 {{ revokedCount }}</span>
        <button class="btn small ghost" @click="showRevoked = !showRevoked">
          {{ showRevoked ? '隐藏已撤销' : '显示已撤销' }}
        </button>
        <button class="btn small ghost" :disabled="loading" @click="load">
          {{ loading ? '读取中…' : '刷新' }}
        </button>
        <button class="btn small ghost" @click="doLogout">退出</button>
      </div>
    </header>

    <p v-if="msg" class="msg err">{{ msg }}</p>

    <!-- 清理工具 -->
    <div class="tools">
      <button
        type="button"
        class="btn small danger"
        :disabled="busy || !revokedCount"
        @click="askPurgeRevoked"
      >
        清空已撤销（{{ revokedCount }}）
      </button>
      <span class="tools-sep">|</span>
      <span class="tools-label">删除</span>
      <input v-model="beforeDate" class="tools-date" type="date" />
      <span class="tools-label">之前的全部记录</span>
      <button
        type="button"
        class="btn small danger"
        :disabled="busy || !beforeDate"
        @click="askPurgeBefore"
      >
        执行
      </button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th class="c-time">时间</th>
            <th class="c-who">谁</th>
            <th class="c-kind">类型</th>
            <th>内容</th>
            <th class="c-photo">图片</th>
            <th class="c-state">状态</th>
            <th class="c-op">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in visibleRows" :key="r.table + r.id" :class="{ revoked: !!r.revoked_at }">
            <td class="c-time">{{ fmt(r.created_at) }}</td>
            <td class="c-who">{{ nameOf(r.actor) }}</td>
            <td class="c-kind">{{ r.kind }}</td>
            <td class="content">
              <span class="text">{{ r.content || '（没有文字）' }}</span>
              <span v-if="r.extra" class="extra">{{ r.extra }}</span>
            </td>
            <td class="c-photo">
              <a
                v-for="(u, i) in r.photos.slice(0, 3)"
                :key="i"
                class="thumb"
                :href="u"
                target="_blank"
                rel="noreferrer"
              >
                <img :src="u" alt="" loading="lazy" />
              </a>
              <span v-if="r.photos.length > 3" class="more">+{{ r.photos.length - 3 }}</span>
            </td>
            <td class="c-state">
              <span :class="r.revoked_at ? 'tag-revoked' : 'tag-ok'">
                {{ r.revoked_at ? '已撤销' : '正常' }}
              </span>
            </td>
            <td class="c-op">
              <button
                class="btn small"
                :class="r.revoked_at ? 'ok' : 'danger'"
                :disabled="busyId === r.table + r.id"
                @click="toggleRevoked(r)"
              >
                {{ r.revoked_at ? '恢复' : '撤销' }}
              </button>
              <button
                class="btn small purge"
                :disabled="busyId === r.table + r.id"
                @click="askPurgeOne(r)"
              >
                彻底删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!visibleRows.length && !loading" class="empty">没有记录</p>
    </div>

    <!-- 危险操作确认 -->
    <div v-if="ask" class="ask-mask" @click.self="ask = null">
      <div class="ask-box">
        <h3 class="ask-title">{{ ask.title }}</h3>
        <p class="ask-desc">{{ ask.desc }}</p>
        <div class="ask-acts">
          <button type="button" class="btn ghost" @click="ask = null">取消</button>
          <button type="button" class="btn danger" :disabled="busy" @click="runAsk">
            {{ ask.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AdminRecord, Profile } from '../types/domain'
import { getFeedSource } from '../lib/dataSource'
import { dateTimeLabel } from '../lib/eventLabels'

const ready = ref(false)
const email = ref('')
const password = ref('')
const busy = ref(false)
const loading = ref(false)
const msg = ref('')
const rows = ref<AdminRecord[]>([])
const profiles = ref<Profile[]>([])
const showRevoked = ref(true)
const busyId = ref('')

const canLogin = computed(() => email.value.trim().length > 0 && password.value.length > 0)
const revokedCount = computed(() => rows.value.filter((r) => r.revoked_at).length)
const visibleRows = computed(() =>
  showRevoked.value ? rows.value : rows.value.filter((r) => !r.revoked_at)
)

function fmt(iso: string): string {
  return dateTimeLabel(iso)
}

function nameOf(id: string): string {
  const p = profiles.value.find((x) => x.id === id)
  if (!p) return id.slice(0, 8)
  const role = p.is_admin ? '（后台）' : ''
  return `${p.display_name || p.email}${role}`
}

async function boot() {
  const src = await getFeedSource()
  try {
    ready.value = await src.adminCheck()
  } catch {
    ready.value = false
  }
  if (ready.value) await load()
}

async function doLogin() {
  if (!canLogin.value || busy.value) return
  busy.value = true
  msg.value = ''
  const src = await getFeedSource()
  const { error } = await src.adminSignIn(email.value.trim(), password.value)
  if (error) {
    busy.value = false
    msg.value = '账号或密码不对'
    return
  }

  const ok = await src.adminCheck()
  busy.value = false
  if (!ok) {
    msg.value = '这个账号不是后台账号：需要在 profiles 里把它的 is_admin 设为 true（见 supabase/admin.sql）'
    await src.adminSignOut()
    return
  }
  password.value = ''
  ready.value = true
  await load()
}

async function load() {
  loading.value = true
  msg.value = ''
  const src = await getFeedSource()
  const [all, ps] = await Promise.all([src.adminListAll(), src.adminListProfiles()])
  rows.value = all.data
  profiles.value = ps.data
  if (all.error) msg.value = '读取记录出错，具体看浏览器控制台'
  loading.value = false
}

async function toggleRevoked(r: AdminRecord) {
  busyId.value = r.table + r.id
  const src = await getFeedSource()
  const target = !r.revoked_at
  const { error } = await src.adminSetRevoked(r.table, r.id, target)
  busyId.value = ''
  if (error) {
    msg.value = '操作失败，具体看浏览器控制台'
    return
  }
  // 就地更新，不用整页重拉
  r.revoked_at = target ? new Date().toISOString() : null
}

/* —— 清理工具：都是不可恢复的动作，先弹确认 —— */
const beforeDate = ref('')

interface AskJob {
  title: string
  desc: string
  confirmText: string
  run: () => Promise<void>
}
const ask = ref<AskJob | null>(null)

function askPurgeOne(r: AdminRecord) {
  ask.value = {
    title: '彻底删除这一条？',
    desc: `${r.kind} · ${fmt(r.created_at)}。数据库里会真的删掉，带照片的连图片文件一起删，不可恢复。`,
    confirmText: '彻底删除',
    run: async () => {
      busyId.value = r.table + r.id
      const src = await getFeedSource()
      const { error } = await src.adminPurge(r.table, r.id)
      busyId.value = ''
      if (error) {
        msg.value = '删除失败，具体看浏览器控制台'
        return
      }
      rows.value = rows.value.filter((x) => !(x.table === r.table && x.id === r.id))
      msg.value = '已彻底删除'
    }
  }
}

function askPurgeRevoked() {
  const n = revokedCount.value
  ask.value = {
    title: `清空全部已撤销的 ${n} 条？`,
    desc: '这些记录连同它们的照片文件会从数据库里彻底删掉，不可恢复。',
    confirmText: `确认清空 ${n} 条`,
    run: async () => {
      const src = await getFeedSource()
      const { count, error } = await src.adminPurgeRevoked()
      if (error) {
        msg.value = '清空失败，具体看浏览器控制台'
        return
      }
      await load()
      msg.value = `已清空 ${count} 条`
    }
  }
}

function askPurgeBefore() {
  const d = beforeDate.value
  if (!d) return
  ask.value = {
    title: `删除 ${d} 之前的全部记录？`,
    desc: '按时间一刀切：那个时间点之前的所有记录（含请愿那几张表）连同照片文件都会彻底删掉，不可恢复。',
    confirmText: '确认删除',
    run: async () => {
      const src = await getFeedSource()
      const { count, error } = await src.adminPurgeBefore(d)
      if (error) {
        msg.value = '删除失败，具体看浏览器控制台'
        return
      }
      await load()
      msg.value = `已删除 ${count} 条`
    }
  }
}

async function runAsk() {
  const job = ask.value
  if (!job) return
  ask.value = null
  busy.value = true
  msg.value = ''
  await job.run()
  busy.value = false
}

async function doLogout() {
  const src = await getFeedSource()
  await src.adminSignOut()
  ready.value = false
  rows.value = []
}

onMounted(boot)
</script>

<style scoped>
/* —— 登录 —— */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: #14110d;
}
.login-box {
  width: 100%;
  max-width: 360px;
  padding: 26px 22px;
  background-color: #1e1a15;
  border: 1px solid #3a332a;
  border-radius: 8px;
}
.login-title {
  margin: 0;
  font-size: 20px;
  color: #f3ead4;
  letter-spacing: 2px;
}
.login-sub {
  margin: 8px 0 20px;
  font-size: 12px;
  line-height: 1.7;
  color: #9a8d78;
}
.field {
  display: block;
  margin-bottom: 14px;
}
.field-label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  color: #9a8d78;
}
.field-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  color: #f3ead4;
  background-color: #14110d;
  border: 1px solid #3a332a;
  border-radius: 5px;
}
.field-input:focus {
  outline: none;
  border-color: #98663a;
}

/* —— 列表 —— */
.admin-page {
  min-height: 100vh;
  background-color: #14110d;
  color: #e8dfc9;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid #3a332a;
  position: sticky;
  top: 0;
  background-color: #14110d;
  z-index: 5;
}
.bar-title {
  margin: 0;
  font-size: 17px;
  letter-spacing: 2px;
  color: #f3ead4;
}
.bar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.stat {
  font-size: 12px;
  color: #9a8d78;
}

.table-wrap {
  padding: 14px 18px 40px;
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #2a251e;
}
.table th {
  font-weight: 500;
  font-size: 12px;
  color: #9a8d78;
  white-space: nowrap;
  border-bottom-color: #3a332a;
}
.c-time {
  white-space: nowrap;
  color: #9a8d78;
  font-variant-numeric: tabular-nums;
}
.c-who {
  white-space: nowrap;
  color: #c9a86f;
}
.c-kind {
  white-space: nowrap;
  color: #b9ac93;
}
.content {
  max-width: 520px;
}
.text {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}
.extra {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #6f6553;
  word-break: break-all;
}
.c-photo {
  white-space: nowrap;
}
.thumb {
  display: inline-block;
  width: 46px;
  height: 46px;
  margin-right: 4px;
  overflow: hidden;
  border: 1px solid #3a332a;
  border-radius: 4px;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.more {
  font-size: 11px;
  color: #9a8d78;
}
.c-state {
  white-space: nowrap;
}
.tag-ok {
  color: #7fb37f;
}
.tag-revoked {
  color: #d08a6a;
}
tr.revoked .text,
tr.revoked .c-kind,
tr.revoked .c-who {
  opacity: 0.45;
  text-decoration: line-through;
}
.c-op {
  white-space: nowrap;
}

.btn {
  padding: 7px 12px;
  font-size: 13px;
  color: #f3ead4;
  background-color: #3a332a;
  border: 1px solid #4a4136;
  border-radius: 5px;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.small {
  padding: 5px 10px;
  font-size: 12px;
}
.btn.primary {
  width: 100%;
  padding: 11px;
  font-size: 15px;
  letter-spacing: 2px;
  background-color: #98663a;
  border-color: #98663a;
}
.btn.ghost {
  background-color: transparent;
  color: #b9ac93;
}
.btn.danger {
  background-color: #7d3a2a;
  border-color: #9a4a34;
}
.btn.ok {
  background-color: #3f6b45;
  border-color: #4e8155;
}

.msg {
  margin: 0 18px 10px;
  font-size: 12px;
  line-height: 1.7;
}
.msg.err {
  color: #d08a6a;
}

/* —— 清理工具 —— */
.tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 18px 12px;
}
.tools-sep {
  color: #3a332a;
}
.tools-label {
  font-size: 12px;
  color: #9a8d78;
}
.tools-date {
  padding: 4px 8px;
  font-size: 12px;
  color: #f3ead4;
  background-color: #1e1a15;
  border: 1px solid #3a332a;
  border-radius: 4px;
}
.btn.purge {
  margin-left: 6px;
  color: #d08a6a;
  background-color: transparent;
  border-color: #5a3a30;
}

/* —— 危险操作确认 —— */
.ask-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: rgba(10, 8, 6, 0.72);
}
.ask-box {
  width: 100%;
  max-width: 420px;
  padding: 20px;
  background-color: #1e1a15;
  border: 1px solid #5a3a30;
  border-radius: 8px;
}
.ask-title {
  margin: 0;
  font-size: 16px;
  color: #f3ead4;
}
.ask-desc {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: #b9ac93;
}
.ask-acts {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.ask-acts .btn {
  flex: 1;
}
.empty {
  padding: 30px;
  text-align: center;
  font-size: 13px;
  color: #6f6553;
}
</style>
