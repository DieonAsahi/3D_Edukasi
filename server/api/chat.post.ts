import { GoogleGenerativeAI } from '@google/generative-ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  message: string
  history?: ChatMessage[]
  userName?: string
}

export interface AuraResponse {
  reply: string
  emotion_detected: 'tired' | 'anxious' | 'sad' | 'neutral' | 'motivated'
  stress_level: 'low' | 'medium' | 'high'
  suggested_intervention: 'none' | 'box_breathing' | 'time_blocking'
  recommended_task: {
    title: string | null
    duration_minutes: number
  } | null
  is_crisis?: boolean
  crisis_resources?: {
    hotline_name: string
    hotline_number: string
    whatsapp: string
    alternative: string
  }
}

// Safety Guardrail: Crisis / Self-Harm detection keywords (SDG 3 Health & Well-being)
const CRISIS_KEYWORDS = [
  'bunuh diri',
  'suicide',
  'akhiri hidup',
  'mengakhiri hidup',
  'menyakiti diri',
  'self harm',
  'self-harm',
  'sayat tangan',
  'minum racun',
  'lompat dari',
  'gantung diri',
  'mati saja',
  'ingin mati',
  'mau mati',
  'tidak mau hidup',
  'gak mau hidup',
  'gak tahan hidup',
  'lelah hidup',
  'capek hidup',
  'end my life',
  'cut myself',
  'kill myself',
  'want to die'
]

function checkCrisisIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw))
}

const SYSTEM_INSTRUCTION = `
Kamu adalah "Ara", sebuah 3D Virtual Companion yang bertindak sebagai pendengar empatik berprinsip Cognitive Behavioral Therapy (CBT) ringan dan pelatih produktivitas ramah.
Tujuan utamamu adalah mendukung SDG 3 (Good Health and Well-being) dengan cara:
1. ATURAN KESELAMATAN KRITIS (SAFETY GUARDRAIL):
   - Jika pengguna menunjukkan indikasi berniat menyakiti diri sendiri, bunuh diri, atau keputusasaan ekstrem:
     * Wajib validasi rasa sakit mereka dengan penuh belas kasih.
     * Tegaskan bahwa keselamatan mereka sangat penting dan mereka tidak sendirian.
     * Setel "is_crisis": true.
     * Arahkan secara lembut untuk segera menghubungi bantuan profesional/hotline krisis kesehatan jiwa (Kemenkes 119 ext 8).
2. Mendengarkan curahan hati pengguna secara aktif, tulus, tanpa menghakimi (non-judgmental validation).
3. Membantu pengguna mengenali distorsi kognitif ringan (seperti catastrophizing, all-or-nothing thinking, atau overthinking) dengan pertanyaan reflektif yang lembut (reframing).
4. Jika pengguna merasa cemas, panik, sesak, atau overthinking (stress level medium-high):
   - Validasi emosi mereka terlebih dahulu.
   - Sarankan intervensi relaksasi "box_breathing" (teknik pernapasan 4-7-8 atau 4-4-4-4).
5. Jika pengguna merasa kewalahan dengan tugas, menunda-nunda pekerjaan (prokrastinasi), atau butuh fokus:
   - Pecah beban kerja menjadi langkah kecil yang realistis.
   - Sarankan intervensi "time_blocking" (teknik Pomodoro atau blok waktu fokus 15-25 menit).
   - Berikan rekomendasi tugas konkret di "recommended_task".
6. Jika pengguna hanya ingin ngobrol santai atau berbagi kabar bahagia:
   - Berikan respon suportif dan apresiatif ("suggested_intervention": "none").
7. Gaya bahasa: Hangat, bersahabat, menggunakan Bahasa Indonesia yang santai tapi sopan, empatik, singkat-padat (cocok untuk dibacakan oleh Text-to-Speech secara natural). Hindari jawaban bertele-tele atau paragraf terlalu panjang.

WAJIB MENGEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERIKUT:
{
  "reply": "Teks balasan empatik untuk dibacakan TTS dan ditampilkan di chat...",
  "emotion_detected": "tired | anxious | sad | neutral | motivated",
  "stress_level": "low | medium | high",
  "suggested_intervention": "none | box_breathing | time_blocking",
  "recommended_task": {
    "title": "Nama tugas spesifik jika time_blocking disarankan, atau null jika tidak ada",
    "duration_minutes": 25
  },
  "is_crisis": false
}
`

