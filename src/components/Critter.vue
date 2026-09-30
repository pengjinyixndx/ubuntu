<template>
  <svg
    class="critter"
    :class="kind"
    :style="{ width: size + 'px', height: 'auto' }"
    :viewBox="kind === 'crab' ? '0 0 72 62' : '0 0 60 58'"
    fill="none"
    aria-hidden="true"
  >
    <!-- 小螃蟹 -->
    <g v-if="kind === 'crab'">
      <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M20 34 L10 28" />
        <path d="M18 40 L7 40" />
        <path d="M20 46 L12 53" />
        <path d="M52 34 L62 28" />
        <path d="M54 40 L65 40" />
        <path d="M52 46 L60 53" />
      </g>
      <g stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <path d="M24 26 C 18 18 13 16 11 12" />
        <path d="M11 12 C 6 10 5 15 9 17 C 12 18 14 16 13 13" />
        <path d="M48 26 C 54 18 59 16 61 12" />
        <path d="M61 12 C 66 10 67 15 63 17 C 60 18 58 16 59 13" />
      </g>
      <ellipse cx="36" cy="35" rx="18" ry="13" stroke="currentColor" stroke-width="2.3" />
      <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M30 24 L30 18" />
        <path d="M42 24 L42 18" />
      </g>
      <g fill="currentColor">
        <circle cx="30" cy="17" r="2.2" />
        <circle cx="42" cy="17" r="2.2" />
      </g>
      <path d="M33 40 Q36 43 39 40" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- 银杏叶 -->
    <g v-else>
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
    </g>
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 画哪一种小生物 */
    kind: 'crab' | 'ginkgo'
    /** 宽度（px），高度按比例 */
    size?: number
  }>(),
  { size: 40 }
)
</script>

<style scoped>
.critter {
  display: block;
}

/* 螃蟹：左右轻轻摇晃、上下微顿，像在爬 */
.crab {
  animation: crab-walk 0.7s ease-in-out infinite;
  transform-origin: center;
}

/* 银杏叶：从叶柄处轻轻摆动 */
.ginkgo {
  animation: ginkgo-sway 3.6s ease-in-out infinite;
  transform-origin: 50% 72%;
}

@keyframes crab-walk {
  0%,
  100% {
    transform: rotate(-2.5deg) translateY(0);
  }
  50% {
    transform: rotate(2.5deg) translateY(-1.5px);
  }
}

@keyframes ginkgo-sway {
  0%,
  100% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
}
</style>
