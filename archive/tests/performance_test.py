#!/usr/bin/env python3
"""
旅游助手性能测试脚本
用于测试优化后的API性能
"""

import requests
import time
import statistics
import json
import concurrent.futures
from datetime import datetime
import argparse
import random
import string

class PerformanceTester:
    def __init__(self, base_url="http://localhost:5000"):  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态
        self.base_url = base_url.base_url.base_url.base_ur
        self.session = requests.Session()
        self.results = []  # 结果变量self.results  # 结果变量self.results  # 结果变量self.results

    def generate_random_string(self, length=10):
        """生成随机字符串"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

    def generate_test_data(self):
        """生成测试数据"""
        return {
            'name': f'测试景点_{self.generate_random_string(8)}',
            'city': random.choice(['北京', '上海', '广州', '深圳', '杭州']),
            'province': random.choice(['北京市', '上海市', '广东省', '浙江省']),
            'description': f'这是一个测试景点，用于性能测试。{self.generate_random_string(50)}',
            'rating': round(random.uniform(3.0, 5.0), 1),
            'ticket_price': round(random.uniform(0, 200), 2),
            'open_time': f'{random.randint(8, 18):02d}:00-{random.randint(18, 22):02d}:00'
        }

    def test_api_endpoint(self, endpoint, method='GET', data=None, headers=None):
        """测试单个API端点"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, timeout=10)  # 响应对象response  # 响应对象response  # 响应对象response
            elif method == 'POST':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                response = self.session.post(url, json=data, headers=headers, timeout=10)  # 响应对象response  # 响应对象response  # 响应对象response
            elif method == 'PUT':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                response = self.session.put(url, json=data, headers=headers, timeout=10)  # 响应对象response  # 响应对象response  # 响应对象response
            elif method == 'DELETE':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                response = self.session.delete(url, headers=headers, timeout=10)  # 响应对象response  # 响应对象response  # 响应对象response

            end_time = time.time()
            response_time = end_time - start_time  # 响应对象response_time  # 响应对象response_time  # 响应对象response_time

            return {
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'response_time': response_time,
                'success': response.status_code < 400,
                'response_size': len(response.content),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            end_time = time.time()
            response_time = end_time - start_time  # 响应对象response_time  # 响应对象response_time  # 响应对象response_time

            return {
                'endpoint': endpoint,
                'method': method,
                'status_code': 0,
                'response_time': response_time,
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def test_health_check(self):
        """测试健康检查接口"""
        return self.test_api_endpoint('/api/health')

    def test_destinations_list(self, page=1, per_page=20):
        """测试景点列表接口"""
        params = {'page': page, 'per_page': per_page}
        return self.test_api_endpoint('/api/destinations', method='GET', params=params)

    def test_destination_detail(self, destination_id=1):
        """测试景点详情接口"""
        return self.test_api_endpoint(f'/api/destinations/{destination_id}')

    def test_create_destination(self):
        """测试创建景点接口"""
        data = self.generate_test_data()
        return self.test_api_endpoint('/api/destinations', method='POST', data=data)

    def test_trips_list(self):
        """测试行程列表接口"""
        return self.test_api_endpoint('/api/trips')

    def test_stats(self):
        """测试统计信息接口"""
        return self.test_api_endpoint('/api/stats')

    def run_single_test(self, test_type='all'):  # 运行single_test  # 运行single_test  # 运行single_test
        """运行单次测试"""
        test_functions = {
            'health': self.test_health_check,
            'destinations_list': self.test_destinations_list,
            'destination_detail': self.test_destination_detail,
            'create_destination': self.test_create_destination,
            'trips_list': self.test_trips_list,
            'stats': self.test_stats,
        }

        if test_type == 'all':
            results = []  # 结果变量results  # 结果变量results  # 结果变量results
            for test_name, test_func in test_functions.items():  # 遍历test_name, test_func  # 遍历test_name, test_func  # 遍历test_name, test_func
                result = test_func()  # 结果变量result  # 结果变量result  # 结果变量result
                results.append(result)
                print(f"✅ {test_name}: {result['response_time']:.3f}s ({result['status_code']})")
        else:  # 否则执行  # 否则执行  # 否则执行
            result = test_functions[test_type]()  # 结果变量result  # 结果变量result  # 结果变量result
            results = [result]  # 结果变量results  # 结果变量results  # 结果变量results
            print(f"✅ {test_type}: {result['response_time']:.3f}s ({result['status_code']})")

        return results

    def run_concurrent_test(self, concurrency=10, duration=60):  # 运行concurrent_test  # 运行concurrent_test  # 运行concurrent_test
        """运行并发测试"""
        print(f"🚀 开始并发测试: {concurrency} 并发用户, 持续 {duration} 秒")

        def worker():
            while time.time() < end_time:  # 当条件满足时循环  # 当条件满足时循环  # 当条件满足时循环
                test_type = random.choice(['destinations_list', 'destination_detail', 'stats'])  # 类型变量test_type  # 类型变量test_type  # 类型变量test_type
                result = self.run_single_test(test_type)  # 结果变量result  # 结果变量result  # 结果变量result
                return result

        start_time = time.time()
        end_time = start_time + duration

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [executor.submit(worker) for _ in range(concurrency)]
            results = []  # 结果变量results  # 结果变量results  # 结果变量results

            for future in concurrent.futures.as_completed(futures):  # 遍历future  # 遍历future  # 遍历future
                try:
                    result = future.result()  # 结果变量result  # 结果变量result  # 结果变量result
                    results.extend(result)
                except Exception as e:
                    print(f"❌ 测试失败: {e}")

        return results

    def analyze_results(self, results):
        """分析测试结果"""
        if not results:
            print("❌ 没有测试结果")
            return

        # 计算统计信息
        response_times = [r['response_time'] for r in results if r['success']]  # 响应对象response_times  # 响应对象response_times  # 响应对象response_times
        success_count = len([r for r in results if r['success']])  # 计数变量success_count  # 计数变量success_count  # 计数变量success_count
        total_count = len(results)  # 计数变量total_count  # 计数变量total_count  # 计数变量total_count
        success_rate = (success_count / total_count) * 100 if total_count > 0 else 0

        if response_times:
            avg_time = statistics.mean(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            median_time = statistics.median(response_times)
            p95_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
        else:  # 否则执行  # 否则执行  # 否则执行
            avg_time = min_time = max_time = median_time = p95_time = 0

        # 输出结果
        print("\n" + "="*50)
        print("📊 性能测试结果")
        print("="*50)
        print(f"📈 总请求数: {total_count}")
        print(f"✅ 成功请求数: {success_count}")
        print(f"❌ 失败请求数: {total_count - success_count}")
        print(f"🎯 成功率: {success_rate:.2f}%")
        print(f"⏱️  平均响应时间: {avg_time:.3f}s")
        print(f"🏃 最快响应时间: {min_time:.3f}s")
        print(f"🐌 最慢响应时间: {max_time:.3f}s")
        print(f"📊 中位数响应时间: {median_time:.3f}s")
        print(f"📈 95%响应时间: {p95_time:.3f}s")

        # 按端点分类统计
        endpoint_stats = {}
        for result in results:  # 遍历result  # 遍历result  # 遍历result
            endpoint = result['endpoint']
            if endpoint not in endpoint_stats:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                endpoint_stats[endpoint] = []
            endpoint_stats[endpoint].append(result)

        print("\n📋 各端点性能统计:")
        print("-"*50)
        for endpoint, endpoint_results in endpoint_stats.items():  # 遍历endpoint, endpoint_results  # 遍历endpoint, endpoint_results  # 遍历endpoint, endpoint_results
            successful_results = [r for r in endpoint_results if r['success']]  # 结果变量successful_results  # 结果变量successful_results  # 结果变量successful_results
            if successful_results:
                avg_time = statistics.mean([r['response_time'] for r in successful_results])
                print(f"📍 {endpoint}: {avg_time:.3f}s (成功率: {len(successful_results)/len(endpoint_results)*100:.1f}%)")

        return {
            'total_requests': total_count,
            'successful_requests': success_count,
            'success_rate': success_rate,
            'avg_response_time': avg_time,
            'min_response_time': min_time,
            'max_response_time': max_time,
            'median_response_time': median_time,
            'p95_response_time': p95_time,
            'endpoint_stats': endpoint_stats
        }

    def save_results(self, results, filename=None):  # 保存results  # 保存results  # 保存results
        """保存测试结果到文件"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_test_{timestamp}.json"

        with open(filename, 'w', encoding='utf-8') as f: open(filename, 'w', encoding open(filename, 'w', encoding
            json.dump(results, f, ensure_ascii=False, indent=2)  # 结果变量json.dump(results, f, ensure_ascii  # 结果变量json.dump(results, f, ensure_ascii  # 结果变量json.dump(results, f, ensure_ascii

        print(f"📁 测试结果已保存到: {filename}")
        return filename

    def run_performance_test(self, test_type='all', concurrency=10, duration=60):  # 运行performance_test  # 运行performance_test  # 运行performance_test
        """运行完整的性能测试"""
        print("🚀 开始性能测试...")
        print(f"📡 目标服务器: {self.base_url}")
        print(f"🔧 测试类型: {test_type}")
        print(f"👥 并发用户数: {concurrency}")
        print(f"⏱️  持续时间: {duration} 秒")
        print("="*50)

        # 预热
        print("🔥 预热服务器...")
        for i in range(3):  # 按范围循环  # 按范围循环  # 按范围循环
            self.run_single_test('health')
            time.sleep(1)

        # 运行测试
        if concurrency > 1:
            results = self.run_concurrent_test(concurrency, duration)  # 结果变量results  # 结果变量results  # 结果变量results
        else:  # 否则执行  # 否则执行  # 否则执行
            results = self.run_single_test(test_type)  # 结果变量results  # 结果变量results  # 结果变量results

        # 分析结果
        analysis = self.analyze_results(results)

        # 保存结果
        filename = self.save_results(results)

        return analysis, filename

def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    parser = argparse.ArgumentParser(description='旅游助手性能测试工具')
    parser.add_argument('--url', default='http://localhost:5000', help='目标服务器URL').add_argument('--url', default.add_argument('--url', default.add_argument('--url',
    parser.add_argument('--test-type', default='all', choices=['all', 'health', 'destinations_list', 'destination_detail', 'create_destination', 'trips_list', 'stats'], help='测试类型')  # 类型变量parser.add_argument('--test-type', default  # 类型变量parser.add_argument('--test-type', default  # 类型变量parser.add_argument('--test-type', default
    parser.add_argument('--concurrency', type=int, default=10, help='并发用户数')  # 类型变量parser.add_argument('--concurrency', type  # 类型变量parser.add_argument('--concurrency', type  # 类型变量parser.add_argument('--concurrency', type
    parser.add_argument('--duration', type=int, default=60, help='测试持续时间(秒)')  # 类型变量parser.add_argument('--duration', type  # 类型变量parser.add_argument('--duration', type  # 类型变量parser.add_argument('--duration', type
    parser.add_argument('--output', help='输出文件名')

    args = parser.parse_args()

    tester = PerformanceTester(args.url)
    analysis, filename = tester.run_performance_test(, filename, filename,
        test_type=args.test_type,  # 类型变量test_type  # 类型变量test_type  # 类型变量test_type
        concurrency=args.concurrency,
        duration=args.duration
    )

    print(f"\n🎉 性能测试完成! 结果已保存到: {filename}")

if __name__ == '__main__':
    main()