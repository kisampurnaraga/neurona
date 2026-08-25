import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Scene {
  id: number;
  title: string;
  duration: number;
  text: string;
  status: 'rendered' | 'processing' | 'draft';
}

const SortableScene: React.FC<{ scene: Scene; index: number }> = ({ scene, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${scene.duration * 40}px`,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`h-full min-w-[150px] rounded-xl border p-3 flex flex-col justify-between cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-colors ${
        isDragging ? 'bg-gray-700 border-indigo-500 shadow-xl' : 'bg-[#18181b] border-white/10'
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-gray-400">Scene {index + 1}</span>
        <span className="text-[10px] bg-black/50 border border-white/5 text-gray-300 px-1.5 py-0.5 rounded">{scene.duration}s</span>
      </div>
      <div className="text-sm truncate mt-3 font-medium text-gray-200">{scene.title}</div>
      <div className="text-[11px] text-gray-400 truncate mt-1">"{scene.text}"</div>
      
      {/* Status Indicator */}
      <div className="mt-3 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 text-gray-400">
        <span className={`w-1.5 h-1.5 rounded-full ${
          scene.status === 'rendered' ? 'bg-emerald-500' : 
          scene.status === 'processing' ? 'bg-amber-500 animate-pulse' : 'bg-gray-500'
        }`}></span>
        {scene.status}
      </div>
    </div>
  );
}

export default function VideoTimeline({ onBack }: { onBack?: () => void }) {
  const [scenes, setScenes] = useState<Scene[]>([
    { id: 1, title: 'Hook Scene', duration: 4, text: 'Diskon 50% Hari Ini!', status: 'rendered' },
    { id: 2, title: 'Product Showcase', duration: 6, text: 'Fitur Unggulan', status: 'processing' },
    { id: 3, title: 'Call to Action', duration: 3, text: 'Klik Keranjang Kuning', status: 'draft' },
  ]);

  const [hermesMessage, setHermesMessage] = useState(
    "Siap! Aku udah suruh Batara buat meracik konsepnya. Cek timeline di bawah ya, kalau ada urutan atau teks yang mau diganti, tinggal bilang!"
  );
  
  const [inputText, setInputText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setScenes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        // Notify Hermes about the structural change
        const movedScene = items[oldIndex];
        setHermesMessage(`Oke, aku lihat kamu mindahin bagian "${movedScene.title}". Nanti aku sesuaikan ya musik latar dari Damar biar transisinya tetep mulus!`);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const simulateOpenclauwUpdate = () => {
    if (!inputText.trim()) return;
    
    // Naive intent parsing simulation
    const lowerInput = inputText.toLowerCase();
    
    setScenes(prev => {
      const newScenes = [...prev];
      if (lowerInput.includes("potong") || lowerInput.includes("durasi")) {
          newScenes[0].duration = Math.max(1, newScenes[0].duration - 1);
          setHermesMessage(`Beres! Durasi adegan pertama udah aku potong jadi ${newScenes[0].duration} detik. Biar ritmenya pas.`);
      } else {
          newScenes[0].text = inputText;
          setHermesMessage(`Sip! Teks di adegan pertama udah aku ganti jadi '${inputText}'. Biar makin mantap, mau aku minta Damar tambahin sound effect ledakan nggak?`);
      }
      return newScenes;
    });
    
    setInputText("");
  };

  return (
    <div className="flex h-full w-full bg-[#030303] text-white font-sans overflow-hidden">
      
      {/* KANVAS KIRI: Visual Timeline (CapCut Style) */}
      <div className="flex-1 flex flex-col border-r border-white/5">
        
        {/* Top Bar for Timeline */}
        {onBack && (
          <div className="h-12 border-b border-white/5 bg-[#080808] flex items-center px-4">
             <button onClick={onBack} className="text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1.5">
               &larr; Kembali ke Studio
             </button>
          </div>
        )}

        {/* Video Preview Area (Placeholder) */}
        <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
           <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <span className="text-gray-500 font-mono tracking-widest uppercase">Video Preview Player</span>
           </div>
           {/* Simulasi Teks Overlay pada Video */}
           <div className="absolute bottom-12 text-4xl font-black text-yellow-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-center w-full px-8 uppercase tracking-wide" style={{ textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>
             {scenes[0].text}
           </div>
        </div>

        {/* Timeline Editor Area */}
        <div className="h-[280px] bg-[#0c0c0c] p-5 border-t border-white/10 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 tracking-wide text-gray-200">
              <span className="text-indigo-500">⚡</span> TIMELINE EDITOR (Sinta & Bima)
            </h2>
            <button className="bg-indigo-600 hover:bg-indigo-500 px-5 py-1.5 rounded-md text-xs font-bold transition shadow-lg shadow-indigo-500/20 uppercase tracking-wider text-white">
              Render Master
            </button>
          </div>
          
          {/* Horizontal Track with DndKit */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 relative">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={scenes.map(s => s.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-2.5 items-center h-full absolute px-1">
                  {scenes.map((scene, index) => (
                    <SortableScene key={scene.id} scene={scene} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      {/* KANVAS KANAN: HUD Chat Neuronna (Hermes) */}
      <div className="w-[400px] bg-[#080808] flex flex-col">
        <div className="p-4 border-b border-white/5 bg-[#0a0a0a] flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20 text-white">
            N
          </div>
          <div>
            <h3 className="font-bold text-gray-200 tracking-wide text-sm">Neuronna (Hermes)</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-0.5 font-mono uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Lead Producer
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-transparent">
          <div className="bg-[#18181b] border border-white/5 p-4 rounded-2xl rounded-tl-sm self-start max-w-[90%] shadow-xl">
            <p className="text-[13px] leading-relaxed text-gray-300">{hermesMessage}</p>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-5 border-t border-white/5 bg-[#0a0a0a]">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && simulateOpenclauwUpdate()}
              placeholder="Coba: 'Ganti teks adegan 1 jadi Flash Sale'" 
              className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600 text-gray-200 shadow-inner"
            />
            {/* Tombol ini menyimulasikan trigger dari Openclauw */}
            <button 
              onClick={simulateOpenclauwUpdate}
              className="bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-600/30 text-white"
            >
              Kirim
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-4 text-center px-2 leading-relaxed">
            ✨ Openclauw menerjemahkan chat menjadi aksi timeline, Hermes membalas dengan luwes.
          </p>
        </div>
      </div>

    </div>
  );
}
