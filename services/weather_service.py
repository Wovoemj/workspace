# -*- coding: utf-8 -*-
"""
============================================
天气服务模块
============================================

【模块说明】
- 封装心知天气API，提供实时天气和预报功能
- 支持真实API和Mock数据切换
- 提供单例模式的全局服务实例

【API文档】
- 心知天气API: https://api.seniverse.com/
- 需要申请API Key并设置环境变量 SENIVERSE_API_KEY
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Optional


class WeatherService:
    """天气服务类
    
    【功能】
    - 获取实时天气（温度、湿度、风力等）
    - 获取天气预报（3-7天）
    - API不可用时自动降级到模拟数据
    
    【使用方式】
    service = WeatherService()
    weather = service.get_current_weather('北京')
    forecast = service.get_forecast('北京', 3)
    """
    
    def __init__(self, api_key: str = None):
        """初始化天气服务
        
        Args:
            api_key: API密钥，优先使用参数，否则从环境变量读取
        """
        self.api_key = api_key or os.getenv('SENIVERSE_API_KEY', '')
        self.base_url = 'https://api.seniverse.com/v3'
    
    def get_current_weather(self, city: str) -> Optional[Dict]:
        """获取实时天气
        
        Args:
            city: 城市名称（支持中文、拼音、坐标等）
            
        Returns:
            天气数据字典，包含：
            - city: 城市名
            - country: 国家
            - temperature: 温度(℃)
            - weather: 天气状况
            - wind_direction: 风向
            - wind_scale: 风力等级
            - humidity: 湿度
            - feels_like: 体感温度
            - last_update: 更新时间
            
        【API调用】
        GET https://api.seniverse.com/v3/weather/now.json
        """
        # 无API Key时返回模拟数据
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
        
        # 失败时降级到模拟数据
        return self._get_mock_weather(city)
    
    def get_forecast(self, city: str, days: int = 3) -> List[Dict]:
        """获取天气预报
        
        Args:
            city: 城市名称
            days: 预报天数（1-7天）
            
        Returns:
            预报数据列表，每项包含：
            - date: 日期
            - text_day: 白天天气
            - text_night: 夜间天气
            - high: 最高温度
            - low: 最低温度
            - wind_direction: 风向
            - wind_scale: 风力等级
            - rainfall: 降水量
            - humidity: 湿度
            
        【API调用】
        GET https://api.seniverse.com/v3/weather/daily.json
        """
        # 无API Key时返回模拟数据
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
        
        # 失败时降级到模拟数据
        return self._get_mock_forecast(city, days)
    
    def _get_mock_weather(self, city: str) -> Dict:
        """返回模拟实时天气
        
        【生成规则】
        - 天气：随机选择晴/多云/阴/小雨/晴转多云
        - 温度：15-30℃随机
        - 湿度：40-80%随机
        - 风向：随机选择东西南北风
        """
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
        """返回模拟预报数据
        
        Args:
            city: 城市名
            days: 预报天数
        """
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


# =============================================
# 全局实例（单例模式）
# =============================================

# 全局天气服务实例，延迟初始化
_weather_service = None

def get_weather_service() -> WeatherService:
    """获取天气服务实例（单例）
    
    【好处】
    - 全局复用，避免重复创建实例
    - 节省资源
    """
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service


# =============================================
# 便捷函数
# =============================================
# 提供直接调用的简化接口

def get_current_weather(city: str) -> Optional[Dict]:
    """获取实时天气"""
    service = get_weather_service()
    return service.get_current_weather(city)


def get_forecast(city: str, days: int = 3) -> List[Dict]:
    """获取天气预报
    
    Args:
        city: 城市名称
        days: 预报天数（默认3天）
    """
    service = get_weather_service()
    return service.get_forecast(city, days)
