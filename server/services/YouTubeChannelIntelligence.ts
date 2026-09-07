import { 
  YouTubeChannelIntelligenceReport, 
  YouTubeChannelMetrics, 
  YouTubeAnalytics28d, 
  YPPMonetizationRoadmap, 
  AudienceRetentionDiagnosis 
} from '../../src/shared/types';

export interface RawYouTubeInput {
  channelData?: {
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      publishedAt?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    statistics?: {
      viewCount?: string | number;
      subscriberCount?: string | number;
      hiddenSubscriberCount?: boolean;
      videoCount?: string | number;
    };
  } | null;
  analyticsData?: {
    views?: number;
    estimatedMinutesWatched?: number;
    averageViewDuration?: number;
    subscribersGained?: number;
  } | null;
  nicheHint?: string;
}

export class YouTubeChannelIntelligence {
  /**
   * Analyzes genuine YouTube Channel and YouTube Analytics API data without synthetic distortion.
   * If unauthenticated or data is missing, accurately marks status as unauthenticated/empty.
   */
  static analyze(input: RawYouTubeInput): YouTubeChannelIntelligenceReport {
    const hasChannel = Boolean(input?.channelData && input.channelData.id);
    const hasAnalytics = Boolean(input?.analyticsData);

    const channelTitle = input?.channelData?.snippet?.title || '';
    const channelId = input?.channelData?.id || '';
    const thumbnailUrl = input?.channelData?.snippet?.thumbnails?.medium?.url || 
                         input?.channelData?.snippet?.thumbnails?.default?.url || '';

    // Extract exact numbers directly from official API response
    const subscriberCount = Number(input?.channelData?.statistics?.subscriberCount) || 0;
    const videoCount = Number(input?.channelData?.statistics?.videoCount) || 0;
    const totalLifetimeViews = Number(input?.channelData?.statistics?.viewCount) || 0;

    const views28d = Number(input?.analyticsData?.views) || 0;
    const estimatedMinutesWatched = Number(input?.analyticsData?.estimatedMinutesWatched) || 0;
    const watchHours = Math.round((estimatedMinutesWatched / 60) * 10) / 10;
    const averageViewDuration = Number(input?.analyticsData?.averageViewDuration) || 0;
    const subscribersGained = Number(input?.analyticsData?.subscribersGained) || 0;

    // YPP Roadmap Calculation (1.000 Subs + 4.000 Jam Tayang ATAU 10M Shorts Views)
    const subProgress = Math.min(100, Math.round((subscriberCount / 1000) * 100));
    const watchHoursProgress = Math.min(100, Math.round((watchHours / 4000) * 100));
    const shortsViewsProgress = Math.min(100, Math.round((views28d / 10000000) * 100));

    const isEligible = subscriberCount >= 1000 && (watchHours >= 4000 || views28d >= 10000000);

    let recommendedTrack: 'SHORTS_VELOCITY' | 'LONG_FORM_WATCH_TIME' | 'HYBRID_GROWTH' = 'HYBRID_GROWTH';
    let trackReasoning = '';

    if (!hasChannel && !hasAnalytics) {
      recommendedTrack = 'HYBRID_GROWTH';
      trackReasoning = 'Hubungkan akun YouTube resmi untuk mengaktifkan audit jalur monetisasi otomatis.';
    } else if (watchHoursProgress > shortsViewsProgress * 1.3 && averageViewDuration > 150) {
      recommendedTrack = 'LONG_FORM_WATCH_TIME';
      trackReasoning = `Retensi durasi tonton (${Math.round(averageViewDuration)} detik) mengindikasikan audiens menyukai penjelasan mendalam. Prioritaskan video panjang 16:9 untuk memenuhi 4.000 jam tayang.`;
    } else if (shortsViewsProgress > watchHoursProgress * 1.3 || averageViewDuration < 50) {
      recommendedTrack = 'SHORTS_VELOCITY';
      trackReasoning = `Channel memiliki momentum pada format video pendek. Optimalkan YouTube Shorts (9:16) berdurasi 40-55 detik untuk percepatan subscriber dan akumulasi view.`;
    } else {
      recommendedTrack = 'HYBRID_GROWTH';
      trackReasoning = 'Kombinasi ideal: 70% YouTube Shorts (9:16) untuk pertumbuhan subscriber cepat + 30% Video Edukasi/Animasi Panjang (16:9) untuk mengumpulkan jam tayang.';
    }

    const yppRoadmap: YPPMonetizationRoadmap = {
      subscribersCurrent: subscriberCount,
      subscribersTarget: 1000,
      subscribersProgress: subProgress,
      subscribersRemaining: Math.max(0, 1000 - subscriberCount),
      subscribersStatus: subscriberCount >= 1000 ? 'ACHIEVED' : 'IN_PROGRESS',

      watchHoursCurrent: watchHours,
      watchHoursTarget: 4000,
      watchHoursProgress: watchHoursProgress,
      watchHoursRemaining: Math.max(0, Math.round((4000 - watchHours) * 10) / 10),
      watchHoursStatus: watchHours >= 4000 ? 'ACHIEVED' : 'IN_PROGRESS',

      shortsViewsCurrent: views28d,
      shortsViewsTarget: 10000000,
      shortsViewsProgress: shortsViewsProgress,
      shortsViewsRemaining: Math.max(0, 10000000 - views28d),
      shortsViewsStatus: views28d >= 10000000 ? 'ACHIEVED' : 'IN_PROGRESS',

      isEligibleYPP: isEligible,
      recommendedTrack,
      recommendedTrackReasoning: trackReasoning
    };

    // Audience Retention Diagnosis
    let retentionRating: AudienceRetentionDiagnosis['retentionRating'] = 'NO_DATA';
    let diagnosisSummary = '';
    const prescribedTactics: string[] = [];

    if (!hasAnalytics || averageViewDuration === 0) {
      retentionRating = 'NO_DATA';
      diagnosisSummary = 'Data retensi spesifik dari YouTube Analytics API belum tersedia atau belum ada aktivitas 28 hari.';
      prescribedTactics.push('Pasang hook 3 detik awal yang tajam tanpa opening logo.');
      prescribedTactics.push('Gunakan transisi dinamis setiap 4-6 detik untuk mengunci perhatian.');
    } else if (averageViewDuration < 25) {
      retentionRating = 'NEEDS_IMPROVEMENT';
      diagnosisSummary = `Rata-rata durasi tonton ${Math.round(averageViewDuration)} detik menunjukkan banyak penonton melakukan swipe-away di 5 detik pertama.`;
      prescribedTactics.push('Potong intro! Langsung masuk ke pertanyaan hook paradoks atau aksi utama di detik 0.5.');
      prescribedTactics.push('Percepat pacing dialog voiceover ke kecepatan 1.05x - 1.1x.');
      prescribedTactics.push('Tambahkan teks subtitle dinamis di tengah layar untuk menarik fokus visual.');
    } else if (averageViewDuration < 60) {
      retentionRating = 'MODERATE';
      diagnosisSummary = `Rata-rata durasi tonton ${Math.round(averageViewDuration)} detik sudah solid untuk Shorts, namun butuh penutup loop tanpa jeda.`;
      prescribedTactics.push('Terapkan formula Seamless Loop: sambungkan kalimat akhir video ke hook kalimat pertama.');
      prescribedTactics.push('Sisipkan grafis pendukung (infografis gerak/ilustrasi anime) saat narator menjelaskan poin kunci.');
    } else if (averageViewDuration < 180) {
      retentionRating = 'STRONG';
      diagnosisSummary = `Rata-rata durasi tonton ${Math.floor(averageViewDuration / 60)}m ${Math.round(averageViewDuration % 60)}s menunjukkan retensi audiens tinggi dan loyalitas materi yang baik.`;
      prescribedTactics.push('Gunakan struktur 3 Bab dengan mini-cliffhanger di akhir Bab 1 dan Bab 2.');
      prescribedTactics.push('Tambahkan rekomendasi video lanjutan di End Screen pada 15 detik terakhir.');
    } else {
      retentionRating = 'EXCEPTIONAL';
      diagnosisSummary = `Rata-rata durasi tonton di atas 3 menit (${Math.floor(averageViewDuration / 60)}m ${Math.round(averageViewDuration % 60)}s) membuktikan konten memiliki nilai retensi premium.`;
      prescribedTactics.push('Pertahankan format eksplorasi mendalam (deep dive explainer).');
      prescribedTactics.push('Integrasikan call-to-action komunitas dan tautan produk rekomendasi di pinned comment.');
    }

    // Niche Diagnosis
    const primaryNiche = input.nicheHint || 'Edukasi & Animasi Populer';
    let studioFocus: 'ANIMATION' | 'EDUCATIONAL' | 'AFFILIATE' | 'BALANCED' = 'BALANCED';
    if (recommendedTrack === 'SHORTS_VELOCITY') {
      studioFocus = 'ANIMATION';
    } else if (recommendedTrack === 'LONG_FORM_WATCH_TIME') {
      studioFocus = 'EDUCATIONAL';
    }

    return {
      timestamp: new Date().toISOString(),
      authenticated: hasChannel,
      channelMetrics: {
        channelId,
        channelTitle,
        subscriberCount,
        videoCount,
        viewCount: totalLifetimeViews,
        thumbnailUrl
      },
      analytics28d: {
        views: views28d,
        estimatedMinutesWatched,
        watchHours,
        averageViewDurationSeconds: averageViewDuration,
        subscribersGained
      },
      yppRoadmap,
      retentionDiagnosis: {
        averageViewDurationSeconds: averageViewDuration,
        retentionRating,
        diagnosisSummary,
        prescribedTactics
      },
      nicheDiagnosis: {
        primaryNiche,
        growthOpportunity: isEligible 
          ? 'Channel telah memenuhi syarat YPP! Fokus pada monetisasi affiliate dan peningkatan RPM dengan konten bernilai komersial tinggi.' 
          : `Fokus pada penutupan gap ${yppRoadmap.subscribersRemaining > 0 ? `${yppRoadmap.subscribersRemaining} subscriber` : ''} ${yppRoadmap.watchHoursRemaining > 0 ? `dan ${yppRoadmap.watchHoursRemaining} jam tayang` : ''}.`,
        recommendedStudioFocus: studioFocus
      }
    };
  }
}
