import sys
import re

with open('src/components/HolographicHudNode.tsx', 'r') as f:
    content = f.read()

target = """            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }"""

replacement = """            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render Text Label when active (dynamic description)
          if (isNodeActive) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = n.color;
            ctx.font = 'bold 10px monospace';
            
            // Generate dynamic text based on current phase
            const phaseText = project?.currentPhaseName ? project.currentPhaseName.replace(/\(.*?\)/g, '').trim() : 'Sedang Memproses...';
            const displayTxt = `▶ ${n.name}: ${phaseText}`;
            
            // Background for text to make it readable
            const textWidth = ctx.measureText(displayTxt).width;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.7)'; // slate-950 with opacity
            ctx.fillRect(nx + 12, ny - 6, textWidth + 8, 16);
            
            ctx.fillStyle = '#ffffff'; // White text
            ctx.fillText(displayTxt, nx + 16, ny + 5);
          }"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/HolographicHudNode.tsx', 'w') as f:
        f.write(content)
    print("Successfully inserted text rendering block.")
else:
    print("Could not find the target block.")
