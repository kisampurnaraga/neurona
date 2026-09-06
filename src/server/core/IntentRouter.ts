import { ProductionProject, VideoType } from "../../shared/types";

export interface IntentRouteResult {
  intent: string;
  response: string;
  action?: string;
  videoType?: VideoType;
  quickConfig?: any;
}

export class ConversationalIntentRouter {
  static async route(prompt: string, project?: ProductionProject | null, hasAssets: boolean = false): Promise<IntentRouteResult> {
    const p = prompt.toLowerCase().trim();
    
    // WAKE
    if (/^(neurona|hey neurona|neurona\?|halo neurona)[.!?]*$/.test(p)) {
      return { intent: 'WAKE', response: 'Ya, Bos. NEURONA siap bertugas. Mau produksi video apa hari ini?' };
    }
    
    // GREETING
    if (/^(hello|hi|halo|selamat pagi|selamat siang|selamat sore|selamat malam)( neurona)?[.!?]*$/.test(p)) {
      return { intent: 'GREETING', response: 'Hello Bos. Studio produksi siap. Anda bisa pilih membuat Video Animasi (3D/Anime), Video Pembelajaran Edukasi, atau Video Affiliate Produk.' };
    }

    // FALLBACK QUOTA APPROVAL
    if (/^(ya|iya|y|boleh|lanjutkan|setuju)[.!?]*$/.test(p) && project?.status === 'QUOTA_FALLBACK_PENDING') {
      return { intent: 'FALLBACK_APPROVE', response: 'Menggunakan naskah template untuk melanjutkan produksi. Mohon tunggu...', action: 'FALLBACK_APPROVE' };
    }
    if (/^(tidak|ga|enggak|batal|jangan)[.!?]*$/.test(p) && project?.status === 'QUOTA_FALLBACK_PENDING') {
      return { intent: 'FALLBACK_REJECT', response: 'Produksi dibatalkan. Menunggu kuota tersedia kembali.', action: 'FALLBACK_REJECT' };
    }

    // APPROVAL / CONTINUE
    if (/^(lanjut|lanjutkan|oke lanjut|gas|mulai render|eksekusi)[.!?]*$/.test(p)) {
      if (project?.status === 'AWAITING_APPROVAL') {
        return { intent: 'APPROVAL', response: 'Siap Bos! Node produksi diaktifkan, rendering visual adegan sedang dieksekusi oleh AI Video Director.', action: 'APPROVE' };
      } else if (project?.status === 'STORYBOARDING' || project?.status === 'BRIEFING') {
        return { intent: 'AMBIGUOUS', response: 'Sabar Bos, tim kreatif masih merumuskan storyboard. Tunggu sampai selesai ya.' };
      } else if (project?.status === 'PRODUCING' || project?.status === 'ASSEMBLING' || project?.status === 'PROCESSING') {
        return { intent: 'AMBIGUOUS', response: 'Produksi sedang berjalan Bos. Silakan pantau progress di layar.' };
      } else if (project?.status === 'COMPLETED') {
        return { intent: 'AMBIGUOUS', response: 'Video ini sudah selesai diproduksi Bos. Ingin membuat video baru?' };
      } else {
        return { intent: 'AMBIGUOUS', response: 'Siap, Bos. Mau melanjutkan proses produksi yang mana?' };
      }
    }

    // MODEL SWITCHING / OPENAI CHATGPT
    if (
      p.includes('open ai') || 
      p.includes('openai') || 
      p.includes('chat gpt') || 
      p.includes('chatgpt') || 
      p.includes('gpt 4') || 
      p.includes('gpt-4') || 
      p.includes('gpt4') ||
      p.includes('gpt 6') ||
      p.includes('gpt-6') ||
      p.includes('gpt6') ||
      p.includes('astra') ||
      p.includes('ganti model')
    ) {
      
      return { 
        intent: 'SWITCH_MODEL_OPENAI', 
        response: 'Untuk mengubah model AI ke OpenAI, silakan atur melalui Founder Control Center (FCC) di pojok kanan atas agar tersimpan aman di database.' 
      };
    }

    // FOUNDER CONTROL CENTER / HUD
    if (/^(buka founder( control center)?|akses founder|founder control center|control center founder|buka fcc)[.!?]*$/.test(p)) {
      return { intent: 'FOUNDER_ACCESS', response: 'Membuka Founder Control Center...', action: 'OPEN_FOUNDER' };
    }

    if (/^(buka hud|mode hud|avengers protocol|hud mode|tampilkan hud|radar node)[.!?]*$/.test(p)) {
      return { intent: 'HUD_ACCESS', response: 'Mengaktifkan mode Holographic HUD Node Command Center...', action: 'TOGGLE_HUD' };
    }

    // 1. ANIMATION VIDEO REQUEST
    if (
      p.includes('animasi') || 
      p.includes('anime') || 
      p.includes('3d pixar') || 
      p.includes('unreal engine') || 
      p.includes('kartun') || 
      p.includes('cartoon') || 
      p.includes('claymation') ||
      p.includes('ghibli') ||
      p.includes('shinkai')
    ) {
      let artStyle: any = '3D_PIXAR';
      if (p.includes('anime') || p.includes('ghibli') || p.includes('shinkai') || p.includes('jepang')) artStyle = 'ANIME_SHINKAI';
      else if (p.includes('unreal') || p.includes('hyper') || p.includes('realistis')) artStyle = '3D_UNREAL_HYPER';
      else if (p.includes('claymation') || p.includes('tanah liat')) artStyle = 'CLAYMATION';
      else if (p.includes('kartun') || p.includes('2d')) artStyle = '2D_CLASSIC_CARTOON';
      else if (p.includes('cyberpunk')) artStyle = 'ANIME_CYBERPUNK';

      let lang = 'id';
      if (p.includes('bahasa jepang') || p.includes('japanese') || p.includes('nihongo')) lang = 'ja';
      else if (p.includes('bahasa inggris') || p.includes('english')) lang = 'en';

      return {
        intent: 'ANIMATION_PRODUCTION_REQUEST',
        response: `Siap Bos! Mode Video Animasi diaktifkan dengan gaya ${artStyle.replace(/_/g, ' ')} dan bahasa ${lang.toUpperCase()}. Creative Strategist & Storyboard Director sedang merancang visual universe dan naskah adegan.`,
        action: 'START_PRODUCTION',
        videoType: 'ANIMATION',
        quickConfig: {
          title: prompt.replace(/buat|buatkan|bikin|video|animasi/gi, '').trim() || 'Petualangan Animasi Baru',
          artStyle,
          language: lang,
          targetGenre: 'ADVENTURE',
          voiceTone: 'CHEERFUL',
          aspectRatio: '16:9'
        }
      };
    }

    // 2. EDUCATIONAL / EXPLAINER VIDEO REQUEST
    if (
      p.includes('pembelajaran') || 
      p.includes('edukasi') || 
      p.includes('belajar') || 
      p.includes('explainer') || 
      p.includes('tutorial') || 
      p.includes('materi') || 
      p.includes('kuliah') || 
      p.includes('sekolah') || 
      p.includes('sains') || 
      p.includes('penjelasan')
    ) {
      let vStyle: any = 'MOTION_GRAPHICS_2D';
      if (p.includes('whiteboard') || p.includes('papan tulis')) vStyle = 'WHITEBOARD_ANIMATION';
      else if (p.includes('isometric') || p.includes('3d')) vStyle = 'ISOMETRIC_3D';
      else if (p.includes('blueprint') || p.includes('diagram')) vStyle = 'SCIENCE_BLUEPRINT';

      let lang = 'id';
      if (p.includes('bahasa inggris') || p.includes('english')) lang = 'en';
      else if (p.includes('bilingual')) lang = 'id-en-bilingual';

      return {
        intent: 'EDUCATIONAL_PRODUCTION_REQUEST',
        response: `Siap Bos! Mode Video Pembelajaran Edukatif diaktifkan (${vStyle.replace(/_/g, ' ')}). Creative Strategist merumuskan konsep pedagogis, analogi visual, serta pembagian bab materi.`,
        action: 'START_PRODUCTION',
        videoType: 'EDUCATIONAL',
        quickConfig: {
          subjectTitle: prompt.replace(/buat|buatkan|bikin|video|pembelajaran|edukasi|tentang/gi, '').trim() || 'Materi Pembelajaran',
          category: 'Sains & Teknologi',
          targetAudience: 'GENERAL_ELI5',
          visualStyle: vStyle,
          language: lang,
          keyTakeaways: 'Memahami konsep dasar secara intuitif dengan analogi visual',
          chapterCount: 3,
          narratorTone: 'FRIENDLY_EXPLAINER',
          aspectRatio: '16:9'
        }
      };
    }

    // 3. AFFILIATE VIDEO SPECIFIC
    if (p.includes('affiliate') || p.includes('afiliasi') || p.includes('keranjang kuning') || p.includes('shopee video') || p.includes('tiktok shop') || p.includes('produk sepatu') || (hasAssets && (p.includes('sepatu') || p.includes('jual') || p.includes('promosi') || p.includes('review')))) {
      return { 
        intent: 'AFFILIATE_PRODUCTION_REQUEST', 
        response: 'Siap Bos! Mode Video Affiliate diaktifkan. Creative Strategist akan merumuskan formula viral (Hook 3 detik pertama, showcase detail produk, solusi benefit, dan CTA Keranjang Kuning).', 
        action: 'START_PRODUCTION',
        videoType: 'AFFILIATE'
      };
    }

    // 4. GENERAL MISSION REQUEST
    if (p.includes('buat video') || p.includes('buatkan video') || p.includes('bikin video') || p.includes('generate video') || p.includes('mulai produksi') || hasAssets) {
      if (p === 'saya ingin membuat video') {
        return { intent: 'AMBIGUOUS', response: 'Siap, Bos. Mau buat Video Animasi (3D/Anime), Video Pembelajaran Edukasi, atau Video Affiliate Produk?' };
      }
      return { 
        intent: 'MISSION_REQUEST', 
        response: 'Siap Bos. Creative Strategist sedang merancang konsep video terbaik.', 
        action: 'START_PRODUCTION',
        videoType: 'BRAND_COMMERCIAL'
      };
    }
    
    // DEFAULT UNKNOWN
    return { intent: 'UNKNOWN', response: 'Maaf Bos, bisa diperjelas instruksinya? Anda dapat meminta "buatkan video animasi 3D tentang robot", "video edukasi fisika kuantum", atau melampirkan foto produk untuk video affiliate.' };
  }
}
