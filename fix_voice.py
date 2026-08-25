import sys

with open('src/components/NeuronaAssistant.tsx', 'r') as f:
    content = f.read()

content = content.replace("neuronaVoice.speak(greeting);", "neuronaVoice.speak(greeting, 'female', 'google', 'id-ID-Journey-O');")
content = content.replace("neuronaVoice.speak(data.message);", "neuronaVoice.speak(data.message, 'female', 'google', 'id-ID-Journey-O');")

with open('src/components/NeuronaAssistant.tsx', 'w') as f:
    f.write(content)

print("Voice fixed to use Google id-ID-Journey-O")
