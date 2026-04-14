#!/usr/bin/env python3
import re

with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix all remaining '?\n or '?\ patterns (incomplete string endings)
# These are strings that were truncated mid-character
content = re.sub(r"'\?\n", "'\n", content)
content = re.sub(r"'\?\)", "'- )", content)
content = re.sub(r"'\?\)", "'- )", content)
content = re.sub(r"'\?\}", "'- }", content)
content = re.sub(r"'\? ", "'- ", content)
content = re.sub(r"'\?\n", "'\n", content)
content = re.sub(r"'\?>", "'>-", content)

# Fix specific patterns found in the file
content = re.sub(r"点击查看详情与商品明", "点击查看详情与商品明细", content)
content = re.sub(r"按时间线展示你最近浏览的目的", "按时间线展示你最近浏览的目的地", content)

# Fix patterns like 'something?\n (truncated strings in JSX)
content = re.sub(r"'?\n(\s*<)", "'\n\\1", content)

# Fix remaining question marks that are placeholders
content = re.sub(r"\? 个", "? 个", content)
content = re.sub(r"\?\)", ")", content)

# Fix the remaining specific corrupted patterns
content = re.sub(r"个\?\n", "个\n", content)
content = re.sub(r"个\?\n", "个\n", content)

# Fix patterns where }? appears (should be } or just ?)
content = re.sub(r"\}\?'\n", "}\n", content)
content = re.sub(r"\}'\?\n", "}'\n", content)

# Fix more patterns
content = re.sub(r"个\?\n", "个\n", content)
content = re.sub(r"个\?\)", "个)", content)

with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed")
print(f"Remaining ? marks: {content.count('?')}")
