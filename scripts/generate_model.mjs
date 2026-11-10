import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import fs from 'fs'
import path from 'path'

// Node.js FileReader polyfill for GLTFExporter binary export
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf
        if (this.onload) this.onload()
        if (this.onloadend) this.onloadend()
      })
    }
  }
}

// Setup Scene
const scene = new THREE.Scene()
scene.name = 'AuraCharacter'

// Root Group
const root = new THREE.Group()
root.name = 'Root'
scene.add(root)

// Base Materials
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x9370DB, // Medium purple
  roughness: 0.3,
  metalness: 0.2,
  name: 'BodyMaterial'
})

const bellyMat = new THREE.MeshStandardMaterial({
  color: 0xE6E6FA, // Lavender
  roughness: 0.4,
  name: 'BellyMaterial'
})

const eyeMat = new THREE.MeshStandardMaterial({
  color: 0x00FFFF, // Cyan glow
  emissive: 0x00BFFF,
  emissiveIntensity: 0.8,
  roughness: 0.1,
  name: 'EyeMaterial'
})

const haloMat = new THREE.MeshStandardMaterial({
  color: 0xFFD700, // Gold glow
  emissive: 0xFFA500,
  emissiveIntensity: 0.6,
  roughness: 0.2,
  name: 'HaloMaterial'
})

const coreMat = new THREE.MeshStandardMaterial({
  color: 0x10B981, // Emerald green (SDG 3 Health & Well-being)
  emissive: 0x059669,
  emissiveIntensity: 0.9,
  roughness: 0.1,
  name: 'CoreMaterial'
})

// Torso / Body
const bodyGeo = new THREE.CapsuleGeometry(0.55, 0.7, 16, 24)
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
bodyMesh.name = 'Body'
bodyMesh.position.y = 1.0
root.add(bodyMesh)

// Belly patch
const bellyGeo = new THREE.SphereGeometry(0.42, 16, 16)
bellyGeo.scale(1, 1.2, 0.5)
const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat)
bellyMesh.name = 'Belly'
bellyMesh.position.set(0, 0.95, 0.3)
root.add(bellyMesh)

// Heart / Wellbeing Core (SDG 3)
const coreGeo = new THREE.OctahedronGeometry(0.12, 0)
const coreMesh = new THREE.Mesh(coreGeo, coreMat)
coreMesh.name = 'HeartCore'
coreMesh.position.set(0, 1.1, 0.48)
root.add(coreMesh)

// Head Group
const headGroup = new THREE.Group()
headGroup.name = 'HeadGroup'
headGroup.position.set(0, 1.85, 0)
root.add(headGroup)

// Head Mesh
const headGeo = new THREE.SphereGeometry(0.52, 24, 24)
headGeo.scale(1.05, 0.98, 1.0)
const headMesh = new THREE.Mesh(headGeo, bodyMat)
headMesh.name = 'Head'
headGroup.add(headMesh)

// Visor / Face Plate
const faceGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 24)
faceGeo.rotateX(Math.PI / 2)
faceGeo.scale(1.0, 0.7, 0.5)
const faceMat = new THREE.MeshStandardMaterial({
  color: 0x1E1E2E,
  roughness: 0.1,
  metalness: 0.8
})
const faceMesh = new THREE.Mesh(faceGeo, faceMat)
faceMesh.position.set(0, 0.02, 0.35)
headGroup.add(faceMesh)

// Left Eye
const eyeGeo = new THREE.SphereGeometry(0.08, 12, 12)
const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat)
eyeLeft.name = 'EyeLeft'
eyeLeft.position.set(-0.16, 0.05, 0.48)
headGroup.add(eyeLeft)

// Right Eye
const eyeRight = new THREE.Mesh(eyeGeo, eyeMat)
eyeRight.name = 'EyeRight'
eyeRight.position.set(0.16, 0.05, 0.48)
headGroup.add(eyeRight)

// Mouth (Animated during talking)
const mouthGeo = new THREE.BoxGeometry(0.14, 0.04, 0.05)
const mouthMat = new THREE.MeshStandardMaterial({
  color: 0xFF69B4,
  emissive: 0xFF1493,
  emissiveIntensity: 0.5
})
const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat)
mouthMesh.name = 'Mouth'
mouthMesh.position.set(0, -0.12, 0.48)
headGroup.add(mouthMesh)

// Cute Halo Ring
const haloGeo = new THREE.TorusGeometry(0.35, 0.035, 12, 32)
haloGeo.rotateX(Math.PI / 2)
const haloMesh = new THREE.Mesh(haloGeo, haloMat)
haloMesh.name = 'Halo'
haloMesh.position.set(0, 0.65, 0)
headGroup.add(haloMesh)

// Floating Left Hand
const handGeo = new THREE.SphereGeometry(0.16, 12, 12)
handGeo.scale(1.2, 0.8, 1.0)
const handLeft = new THREE.Mesh(handGeo, bodyMat)
handLeft.name = 'HandLeft'
handLeft.position.set(-0.75, 1.05, 0.1)
root.add(handLeft)

