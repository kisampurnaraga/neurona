import sys

with open('server/orchestrator.ts', 'r') as f:
    content = f.read()

# Replace VideoEditor.concatScenes with VideoEditor.processProject
old_code = """          const videoUrls = completedScenes.map(s => s.videoUrl || s.assetUrl).filter(Boolean) as string[];
          if (videoUrls.length > 0) {
            project.finalVideoUrl = await VideoEditor.concatScenes(videoUrls, id);
          }"""

new_code = """          if (completedScenes.length > 0) {
            project.finalVideoUrl = await VideoEditor.processProject(project);
          }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    
# Add persistence database
db_logic = """
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'outputs', 'db.json');

export function saveProjects() {
  try {
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    const data = Array.from(projects.entries());
    fs.writeFileSync(dbPath, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save projects to db:", e);
  }
}

export function loadProjects() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      for (const [k, v] of data) {
        projects.set(k, v);
      }
      console.log(`Loaded ${projects.size} projects from gallery DB.`);
    }
  } catch (e) {
    console.error("Failed to load projects from db:", e);
  }
}
// Load on module init
loadProjects();
"""

if "export function saveProjects" not in content:
    content = content.replace("export const projects = new Map<string, ProductionProject>();", "export const projects = new Map<string, ProductionProject>();\n" + db_logic)

# Save on project completion or error
save_trigger = "      project.agentStatus['Distribution Manager'] = 'COMPLETE';\n      saveProjects();"
if "saveProjects();" not in content:
    content = content.replace("project.agentStatus['Distribution Manager'] = 'COMPLETE';", save_trigger)

with open('server/orchestrator.ts', 'w') as f:
    f.write(content)

print("Orchestrator updated with DB logic and new Editor.")

