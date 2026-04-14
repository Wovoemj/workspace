#!/usr/bin/env python3
with open('src/components/Navbar.tsx', 'rb') as f:
    content = f.read()

# 找到错误的双单引号并替换
old = b"|| '?\r"
new = b"|| '?'\r"
content = content.replace(old, new)

with open('src/components/Navbar.tsx', 'wb') as f:
    f.write(content)
print('Done')
