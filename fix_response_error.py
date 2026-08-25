import sys

with open('src/server/providers/RunwayAdapter.ts', 'r') as f:
    content = f.read()

old_code = """        } else {
          const errText = await response.text();
          console.warn(`[Runway Adapter] API returned status ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Runway Adapter] Runway API call error:`, err?.message || err);
      }
    }

    // Standard simulation delay fallback"""

new_code = """        } else {
          const errText = await response.text();
          console.warn(`[Runway Adapter] API returned status ${response.status}: ${errText}`);
          throw new Error(`Runway API returned status ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Runway Adapter] Runway API call error:`, err?.message || err);
        throw err;
      }
    }

    // Standard simulation delay fallback"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/server/providers/RunwayAdapter.ts', 'w') as f:
        f.write(content)
    print("Error throwing added.")
else:
    print("Could not find old_code")
