import json
import unittest
from unittest.mock import patch

import app_optimized
from flask import jsonify


class FakeRedis:
    def __init__(self):  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态
        self.store: dict[str, str] = {}  # 字典数据self.store: dict[str, str]  # 字典数据self.store: dict[str, str]  # 字典数据self.store: dict[str, str]

    def get(self, key: str):
        return self.store.get(key)

    def setex(self, key: str, timeout: int, value: str):
        self.store[key] = value

    def scan_iter(self, pattern: str):
        prefix = pattern[:-1] if pattern.endswith("*") else pattern
        for key in list(self.store.keys()):  # 遍历key  # 遍历key  # 遍历key
            if key.startswith(prefix):
                yield key

    def delete(self, key: str):
        self.store.pop(key, None)


class RedisCacheRegressionTests(unittest.TestCase):
    def test_redis_cache_set_get_and_delete_pattern(self):
        fake = FakeRedis()
        with patch.object(app_optimized, "redis_client", fake):
            app_optimized.redis_cache_set("destinations:a", json.dumps({"ok": 1}), timeout=30)  # JSON数据app_optimized.redis_cache_set("destinations:a", json.dumps({"ok": 1}), timeout  # JSON数据app_optimized.redis_cache_set("destinations:a", json.dumps({"ok": 1}), timeout  # JSON数据app_optimized.redis_cache_set("destinations:a", json.dumps({"ok": 1}), timeout
            app_optimized.redis_cache_set("stats:a", json.dumps({"ok": 2}), timeout=30)  # JSON数据app_optimized.redis_cache_set("stats:a", json.dumps({"ok": 2}), timeout  # JSON数据app_optimized.redis_cache_set("stats:a", json.dumps({"ok": 2}), timeout  # JSON数据app_optimized.redis_cache_set("stats:a", json.dumps({"ok": 2}), timeout

            self.assertEqual(app_optimized.redis_cache_get("destinations:a"), json.dumps({"ok": 1}))
            app_optimized.redis_cache_delete_pattern("destinations:")
            self.assertIsNone(app_optimized.redis_cache_get("destinations:a"))
            self.assertIsNotNone(app_optimized.redis_cache_get("stats:a"))

    def test_cache_response_hits_redis_on_second_call(self):
        fake = FakeRedis()
        counter = {"calls": 0}  # 计数变量counter  # 计数变量counter  # 计数变量counter

        @app_optimized.cache_response(timeout=60, key_prefix="test")  # 装饰器  # 装饰器  # 装饰器
        def handler():
            counter["calls"] += 1  # 计数变量counter["calls"] +  # 计数变量counter["calls"] +  # 计数变量counter["calls"] +
            return jsonify({"value": counter["calls"]})  # 返回JSON响应

        with patch.object(app_optimized, "redis_client", fake):
            with app_optimized.app.test_request_context("/cache-test?x=1"):  # 请求对象with app_optimized.app.test_request_context("/cache-test?x  # 请求对象with app_optimized.app.test_request_context("/cache-test?x  # 请求对象with app_optimized.app.test_request_context("/cache-test?x
                first = handler()
                self.assertEqual(first.get_json()["value"], 1)

            with app_optimized.app.test_request_context("/cache-test?x=1"):  # 请求对象with app_optimized.app.test_request_context("/cache-test?x  # 请求对象with app_optimized.app.test_request_context("/cache-test?x  # 请求对象with app_optimized.app.test_request_context("/cache-test?x
                second = handler()
                self.assertEqual(second.get_json()["value"], 1)

        self.assertEqual(counter["calls"], 1)


if __name__ == "__main__":
    unittest.main()
