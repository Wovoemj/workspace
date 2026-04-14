#!/usr/bin/env python3
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    
    # Pattern 1: Fix '?\n (string ending with single quote ? then newline)
    # These are truncated strings that need proper closing
    content = re.sub(r"'/\?\n", "'/?'\n", content)
    content = re.sub(r"'普通会?\n", "'普通会员'\n", content)
    content = re.sub(r"'已退出登?\n", "'已退出登录'\n", content)
    content = re.sub(r"'旅行会?\n", "'旅行会员'\n", content)
    content = re.sub(r"'旅行用户'\n", "'旅行用户'\n", content)
    content = re.sub(r"'未设置'\n", "'未设置'\n", content)
    content = re.sub(r"'去发现目?\n", "'去发现目的地'\n", content)
    content = re.sub(r"'管理喜欢的目?\n", "'管理喜欢的目的地'\n", content)
    content = re.sub(r"'去提交订?\n", "'去提交订单'\n", content)
    content = re.sub(r"'查看订单与状?\n", "'查看订单与状态'\n", content)
    content = re.sub(r"'还没有收?\n", "'还没有收藏'\n", content)
    content = re.sub(r"'加载中...\?\n", "'加载中...'\n", content)
    content = re.sub(r"'个收?\n", "'个收藏'\n", content)
    content = re.sub(r"'查看详情 ?", "'查看详情 '", content)
    content = re.sub(r"' ~ ?", "' ~ '", content)
    content = re.sub(r"'去过 ?", "'去过 '", content)
    content = re.sub(r"'次'\n", "'次'\n", content)
    content = re.sub(r"' ? 个", "'? 个", content)
    content = re.sub(r"' ?\n", "'\n", content)
    content = re.sub(r"'登录'\n", "'登录'\n", content)
    content = re.sub(r"'登录'\n", "'登录'\n", content)
    content = re.sub(r"' ?\)\[0\]\.toUpperCase", "'?')[0].toUpperCase", content)
    content = re.sub(r"' ?\n\)$", "'?\n)", content)
    content = re.sub(r"' ?\)$", "'?'", content)
    
    # Pattern 2: Fix incomplete Chinese characters in the middle of strings
    # Common truncations
    content = re.sub(r"目 的 地", "目的地", content)
    content = re.sub(r"请先登录\?", "请先登录", content)
    content = re.sub(r"登录\?\n", "登录\n", content)
    content = re.sub(r"请先 <Link href=\"/login\" className=\"text-blue-600 underline\">登录</Link>\?", 
                     "请先 <Link href=\"/login\" className=\"text-blue-600 underline\">登录</Link>", content)
    content = re.sub(r"验证文件大小（最\?MB\?", "验证文件大小（最大 5MB）", content)
    content = re.sub(r"// 恢复原头\?", "// 恢复原头像", content)
    content = re.sub(r"冒险 \?追求", "冒险 - 追求", content)
    content = re.sub(r"休闲 \?放松", "休闲 - 放松", content)
    content = re.sub(r"人文 \?探索", "人文 - 探索", content)
    content = re.sub(r"商务 \?兼顾", "商务 - 兼顾", content)
    content = re.sub(r"多个标签用逗号分隔，帮\?AI", "多个标签用逗号分隔，帮助 AI", content)
    
    # Pattern 3: Fix JSX issues - elements that end with ?br /> or ?/p> or similar
    content = re.sub(r"我们\?<br />", "我们。<br />", content)
    content = re.sub(r"日期：2026\?\?\?/p>", "日期：2026年4月10日</p>", content)
    content = re.sub(r"电话\?00-888-9999", "电话：400-888-9999", content)
    
    # Pattern 4: Generic fix for '? at end of incomplete strings before punctuation
    content = re.sub(r"'\?\.", "'.", content)
    content = re.sub(r"'\?\n", "'\n", content)
    
    # Pattern 5: Fix patterns where ? is used as a placeholder for missing character
    content = re.sub(r"\? 个", "? 个", content)
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Report changes
    new_qmarks = content.count('?')
    print(f"{filepath}: Fixed (remaining ? marks: {new_qmarks})")

# Fix all three files
fix_file('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx')
fix_file('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx')
fix_file('d:/travel-assistant/frontend/user-web/src/app/privacy/page.tsx')

print("\nDone!")
