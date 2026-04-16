#!/usr/bin/env python3
"""
生成PWA图标
需要安装: pip install cairosvg pillow
"""

import os
import subprocess
from PIL import Image
import io

# 图标尺寸列表
icon_sizes = [(72, 72), (96, 96), (128, 128), (144, 144), 
              (152, 152), (192, 192), (384, 384), (512, 512)]

def create_placeholder_icon(size):
    """创建占位图标"""
    from PIL import Image, ImageDraw
    
    # 创建新图像
    img = Image.new('RGBA', (size, size), (14, 165, 233, 255))  # #0ea5e9
    draw = ImageDraw.Draw(img)
    
    # 添加白色圆圈
    margin = size * 0.1
    draw.ellipse([margin, margin, size-margin, size-margin], fill=(255, 255, 255, 255))
    
    # 添加内部蓝色方块
    inner_margin = size * 0.3
    inner_size = size * 0.4
    draw.rectangle([inner_margin, inner_margin, 
                   inner_margin+inner_size, inner_margin+inner_size], 
                  fill=(14, 165, 233, 255))
    
    return img

def main():
    print("开始生成PWA图标...")
    
    # 检查是否安装了cairosvg
    try:
        import cairosvg
        use_svg = True
        print("检测到cairosvg，将使用SVG转换")
    except ImportError:
        use_svg = False
        print("未检测到cairosvg，将使用PIL生成占位图标")
    
    # 确保输出目录存在
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    for width, height in icon_sizes:
        filename = f"icon-{width}x{height}.png"
        filepath = os.path.join(output_dir, filename)
        
        try:
            if use_svg:
                # 使用cairosvg从SVG转换
                svg_path = os.path.join(output_dir, "icon.svg")
                if os.path.exists(svg_path):
                    cairosvg.svg2png(url=svg_path, write_to=filepath, 
                                     output_width=width, output_height=height)
                    print(f"✓ 生成 {filename}")
                else:
                    # 如果没有SVG，创建占位图标
                    img = create_placeholder_icon(width)
                    img.save(filepath, 'PNG')
                    print(f"✓ 生成占位图标 {filename}")
            else:
                # 使用PIL创建占位图标
                img = create_placeholder_icon(width)
                img.save(filepath, 'PNG')
                print(f"✓ 生成占位图标 {filename}")
                
        except Exception as e:
            print(f"✗ 生成 {filename} 失败: {e}")
    
    print("图标生成完成！")

if __name__ == "__main__":
    main()