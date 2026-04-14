#!/usr/bin/env python3
import re

with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

original = content

# Fix all '?\n patterns (incomplete string literals)
content = re.sub(r"'\?\n", "'\n", content)

# Fix common truncated patterns
content = re.sub(r"'\?\}\n", "'- }\n", content)  
content = re.sub(r"'\?\n", "'-\n", content)
content = re.sub(r"'\? :", "'- :", content)
content = re.sub(r"\? :", "- :", content)
content = re.sub(r"'\?\)", "'- )", content)
content = re.sub(r"'\?\?\)", "'- )", content)
content = re.sub(r"\?\)", "- )", content)
content = re.sub(r"'?\? :", "'- :", content)
content = re.sub(r"'\? :", "'- :", content)

# Fix specific corrupted strings based on context
content = re.sub(r"\? 个\b", "? 个", content)
content = re.sub(r"'去创建行?'", "'去创建行程'", content)
content = re.sub(r"'查看行程时间?'", "'查看行程时间表'", content)
content = re.sub(r"'管理喜欢的目?'", "'管理喜欢的目的地'", content)
content = re.sub(r"'去发现目?'", "'去发现目的地'", content)
content = re.sub(r"'已退出登?'", "'已退出登录'", content)
content = re.sub(r"'普通会?'", "'普通会员'", content)
content = re.sub(r"'登录后同步行?'", "'登录后同步行程'", content)
content = re.sub(r"'查看订单与状?'", "'查看订单与状态'", content)
content = re.sub(r"'去提交订?'", "'去提交订单'", content)
content = re.sub(r"'还没有行?'", "'还没有行程'", content)
content = re.sub(r"'还没有收?'", "'还没有收藏'", content)
content = re.sub(r"'去过 ?", "'去过 ", content)
content = re.sub(r"'次'\n", "'次'\n", content)
content = re.sub(r"' ?\n", "'\n", content)
content = re.sub(r"' ?\n", "'\n", content)

# Fix JSX issues - unterminated strings in JSX expressions
content = re.sub(r"\{([^}]*)\?'\?\n", r"{$1'- }\n", content)
content = re.sub(r"\{([^}]*)\?'\n", r"{$1'\n", content)

# Fix patterns like counts.trips > 0 ? counts.trips : '?
content = re.sub(r": '\?'\n", ": '-'\n", content)
content = re.sub(r": '\?'", ": '-'", content)

# Fix remaining patterns
content = re.sub(r"'\? 个", "'? 个", content)
content = re.sub(r"'\?\)", "'- )", content)

# Fix the specific error patterns we saw
content = re.sub(r"counts\.trips > 0 \? counts\.trips : '\?", "counts.trips > 0 ? counts.trips : '-", content)
content = re.sub(r"counts\.favorites > 0 \? counts\.favorites : '\?", "counts.favorites > 0 ? counts.favorites : '-", content)
content = re.sub(r"counts\.orders > 0 \? counts\.orders : '\?", "counts.orders > 0 ? counts.orders : '-", content)

with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed profile/page.tsx")
print(f"Remaining ? marks: {content.count('?')}")
