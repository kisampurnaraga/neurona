import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Box, MousePointer2 } from 'lucide-react';

interface InteractiveProduct360ViewerProps {
  imageSrc: string;
  className?: string;
}

export const InteractiveProduct360Viewer: React.FC<InteractiveProduct360ViewerProps> = ({
  imageSrc,
  className = ''
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Create a parallax/3D tilt effect mapped to drag coordinates
  const rotateX = useTransform(y, [-150, 150], [45, -45]);
  const rotateY = useTransform(x, [-150, 150], [-45, 45]);

  return (
    <div 
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900 cursor-grab active:cursor-grabbing ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* HUD overlay */}
      <div className="absolute top-12 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/70 border border-cyan-500/40 text-[10px] text-cyan-300 font-mono backdrop-blur-md shadow-lg shadow-cyan-900/20">
        <Box size={14} className="text-cyan-400" />
        <span className="font-bold tracking-wider">360° PRODUCT INSPECTION</span>
      </div>
      
      <div className="absolute bottom-6 inset-x-0 z-20 flex items-center justify-center pointer-events-none opacity-60">
         <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 text-white/70 backdrop-blur-sm">
           <MousePointer2 size={12} className="animate-pulse" />
           <span className="text-[10px] font-mono uppercase tracking-widest">Drag to rotate & inspect</span>
         </div>
      </div>

      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        style={{
          x,
          y,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
        className="relative w-[70%] h-[80%] max-w-sm flex items-center justify-center"
      >
        <img
          src={imageSrc}
          alt="360 Product View"
          className="w-full h-full object-contain rounded-xl drop-shadow-2xl"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          draggable="false"
        />
        {/* Holographic glow effect that sits slightly in front */}
        <motion.div 
          className="absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-500/10 via-transparent to-amber-500/10 pointer-events-none border border-white/10"
          style={{ transform: "translateZ(30px)" }}
        />
      </motion.div>
    </div>
  );
};
