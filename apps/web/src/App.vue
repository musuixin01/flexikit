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
