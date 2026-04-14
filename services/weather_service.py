# -*- coding: utf-8 -*-
"""
天气服务模块

封装心知天气 API，提供实时天气和预报功能。
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Optional


class WeatherService:
    """天气服务类"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('SENIVERSE_API_KEY', '')
        self.base_url = 'https://api.seniverse.com/v3'
    
    def get_current_weather(self, city: str) -> Optional[Dict]:
        """获取实时天气"""
        if not self.api_key:
            return self._get_mock_weather(city)
        
        try:
            url = f"{self.base_url}/weather/now.json"
            params = {
                'key': self.api_key,
                'location': city,
                'language': 'zh-Hans',
                'unit': 'c'
            }
            resp = requests.get(url, params=params, timeout=5)
            data = resp.json()
            
            if data.get('results'):
                result = data['results'][0]
                now = result.get('now', {})
                return {
                    'city': result['location']['name'],
                    'country': result['location']['country'],
                    'temperature': now.get('temperature'),
                    'weather': now.get('text'),
                    'wind_direction': now.get('wind_direction'),
                    'wind_scale': now.get('wind_scale'),
                    'humidity': now.get('humidity'),
                    'feels_like': now.get('feels_like'),
                    'last_update': result.get('last_update'),
                }
        except Exception as e:
            print(f"获取天气失败: {e}")
        
        return self._get_mock_weather(city)
    
    def get_forecast(self, city: str, days: int = 3) -> List[Dict]:
        """获取天气预报"""
        if not self.api_key:
            return self._get_mock_forecast(city, days)
        
        try:
            url = f"{self.base_url}/weather/daily.json"
            params = {
                'key': self.api_key,
                'location': city,
                'language': 'zh-Hans',
                'unit': 'c',
                'start': 0,
                'days': days
            }
            resp = requests.get(url, params=params, timeout=5)
            data = resp.json()
            
            if data.get('results'):
                result = data['results'][0]
                daily = result.get('daily', [])
                return [
                    {
                        'date': d.get('date'),
                        'text_day': d.get('text_day'),
                        'text_night': d.get('text_night'),
                        'high': d.get('high'),
                        'low': d.get('low'),
                        'wind_direction': d.get('wind_direction'),
                        'wind_scale': d.get('wind_scale'),
                        'rainfall': d.get('rainfall'),
                        'humidity': d.get('humidity'),
                    }
                    for d in daily
                ]
        except Exception as e:
            print(f"获取预报失败: {e}")
        
        return self._get_mock_forecast(city, days)
    
    def _get_mock_weather(self, city: str) -> Dict:
        """返回模拟实时天气"""
        import random
        weather_types = ['晴', '多云', '阴', '小雨', '晴转多云']
        return {
            'city': city,
            'country': '中国',
            'temperature': str(random.randint(15, 30)),
            'weather': random.choice(weather_types),
            'wind_direction': random.choice(['北风', '南风', '东风', '西风']),
            'wind_scale': str(random.randint(1, 5)),
            'humidity': str(random.randint(40, 80)),
            'feels_like': str(random.randint(14, 28)),
            'last_update': datetime.now().isoformat(),
        }
    
    def _get_mock_forecast(self, city: str, days: int) -> List[Dict]:
        """返回模拟预报数据"""
        import random
        weather_types = ['晴', '多云', '阴', '小雨', '晴转多云']
        forecasts = []
        for i in range(days):
            date = datetime.now().date()
            forecasts.append({
                'date': str(date),
                'text_day': random.choice(weather_types),
                'text_night': random.choice(weather_types),
                'high': str(random.randint(20, 32)),
                'low': str(random.randint(10, 20)),
                'wind_direction': random.choice(['北风', '南风', '东风', '西风']),
                'wind_scale': str(random.randint(1, 4)),
                'rainfall': str(round(random.uniform(0, 10), 1)),
                'humidity': str(random.randint(40, 80)),
            })
        return forecasts


# 全局实例
_weather_service = None

def get_weather_service() -> WeatherService:
    """获取天气服务实例"""
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service


# 便捷函数
def get_current_weather(city: str) -> Optional[Dict]:
    """获取实时天气"""
    service = get_weather_service()
    return service.get_current_weather(city)


def get_forecast(city: str, days: int = 3) -> List[Dict]:
    """获取天气预报"""
    service = get_weather_service()
    return service.get_forecast(city, days)