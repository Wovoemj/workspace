#!/usr/bin/env python3
with open('MobileProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复 avatarInitial 末尾的未闭合单引号
bad1 = "const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?"
good1 = "const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?'"
content = content.replace(bad1, good1)

# 修复订单号
bad2 = '订单?{o.order_no || \'?}'
good2 = '订单号：{o.order_no || \'无\'}'
content = content.replace(bad2, good2)

with open('MobileProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
