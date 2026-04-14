#!/usr/bin/env python3
import re

with open('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix all corrupted strings - patterns like '?\n or truncated Chinese strings ending with ?
content = re.sub(r"'旅行\?\n", "'旅行用户'\n", content)
content = re.sub(r"'未设置\?\n", "'未设置'\n", content)
content = re.sub(r"'登录'\?\n", "'登录'\n", content)
content = re.sub(r"'\?'\)\[0\]\.toUpperCase\(\)", "'?')[0].toUpperCase()", content)
content = re.sub(r"// value\?\n", "// value\n", content)
content = re.sub(r"冒险 \?追求刺激与挑", "冒险 - 追求刺激与挑战", content)
content = re.sub(r"休闲 \?放松身心为主", "休闲 - 放松身心为主", content)
content = re.sub(r"人文 \?探索历史文化", "人文 - 探索历史文化", content)
content = re.sub(r"商务 \?兼顾工作与出", "商务 - 兼顾工作与出行", content)
content = re.sub(r"多个标签用逗号分隔，帮\?AI 推荐更精", "多个标签用逗号分隔，帮助 AI 推荐更精准", content)
content = re.sub(r"请先 <Link href=\"/login\" className=\"text-blue-600 underline\">登录</Link>\?", "请先 <Link href=\"/login\" className=\"text-blue-600 underline\">登录</Link>", content)
content = re.sub(r"验证文件大小（最\?MB\?", "验证文件大小（最大 5MB）", content)
content = re.sub(r"// 恢复原头\?", "// 恢复原头像", content)

with open('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed profile/edit/page.tsx")

# Also check and fix the '?' issue at end of string lines
with open('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find any remaining '?\n patterns (string ending with ? followed by newline)
lines = content.split('\n')
fixed_lines = []
for line in lines:
    # If line ends with '? followed by newline (not '??')
    if line.rstrip().endswith("'?") and not line.rstrip().endswith("'??'"):
        line = line.rstrip() + "'"
    fixed_lines.append(line)

content = '\n'.join(fixed_lines)

with open('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
