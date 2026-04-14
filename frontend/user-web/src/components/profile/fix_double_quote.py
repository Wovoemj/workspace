#!/usr/bin/env python3
with open('MobileProfile.tsx', 'rb') as f:
    content = f.read()

# 找到错误的双单引号并替换
old = b"|| '?''"
new = b"|| '?'"
content = content.replace(old, new)

with open('MobileProfile.tsx', 'wb') as f:
    f.write(content)
print('Done')
