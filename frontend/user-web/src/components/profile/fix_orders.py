#!/usr/bin/env python3
with open('MobileProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到并修复订单号那行
# 原: '          <div className="text-xs text-slate-500">订单?{o.order_no || '?}</div>'
# 修复后应该是: '          <div className="text-xs text-slate-500">订单号：{o.order_no || '无'}</div>'

bad = '订单?{o.order_no || \'?}'
good = '订单号：{o.order_no || \'无\'}'
content = content.replace(bad, good)

with open('MobileProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
