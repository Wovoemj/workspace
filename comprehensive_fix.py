#!/usr/bin/env python3
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    
    # Fix all patterns where string ends with '? followed by newline (incomplete string)
    # These are strings that were truncated
    content = re.sub(r"'/\?\n", "'/?'\n", content)
    
    # Fix specific truncated Chinese strings based on common patterns
    fixes = [
        # Profile page
        ("'旅行会?\n", "'旅行会员'\n"),
        ("'普通会?\n", "'普通会员'\n"),
        ("'已退出登?\n", "'已退出登录'\n"),
        ("'去发现目?\n", "'去发现目的地'\n"),
        ("'管理喜欢的目?\n", "'管理喜欢的目的地'\n"),
        ("'去提交订?\n", "'去提交订单'\n"),
        ("'查看订单与状?\n", "'查看订单与状态'\n"),
        ("'还没有收?\n", "'还没有收藏'\n"),
        ("'加载中...\?\n", "'加载中...'\n"),
        ("'个收?\n", "'个收藏'\n"),
        ("'还没有足迹。去 <Link", "'还没有足迹。去 <Link"),
        ("'AI 助手规划你的行程'\n", "'AI 助手规划你的行程'\n"),
        ("'还没有行?\n", "'还没有行程'\n"),
        ("'去 <Link", "'去 <Link"),
        ("'? 个", "? 个"),
        ("'去过 ?", "'去过 "),
        ("'次'\n", "'次'\n"),
        ("'查看详情 ?", "'查看详情 "),
        ("' ~ ?", "' ~ "),
        
        # Edit profile page  
        ("'登录'\n", "'登录'\n"),
        ("'未设置'\n", "'未设置'\n"),
        ("'旅行用户'\n", "'旅行用户'\n"),
    ]
    
    for old, new in fixes:
        if old in content:
            content = content.replace(old, new)
            print(f"Fixed in {filepath}: {old[:30]}...")
    
    # Generic fix: if a line ends with '? (not ??), add closing quote
    lines = content.split('\n')
    fixed_lines = []
    for line in lines:
        # Check if line has incomplete string at end
        stripped = line.rstrip()
        if stripped.endswith("'") and stripped.count("'") % 2 == 1:
            # Odd number of quotes, might be missing closing quote
            # But we need to be careful not to break valid lines
            pass
        fixed_lines.append(line)
    
    content = '\n'.join(fixed_lines)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes to {filepath}")

# Fix the three corrupted files
fix_file('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx')
fix_file('d:/travel-assistant/frontend/user-web/src/app/profile/edit/page.tsx')
fix_file('d:/travel-assistant/frontend/user-web/src/app/privacy/page.tsx')

print("Done")