// Floating Right Hand
const handRight = new THREE.Mesh(handGeo, bodyMat)
handRight.name = 'HandRight'
handRight.position.set(0.75, 1.05, 0.1)
root.add(handRight)

// --- CREATE ANIMATIONS ---
// 1. Idle Animation: gentle floating bob, breathing scale, slight head tilt
const idleTimes = [0, 1.5, 3]
const idleRootPos = [
  0, 0, 0,
  0, 0.08, 0,
  0, 0, 0
]
const idleHeadRot = [
  0, 0, 0, 1,
  0.03, 0, 0, 0.999,
  0, 0, 0, 1
]
const idleCoreScale = [
  1, 1, 1,
  1.2, 1.2, 1.2,
  1, 1, 1
]
const idleTrack1 = new THREE.VectorKeyframeTrack('Root.position', idleTimes, idleRootPos)
const idleTrack2 = new THREE.QuaternionKeyframeTrack('HeadGroup.quaternion', idleTimes, idleHeadRot)
const idleTrack3 = new THREE.VectorKeyframeTrack('HeartCore.scale', idleTimes, idleCoreScale)
const idleClip = new THREE.AnimationClip('Idle', 3, [idleTrack1, idleTrack2, idleTrack3])

// 2. Listening / Nodding Animation: rhythmic empathetic nodding, forward tilt
const nodTimes = [0, 0.5, 1.0, 1.5, 2.0]
const nodHeadRot = [
  0, 0, 0, 1,
  0.09, 0, 0, 0.995,  // nod down
  0.02, 0, 0, 0.999,  // return
  0.09, 0, 0, 0.995,  // nod down again
  0, 0, 0, 1
]
const nodHandLeftPos = [
  -0.75, 1.05, 0.1,
  -0.72, 1.15, 0.25,
  -0.75, 1.05, 0.1,
  -0.72, 1.15, 0.25,
  -0.75, 1.05, 0.1
]
const nodTrack1 = new THREE.QuaternionKeyframeTrack('HeadGroup.quaternion', nodTimes, nodHeadRot)
const nodTrack2 = new THREE.VectorKeyframeTrack('HandLeft.position', nodTimes, nodHandLeftPos)
const listeningClip = new THREE.AnimationClip('Listening', 2.0, [nodTrack1, nodTrack2])

// 3. Thinking Animation: inquisitive tilt, halo rotation, gazing slightly upward
const thinkTimes = [0, 1.0, 2.0]
const thinkHeadRot = [
  0, 0, 0, 1,
  -0.08, 0.1, 0.05, 0.99, // looking up and tilted
  0, 0, 0, 1
]
const thinkHaloRot = [
  0, 0, 0, 1,
  0, 0.707, 0, 0.707,
  0, 1, 0, 0
]
const thinkTrack1 = new THREE.QuaternionKeyframeTrack('HeadGroup.quaternion', thinkTimes, thinkHeadRot)
const thinkTrack2 = new THREE.QuaternionKeyframeTrack('Halo.quaternion', thinkTimes, thinkHaloRot)
const thinkingClip = new THREE.AnimationClip('Thinking', 2.0, [thinkTrack1, thinkTrack2])

// 4. Talking Animation: mouth opening/closing scale, floating bounce, active hand gestures
const talkTimes = [0, 0.25, 0.5, 0.75, 1.0]
const talkMouthScale = [
  1, 1, 1,
  1.4, 2.8, 1.2,
  1, 0.8, 1,
  1.3, 2.4, 1.2,
  1, 1, 1
]
const talkHeadRot = [
  0, 0, 0, 1,
  0.04, 0.03, 0, 0.998,
  -0.03, -0.02, 0, 0.999,
  0.04, 0.02, 0, 0.998,
  0, 0, 0, 1
]
const talkHandRightPos = [
  0.75, 1.05, 0.1,
  0.70, 1.25, 0.3,
  0.78, 1.10, 0.15,
  0.70, 1.28, 0.32,
  0.75, 1.05, 0.1
]
const talkTrack1 = new THREE.VectorKeyframeTrack('Mouth.scale', talkTimes, talkMouthScale)
const talkTrack2 = new THREE.QuaternionKeyframeTrack('HeadGroup.quaternion', talkTimes, talkHeadRot)
const talkTrack3 = new THREE.VectorKeyframeTrack('HandRight.position', talkTimes, talkHandRightPos)
const talkingClip = new THREE.AnimationClip('Talking', 1.0, [talkTrack1, talkTrack2, talkTrack3])

// Export with GLTFExporter
const exporter = new GLTFExporter()
const animations = [idleClip, listeningClip, thinkingClip, talkingClip]

exporter.parse(
  scene,
  (gltf) => {
    const outputDir = path.resolve(process.cwd(), 'public/models')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    const outputPath = path.join(outputDir, 'aura.glb')
    fs.writeFileSync(outputPath, Buffer.from(gltf))
    console.log(`Successfully generated aura.glb at ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB) with animations: Idle, Listening, Thinking, Talking`)
  },
  (error) => {
    console.error('Error exporting GLTF:', error)
  },
  {
    binary: true,
    animations: animations
  }
)
