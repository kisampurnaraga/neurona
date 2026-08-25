import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

import_line = "import { NeuronaAssistant } from './components/NeuronaAssistant';\n"
if "NeuronaAssistant" not in content:
    content = content.replace("import { GalleryModal } from './components/GalleryModal';", import_line + "import { GalleryModal } from './components/GalleryModal';")

action_handler = """
  const handleNeuronaAction = (action: string) => {
    if (action === 'INIT_AFFILIATE' || action === 'REQUEST_IMAGE_UPLOAD') {
      setIsAffiliateModalOpen(true);
    } else if (action === 'INIT_ANIMATION') {
      setIsAnimationModalOpen(true);
    } else if (action === 'INIT_EDUCATIONAL') {
      setIsEducationalModalOpen(true);
    }
  };
"""

if "handleNeuronaAction" not in content:
    content = content.replace("const handleLogin = (user: User) => {", action_handler + "\n  const handleLogin = (user: User) => {")

assistant_tag = """
      {currentUser && (
        <NeuronaAssistant onActionTriggered={handleNeuronaAction} />
      )}
"""

if "<NeuronaAssistant" not in content:
    content = content.replace("{/* Modals */}", assistant_tag + "\n      {/* Modals */}")

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("App.tsx updated")
