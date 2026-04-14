#!/usr/bin/env python3
with open('MobileProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 822行 - 订单号显示问题
content = content.replace("订单?{o.order_no || '?'}", "订单号：{o.order_no || '无'}")
# 824行 - 状态显示问题
content = content.replace("{o.status || '?'}", "{o.status || '未知'}")

# 848行 - 优惠劵问题
content = content.replace("'暂无可用优惠？'", "'暂无可用优惠券'")

# 860行 - 去领取问题
content = content.replace("去领?/ 看看目的?", "去领取 / 看看目的地")

with open('MobileProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
