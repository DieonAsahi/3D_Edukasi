<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useGLTF, useAnimations } from '@tresjs/cientos'
import { useRenderLoop } from '@tresjs/core'
import { useCharacterState } from '~/composables/useCharacterState'

const { characterState } = useCharacterState()

// Load GLTF model with animations
const { scene, animations } = await useGLTF('/models/aura.glb')
const { actions } = useAnimations(animations, scene)

let currentAction: any = null

const playStateAnimation = (state: string) => {
  if (!actions) return

  let targetName = 'Idle'
  if (state === 'listening') targetName = 'Listening'
  else if (state === 'thinking') targetName = 'Thinking'
  else if (state === 'talking') targetName = 'Talking'

  const nextAction = actions[targetName] || actions.Idle

  if (nextAction && nextAction !== currentAction) {
    if (currentAction) {
      currentAction.fadeOut(0.25)
    }
    nextAction.reset().fadeIn(0.25).play()
    currentAction = nextAction
  }
}

watch(characterState, (newState) => {
  playStateAnimation(newState)
}, { immediate: true })

onMounted(() => {
  playStateAnimation(characterState.value)
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', handleMouseMove)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', handleMouseMove)
  }
})

// Mouse tracking for empathetic gaze
const targetMouseX = ref(0)
const targetMouseY = ref(0)
const currentHeadX = ref(0)
const currentHeadY = ref(0)

const handleMouseMove = (e: MouseEvent) => {
  // Normalize coordinates to -1 ... 1
  targetMouseX.value = (e.clientX / window.innerWidth) * 2 - 1
  targetMouseY.value = -(e.clientY / window.innerHeight) * 2 + 1
}

// Find HeadGroup node for interactive tracking
const headNode = scene.getObjectByName('HeadGroup')

// Render loop for organic floating, breathing, and gaze tracking
const modelRef = ref<any>(null)
const { onLoop } = useRenderLoop()

onLoop(({ elapsed }) => {
  if (modelRef.value) {
    // Organic floating bobbing
    modelRef.value.position.y = Math.sin(elapsed * 1.8) * 0.04
    // Natural subtle rotation
    modelRef.value.rotation.y = Math.sin(elapsed * 0.6) * 0.06
  }

  // Smooth head tracking towards user cursor when not in thinking state
  if (headNode && characterState.value !== 'thinking') {
    currentHeadX.value += (targetMouseX.value * 0.35 - currentHeadX.value) * 0.05
    currentHeadY.value += (-targetMouseY.value * 0.25 - currentHeadY.value) * 0.05

    headNode.rotation.y = currentHeadX.value
    headNode.rotation.x = currentHeadY.value
  }
})
</script>

<template>
  <primitive ref="modelRef" :object="scene" :position="[0, 0, 0]" />
</template>
