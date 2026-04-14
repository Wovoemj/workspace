#!/usr/bin/env python3
import re

# Fix profile/edit/page.tsx
with open('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix truncated strings
content = re.sub(r"'\?\n", "'?'\n", content)
content = content.replace("'普通会?\n", "'普通会员'\n")

with open('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed profile/edit/page.tsx')

# Fix privacy/page.tsx
with open('d:/travel-assistant/frontend/user-web/src/app/privacy/page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

content = re.sub(r"'\?\n", "'?'\n", content)

with open('d:/travel-assistant/frontend/user-web/src/app/privacy/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed privacy/page.tsx')

print('Done')
