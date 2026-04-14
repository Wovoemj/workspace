#!/usr/bin/env python3
import re

with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix the missing closing quote on line 262
# Pattern: || '? followed by newline
content = re.sub(r"\|\| '\?\n", "|| '?'\n", content)

# Fix the truncated Chinese string on line 271
content = content.replace("'普通会?", "'普通会员'")

with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('Line 262:', repr(lines[261]))
print('Line 271:', repr(lines[270]))
