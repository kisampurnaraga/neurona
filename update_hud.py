import sys
import re

with open('src/components/HolographicHudNode.tsx', 'r') as f:
    content = f.read()

# 1. Update nodes list to 8 agents
old_nodes = """      const nodes = [
        { code: 'BATARA', name: 'BATARA / JAKARTA', lat: 0.35, lng: 1.2, color: '#f43f5e' },
        { code: 'GATOTKACA', name: 'GATOTKACA / BANDUNG', lat: 0.6, lng: -0.8, color: '#06b6d4' },
        { code: 'DAMAR', name: 'DAMAR / BALI', lat: 0.15, lng: 0.4, color: '#f59e0b' },
        { code: 'SINTA', name: 'SINTA / YOGYAKARTA', lat: 0.38, lng: -0.2, color: '#10b981' },
        { code: 'TIARA', name: 'TIARA / NUSANTARA', lat: -0.05, lng: 1.0, color: '#8b5cf6' }
      ];"""

new_nodes = """      // We map 8 AI Agents directly to Production States
      const stateMapping: Record<string, string> = {
        'BRIEFING': 'DIRECTOR',
        'STORYBOARDING': 'STORYBOARD',
        'AWAITING_APPROVAL': 'REVIEWER',
        'PRODUCING': 'VISUAL_FX',
        'AUDIO': 'VOICEOVER',
        'ASSEMBLING': 'STITCHER',
        'EDITING': 'EDITOR',
        'QA': 'QUALITY_CTRL',
        'COMPLETED': 'DIRECTOR'
      };
      
      const activeState = project?.status || (isThinking ? 'BRIEFING' : '');
      const activeAgent = stateMapping[activeState] || 'DIRECTOR';

      const nodes = [
        { code: 'DIRECTOR', name: 'AGEN SUTRADARA', lat: 0.45, lng: 1.2, color: '#f43f5e' },
        { code: 'STORYBOARD', name: 'AGEN STORYBOARD', lat: 0.65, lng: -0.6, color: '#06b6d4' },
        { code: 'REVIEWER', name: 'AGEN REVIEW', lat: 0.15, lng: 0.4, color: '#f59e0b' },
        { code: 'VISUAL_FX', name: 'AGEN VISUAL FX', lat: 0.4, lng: -0.2, color: '#10b981' },
        { code: 'VOICEOVER', name: 'AGEN AUDIO TTS', lat: -0.1, lng: 1.0, color: '#8b5cf6' },
        { code: 'STITCHER', name: 'AGEN STITCHER', lat: -0.25, lng: -0.5, color: '#ec4899' },
        { code: 'EDITOR', name: 'AGEN EDITOR', lat: 0.25, lng: -1.0, color: '#eab308' },
        { code: 'QUALITY_CTRL', name: 'AGEN QA', lat: -0.4, lng: 0.3, color: '#3b82f6' }
      ];"""

content = content.replace(old_nodes, new_nodes)

# Update node active logic
old_active_logic = """const isNodeActive = isLiveProcessing && (activeAgentCodename.includes(n.code) || (!activeAgentCodename && n.code === 'BATARA'));"""
new_active_logic = """const isNodeActive = isLiveProcessing && (activeAgent === n.code);"""
content = content.replace(old_active_logic, new_active_logic)

# Add text rendering
old_crosshair = """          ctx.lineTo(nx, ny - armLen);
          ctx.moveTo(nx, ny + 5);
          ctx.lineTo(nx, ny + armLen);
          ctx.stroke();
        }
      });"""

new_crosshair = """          ctx.lineTo(nx, ny - armLen);
          ctx.moveTo(nx, ny + 5);
          ctx.lineTo(nx, ny + armLen);
          ctx.stroke();

          // Render Text Label when active
          if (isNodeActive) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = n.color;
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`▶ ${n.name} [MEMPROSES]`, nx + 15, ny + 4);
          }
        }
      });"""
content = content.replace(old_crosshair, new_crosshair)


# Remove Telemetry Section
telemetry_pattern = re.compile(r"\{/\* ========================================================================= \*/\}\s*\{/\* BOTTOM TELEMETRY STREAM TERMINAL & CONTROLS \*/\}\s*\{/\* ========================================================================= \*/\}\s*<footer className.*?</footer>", re.DOTALL)

content = telemetry_pattern.sub("", content)

with open('src/components/HolographicHudNode.tsx', 'w') as f:
    f.write(content)

print("HUD updated successfully!")
