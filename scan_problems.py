#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

files = [
    r'd:\travel-assistant\frontend\user-web\src\components\AdminGuard.tsx',
    r'd:\travel-assistant\frontend\user-web\src\app\admin\page.tsx',
    r'd:\travel-assistant\frontend\user-web\src\app\admin\destinations\page.tsx',
    r'd:\travel-assistant\frontend\user-web\src\app\admin\footprints\page.tsx',
    r'd:\travel-assistant\frontend\user-web\src\app\admin\orders\page.tsx',
]

for fpath in files:
    import os
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    found = []
    for i, line in enumerate(lines, 1):
        stripped = line.rstrip()
        # Unclosed string: has ? before ) or } without matching closing quote
        # Look for: '...chinese..?' followed by ) without closing quote
        if re.search(r"'[^']*[\u4e00-\u9fff][^']*\?\s*[)}\]]", stripped):
            found.append(f'  L{i} UNCLOSED_STR: {stripped[:110]}')
        # JSX text truncation
        elif re.search(r'[\u4e00-\u9fff]\?/\w+>', stripped):
            found.append(f'  L{i} JSX_TAG: {stripped[:110]}')
        # Template literal truncation
        elif re.search(r'[\u4e00-\u9fff]\?`', stripped):
            found.append(f'  L{i} TEMPLATE: {stripped[:110]}')
    
    name = os.path.basename(fpath)
    if found:
        print(f'\n{name}:')
        for f2 in found[:20]:
            print(f2)
    else:
        print(f'{name}: OK')
