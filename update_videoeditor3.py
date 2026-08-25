import sys

with open('server/VideoEditor.ts', 'r') as f:
    content = f.read()

old_res = "return { index: i, success: true, text };"
new_res = "return { index: i, success: true, text, hasTts };"
content = content.replace(old_res, new_res)

old_res_err = "return { index: i, success: false, text }; // Tangkap error"
new_res_err = "return { index: i, success: false, text, hasTts: false }; // Tangkap error"
content = content.replace(old_res_err, new_res_err)

with open('server/VideoEditor.ts', 'w') as f:
    f.write(content)

print("VideoEditor hasTts updated")
