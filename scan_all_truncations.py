#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全面扫描并修复所有截断字符串
截断模式：中文字符 + ? + 引号/括号/标签结尾（不以中文继续）
"""

import re
import os

src_dir = r'd:\travel-assistant\frontend\user-web\src'

def scan_and_report(fpath, content):
    """报告文件中所有可疑的截断字符串"""
    lines = content.split('\n')
    problems = []
    for i, line in enumerate(lines, 1):
        s = line.rstrip()
        # Patterns that indicate truncation:
        # 1. Chinese + ? + closing quote/paren: '中文?' or "中文?" or 中文?)
        if re.search(r"[\u4e00-\u9fff]\?['\"`)\]}>,\s]", s):
            problems.append((i, s))
        # 2. Chinese + ? at end of line (truncated JSX text)
        elif re.search(r"[\u4e00-\u9fff]\?$", s):
            problems.append((i, s))
        # 3. JSX attribute truncation: attr="中文?
        elif re.search(r'[\u4e00-\u9fff]\?\s*$', s) or re.search(r'[\u4e00-\u9fff]\?\s+\w', s):
            problems.append((i, s))
    return problems


def main():
    print("=== 全面扫描截断字符串 ===\n")
    
    total_files = 0
    total_probs = 0
    
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
            
            problems = scan_and_report(fpath, content)
            if problems:
                rel = os.path.relpath(fpath, r'd:\travel-assistant\frontend\user-web')
                print(f"\n{rel} ({len(problems)} issues):")
                for lineno, line_text in problems[:10]:  # show max 10
                    print(f"  L{lineno}: {line_text[:110]}")
                total_files += 1
                total_probs += len(problems)
    
    print(f"\n\n总计: {total_files} 个文件, {total_probs} 处可疑截断")


if __name__ == '__main__':
    main()
