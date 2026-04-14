#!/usr/bin/env python3
"""批量更新景点坐标"""
import requests
import time
from app import app, db

AMAP_KEY = 'c819cfec11f53d9fa4e022a8fb1b5c48'
URL = 'https://restapi.amap.com/v3/geocode/geo'

def geocode(address, city=None):
    try:
        params = {'key': AMAP_KEY, 'address': address}
        if city:
            params['city'] = city
        resp = requests.get(URL, params=params, timeout=10)
        data = resp.json()
        if data.get('status') == '1' and data.get('geocodes'):
            loc = data['geocodes'][0]['location']
            return loc.split(',')
    except:
        pass
    return None, None

with app.app_context():
    # 获取所有缺少坐标的景点
    dests = db.session.execute(db.text(
        'SELECT id, name, city, province FROM destinations WHERE lat IS NULL OR lng IS NULL OR lat = 0 OR lng = 0'
    )).fetchall()
    
    total = len(dests)
    updated = 0
    failed = 0
    
    print(f'需要更新 {total} 个景点...')
    
    for i, (dest_id, name, city, province) in enumerate(dests, 1):
        # 构造地址
        addr = (city or '') + (province or '') + name
        lng, lat = geocode(addr, city)
        
        if lat and lng:
            db.session.execute(db.text('UPDATE destinations SET lat=:lat, lng=:lng WHERE id=:id'),
                             {'lat': float(lat), 'lng': float(lng), 'id': dest_id})
            db.session.commit()
            updated += 1
            print(f'[{i}/{total}] ✓ {name}: {lat}, {lng}')
        else:
            failed += 1
            print(f'[{i}/{total}] ✗ {name}')
        
        time.sleep(0.1)  # 限流
    
    print(f'\n完成! 成功: {updated}, 失败: {failed}')