#!/usr/bin/env python3
import re

with open('page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复列表
fixes = [
    # 258: toast.success('已退出登?')
    ("toast.success('已退出登?',)", "toast.success('已退出登录'),"),
    
    # 262: || '? -> || '?'
    ("|| '?\n", "|| '?'\n"),
    
    # 271: '普通会? -> '普通会员'
    ("'普通会?',\n", "'普通会员',\n"),
    
    # 378: '管理? : membershipText} -> '管理员' : membershipText}
    ("{user?.is_admin ? '管理? : membershipText}", "{user?.is_admin ? '管理员' : membershipText}"),
    
    # 386: 查看个人信息? -> 查看个人信息
    ("后查看个人信息?", "后查看个人信息"),
    
    # 518: : '?} -> : '0'}
    ("{counts.trips > 0 ? counts.trips : '?}", "{counts.trips > 0 ? counts.trips : '0'}"),
    
    # 521: 查看行程时间? : '去创建行?'} -> 查看行程时间' : '去创建行程'}
    ("{counts.trips > 0 ? '查看行程时间? : '去创建行?',", "{counts.trips > 0 ? '查看行程时间' : '去创建行程'},"),
    
    # 536: : '?} -> : '0'}
    ("{counts.favorites > 0 ? counts.favorites : '?}", "{counts.favorites > 0 ? counts.favorites : '0'}"),
    
    # 553: : '?} -> : '0'}
    ("{counts.orders > 0 ? counts.orders : '?}", "{counts.orders > 0 ? counts.orders : '0'}"),
    
    # 555: '查看订单与状? : '去提交订?' -> '查看订单与状态' : '去提交订单'
    ("{counts.orders > 0 ? '查看订单与状? : '去提交订?',", "{counts.orders > 0 ? '查看订单与状态' : '去提交订单'},"),
    
    # 571: `?${ -> `${
    ("`?${counts.favorites} 个`", "`${counts.favorites} 个`"),
    
    # 571: '还没有收?' -> '还没有收藏'
    (": '还没有收?',", ": '还没有收藏',"),
    
    # 580: 查看全部 X ? -> 查看全部 X
    ("查看全部 {counts.favorites} ?\n", "查看全部 {counts.favorites}\n"),
    
    # 680: : '? -> : ''
    ("toLocaleDateString('zh-CN') : '?", "toLocaleDateString('zh-CN') : ''"),
    
    # 689: 你可以先?<Link -> 你可以先去<Link
    ("你可以先?<Link", "你可以先去<Link"),
    
    # 700: 一次性保存? -> 一次性保存
    ("一次性保存?\n", "一次性保存\n"),
    
    # 715: 退出登</span> -> 退出登录</span>
    (">退出登</span>", ">退出登录</span>"),
    
    # 728: counts.orders} ?/div> -> counts.orders}</div>
    ("{counts.orders} ?/div>", "{counts.orders}</div>"),
    
    # 742: || '?} -> || '无'}
    ("order_no || '?}", "order_no || '无'}"),
    
    # 747: || '?} -> || '未知'}
    ("status || '?", "status || '未知'"),
    
    # 748: 支付方式?{ -> 支付方式：{
    ("支付方式?{o.payment_method}", "支付方式：{o.payment_method}"),
    
    # 802: } ?/div> -> }</div>
    ("{counts.favorites} ?/div>", "{counts.favorites}</div>"),
    
    # 847: >?/span> -> >★</span>
    (">?/span>", ">★</span>"),
    
    # 859: 试试吧? -> 试试吧
    ("试试吧?\n", "试试吧\n"),
    
    # 872: } ?/div> -> }</div>
    ("{footprintTotal || footprints.length} ?/div>", "{footprintTotal || footprints.length}</div>"),
    
    # 914: : '?} -> : ''
    ("visitDate ? new Date(p.visitDate).toLocaleDateString('zh-CN') : '?", "visitDate ? new Date(p.visitDate).toLocaleDateString('zh-CN') : ''"),
    
    # 923: 生成行程吧? -> 生成行程吧
    ("生成行程吧?\n", "生成行程吧\n"),
    
    # 936: counts.trips} ?/div> -> counts.trips}</div>
    ("{counts.trips} ?/div>", "{counts.trips}</div>"),
]

for old, new in fixes:
    if old in content:
        content = content.replace(old, new)
        print(f"Fixed: {old[:50]}...")
    else:
        print(f"NOT FOUND: {old[:50]}...")

with open('page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone!')
