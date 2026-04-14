#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""API 测试脚本"""

import requests
import json

BASE_URL = "http://127.0.0.1:5001"

def test_flights():
    """测试机票搜索"""
    print("\n=== 测试机票搜索 ===")
    r = requests.get(f"{BASE_URL}/api/flights/search", params={
        "origin": "beijing",
        "destination": "shanghai",
        "date": "2026-05-01"
    })
    data = r.json()
    print(f"成功: {data.get('success')}")
    if data.get('success'):
        print(f"航班数量: {len(data.get('flights', []))}")
    return data

def test_hotels():
    """测试酒店搜索"""
    print("\n=== 测试酒店搜索 ===")
    r = requests.get(f"{BASE_URL}/api/hotels/search", params={
        "city": "beijing",
        "checkin": "2026-05-01",
        "checkout": "2026-05-03"
    })
    data = r.json()
    print(f"成功: {data.get('success')}")
    if data.get('success'):
        print(f"酒店数量: {len(data.get('hotels', []))}")
    return data

def test_register_and_login():
    """测试注册和登录，返回 token"""
    print("\n=== 测试注册 ===")
    import time
    username = f"testuser_{int(time.time())}"
    
    r = requests.post(f"{BASE_URL}/api/users/register", json={
        "username": username,
        "email": f"{username}@test.com",
        "password": "Test123456",
        "nickname": "测试用户"
    })
    data = r.json()
    print(f"注册成功: {data.get('success')}")
    
    if data.get('success'):
        token = data.get('token')
        print(f"Token: {token[:50]}...")
        return token
    
    # 如果注册失败，尝试登录
    print("\n=== 测试登录 ===")
    r = requests.post(f"{BASE_URL}/api/users/login", json={
        "username": username,
        "password": "Test123456"
    })
    data = r.json()
    print(f"登录成功: {data.get('success')}")
    return data.get('token')

def test_protected_api(token):
    """测试需要认证的 API"""
    if not token:
        print("\n跳过需要认证的测试（无 token）")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 测试积分
    print("\n=== 测试积分 API ===")
    r = requests.get(f"{BASE_URL}/api/users/me/points", headers=headers)
    print(f"状态: {r.status_code}")
    print(f"响应: {r.text[:200]}")
    
    # 测试邀请
    print("\n=== 测试邀请 API ===")
    r = requests.get(f"{BASE_URL}/api/users/invite", headers=headers)
    print(f"状态: {r.status_code}")
    print(f"响应: {r.text[:200]}")
    
    # 测试工单
    print("\n=== 测试工单 API ===")
    r = requests.post(f"{BASE_URL}/api/support/tickets", 
        headers={**headers, "Content-Type": "application/json"},
        json={"title": "测试工单", "description": "测试内容", "ticket_type": "bug"})
    print(f"状态: {r.status_code}")
    print(f"响应: {r.text[:200]}")

if __name__ == "__main__":
    # 测试公开 API
    test_flights()
    test_hotels()
    
    # 测试需要认证的 API
    token = test_register_and_login()
    test_protected_api(token)
    
    print("\n=== 测试完成 ===")