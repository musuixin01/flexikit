<template>
  <div class="bg-layer" aria-hidden="true"></div>
  <router-view />
  <SettingsPanel />
  <CookieConsent />
</template>

<script setup lang="ts">
import SettingsPanel from '@/components/layout/SettingsPanel.vue'
import CookieConsent from '@/components/common/CookieConsent.vue'
</script>

<style>
/* 只让 FlexiKit 品牌 Logo 跟随主题色，工具卡片中的网站 Logo 保持品牌原色。 */
img[src$="/icon/icon_256x256.ico"] {
  filter: var(--brand-logo-filter, none);
  opacity: var(--brand-logo-opacity, .98);
  transition: filter .3s cubic-bezier(.25, .1, .25, 1), opacity .3s cubic-bezier(.25, .1, .25, 1);
}
</style>
