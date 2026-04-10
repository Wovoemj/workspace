#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能修复：只修复会导致编译失败的截断字符串
- 字符串字面量 '中文?' → '中文???'（我们不知道缺的字，所以就用？结尾关闭）
- JSX 属性 attr="中文? → attr="中文？"（关闭属性值）
跳过注释里的截断（不影响编译）
"""

import re
import os

src_dir = r'd:\travel-assistant\frontend\user-web\src'


def fix_unclosed_string_literals(content, fpath):
    """
    修复未关闭的字符串字面量
    模式：行中有 '中文?' 或 "中文?" 或 `中文?` 但引号未关闭
    """
    lines = content.split('\n')
    fixed_lines = []
    changes = 0
    
    for line in lines:
        stripped = line.rstrip()
        new_line = stripped
        
        # Skip pure comment lines
        if re.match(r'^\s*//', stripped):
            fixed_lines.append(line)
            continue
        
        # Pattern 1: Single-quoted string with truncated Chinese ending
        # '...chinese..?' followed by non-quote delimiter (meaning quote is not closed)
        # Example: { label: '跟团?' } or toast.success('已下?')
        
        # Fix single-quoted strings where ? appears before ) } , ; and no closing '
        # '中文?' → '中文？' (keep the ? and close the string)
        def fix_single_quoted(m):
            nonlocal changes
            inner = m.group(1)
            # Check if inner ends with ? and contains Chinese
            if inner.endswith('?') and re.search(r'[\u4e00-\u9fff]', inner):
                changes += 1
                return f"'{inner}'"  # already has ' at start and we add '
            return m.group(0)
        
        # Look for unclosed single-quoted strings
        # Pattern: ' + content + ? (no closing ')
        # We check: the string starts with ' and the ? is at end before a non-quote char
        
        # More targeted: find '...?' where the ? is NOT followed by closing '
        # i.e., matches: '中文?' followed by ), }, ,, ;, space, end-of-string
        new_line = re.sub(r"'([^']*[\u4e00-\u9fff][^']*)\?'", lambda m: f"'{m.group(1)}？'", stripped)
        
        # Pattern for unclosed: '中文? followed by ) or } or , 
        def close_single(m):
            nonlocal changes
            inner = m.group(1)
            after = m.group(2)
            # inner ends with ?, contains Chinese → close the string
            if re.search(r'[\u4e00-\u9fff]', inner) and inner.endswith('?'):
                changes += 1
                return f"'{inner}'" + after
            return m.group(0)
        
        new_line2 = re.sub(r"'([^']*[\u4e00-\u9fff][^']*\?)([)}\],;])", close_single, stripped)
        if new_line2 != stripped:
            new_line = new_line2
        
        # Pattern for JSX attribute with unclosed string
        # placeholder="中文? or title="中文?
        def close_attr(m):
            nonlocal changes
            attr = m.group(1)
            inner = m.group(2)
            after = m.group(3)
            if re.search(r'[\u4e00-\u9fff]', inner) and inner.endswith('?'):
                changes += 1
                return f'{attr}"{inner}"' + after
            return m.group(0)
        
        new_line3 = re.sub(r'(\w+=)"([^"]*[\u4e00-\u9fff][^"]*\?)([\s\n])', close_attr, new_line)
        if new_line3 != new_line:
            new_line = new_line3
        
        # Indentation preservation
        indent = len(line) - len(line.lstrip())
        if new_line != stripped:
            line = ' ' * indent + new_line
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines), changes


def main():
    print("=== 智能修复：关闭截断字符串 ===\n")
    total = 0
    files_fixed = 0
    
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.next']]
        for fname in files:
            if not fname.endswith(('.tsx', '.ts', '.jsx', '.js')):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue
            
            orig = content
            content, c1 = fix_unclosed_string_literals(content, fpath)
            
            if content != orig:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(content)
                rel = os.path.relpath(fpath, r'd:\travel-assistant\frontend\user-web')
                print(f"  {rel}: {c1} 处修复")
                total += c1
                files_fixed += 1
    
    print(f"\n总计: {files_fixed} 个文件, {total} 处修复")


if __name__ == '__main__':
    main()
