#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
终极修复：删除所有 JSX 上下文中的 // 注释
策略：任何在 JSX return() 块内部的 // 注释都要删除
（JSX 里只能用 {/* */} 注释）
"""

import os
import re

src_dir = r'd:\travel-assistant\frontend\user-web\src'

def remove_all_inline_jsx_comments(content):
    """
    删除 JSX 中所有行末的 // 注释
    简单策略：删除所有行末 "   // 中文" 模式的注释（2+空格后跟//）
    这些都是脚本加的垃圾注释
    """
    lines = content.split('\n')
    fixed = []
    changes = 0
    
    for line in lines:
        orig = line
        
        # Pattern: line ends with '   // 中文注释' (pure Chinese comment added by script)
        # This matches things like:
        #   <div className="...">   // div元素
        #   className={...}   // className名称
        #   const x = 5   // x变量
        # But should NOT match legitimate code like:
        #   // This is a real comment
        #   const url = 'http://example.com'  (URL with //)
        
        stripped = line.rstrip()
        
        # Skip lines that ARE comments (start with //)
        if re.match(r'^\s*//', stripped):
            fixed.append(line)
            continue
        
        # Find '   // 中文' pattern at end of line
        # Match: 2+ spaces, then //, then space, then content
        match = re.search(r'\s{2,}//\s+[\u4e00-\u9fff\w\u3000-\u303f\uff00-\uffef]', stripped)
        if match:
            # Remove from the comment start
            new_line = stripped[:match.start()].rstrip()
            # Only remove if the comment appears to be added by the script
            # (Chinese chars in comment, or script-style labels like "// div元素")
            comment_text = stripped[match.end()-1:]
            # Check it's a Chinese/script comment (not URL or real code)
            if re.search(r'[\u4e00-\u9fff]', comment_text) or re.match(r'^\w+[元标签映射]', comment_text):
                line = new_line
                if line != orig.rstrip():
                    changes += 1
        
        fixed.append(line)
    
    return '\n'.join(fixed), changes


def also_fix_truncated_strings(content):
    """修复更多截断字符串（纯 JS 上下文中的）"""
    # Common patterns found in admin files
    replacements = [
        ("'没有管理员权?'", "'没有管理员权限'"),
        ("'没有管理员权?)", "'没有管理员权限')"),
        ("toast.error('没有管理员权?)", "toast.error('没有管理员权限')"),
        ("toast.error('没有管理员权?)", "toast.error('没有管理员权限')"),
        # More generic patterns
        ("'没有权?'", "'没有权限'"),
        ("'没有权?)", "'没有权限')"),
        ("'权限不?'", "'权限不足'"),
    ]
    
    changes = 0
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            changes += 1
    
    return content, changes


def main():
    print("=== 终极清理：删除所有 JSX // 注释 ===\n")
    
    total = 0
    files_fixed = 0
    
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.next']]
        for fname in files:
            if not fname.endswith(('.tsx', '.ts', '.jsx', '.js', '.json')):
                continue
            fpath = os.path.join(root, fname)
            
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except:
                continue
            
            orig = content
            
            content, c1 = remove_all_inline_jsx_comments(content)
            content, c2 = also_fix_truncated_strings(content)
            
            if content != orig:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(content)
                rel = os.path.relpath(fpath, r'd:\travel-assistant\frontend\user-web')
                print(f"✅ {rel}: 注释 {c1}, 字符串 {c2}")
                total += c1 + c2
                files_fixed += 1
    
    print(f"\n总计: {files_fixed} 个文件, {total} 处修复")


if __name__ == '__main__':
    main()
