import sys
with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace deep background with dark purple
code = code.replace('bg-[#0f172a]', 'bg-[#1a0f2e]')

# Replace slate with purple
code = code.replace('slate', 'purple')

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated theme.")
