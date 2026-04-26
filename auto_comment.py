#!/usr/bin/env python3
"""
代码自动添加中文注释脚本
用法：
    python auto_comment.py <文件路径>           # 给单个文件加注释
    python auto_comment.py <目录路径> --ext .py  # 给目录下所有 .py 文件加注释
    python auto_comment.py <文件路径> --dry-run  # 预览效果，不写入文件
"""

import os
import sys
import re
import argparse
import time

# 智谱 API 配置（从 .env 读取或直接用）
ZHIPU_API_KEY = "21b72c0e3f0c42b3bb48ede1cccf6fd7.kZWVri6LIu783YN8"
ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
ZHIPU_MODEL = "glm-4.6v"


def call_ai_for_comments(code: str, filename: str) -> str:
    """
    调用智谱 AI API，为代码添加中文注释
    """
    import requests
    import json

    # 检测文件类型
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.py']:
        lang = 'Python'
    elif ext in ['.tsx', '.ts']:
        lang = 'TypeScript'
    elif ext in ['.jsx', '.js']:
        lang = 'JavaScript'
    elif ext in ['.go']:
        lang = 'Go'
    elif ext in ['.css']:
        lang = 'CSS'
    else:
        lang = '代码'

    prompt = f"""你是一位资深{lang}开发工程师和导师。请为下面的{lang}代码添加详细的中文注释。

要求：
1. 在**关键行**上方或右侧添加中文注释，说明这行/这段代码的作用
2. 导入语句要注释说明这个库/模块的用途
3. 函数/类定义要注释说明功能和参数
4. 复杂的逻辑块要注释说明思路
5. 保持原有代码格式和缩进不变，只添加注释
6. 注释用 # 或 //，不要用文档字符串覆盖原有内容
7. 如果某行已经有注释，不要重复添加
8. 返回完整的、带注释的代码

文件名：{os.path.basename(filename)}

代码：
```
{code}
```

请直接返回带注释的完整代码，不要添加任何解释文字。"""

    headers = {
        "Authorization": f"Bearer {ZHIPU_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": ZHIPU_MODEL,
        "messages": [
            {"role": "system", "content": "你是资深代码注释专家，擅长为代码添加清晰的中文注释。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 8000
    }

    try:
        with requests.post(
            f"{ZHIPU_BASE_URL}/chat/completions",
            headers=headers,
            json=data,
            timeout=120
        ) as response:
            response.raise_for_status()
            result = response.json()
            content = result["choices"][0]["message"]["content"]

            # 提取代码块
            content = content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                # 去掉开头的 ```python 或 ```
                if lines[0].startswith("```"):
                    lines = lines[1:]
                # 去掉结尾的 ```
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                content = "\n".join(lines)

            return content.strip()
    except Exception as e:
        print(f"  API 调用失败: {e}")
        return None


def add_comments_to_file(filepath: str, dry_run: bool = False) -> bool:
    """
    为单个文件添加注释
    """
    print(f"\n处理文件: {filepath}")

    # 读取文件
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            original_code = f.read()
    except Exception as e:
        print(f"  读取失败: {e}")
        return False

    # 如果文件为空或太小，跳过
    if len(original_code.strip()) < 50:
        print(f"  文件太小，跳过")
        return False

    # 调用 AI 添加注释
    commented_code = call_ai_for_comments(original_code, filepath)
    if commented_code is None:
        return False

    # 检查是否真的有变化
    if commented_code.strip() == original_code.strip():
        print(f"  内容无变化，跳过")
        return False

    if dry_run:
        print(f"  [预览模式] 前 10 行注释效果:")
        for i, line in enumerate(commented_code.split("\n")[:15]):
            print(f"    {i+1}: {line}")
        return True

    # 备份原文件
    backup_path = filepath + ".backup"
    try:
        with open(backup_path, "w", encoding="utf-8") as f:
            f.write(original_code)
    except Exception as e:
        print(f"  备份失败: {e}")
        return False

    # 写入注释后的代码
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(commented_code)
        print(f"  注释添加成功，原文件备份为: {backup_path}")
        return True
    except Exception as e:
        print(f"  写入失败: {e}")
        # 恢复原文件
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(original_code)
        return False


def scan_directory(directory: str, extensions: list) -> list:
    """
    扫描目录，返回匹配扩展名的文件列表
    """
    files = []
    for root, _, filenames in os.walk(directory):
        # 跳过 node_modules 和 .next 等目录
        if any(skip in root for skip in ['node_modules', '.next', 'venv', '__pycache__', '.git']):
            continue
        for filename in filenames:
            if any(filename.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, filename)
                # 跳过已有 .backup 的文件（已经处理过）
                if os.path.exists(filepath + ".backup"):
                    continue
                files.append(filepath)
    return files


def main():
    parser = argparse.ArgumentParser(description='自动为代码文件添加中文注释')
    parser.add_argument('path', help='文件或目录路径')
    parser.add_argument('--ext', nargs='+', default=['.py', '.tsx', '.ts', '.jsx', '.js'],
                        help='要处理的文件扩展名，默认: .py .tsx .ts .jsx .js')
    parser.add_argument('--dry-run', action='store_true',
                        help='预览模式，不实际修改文件')
    parser.add_argument('--max-files', type=int, default=0,
                        help='最大处理文件数，0 表示不限制')

    args = parser.parse_args()

    target_path = os.path.abspath(args.path)

    if not os.path.exists(target_path):
        print(f"错误: 路径不存在: {target_path}")
        sys.exit(1)

    # 检查 API Key
    if not ZHIPU_API_KEY or ZHIPU_API_KEY == "your-api-key":
        print("错误: 请在脚本中设置 ZHIPU_API_KEY")
        sys.exit(1)

    # 单文件模式
    if os.path.isfile(target_path):
        success = add_comments_to_file(target_path, dry_run=args.dry_run)
        sys.exit(0 if success else 1)

    # 目录模式
    files = scan_directory(target_path, args.ext)
    print(f"找到 {len(files)} 个待处理文件")

    if not files:
        print("没有需要处理的文件")
        sys.exit(0)

    if not args.dry_run:
        print(f"\n注意: 这将调用 AI API 处理 {len(files)} 个文件，可能产生费用")
        print(f"预计耗时: 约 {len(files) * 10} 秒")
        confirm = input("确认继续? (y/n): ").strip().lower()
        if confirm != 'y':
            print("已取消")
            sys.exit(0)

    # 处理文件
    processed = 0
    failed = 0
    skipped = 0

    for i, filepath in enumerate(files, 1):
        if args.max_files > 0 and i > args.max_files:
            print(f"\n已达到最大处理数量 {args.max_files}，停止")
            break

        print(f"\n[{i}/{len(files)}] {filepath}")
        success = add_comments_to_file(filepath, dry_run=args.dry_run)

        if success:
            processed += 1
        else:
            failed += 1

        # 避免 API 限流
        if not args.dry_run and i < len(files):
            time.sleep(1)

    print(f"\n{'='*50}")
    print(f"处理完成!")
    print(f"  成功: {processed}")
    print(f"  失败: {failed}")
    print(f"  总计: {len(files)}")


if __name__ == "__main__":
    main()
