import sys

with open('src/components/NeuronaAssistant.tsx', 'r') as f:
    content = f.read()

import_statement = "import { AVAILABLE_VOICES } from '../utils/speechSynthesis';\n"
if "AVAILABLE_VOICES" not in content:
    content = content.replace("import { neuronaVoice } from '../utils/speechSynthesis';", "import { neuronaVoice, AVAILABLE_VOICES } from '../utils/speechSynthesis';")

play_voice_code = """
    const voiceId = localStorage.getItem('neurona_ui_voice') || 'id-ID-Journey-O';
    const voiceOpt = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
    neuronaVoice.speak(greeting, voiceOpt.gender, voiceOpt.provider, voiceOpt.voiceKey);
"""
content = content.replace("neuronaVoice.speak(greeting, 'female', 'google', 'id-ID-Journey-O');", play_voice_code.strip())

play_voice_data = """
        const voiceId = localStorage.getItem('neurona_ui_voice') || 'id-ID-Journey-O';
        const voiceOpt = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
        neuronaVoice.speak(data.message, voiceOpt.gender, voiceOpt.provider, voiceOpt.voiceKey);
"""
content = content.replace("neuronaVoice.speak(data.message, 'female', 'google', 'id-ID-Journey-O');", play_voice_data.strip())

# Fix autoplay issue by calling triggerAutoGreeting synchronously in the open handler
handle_open = """
  const handleOpen = () => {
    setIsOpen(true);
    if (!hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      triggerAutoGreeting();
    }
  };
"""
if "const handleOpen" not in content:
    content = content.replace("  const toggleListen = () => {", handle_open + "\n  const toggleListen = () => {")

content = content.replace("onClick={() => setIsOpen(true)}", "onClick={handleOpen}")
# Remove the useEffect auto-greeting
content = content.replace("if (isOpen && !hasGreeted.current && messages.length === 0) {\n      hasGreeted.current = true;\n      triggerAutoGreeting();\n    }", "")

with open('src/components/NeuronaAssistant.tsx', 'w') as f:
    f.write(content)

print("NeuronaAssistant patched")
