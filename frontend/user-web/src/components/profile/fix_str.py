#!/usr/bin/env python3
with open('MobileProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复128行的未闭合字符串
old1 = "const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?"
new1 = "const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?'"
content = content.replace(old1, new1)

# 修复订单号显示 - 多处
content = content.replace("订单?{o.order_no || '?'}", "订单号：{o.order_no || '无'}")

with open('MobileProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
