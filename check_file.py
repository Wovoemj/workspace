#!/usr/bin/env python3
with open('frontend/user-web/src/components/search/ProductResultsList.tsx', 'rb') as f:
    content = f.read()
lines = content.split(b'\n')
for i, line in enumerate(lines, 1):
    print(f'{i}: {repr(line[:100])}')
