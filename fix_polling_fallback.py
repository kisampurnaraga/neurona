import sys

with open('src/server/providers/RunwayAdapter.ts', 'r') as f:
    content = f.read()

old_code = """              if (statusData.status === 'SUCCEEDED' && statusData.output?.[0]) {
                console.log(`[Runway Adapter] Real Runway Gen-3 Video Generated: ${statusData.output[0]}`);
                return statusData.output[0];
              } else if (statusData.status === 'FAILED') {
                console.error(`[Runway Adapter] Task failed:`, statusData.failure);
                break;
              }
            }
          }
        } else {"""

new_code = """              if (statusData.status === 'SUCCEEDED' && statusData.output?.[0]) {
                console.log(`[Runway Adapter] Real Runway Gen-3 Video Generated: ${statusData.output[0]}`);
                return statusData.output[0];
              } else if (statusData.status === 'FAILED') {
                console.error(`[Runway Adapter] Task failed:`, statusData.failure);
                throw new Error(`Runway API task failed: ${statusData.failure}`);
              }
            }
          }
          throw new Error(`Runway API polling timeout: Video generation took too long.`);
        } else {"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/server/providers/RunwayAdapter.ts', 'w') as f:
        f.write(content)
    print("Fallback throw added.")
else:
    print("Could not find old_code")

