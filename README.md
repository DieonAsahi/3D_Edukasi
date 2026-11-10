# Ara — 3D Virtual Companion (CBT & Produktivitas)

Web application pendamping psikologis (berprinsip Cognitive Behavioral Therapy / CBT ringan) dan pelatih produktivitas harian berbasis AI dengan visualisasi karakter 3D real-time yang menargetkan **SDG 3: Good Health and Well-being**. Dibangun dengan 100% JavaScript/TypeScript dan \$0 Cost architecture.

---

## 🛠️ Tech Stack
- **Framework:** Nuxt 3 (Vue 3 Composition API, TypeScript, Nitro Server Engine)
- **Styling:** Tailwind CSS + Glassmorphism UI
- **3D Engine:** TresJS (`@tresjs/core`, `@tresjs/cientos`, Three.js) dengan model `.glb` karakter 3D low-poly (< 5MB) beranimasi: `Idle`, `Listening`, `Thinking`, dan `Talking`.
- **Database & Auth:** Supabase (`@nuxtjs/supabase`) dengan Google OAuth & Anonymous Guest Mode fallback.
- **Voice STT:** Browser Web Speech API (`SpeechRecognition`) dengan mekanisme **Push-to-Talk** (tahan spasi / tombol) dan toleransi jeda pernapasan.
- **Voice TTS:** Browser Web Speech API (`SpeechSynthesis`) yang tersinkronisasi otomatis dengan animasi karakter 3D saat berbicara.
- **AI Brain:** Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`) via Nuxt Server Route (`/server/api/chat.post.ts`) dengan output JSON terstruktur.

---

## 📁 Struktur Proyek
```text
├── assets/
│   └── css/main.css                 # Utilitas Tailwind & glassmorphism
├── components/
│   ├── AuraModel.vue                # Loader model .glb & animasi useAnimations
│   ├── AuraScene.vue                # Canvas TresJS, pencahayaan, bintang, & state badge
│   ├── AuthGateOverlay.vue          # Modal awal Google OAuth vs Guest Mode
│   ├── BoxBreathingModal.vue        # Visualizer interaktif pernapasan kotak 4-4-4-4
│   ├── ChatPanel.vue                # Panel chat, Push-to-Talk, STT/TTS & intervensi
│   ├── HeaderBar.vue                # Navigasi, status Aura, & shortcut CBT/Pomodoro
│   ├── MoodLoggerModal.vue          # Pencatat mood (1-5) & tingkat stres
│   └── ProductivityModal.vue        # Timer Pomodoro & manajemen tugas fokus
├── composables/
│   ├── useAuraAuth.ts               # Autentikasi Google, Supabase Anon, & Local Guest
│   ├── useCharacterState.ts         # Global state 3D ('idle'|'listening'|'thinking'|'talking')
│   └── useVoiceInteraction.ts       # Push-to-Talk STT & Web Speech TTS
├── public/
│   └── models/aura.glb              # Asset 3D low-poly (<200KB) dengan 4 animasi
├── server/
│   └── api/chat.post.ts             # Server route Gemini 2.5 Flash dengan JSON Structured Output
├── structure.sql                    # Skema PostgreSQL Supabase + RLS & Triggers
├── nuxt.config.ts                   # Konfigurasi modul Nuxt 3, TresJS, Supabase
└── tailwind.config.js               # Konfigurasi Tailwind & animasi aura
```

---

## 🚀 Cara Menjalankan

### 1. Salin Environment Variables
Buat file `.env` di direktori root berdasarkan `.env.example`:
```bash
cp .env.example .env
```
Isi variabel berikut:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-google-gemini-api-key
```
*(Catatan: Aplikasi memiliki simulator CBT cerdas lokal jika API key belum diisi, sehingga dapat langsung diuji seketika).*

### 2. Jalankan Database Schema (Supabase)
Jalankan file `structure.sql` pada menu **SQL Editor** di dashboard Supabase Anda untuk membuat:
1. `profiles` (+ Row Level Security & trigger user baru)
2. `mood_logs` (+ RLS)
3. `chat_messages` (+ RLS)
4. `productivity_tasks` (+ RLS)

### 3. Jalankan Development Server
```bash
pnpm run dev
```
Buka browser di `http://localhost:3000`.

### 4. Build untuk Production
```bash
pnpm run build
node .output/server/index.mjs
```

