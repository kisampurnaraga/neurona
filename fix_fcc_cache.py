import sys

with open('src/FounderControlCenter.tsx', 'r') as f:
    content = f.read()

old_fetch = """      const res = await fetch('/api/fcc/config', {
        headers: { 'x-role': 'founder' }
      });"""

new_fetch = """      const res = await fetch('/api/fcc/config', {
        headers: { 
          'x-role': 'founder',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    with open('src/FounderControlCenter.tsx', 'w') as f:
        f.write(content)
    print("Fixed cache issue in fetchConfig")
else:
    print("Could not find fetchConfig")
