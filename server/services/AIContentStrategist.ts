import { 
  ContentIdea, 
  ProductionContext, 
  YouTubeChannelIntelligenceReport 
} from '../../src/shared/types';
import { getGenAI, getOpenAIClient } from '../llmService';

export interface StrategyRequestOptions {
  intelligence?: YouTubeChannelIntelligenceReport;
  channelTitle?: string;
  niche?: string;
  preferredStudio?: 'ANIMATION' | 'EDUCATIONAL' | 'AFFILIATE' | 'ALL';
  planLengthDays?: number;
}

export class AIContentStrategist {
  /**
   * Generates tactical, high-retention ContentIdea artifacts with complete ProductionContext.
   * Leverages Gemini or OpenAI via LLMService infrastructure, with fallback procedural strategy.
   */
  static async generatePlan(options: StrategyRequestOptions): Promise<ContentIdea[]> {
    const channelName = options.intelligence?.channelMetrics?.channelTitle || options.channelTitle || 'Kreator YouTube';
    const niche = options.niche || options.intelligence?.nicheDiagnosis?.primaryNiche || 'Edukasi & Animasi Populer';
    const recommendedTrack = options.intelligence?.yppRoadmap?.recommendedTrack || 'HYBRID_GROWTH';
    const days = options.planLengthDays || 7;

    try {
      const genAI = getGenAI();
      const openAI = getOpenAIClient();

      if (genAI) {
        const prompt = `Anda adalah AI Content Strategist & Growth Architect untuk channel YouTube "${channelName}" (Niche: ${niche}).
Target monetisasi: ${recommendedTrack}.
Rancang ${days} ide konten harian terstruktur dalam format JSON array yang mencakup ketiga studio produksi video AI:
1. Studio Animasi (Anime Shinkai / 3D Pixar / Manga)
2. Studio Edukasi (Motion Graphics 2D / Infografis / Sains STEM)
3. Studio Affiliate (TikTok Shop / Shopee / Produk Showcase)

Setiap item JSON WAJIB memiliki field:
{
  "id": "idea_1",
  "day": "Hari 1 (Senin)",
  "title": "Judul video yang memicu rasa ingin tahu",
  "hook3s": "Kalimat hook narasi 3 detik pertama untuk mencegah swipe-away penonton",
  "concept": "Ringkasan konsep dan alur materi video",
  "niche": "${niche}",
  "format": "SHORTS" atau "LONG_FORM",
  "aspectRatio": "9:16" atau "16:9",
  "targetDuration": "45 - 55 Detik",
  "retentionTip": "Saran retensi algoritma YouTube (pacing, visual loop, atau bab)",
  "recommendedStudio": "ANIMATION" atau "EDUCATIONAL" atau "AFFILIATE",
  "animationInitialValues": {
    "title": "string",
    "targetGenre": "ACTION" | "ADVENTURE" | "FANTASY" | "SCI_FI",
    "artStyle": "3D_PIXAR" | "ANIME_SHINKAI" | "ANIME_CYBERPUNK",
    "characterDescription": "string",
    "worldSetting": "string",
    "aspectRatio": "9:16" | "16:9"
  },
  "educationalInitialValues": {
    "subjectTitle": "string",
    "category": "string",
    "visualStyle": "MOTION_GRAPHICS_2D" | "ISOMETRIC_3D" | "WHITEBOARD_ANIMATION",
    "targetAudience": "GENERAL_ELI5" | "STUDENTS" | "PROFESSIONALS",
    "keyTakeaways": "string",
    "aspectRatio": "9:16" | "16:9"
  },
  "affiliateInitialValues": {
    "productName": "string",
    "productInfo": "string",
    "keyBenefits": "string",
    "callToAction": "string",
    "hookStyle": "PAIN_POINT" | "CURIOSITY" | "BEFORE_AFTER",
    "platform": "TikTok Shop" | "Shopee Video" | "YouTube Shorts",
    "aspectRatio": "9:16"
  }
}

Hasilkan HANYA JSON array valid tanpa markdown formatting!`;

        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const rawText = response.text || '';
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => this.mapRawIdeaToArtifact(item, idx, channelName, options.intelligence?.channelMetrics?.channelId));
        }
      } else if (openAI) {
        const prompt = `Rancang ${days} ide konten harian YouTube untuk channel "${channelName}" (Niche: ${niche}) dalam JSON format. Harus mencakup Studio ANIMATION, EDUCATIONAL, dan AFFILIATE dengan hook 3 detik.`;
        const res = await openAI.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });
        const content = res.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const list = Array.isArray(parsed) ? parsed : (parsed.ideas || parsed.schedule || Object.values(parsed)[0]);
          if (Array.isArray(list) && list.length > 0) {
            return list.map((item, idx) => this.mapRawIdeaToArtifact(item, idx, channelName, options.intelligence?.channelMetrics?.channelId));
          }
        }
      }
    } catch (err) {
      console.warn('[AIContentStrategist] LLM generation fell back to tactical strategy catalog:', (err as any)?.message);
    }

    // Procedural Fallback Strategy Catalog (High craftsmanship, strictly structured)
    return this.getProceduralStrategyCatalog(channelName, niche, options.intelligence?.channelMetrics?.channelId);
  }

  private static mapRawIdeaToArtifact(
    raw: any, 
    index: number, 
    channelTitle: string, 
    channelId?: string
  ): ContentIdea {
    const format = raw.format === 'LONG_FORM' ? 'LONG_FORM' : 'SHORTS';
    const aspectRatio = raw.aspectRatio || (format === 'SHORTS' ? '9:16' : '16:9');
    const recommendedStudio = raw.recommendedStudio === 'AFFILIATE' 
      ? 'AFFILIATE' 
      : raw.recommendedStudio === 'EDUCATIONAL' 
      ? 'EDUCATIONAL' 
      : 'ANIMATION';

    const productionContext: ProductionContext = {
      source: 'AI_STRATEGIST',
      channelId,
      channelTitle,
      strategicGoal: format === 'SHORTS' ? 'VIRAL_SHORTS' : 'MONETIZATION_WATCH_HOURS',
      animationInitialValues: raw.animationInitialValues ? {
        title: raw.animationInitialValues.title || raw.title,
        targetGenre: raw.animationInitialValues.targetGenre || 'ADVENTURE',
        artStyle: raw.animationInitialValues.artStyle || 'ANIME_SHINKAI',
        characterDescription: raw.animationInitialValues.characterDescription || 'Karakter utama visual ekspresif dengan pencahayaan sinematik',
        worldSetting: raw.animationInitialValues.worldSetting || 'Latar dunia dinamis dengan atmosfer visual memukau',
        aspectRatio,
        voiceTone: 'CHEERFUL'
      } : undefined,
      educationalInitialValues: raw.educationalInitialValues ? {
        subjectTitle: raw.educationalInitialValues.subjectTitle || raw.title,
        category: raw.educationalInitialValues.category || 'Sains & Teknologi (STEM)',
        visualStyle: raw.educationalInitialValues.visualStyle || 'MOTION_GRAPHICS_2D',
        targetAudience: raw.educationalInitialValues.targetAudience || 'GENERAL_ELI5',
        keyTakeaways: raw.educationalInitialValues.keyTakeaways || raw.concept,
        aspectRatio,
        narratorTone: 'FRIENDLY_EXPLAINER'
      } : undefined,
      affiliateInitialValues: raw.affiliateInitialValues ? {
        productName: raw.affiliateInitialValues.productName || 'Smart Wireless Gadget',
        productInfo: raw.affiliateInitialValues.productInfo || raw.concept,
        keyBenefits: raw.affiliateInitialValues.keyBenefits || 'Desain ergonomis, baterai tahan lama, konektivitas ultra cepat',
        callToAction: raw.affiliateInitialValues.callToAction || 'Klik tautan di deskripsi / komentar tersemat sebelum promo berakhir!',
        hookStyle: raw.affiliateInitialValues.hookStyle || 'PAIN_POINT',
        platform: raw.affiliateInitialValues.platform || 'YouTube Shorts',
        aspectRatio,
        category: 'Gadget & Teknologi'
      } : undefined
    };

    return {
      id: raw.id || `idea_${Date.now()}_${index}`,
      day: raw.day || `Hari ${index + 1}`,
      title: raw.title || 'Ide Konten Berkualitas',
      hook3s: raw.hook3s || 'Tahukah kalian rahasia di balik fenomena ini?',
      concept: raw.concept || 'Penjelasan visual mendalam yang menarik perhatian.',
      niche: raw.niche || 'Umum & Teknologi',
      format,
      aspectRatio,
      targetDuration: raw.targetDuration || (format === 'SHORTS' ? '45 - 55 Detik' : '6 - 8 Menit'),
      retentionTip: raw.retentionTip || 'Gunakan transisi cepat setiap 4 detik untuk menjaga retensi.',
      recommendedStudio,
      productionContext
    };
  }

  /**
   * Procedural catalog delivering 7 high-impact, actionable ideas across Animation, Educational, and Affiliate Studios.
   */
  static getProceduralStrategyCatalog(channelTitle: string, niche: string, channelId?: string): ContentIdea[] {
    return [
      {
        id: 'strat_1',
        day: 'Hari 1 (Senin)',
        format: 'SHORTS',
        aspectRatio: '9:16',
        recommendedStudio: 'ANIMATION',
        title: '3 Rahasia Tersembunyi di Balik Karakter Anime Favorit',
        hook3s: '"Kalian sadar gak, kenapa tokoh utama anime shonen selalu punya luka di wajah atau mata kirinya?"',
        concept: 'Animasi visual karakter bergaya Shinkai/Anime yang mengungkap makna simbolis di balik desain pahlawan fiksi.',
        niche: 'Animasi & Pop Culture',
        targetDuration: '45 - 55 Detik',
        retentionTip: 'Gunakan loop ending di detik 50 agar video otomatis terulang saat penonton masih mencerna poin ketiga.',
        productionContext: {
          source: 'AI_STRATEGIST',
          channelId,
          channelTitle,
          targetNiche: 'Animasi & Pop Culture',
          strategicGoal: 'VIRAL_SHORTS',
          animationInitialValues: {
            title: '3 Rahasia Tersembunyi di Balik Karakter Anime Favorit',
            targetGenre: 'ACTION',
            artStyle: 'ANIME_SHINKAI',
            characterDescription: 'Karakter pendekar anime rambut hitam dengan mata kiri berpendar biru misterius dan luka gores epik di pipi',
            worldSetting: 'Latar kuil Jepang di atas bukit berselimut kelopak bunga sakura dan awan senja magis',
            aspectRatio: '9:16',
            voiceTone: 'CHEERFUL'
          }
        }
      },
      {
        id: 'strat_2',
        day: 'Hari 2 (Selasa)',
        format: 'SHORTS',
        aspectRatio: '9:16',
        recommendedStudio: 'EDUCATIONAL',
        title: 'Apa yang Terjadi Jika Bumi Berhenti Berputar 1 Detik Saja?',
        hook3s: '"Jika Bumi mendadak berhenti berputar selama 1 detik saja, kecepatan angin 1.600 km/jam akan menyapu seluruh benua!"',
        concept: 'Infografis gerak 2D dan simulasi diagram fisika atmosfer yang dramatis dan mudah dipahami.',
        niche: 'Sains Populer & Edukasi',
        targetDuration: '50 - 58 Detik',
        retentionTip: 'Visual transisi cepat pada detik ke-3 dengan suara whoosh dan efek peta dunia berguncang.',
        productionContext: {
          source: 'AI_STRATEGIST',
          channelId,
          channelTitle,
          targetNiche: 'Sains Populer & Edukasi',
          strategicGoal: 'VIRAL_SHORTS',
          educationalInitialValues: {
            subjectTitle: 'Apa yang Terjadi Jika Bumi Berhenti Berputar 1 Detik Saja?',
            category: 'Sains & Teknologi (STEM)',
            visualStyle: 'MOTION_GRAPHICS_2D',
            targetAudience: 'GENERAL_ELI5',
            keyTakeaways: 'Hukum inersia atmosfer, dampak badai supersonik, dan cara rotasi bumi menjaga kehidupan.',
            aspectRatio: '9:16',
            narratorTone: 'ENERGETIC_TEACHER'
          }
        }
      },
      {
        id: 'strat_3',
        day: 'Hari 3 (Rabu)',
        format: 'SHORTS',
        aspectRatio: '9:16',
        recommendedStudio: 'AFFILIATE',
        title: 'Gadget Produktivitas Rp 100 Ribuan yang Mengubah Meja Kerja',
        hook3s: '"Meja kerja kalian masih berantakan kabel? Stop buang uang beli organizer mahal sebelum lihat alat satu ini!"',
        concept: 'Ulasan visual gadget minimalis dengan transisi Before-After meja kerja rapi, menampilkan fitur praktis dan harga terjangkau.',
        niche: 'Gadget & Produktivitas',
        targetDuration: '40 - 50 Detik',
        retentionTip: 'Tampilkan hasil Before di detik 0-2 dan After dramatis di detik 4 dengan audio beat sinkron.',
        productionContext: {
          source: 'AI_STRATEGIST',
          channelId,
          channelTitle,
          targetNiche: 'Gadget & Produktivitas',
          strategicGoal: 'AFFILIATE_CONVERSION',
          affiliateInitialValues: {
            productName: 'Desk Cable Organizer & Fast Charger Dock',
            productInfo: 'Alat pengatur kabel magnetik dan docking charger meja kerja minimalis',
            keyBenefits: 'Meja bebas kabel kusut, magnet super kuat, mendukung fast charging semua gadget',
            callToAction: 'Cek tautan keranjang kuning / deskripsi sebelum diskon kilat berakhir hari ini!',
            hookStyle: 'BEFORE_AFTER',
            platform: 'YouTube Shorts',
            aspectRatio: '9:16',
            category: 'Elektronik & Gadget'
          }
        }
      },
      {
        id: 'strat_4',
        day: 'Hari 4 (Kamis)',
        format: 'LONG_FORM',
        aspectRatio: '16:9',
        recommendedStudio: 'EDUCATIONAL',
        title: 'Panduan Lengkap: Bagaimana AI Mengubah Masa Depan Finansial & Karir',
        hook3s: '"Dalam 3 tahun ke depan, 60% pekerjaan administrasi akan digantikan sistem otonom. Ini cara agar Anda tetap unggul."',
        concept: 'Penjelasan mendalam 3 bab: Evolusi AI, Sektor pekerjaan terdampak, dan 5 keahlian non-AI yang bernilai tinggi.',
        niche: 'Teknologi, Finansial & Karir',
        targetDuration: '6 - 8 Menit',
        retentionTip: 'Bagi video menjadi 3 bab bertahap dengan visual diagram data infografis dinamis.',
        productionContext: {
          source: 'AI_STRATEGIST',
          channelId,
          channelTitle,
          targetNiche: 'Teknologi, Finansial & Karir',
          strategicGoal: 'MONETIZATION_WATCH_HOURS',
          educationalInitialValues: {
            subjectTitle: 'Panduan Lengkap: Bagaimana AI Mengubah Masa Depan Finansial & Karir',
            category: 'Bisnis, Finansial & Investasi',
            visualStyle: 'DOCUMENTARY_INFOGRAPHIC',
            targetAudience: 'PROFESSIONALS',
            keyTakeaways: 'Peta jalan adopsi AI global, identifikasi soft skill tahan otomasi, dan langkah investasi diri.',
            aspectRatio: '16:9',
            narratorTone: 'DOCUMENTARY_NARRATOR'
          }
        }
      },
      {
        id: 'strat_5',
        day: 'Hari 5 (Jumat)',
        format: 'SHORTS',
        aspectRatio: '9:16',
        recommendedStudio: 'ANIMATION',
        title: 'Kisah 30 Detik: Pertarungan Terakhir Robot Pelindung Hutan',
        hook3s: '"Ketika kota beton mencoba meratakan pohon terakhir di bumi, satu robot tua bangkit melawan."',
        concept: 'Animasi 3D Pixar / Unreal Engine epik dengan karakter robot pelindung dan visual pencahayaan atmosferik.',
        niche: 'Animasi & Cerita Sinematik',
        targetDuration: '40 - 50 Detik',
        retentionTip: 'Visual emosional dengan musik haru dan klimaks dramatis di detik 35.',
        productionContext: {
          source: 'AI_STRATEGIST',
          channelId,
          channelTitle,
          targetNiche: 'Animasi & Cerita Sinematik',
          strategicGoal: 'VIRAL_SHORTS',
          animationInitialValues: {
            title: 'Kisah 30 Detik: Pertarungan Terakhir Robot Pelindung Hutan',
            targetGenre: 'SCI_FI',
            artStyle: '3D_PIXAR',
            characterDescription: 'Robot penjaga tua berlumut hijau dengan mata sensor bulat kuning ramah dan tangan mekanik kokoh',
            worldSetting: 'Hutan lebat magis dengan pohon raksasa kuno di perbatasan kota megastruktur futuristik',
            aspectRatio: '9:16',
            voiceTone: 'DRAMATIC'
          }
        }
      },
      {
        id: 'strat_6',
        day: 'Hari 6 (Sabtu)',
        format: 'LONG_FORM',
        aspectRatio: '16:9',
        recommendedStudio: 'ANIMATION',
        title: 'Legenda Pendekar Bayangan: Episode 1 - Sumpah di Tebing Naga',
        hook3s: '"Di puncak Gunung Naga, sumpah yang diucapkan 100 tahun lalu kini menuntut balas darah."',
        concept: 'Cerita anime bersambung dengan koreografi pertarungan cepat, dialog tajam, dan worldbuilding fantasi.',
        niche: 'Serial Animasi Sinematik',
        targetDuration: '5 - 7 Menit',
        retentionTip: 'Berikan cliffhanger menggantung di menit terakhir untuk memicu penonton subscribe episode berikutnya.',
        productionContext: {
          source: 'AI_STRATEGIST',
          channelId,
          channelTitle,
          targetNiche: 'Serial Animasi Sinematik',
          strategicGoal: 'MONETIZATION_WATCH_HOURS',
          animationInitialValues: {
            title: 'Legenda Pendekar Bayangan: Episode 1 - Sumpah di Tebing Naga',
            targetGenre: 'ACTION',
            artStyle: 'ANIME_SHINKAI',
            characterDescription: 'Pendekar bayangan bertopeng separuh dengan jubah hitam berkibar dan pedang perak bercahaya',
            worldSetting: 'Tebing batu terjal berkabut tebal di bawah sinar bulan purnama merah',
            aspectRatio: '16:9',
            voiceTone: 'DEEP_CINEMATIC'
          }
        }
      },
      {
        id: 'strat_7',
        day: 'Hari 7 (Minggu)',
        format: 'SHORTS',
        aspectRatio: '9:16',
        recommendedStudio: 'AFFILIATE',
        title: 'Mic Wireless Rp 90 Ribuan Suara Sejernih Podcast Studio?',
        hook3s: '"Jangan bikin konten kalau audio kalian masih berisik desis angin! Dengerin perbedaan mic ini!"',
        concept: 'Review komparasi uji suara mic wireless jepit AI Noise Reduction vs mic HP langsung di tempat bising.',
        niche: 'Content Creation Gear & Tech',
        targetDuration: '40 - 50 Detik',
        retentionTip: 'Lakukan demo suara audio mentah di detik 0-5, lalu aktifkan noise cancel di detik 6 secara seketika.',
        productionContext: {
          source: 'AI_STRATEGIST',
          channelId,
          channelTitle,
          targetNiche: 'Content Creation Gear & Tech',
          strategicGoal: 'AFFILIATE_CONVERSION',
          affiliateInitialValues: {
            productName: 'Wireless Lavalier Microphone with AI Noise Cancelling',
            productInfo: 'Microphone klip nirkabel plug-and-play untuk smartphone dan kamera kreator',
            keyBenefits: 'Suara jernih bebas bising, jangkauan 20 meter, baterai tahan 8 jam nonstop',
            callToAction: 'Klik tautan produk di deskripsi sebelum kupon gratis ongkir habis!',
            hookStyle: 'PAIN_POINT',
            platform: 'YouTube Shorts',
            aspectRatio: '9:16',
            category: 'Elektronik & Gadget'
          }
        }
      }
    ];
  }
}
