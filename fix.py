import sys

with open('src/components/StoryboardMatrixModal.tsx', 'r') as f:
    content = f.read()

# 1. Fix the Action Buttons wrapping
old_action_buttons = """                          {/* Action Buttons per Scene - Enforce Sequential Generation */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">"""

new_action_buttons = """                          {/* Action Buttons per Scene - Enforce Sequential Generation */}
                          {project?.videoType !== 'AFFILIATE' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">"""

content = content.replace(old_action_buttons, new_action_buttons)

old_action_buttons_end = """                              )}
                            </button>
                          </div>
                        </div>

                        {/* RIGHT: Visual Direction, Script, Subtitle, Prompts (7 Cols on LG) */}"""

new_action_buttons_end = """                              )}
                            </button>
                            </div>
                          )}
                        </div>

                        {/* RIGHT: Visual Direction, Script, Subtitle, Prompts (7 Cols on LG) */}"""

content = content.replace(old_action_buttons_end, new_action_buttons_end)

with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
    f.write(content)

print("Fix applied")
