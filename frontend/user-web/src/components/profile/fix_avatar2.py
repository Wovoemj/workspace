#!/usr/bin/env python3
with open('MobileProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复 avatarInitial - 需要把末尾的 '? 改成 '?'
old = "|| '?\n"
new = "|| '?'\n"
content = content.replace(old, new)

with open('MobileProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
