# -*- coding: utf-8 -*-
"""
酒店服务模块

提供酒店搜索和详情查询功能。
目前返回模拟数据，预留对接真实 API 的位置。

支持的 API 提供商（待对接）：
- 携程酒店 API
- 飞猪酒店 API
- Booking.com API
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import random


class HotelService(ABC):
    """酒店服务抽象基类"""
    
    @abstractmethod
    def search_hotels(self, city: str, checkin: str, checkout: str,
                      guests: int = 1, rooms: int = 1) -> List[Dict]:
        """搜索酒店"""
        pass
    
    @abstractmethod
    def get_hotel_detail(self, hotel_id: str) -> Optional[Dict]:
        """获取酒店详情"""
        pass
    
    @abstractmethod
    def get_hotel_rooms(self, hotel_id: str, checkin: str, 
                        checkout: str) -> List[Dict]:
        """获取酒店房型"""
        pass


class MockHotelService(HotelService):
    """模拟酒店服务（开发测试用）"""
    
    def search_hotels(self, city: str, checkin: str, checkout: str,
                      guests: int = 1, rooms: int = 1) -> List[Dict]:
        """返回模拟酒店数据"""
        hotel_names = [
            f"{city}JW万豪酒店",
            f"{city}香格里拉大酒店",
            f"{city}洲际酒店",
            f"{city}希尔顿酒店",
            f"{city}喜来登酒店",
            f"{city}凯悦酒店",
            f"{city}皇冠假日酒店",
            f"{city}威斯汀酒店",
            f"{city}君悦酒店",
            f"{city}铂尔曼酒店",
        ]
        
        districts = ['市中心', '西湖区', '朝阳区', '浦东新区', '天河区', '南山区']
        amenities = ['WiFi', '停车场', '游泳池', '健身房', '餐厅', '会议室', '机场接送']
        
        hotels = []
        for i, name in enumerate(hotel_names[:8]):
            base_price = random.randint(200, 1200)
            rating = round(random.uniform(4.0, 5.0), 1)
            
            hotels.append({
                'hotel_id': f"H{1000 + i}",
                'name': name,
                'city': city,
                'district': random.choice(districts),
                'address': f"{city}{random.choice(districts)}xx路{random.randint(1, 500)}号",
                'latitude': 30.0 + random.random() * 10,
                'longitude': 120.0 + random.random() * 10,
                'rating': rating,
                'review_count': random.randint(100, 5000),
                'star': random.choice([4, 5]),
                'price': base_price,
                'price_original': int(base_price * 1.3),
                'discount': random.randint(10, 30),
                'images': [
                    f"https://picsum.photos/seed/{i}a/400/300",
                    f"https://picsum.photos/seed/{i}b/400/300",
                ],
                'amenities': random.sample(amenities, random.randint(3, 6)),
                'distance_to_center': round(random.uniform(0.5, 10), 1),
                'distance_to_airport': round(random.uniform(10, 50), 1),
            })
        
        # 按价格排序
        hotels.sort(key=lambda x: x['price'])
        return hotels
    
    def get_hotel_detail(self, hotel_id: str) -> Optional[Dict]:
        """返回模拟酒店详情"""
        return {
            'hotel_id': hotel_id,
            'description': f"这是{hotel_id}的详细描述...",
            'check_in': '14:00',
            'check_out': '12:00',
            'front_desk_24h': True,
            'luggage_storage': True,
            'currency': 'CNY',
            'languages': ['中文', '英文'],
            'year_opened': random.randint(2010, 2023),
            'renovated': random.randint(2015, 2024),
            'rooms_count': random.randint(200, 500),
            'floors': random.randint(10, 40),
            'parking_spaces': random.randint(50, 200),
        }
    
    def get_hotel_rooms(self, hotel_id: str, checkin: str,
                        checkout: str) -> List[Dict]:
        """返回模拟房型数据"""
        room_types = [
            {'name': '标准间', 'bed': '大床/双床', 'max_guests': 2, 'size': '25-30㎡'},
            {'name': '豪华间', 'bed': '大床', 'max_guests': 2, 'size': '35-40㎡'},
            {'name': '行政间', 'bed': '大床', 'max_guests': 2, 'size': '45-50㎡'},
            {'name': '套房', 'bed': '大床', 'max_guests': 3, 'size': '60-80㎡'},
            {'name': '家庭房', 'bed': '大床+小床', 'max_guests': 4, 'size': '50-60㎡'},
        ]
        
        rooms = []
        for i, rt in enumerate(room_types):
            base_price = random.randint(300, 1500)
            rooms.append({
                'room_id': f"{hotel_id}-R{i+1}",
                'name': rt['name'],
                'bed_type': rt['bed'],
                'max_guests': rt['max_guests'],
                'size': rt['size'],
                'floor': f"{random.randint(5, 35)}楼",
                'price': base_price,
                'price_original': int(base_price * 1.4),
                'breakfast': random.choice([True, False]),
                'cancellation': random.choice(['free', 'paid', 'none']),
                'pay_method': ['到店付', '预付'],
                'rooms_left': random.randint(1, 10),
                'bed_preference': random.choice(['大床', '双床', '无要求']),
            })
        
        return rooms


# 预留：真实 API 服务类（待实现）
# class CtripHotelService(HotelService):
#     """携程酒店服务"""
#     def __init__(self, api_key: str):
#         self.api_key = api_key
#     
#     def search_hotels(self, city, checkin, checkout, guests=1, rooms=1):
#         # TODO: 对接携程 API
#         pass


def get_hotel_service() -> HotelService:
    """获取酒店服务实例"""
    return MockHotelService()


# 便捷函数
def search_hotels(city: str, checkin: str, checkout: str,
                  guests: int = 1, rooms: int = 1) -> List[Dict]:
    """搜索酒店（便捷函数）"""
    service = get_hotel_service()
    return service.search_hotels(city, checkin, checkout, guests, rooms)


def get_hotel_detail(hotel_id: str) -> Optional[Dict]:
    """获取酒店详情（便捷函数）"""
    service = get_hotel_service()
    return service.get_hotel_detail(hotel_id)


def get_hotel_rooms(hotel_id: str, checkin: str, 
                    checkout: str) -> List[Dict]:
    """获取酒店房型（便捷函数）"""
    service = get_hotel_service()
    return service.get_hotel_rooms(hotel_id, checkin, checkout)