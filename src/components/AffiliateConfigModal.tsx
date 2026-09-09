import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Upload, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Video,
  Mic,
  X, 
  Sparkles, 
  Check, 
  Tag, 
  Flame, 
  TrendingUp, 
  Zap 
, Film } from 'lucide-react';
import type { ProductAsset, AffiliateConfig } from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';
import { UnifiedVideoModelSelector, SelectedModelData } from './UnifiedVideoModelSelector';

interface AffiliateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AffiliateConfig, assets: ProductAsset[], promptText: string) => void;
  initialAssets?: ProductAsset[];
  initialValues?: {
    productName?: string;
    category?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    platform?: 'TikTok Shop' | 'Shopee Video' | 'Instagram Reels' | 'YouTube Shorts';
    keyBenefits?: string;
    pricePromo?: string;
    callToAction?: string;
    hookStyle?: 'PAIN_POINT' | 'CURIOSITY' | 'UNBOXING' | 'BEFORE_AFTER' | 'AESTHETIC_REVEAL';
    productInfo?: string;
  };
}

export default function AffiliateConfigModal({
  isOpen,
  onClose,
  onSubmit,
  initialAssets = [],
  initialValues
}: AffiliateConfigModalProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Lainnya');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');
  const [platform, setPlatform] = useState<'TikTok Shop' | 'Shopee Video' | 'Instagram Reels' | 'YouTube Shorts'>('TikTok Shop');
  const [keyBenefits, setKeyBenefits] = useState('');
  const [pricePromo, setPricePromo] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [hookStyle, setHookStyle] = useState<'PAIN_POINT' | 'CURIOSITY' | 'UNBOXING' | 'BEFORE_AFTER' | 'AESTHETIC_REVEAL'>('PAIN_POINT');
  const [sceneCount, setSceneCount] = useState<number>(4);
  const [imageEngine, setImageEngine] = useState<string>('nano-asli');
  const [videoProvider, setVideoProvider] = useState<string>('higgsfield');
  const [videoModel, setVideoModel] = useState<string>('veo3_1_lite');
  const [videoModelDisplayName, setVideoModelDisplayName] = useState<string>('Google Veo 3.1 Lite');
  const [videoEngine, setVideoEngine] = useState<string>('veo3_1_lite');
  const [characterImage, setCharacterImage] = useState('');
  const [productInfo, setProductInfo] = useState('');
  
  const [assets, setAssets] = useState<ProductAsset[]>(initialAssets);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('');

  useEffect(() => {
    if (isOpen && initialValues) {
      if (initialValues.productName) setProductName(initialValues.productName);
      if (initialValues.category) setCategory(initialValues.category);
      if (initialValues.aspectRatio) setAspectRatio(initialValues.aspectRatio);
      if (initialValues.platform) setPlatform(initialValues.platform);
      if (initialValues.keyBenefits) setKeyBenefits(initialValues.keyBenefits);
      if (initialValues.pricePromo) setPricePromo(initialValues.pricePromo);
      if (initialValues.callToAction) setCallToAction(initialValues.callToAction);
      if (initialValues.hookStyle) setHookStyle(initialValues.hookStyle);
      if (initialValues.productInfo) setProductInfo(initialValues.productInfo);
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleCharacterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 300 || img.height < 300) {
          alert(`⚠️ Foto wajah '${file.name}' terlalu kecil (${img.width}x${img.height}px). Harap gunakan foto minimal resolusi 300x300px agar model AI konsisten.`);
          return;
        }
        setCharacterImage(src);
      };
      img.onerror = () => setCharacterImage(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const resizeImageFile = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width < 300 || img.height < 300) {
            alert(`⚠️ Foto '${file.name}' memiliki resolusi terlalu rendah (${img.width}x${img.height}px). Minimal 300x300px agar AI dapat mengenali detail fisik produk.`);
            return reject(new Error('Resolusi foto terlalu rendah (minimal 300x300px)'));
          }

          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      if (type === 'VIDEO') {
        if (file.size > 800 * 1024) {
           alert(`Video ${file.name} is too large. Max 800KB due to proxy limits.`);
           continue;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const newAsset: ProductAsset = {
            id: Math.random().toString(36).substring(2, 9),
            type,
            url: result,
            name: file.name,
            size: file.size
          };
          setAssets(prev => [...prev, newAsset]);
        };
        reader.readAsDataURL(file);
      } else {
        try {
          const url = await resizeImageFile(file, 800, 800, 0.7);
          const newAsset: ProductAsset = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'IMAGE',
            url,
            name: file.name,
            size: Math.round(url.length * 0.75)
          };
          setAssets(prev => [...prev, newAsset]);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

        

  const handleStartGeneration = () => {
    const productImages = assets.filter(a => a.type === 'IMAGE').map(a => a.url);
    if (!characterImage || productImages.length === 0) {
      alert('⚠️ Wajib mengunggah minimal 1 Foto Produk DAN 1 Foto Model/Wajah Kreator sebelum memulai produksi!');
      return;
    }

    const config: AffiliateConfig = {
      productName,
      category,
      platform,
      aspectRatio,
      keyBenefits,
      pricePromo,
      callToAction,
      hookStyle,
      characterImage: characterImage || undefined,
      productInfo: productInfo || keyBenefits,
      productImages: productImages,
      referenceVideoUrl: referenceVideoUrl || assets.find(a => a.type === 'VIDEO')?.url,
      sceneCount: sceneCount,
      imageEngine: imageEngine,
      videoEngine: videoModel,
      videoProvider: videoProvider,
      videoModel: videoModel,
      videoModelDisplayName: videoModelDisplayName
    };

    const promptText = `Buatkan video affiliate ${platform} untuk produk ${productName}. Keunggulan: ${keyBenefits}. Promo: ${pricePromo}. Call To Action: ${callToAction}. Hook style: ${hookStyle}.`;

    onSubmit(config, assets, promptText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#09090b] border border-[#27272a] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1f1f23] flex items-center justify-between bg-[#0e0e12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Studio Video Affiliate Produk</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono">
                  E-COMMERCE READY
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-light">
                Unggah foto produk & video referensi untuk generate video promosi berkonversi tinggi
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] text-xs">
          
          {/* 1. Upload Product Photos, Character & Reference Video */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 mb-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-purple-400" />
                    <span>Karakter / Kreator Image <span className="text-red-400">*</span></span>
                  </label>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    characterImage 
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
                      : 'bg-red-950/60 text-red-400 border-red-500/30'
                  }`}>
                    {characterImage ? '✓ Wajah Terpasang' : '✗ Wajib Upload Wajah'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {characterImage && (
                    <div className="relative w-20 h-20 rounded-lg border border-[#27272a] bg-[#121216] overflow-hidden group shrink-0">
                      <img 
                        src={characterImage} 
                        alt="Karakter" 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover" 
                      />
                      <button
                        onClick={() => setCharacterImage('')}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                  <label className="flex-1 h-20 rounded-lg border-2 border-dashed border-[#2d2d35] hover:border-purple-500/60 bg-[#0f0f13] hover:bg-[#15151c] flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-purple-300 cursor-pointer transition-all">
                    <Upload size={14} />
                    <span className="text-[10px] font-medium text-center">{characterImage ? 'Ganti Karakter' : '+ Foto Karakter (Wajib)'}</span>
                    <input type="file" accept="image/*" onChange={handleCharacterUpload} className="hidden" />
                  </label>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="font-bold text-gray-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <ImageIcon size={13} className="text-indigo-400" />
                <span>Foto Produk ({assets.filter(a => a.type === 'IMAGE').length} Terpilih) <span className="text-red-400">*</span></span>
              </label>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                assets.filter(a => a.type === 'IMAGE').length > 0
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-950/60 text-red-400 border-red-500/30'
              }`}>
                {assets.filter(a => a.type === 'IMAGE').length > 0 ? `✓ ${assets.filter(a => a.type === 'IMAGE').length} Foto Siap` : '✗ Wajib Upload Min 1 Foto Produk'}
              </span>
            </div>

            {/* Asset Thumbnails */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {assets.map((asset) => (
                <div key={asset.id} className="relative aspect-square rounded-lg border border-[#27272a] bg-[#121216] overflow-hidden group">
                  {asset.type === 'IMAGE' ? (
                    <img 
                      src={asset.url} 
                      alt={asset.name} 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-gray-400 p-2 text-center">
                      <VideoIcon size={20} className="mb-1 text-indigo-400" />
                      <span className="text-[9px] line-clamp-1">{asset.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                  >
                    <X size={10} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[8px] text-gray-300 truncate">
                    {asset.name}
                  </div>
                </div>
              ))}

              {/* Add Image Button */}
              <label className="aspect-square rounded-lg border-2 border-dashed border-[#2d2d35] hover:border-indigo-500/60 bg-[#0f0f13] hover:bg-[#15151c] flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-indigo-300 cursor-pointer transition-all">
                <Upload size={16} />
                <span className="text-[10px] font-medium">+ Foto Produk</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={(e) => handleFileUpload(e, 'IMAGE')} 
                  className="hidden" 
                />
              </label>

              {/* Add Video Button */}
              <label className="aspect-square rounded-lg border-2 border-dashed border-[#2d2d35] hover:border-purple-500/60 bg-[#0f0f13] hover:bg-[#15151c] flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-purple-300 cursor-pointer transition-all">
                <VideoIcon size={16} />
                <span className="text-[10px] font-medium">+ Video Ref (Opsional)</span>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={(e) => handleFileUpload(e, 'VIDEO')} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Reference Video URL input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Atau Link Video Referensi (Opsional)</label>
            <input
              type="text"
              value={referenceVideoUrl}
              onChange={(e) => setReferenceVideoUrl(e.target.value)}
              placeholder="https://tiktok.com/@... atau URL footage video"
              className="w-full bg-[#121216] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 2. Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Nama Produk</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Sepatu Sneakers Aeroflex Pro"
                className="w-full bg-[#121216] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

                        <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Rasio Video (Resolusi)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 px-2.5 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                      aspectRatio === ratio
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                        : 'bg-[#121216] border-[#27272a] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {ratio === '9:16' ? 'Vertikal (9:16)' : ratio === '1:1' ? 'Persegi (1:1)' : 'Lanskap (16:9)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Platform Target</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['TikTok Shop', 'Shopee Video', 'Instagram Reels', 'YouTube Shorts'] as const).map((plt) => (
                  <button
                    key={plt}
                    type="button"
                    onClick={() => setPlatform(plt)}
                    className={`py-2 px-2.5 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                      platform === plt 
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm' 
                        : 'bg-[#121216] border-[#27272a] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {plt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Hook Style Strategy */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
              <Flame size={13} className="text-amber-400" />
              <span>Gaya Hook (3 Detik Pertama Pembuka Video)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'PAIN_POINT', label: 'Problem Solver', desc: 'Keluhan sepatu pegal/licin' },
                { id: 'CURIOSITY', label: 'Spill & Curiosity', desc: 'Rekomendasi racun viral' },
                { id: 'UNBOXING', label: 'Unboxing Real', desc: 'Buka paket & review first impression' },
                { id: 'BEFORE_AFTER', label: 'Before - After', desc: 'Upgrade penampilan OOTD' },
                { id: 'AESTHETIC_REVEAL', label: 'Cinematic Reveal', desc: 'Macro close-up detail bahan' }
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setHookStyle(style.id as any)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    hookStyle === style.id 
                      ? 'bg-indigo-950/50 border-indigo-500 text-white' 
                      : 'bg-[#121216] border-[#27272a] text-gray-400 hover:border-[#383842]'
                  }`}
                >
                  <div className="font-bold text-[10px] text-gray-200">{style.label}</div>
                  <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* JUMLAH ADEGAN (SCENE) */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
              <Film size={13} className="text-amber-400" />
              <span>JUMLAH ADEGAN (SCENE)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { count: 3, label: '3 Scene (15s - Cepat)' },
                { count: 4, label: '4 Scene (25s - Standar) ⭐' },
                { count: 6, label: '6 Scene (45s - Lengkap)' },
                { count: 8, label: '8 Scene (60s - Max)' }
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setSceneCount(opt.count)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    sceneCount === opt.count 
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold' 
                      : 'bg-[#121216] border-[#27272a] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-indigo-400/80 mt-1">
              💡 Estimasi Biaya Render Video: {sceneCount} Scene x 8 Kredit = <strong>{sceneCount * 8} Kredit</strong>
            </div>
          </div>

          {/* 4. Selling Points & Benefits */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>Detail Spesifikasi & Keunggulan Produk</span>
            </label>
            <textarea
              rows={3}
              value={keyBenefits}
              onChange={(e) => setKeyBenefits(e.target.value)}
              placeholder="Contoh: Sangat ringan, sol empuk seperti jalan di awan, anti-slip aman saat hujan..."
              className="w-full bg-[#121216] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 5. Pricing & CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Harga Promo / Diskon</label>
              <input
                type="text"
                value={pricePromo}
                onChange={(e) => setPricePromo(e.target.value)}
                placeholder="Contoh: Diskon 50% + Gratis Ongkir"
                className="w-full bg-[#121216] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Call to Action (Ajakan Beli)</label>
              <input
                type="text"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                placeholder="Contoh: Klik keranjang kuning di kiri bawah!"
                className="w-full bg-[#121216] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {(() => {
          const productAssetsCount = assets.filter(a => a.type === 'IMAGE').length;
          const hasRequiredFace = Boolean(characterImage && characterImage.trim().length > 0);
          const isSubmitDisabled = productAssetsCount === 0 || !hasRequiredFace;

          return (
            <div className="p-4 border-t border-[#1f1f23] bg-[#0c0c10] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="text-[10px] text-gray-400">
                  {assets.length > 0 ? `✨ ${assets.length} aset terlampir (${productAssetsCount} foto produk)` : 'Belum ada aset terlampir'}
                </div>
                {isSubmitDisabled && (
                  <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>
                      {productAssetsCount === 0 && !hasRequiredFace 
                        ? 'Upload minimal 1 foto produk & 1 foto wajah' 
                        : productAssetsCount === 0 
                          ? 'Upload minimal 1 foto produk' 
                          : 'Upload foto wajah model/kreator'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-transparent hover:bg-white/5 text-gray-400 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitDisabled}
                  onClick={handleStartGeneration}
                  className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                    isSubmitDisabled
                      ? 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] cursor-pointer'
                  }`}
                  title={isSubmitDisabled ? 'Harap lengkapi foto produk dan wajah model sebelum lanjut' : 'Mulai produksi video affiliate'}
                >
                  <Sparkles size={14} />
                  <span>Mulai Produksi Affiliate</span>
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
