# -*- coding: utf-8 -*-
"""
============================================
航班服务模块
============================================

【模块说明】
- 提供航班搜索和详情查询功能
- 采用工厂模式，支持Mock和真实API切换
- 目前返回模拟数据，预留对接真实API的位置

【支持的API提供商（待对接）】
- 携程机票 API
- 飞猪机票 API
- Amadeus API

【数据结构】
- Flight: 航班基本信息（航线、时间、价格）
- FlightDetail: 航班详情（登机口、状态、餐食等）
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import random


class FlightService(ABC):
    """航班服务抽象基类
    
    【设计模式】
    - 抽象工厂模式：定义统一接口
    - 便于后续接入真实API时保持接口一致
    """
    
    @abstractmethod
    def search_flights(self, origin: str, destination: str, date: str, 
                       passengers: int = 1) -> List[Dict]:
        """搜索航班
        
        Args:
            origin: 出发城市
            destination: 目的地城市
            date: 出发日期 (YYYY-MM-DD)
            passengers: 乘客数量
            
        Returns:
            航班列表
        """
        pass
    
    @abstractmethod
    def get_flight_detail(self, flight_id: str) -> Optional[Dict]:
        """获取航班详情
        
        Args:
            flight_id: 航班号
            
        Returns:
            航班详情，未找到返回None
        """
        pass


class MockFlightService(FlightService):
    """模拟航班服务（开发测试用）
    
    【功能】
    - 生成随机但合理的航班数据
    - 便于前端开发和测试
    - 数据结构与真实API保持一致
    
    【航空公司】
    - CA: 中国国航
    - MU: 东方航空
    - CZ: 南方航空
    - HU: 海南航空
    - 3U: 四川航空
    """
    
    def search_flights(self, origin: str, destination: str, date: str,
                       passengers: int = 1) -> List[Dict]:
        """返回模拟航班数据
        
        【生成规则】
        - 每次返回5个航班
        - 出发时间：6:00-22:59随机
        - 飞行时长：90-300分钟随机
        - 价格：300-1500元随机
        - 座位余量：5-50随机
        """
        # 航空公司列表
        airlines = [
            {'code': 'CA', 'name': '中国国航'},
            {'code': 'MU', 'name': '东方航空'},
            {'code': 'CZ', 'name': '南方航空'},
            {'code': 'HU', 'name': '海南航空'},
            {'code': '3U', 'name': '四川航空'},
        ]
        
        flights = []
        for i in range(5):
            airline = random.choice(airlines)
            
            # 生成随机出发时间
            dep_time = f"{random.randint(6, 22):02d}:{random.randint(0, 59):02d}"
            
            # 计算飞行时长和到达时间
            duration = random.randint(90, 300)  # 分钟
            arr_hour = (int(dep_time[:2]) + duration // 60) % 24
            arr_min = (int(dep_time[3:]) + duration % 60)
            if arr_min >= 60:
                arr_hour = (arr_hour + 1) % 24
                arr_min -= 60
            arr_time = f"{arr_hour:02d}:{arr_min:02d}"
            
            base_price = random.randint(300, 1500)
            flights.append({
                'flight_id': f"{airline['code']}{random.randint(1000, 9999)}",
                'airline_code': airline['code'],
                'airline_name': airline['name'],
                'flight_number': f"{airline['code']}{random.randint(100, 999)}",
                'origin': origin,
                'destination': destination,
                'departure_date': date,
                'departure_time': dep_time,
                'arrival_time': arr_time,
                'duration': f"{duration // 60}h{duration % 60}m",
                'price': base_price,
                'price_child': int(base_price * 0.75),  # 儿童票75折
                'seats_available': random.randint(5, 50),
                'aircraft': random.choice(['波音737', '空客320', '波音787', '空客330']),
                'cabin_class': '经济舱',
                'refundable': random.choice([True, False]),  # 是否可退
                'changeable': random.choice([True, False]),  # 是否可改签
            })
        
        # 按价格排序
        flights.sort(key=lambda x: x['price'])
        return flights
    
    def get_flight_detail(self, flight_id: str) -> Optional[Dict]:
        """返回模拟航班详情
        
        【详情内容】
        - 航班状态：准点/延误/取消
        - 航站楼、登机口、行李转盘
        - 餐食、WiFi等信息
        - 座位布局
        """
        return {
            'flight_id': flight_id,
            'status': 'on_time',  # on_time/delay/cancelled
            'terminal': f"T{random.randint(1, 3)}",
            'gate': f"{random.choice(['A', 'B', 'C'])}{random.randint(1, 50)}",
            'baggage_claim': f"{random.randint(1, 10)}",
            'meals': random.choice([True, False]),
            'wifi': random.choice([True, False]),
            'seat_layout': '3-3',
            'leg_room': random.choice(['标准', '宽敞', '紧急出口']),
        }


# =============================================
# 真实API服务类（预留，待实现）
# =============================================
# class CtripFlightService(FlightService):
#     """携程航班服务"""
#     def __init__(self, api_key: str):
#         self.api_key = api_key
#     
#     def search_flights(self, origin, destination, date, passengers=1):
#         # TODO: 对接携程 API
#         pass


def get_flight_service() -> FlightService:
    """获取航班服务实例
    
    【工厂模式】
    - 目前返回Mock服务
    - 后续可改为读取配置决定返回哪种服务
    """
    return MockFlightService()


# =============================================
# 便捷函数
# =============================================
# 提供直接调用的简化接口

def search_flights(origin: str, destination: str, date: str, 
                   passengers: int = 1) -> List[Dict]:
    """搜索航班（便捷函数）"""
    service = get_flight_service()
    return service.search_flights(origin, destination, date, passengers)


def get_flight_detail(flight_id: str) -> Optional[Dict]:
    """获取航班详情（便捷函数）"""
    service = get_flight_service()
    return service.get_flight_detail(flight_id)
