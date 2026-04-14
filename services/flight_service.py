# -*- coding: utf-8 -*-
"""
航班服务模块

提供航班搜索和详情查询功能。
目前返回模拟数据，预留对接真实 API 的位置。

支持的 API 提供商（待对接）：
- 携程机票 API
- 飞猪机票 API
- Amadeus API
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import random


class FlightService(ABC):
    """航班服务抽象基类"""
    
    @abstractmethod
    def search_flights(self, origin: str, destination: str, date: str, 
                       passengers: int = 1) -> List[Dict]:
        """搜索航班"""
        pass
    
    @abstractmethod
    def get_flight_detail(self, flight_id: str) -> Optional[Dict]:
        """获取航班详情"""
        pass


class MockFlightService(FlightService):
    """模拟航班服务（开发测试用）"""
    
    def search_flights(self, origin: str, destination: str, date: str,
                       passengers: int = 1) -> List[Dict]:
        """返回模拟航班数据"""
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
            dep_time = f"{random.randint(6, 22):02d}:{random.randint(0, 59):02d}"
            duration = random.randint(90, 300)
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
                'price_child': int(base_price * 0.75),
                'seats_available': random.randint(5, 50),
                'aircraft': random.choice(['波音737', '空客320', '波音787', '空客330']),
                'cabin_class': '经济舱',
                'refundable': random.choice([True, False]),
                'changeable': random.choice([True, False]),
            })
        
        # 按价格排序
        flights.sort(key=lambda x: x['price'])
        return flights
    
    def get_flight_detail(self, flight_id: str) -> Optional[Dict]:
        """返回模拟航班详情"""
        return {
            'flight_id': flight_id,
            'status': 'on_time',
            'terminal': f"T{random.randint(1, 3)}",
            'gate': f"{random.choice(['A', 'B', 'C'])}{random.randint(1, 50)}",
            'baggage_claim': f"{random.randint(1, 10)}",
            'meals': random.choice([True, False]),
            'wifi': random.choice([True, False]),
            'seat_layout': '3-3',
            'leg_room': random.choice(['标准', '宽敞', '紧急出口']),
        }


# 预留：真实 API 服务类（待实现）
# class CtripFlightService(FlightService):
#     """携程航班服务"""
#     def __init__(self, api_key: str):
#         self.api_key = api_key
#     
#     def search_flights(self, origin, destination, date, passengers=1):
#         # TODO: 对接携程 API
#         pass


def get_flight_service() -> FlightService:
    """获取航班服务实例"""
    # 目前返回模拟服务，后续可扩展为真实 API
    return MockFlightService()


# 便捷函数
def search_flights(origin: str, destination: str, date: str, 
                   passengers: int = 1) -> List[Dict]:
    """搜索航班（便捷函数）"""
    service = get_flight_service()
    return service.search_flights(origin, destination, date, passengers)


def get_flight_detail(flight_id: str) -> Optional[Dict]:
    """获取航班详情（便捷函数）"""
    service = get_flight_service()
    return service.get_flight_detail(flight_id)