// Offline/Fallback simulator if GEMINI_API_KEY is not configured
function generateFallbackResponse(userMessage: string): AuraResponse {
  const isCrisis = checkCrisisIntent(userMessage)

  if (isCrisis) {
    return {
      reply: 'Aku mendengar betapa berat dan menyakitkannya beban yang sedang kamu tanggung saat ini, dan aku sangat peduli dengan keselamatanmu. Kamu berharga dan tidak harus memikul ini sendirian. Tolong segera hubungi tenaga profesional atau layanan darurat kesehatan jiwa di bawah ini.',
      emotion_detected: 'sad',
      stress_level: 'high',
      suggested_intervention: 'none',
      recommended_task: null,
      is_crisis: true,
      crisis_resources: {
        hotline_name: 'Layanan Darurat Kesehatan Jiwa Kemenkes RI',
        hotline_number: '119 ext 8',
        whatsapp: '+62811119119',
        alternative: 'LISA Helpline (+62 811-3855-472) / Yayasan Pulih (+62 811-8436-633)'
      }
    }
  }

  const lower = userMessage.toLowerCase()

  if (lower.includes('cemas') || lower.includes('panik') || lower.includes('takut') || lower.includes('stres') || lower.includes('deg-degan') || lower.includes('tegang')) {
    return {
      reply: 'Aku bisa merasakan ketegangan yang kamu rasakan saat ini. Tarik napas perlahan, kamu aman bersamaku. Maukah kamu mencoba latihan pernapasan 4-7-8 sebentar bersamaku untuk menenangkan sistem sarafmu?',
      emotion_detected: 'anxious',
      stress_level: 'high',
      suggested_intervention: 'box_breathing',
      recommended_task: null,
      is_crisis: false
    }
  }

  if (lower.includes('capek') || lower.includes('lelah') || lower.includes('lemas') || lower.includes('burnout') || lower.includes('letih')) {
    return {
      reply: 'Tubuh dan pikiranmu sedang memberi sinyal bahwa kamu butuh jeda. Beri dirimu izin untuk istirahat sejenak. Kamu sudah berjuang keras hari ini.',
      emotion_detected: 'tired',
      stress_level: 'medium',
      suggested_intervention: 'box_breathing',
      recommended_task: null,
      is_crisis: false
    }
  }

  if (lower.includes('tugas') || lower.includes('skripsi') || lower.includes('kerja') || lower.includes('fokus') || lower.includes('deadline') || lower.includes('nunda') || lower.includes('prokrastinasi')) {
    return {
      reply: 'Wajar merasa kewalahan kalau melihat tumpukan tugas sekaligus. Bagaimana kalau kita coba satu langkah kecil dulu? Fokus 25 menit saja untuk memulai langkah pertama, setelah itu kita evaluasi.',
      emotion_detected: 'anxious',
      stress_level: 'medium',
      suggested_intervention: 'time_blocking',
      recommended_task: {
        title: 'Fokus Langkah Pertama (Pomodoro 25 Menit)',
        duration_minutes: 25
      },
      is_crisis: false
    }
  }

  if (lower.includes('sedih') || lower.includes('kecewa') || lower.includes('galau') || lower.includes('nangis')) {
    return {
      reply: 'Aku mendengarkanmu. Emosi sedih ini valid dan wajar hadir. Ceritakan apa saja yang mengganjal di hatimu, aku ada di sini untuk menemanimu tanpa menghakimi.',
      emotion_detected: 'sad',
      stress_level: 'medium',
      suggested_intervention: 'none',
      recommended_task: null,
      is_crisis: false
    }
  }

  if (lower.includes('semangat') || lower.includes('senang') || lower.includes('bisa') || lower.includes('bagus') || lower.includes('selesai')) {
    return {
      reply: 'Luar biasa! Energi positifmu terasa sekali. Mari kita jaga momentum baik ini untuk hal-hal bermakna hari ini.',
      emotion_detected: 'motivated',
      stress_level: 'low',
      suggested_intervention: 'none',
      recommended_task: null,
      is_crisis: false
    }
  }

  return {
    reply: 'Halo, aku Ara. Terima kasih sudah berbagi. Ceritakan lebih banyak tentang apa yang sedang kamu rasakan atau pikirkan saat ini.',
    emotion_detected: 'neutral',
    stress_level: 'low',
    suggested_intervention: 'none',
    recommended_task: null,
    is_crisis: false
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim()

  const body = await readBody<ChatRequestBody>(event)
  const message = body?.message?.trim()

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Pesan pengguna tidak boleh kosong.'
    })
  }

  // Safety Guardrail Pre-Check (Immediate Emergency Detection)
  const isDirectCrisis = checkCrisisIntent(message)
  if (isDirectCrisis) {
    return {
      reply: 'Aku mendengar betapa berat dan menyakitkannya beban yang sedang kamu tanggung saat ini, dan aku sangat peduli dengan keselamatanmu. Kamu berharga dan tidak harus memikul ini sendirian. Tolong segera hubungi tenaga profesional atau layanan darurat kesehatan jiwa di bawah ini.',
      emotion_detected: 'sad' as const,
      stress_level: 'high' as const,
      suggested_intervention: 'none' as const,
      recommended_task: null,
      is_crisis: true,
      crisis_resources: {
        hotline_name: 'Layanan Darurat Kesehatan Jiwa Kemenkes RI',
        hotline_number: '119 ext 8',
        whatsapp: '+62811119119',
        alternative: 'LISA Helpline (+62 811-3855-472) / Yayasan Pulih (+62 811-8436-633)'
      }
    }
  }

  // If Gemini API Key is missing, provide intelligent resilient CBT fallback
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return generateFallbackResponse(message)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    })

    let conversationPrompt = ''
    if (body.history && Array.isArray(body.history) && body.history.length > 0) {
      conversationPrompt += 'RIWAYAT PERCAKAPAN SEBELUMNYA:\n'
      for (const h of body.history.slice(-6)) {
        conversationPrompt += `${h.role === 'user' ? 'User' : 'Ara'}: ${h.content}\n`
      }
      conversationPrompt += '\n'
    }
    conversationPrompt += `PESAN USER SAAT INI: "${message}"\n`
    conversationPrompt += 'Kembalikan respon JSON sesuai format skema wajib.'

    const result = await model.generateContent(conversationPrompt)
    const rawText = result.response.text()

    try {
      const parsed: AuraResponse = JSON.parse(rawText)
      const crisisFlag = parsed.is_crisis || isDirectCrisis
      return {
        reply: parsed.reply || 'Aku mendengarkanmu.',
        emotion_detected: parsed.emotion_detected || 'neutral',
        stress_level: parsed.stress_level || 'low',
        suggested_intervention: parsed.suggested_intervention || 'none',
        recommended_task: parsed.recommended_task || null,
        is_crisis: crisisFlag,
        crisis_resources: crisisFlag ? {
          hotline_name: 'Layanan Darurat Kesehatan Jiwa Kemenkes RI',
          hotline_number: '119 ext 8',
          whatsapp: '+62811119119',
          alternative: 'LISA Helpline (+62 811-3855-472) / Yayasan Pulih (+62 811-8436-633)'
        } : undefined
      }
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0])
        return {
          ...extracted,
          is_crisis: extracted.is_crisis || isDirectCrisis
        } as AuraResponse
      }
      return {
        reply: rawText.replace(/```json|```/g, '').trim(),
        emotion_detected: 'neutral',
        stress_level: 'low',
        suggested_intervention: 'none',
        recommended_task: null,
        is_crisis: isDirectCrisis
      }
    }
  } catch (err: any) {
    console.error('Gemini API Error, falling back to local CBT intelligence:', err?.message || err)
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const fallbackModel = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      })
      const result = await fallbackModel.generateContent(`User: "${message}". Format JSON wajib.`)
      const rawText = result.response.text()
      const parsed = JSON.parse(rawText)
      return {
        ...parsed,
        is_crisis: parsed.is_crisis || isDirectCrisis
      }
    } catch (fallbackErr: any) {
      console.warn('Fallback Gemini model also failed, returning simulated CBT response:', fallbackErr?.message)
      return generateFallbackResponse(message)
    }
  }
})
