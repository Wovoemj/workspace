# 尝试不同的编码读取日志文件
encodings = ['utf-8', 'gbk', 'gb2312', 'ascii']

for enc in encodings:
    try:
        with open('logs/travel_assistant.log', 'r', encoding=enc) as f:
            lines = f.readlines()
            print(f"使用编码 {enc} 成功读取文件:")
            for line in lines[-20:]:
                print(line.strip())
            break
    except UnicodeDecodeError:
        print(f"使用编码 {enc} 读取失败")
        continue
else:
    print("无法使用常见编码读取文件")