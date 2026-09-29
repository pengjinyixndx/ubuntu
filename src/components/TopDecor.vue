<template>
  <div class="top-decor" aria-hidden="true">
    <!-- 小螃蟹 -->
    <svg class="decor crab" viewBox="0 0 72 62" fill="none">
      <!-- 腿 -->
      <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M20 34 L10 28" />
        <path d="M18 40 L7 40" />
        <path d="M20 46 L12 53" />
        <path d="M52 34 L62 28" />
        <path d="M54 40 L65 40" />
        <path d="M52 46 L60 53" />
      </g>
      <!-- 钳子 -->
      <g stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <path d="M24 26 C 18 18 13 16 11 12" />
        <path d="M11 12 C 6 10 5 15 9 17 C 12 18 14 16 13 13" />
        <path d="M48 26 C 54 18 59 16 61 12" />
        <path d="M61 12 C 66 10 67 15 63 17 C 60 18 58 16 59 13" />
      </g>
      <!-- 身体 -->
      <ellipse cx="36" cy="35" rx="18" ry="13" stroke="currentColor" stroke-width="2.3" />
      <!-- 眼睛 -->
      <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M30 24 L30 18" />
        <path d="M42 24 L42 18" />
      </g>
      <g fill="currentColor">
        <circle cx="30" cy="17" r="2.2" />
        <circle cx="42" cy="17" r="2.2" />
      </g>
      <!-- 笑 -->
      <path d="M33 40 Q36 43 39 40" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>

    <!-- 爱心 -->
    <svg class="decor heart" viewBox="0 0 40 38" fill="none">
      <path
        d="M20 34 C 5 23 3 13 10 8 C 15 5 20 10 20 14 C 20 10 25 5 30 8 C 37 13 35 23 20 34 Z"
        stroke="currentColor"
        stroke-width="2.3"
        stroke-linejoin="round"
      />
    </svg>

    <!-- 银杏叶（折扇扇形） -->
    <svg class="decor ginkgo" viewBox="0 0 60 58" fill="none">
      <path
        d="M30 42 C 20 40 10 30 6 18 Q 12 7 18 11 Q 24 8 30 12 Q 36 8 42 11 Q 48 7 54 18 C 50 30 40 40 30 42 Z"
        stroke="currentColor"
        stroke-width="2.3"
        stroke-linejoin="round"
      />
      <g stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
        <path d="M30 41 L9 18" />
        <path d="M30 41 L18 10" />
        <path d="M30 41 L24 9" />
        <path d="M30 41 L30 12" />
        <path d="M30 41 L36 9" />
        <path d="M30 41 L42 10" />
        <path d="M30 41 L51 18" />
      </g>
      <path d="M30 42 L30 55" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" />
    </svg>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.top-decor {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 20px;
  padding: 8px 0 2px;
}

.decor {
  display: block;
}

.crab {
  width: 58px;
  color: var(--caramel);
  transform: rotate(-3deg);
}

.heart {
  width: 30px;
  margin-bottom: 9px;
  color: var(--brick);
  transform: rotate(2deg);
}

.ginkgo {
  width: 42px;
  color: var(--caramel);
  transform: rotate(3deg);
}
</style>
