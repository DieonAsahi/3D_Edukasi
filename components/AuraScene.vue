<script setup lang="ts">
import { computed } from 'vue'
import { OrbitControls, Stars } from '@tresjs/cientos'
import { useCharacterState } from '~/composables/useCharacterState'

const { characterState } = useCharacterState()

// State badge metadata for UI feedback
const stateInfo = computed(() => {
  switch (characterState.value) {
    case 'listening':
      return {
        label: 'Ara sedang mendengarkan...',
        color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
        dot: 'bg-emerald-400 animate-ping'
      }
    case 'thinking':
      return {
        label: 'Ara sedang memikirkan respon...',
        color: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
        dot: 'bg-amber-400 animate-spin'
      }
    case 'talking':
      return {
        label: 'Ara sedang berbicara...',
        color: 'text-purple-300 bg-purple-500/20 border-purple-500/40',
        dot: 'bg-purple-400 animate-pulse'
      }
    case 'idle':
    default:
      return {
        label: 'Ara siap menemanimu',
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
        dot: 'bg-indigo-400'
      }
  }
})

// Dynamic light color based on emotional state
const auraLightColor = computed(() => {
  switch (characterState.value) {
    case 'listening':
      return '#34d399' // Emerald
    case 'thinking':
      return '#fbbf24' // Warm amber
    case 'talking':
      return '#c084fc' // Vibrant violet
    default:
      return '#818cf8' // Gentle indigo
  }
})
</script>

<template>
  <div class="relative w-full h-full min-h-[380px] lg:min-h-[500px] flex items-center justify-center overflow-hidden rounded-3xl">
    <!-- 3D Canvas with ClientOnly -->
    <ClientOnly>
      <TresCanvas
        clear-color="#090d16"
        window-size="false"
        class="w-full h-full absolute inset-0 !cursor-grab active:!cursor-grabbing"
      >
        <TresPerspectiveCamera
          :position="[0, 1.4, 3.2]"
          :fov="42"
          :look-at="[0, 1.25, 0]"
        />

        <OrbitControls
          :enable-zoom="false"
          :enable-pan="false"
          :max-polar-angle="Math.PI / 1.7"
          :min-polar-angle="Math.PI / 2.5"
          :max-azimuth-angle="Math.PI / 4"
          :min-azimuth-angle="-Math.PI / 4"
        />

        <!-- Ambient and Key Lighting -->
        <TresAmbientLight :intensity="1.4" />
        <TresDirectionalLight
          :position="[3, 6, 4]"
          :intensity="2.2"
        />
        <TresPointLight
          :position="[0, 2, 2.5]"
          :intensity="1.8"
          :color="auraLightColor"
        />
        <TresPointLight
          :position="[-3, 1, -2]"
          :intensity="0.8"
          color="#38bdf8"
        />

        <!-- Calming Starfield -->
        <Stars
          :radius="50"
          :depth="30"
          :count="800"
          :size="0.6"
          :size-attenuation="true"
        />

        <!-- Suspense for GLTF character loading -->
        <Suspense>
          <AuraModel />
          <template #fallback>
            <!-- Fallback procedural sphere while GLTF prepares -->
            <TresMesh :position="[0, 1.3, 0]">
              <TresSphereGeometry :args="[0.5, 32, 32]" />
              <TresMeshStandardMaterial color="#8b5cf6" :roughness="0.3" />
            </TresMesh>
          </template>
        </Suspense>
      </TresCanvas>
      <template #fallback>
        <div class="flex flex-col items-center justify-center space-y-4 text-purple-300">
          <div class="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p class="text-sm font-medium">Memuat Karakter Ara 3D...</p>
        </div>
      </template>
    </ClientOnly>

    <!-- State Indicator Badge Overlay -->
    <div class="absolute top-6 left-6 z-10 pointer-events-none">
      <div
        class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all duration-300 text-xs font-semibold"
        :class="stateInfo.color"
      >
        <span class="w-2.5 h-2.5 rounded-full" :class="stateInfo.dot" />
        <span>{{ stateInfo.label }}</span>
      </div>
    </div>

    <!-- Soft Ambient Vignette / Glow Effect at bottom -->
    <div class="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
    <div class="absolute -bottom-8 w-72 h-32 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
  </div>
</template>

