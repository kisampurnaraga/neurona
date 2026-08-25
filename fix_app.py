import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

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

content = content.replace("const handleLoginSuccess = (user: UserSessionData, token: string) => {", action_handler + "\n  const handleLoginSuccess = (user: UserSessionData, token: string) => {")

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("App.tsx patched")
