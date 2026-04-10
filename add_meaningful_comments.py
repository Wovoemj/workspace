#!/usr/bin/env python3
"""
为项目代码添加有意义的中文注释
"""

import os
import re
from pathlib import Path

# 文件扩展名映射
EXTENSIONS = {
    '.py': 'python',
    '.tsx': 'typescript',
    '.ts': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
}

# 忽略的文件/目录
IGNORE_PATTERNS = [
    'node_modules',
    '.next',
    '__pycache__',
    'venv',
    '.git',
    'dist',
    'build',
    '.workbuddy',
    'instance',
    'scenic_images',
]


def should_ignore(filepath):
    """检查是否应该忽略该文件"""
    for pattern in IGNORE_PATTERNS:
        if pattern in filepath:
            return True
    return False


def remove_existing_comments(content, lang):
    """移除已有的自动注释"""
    if lang == 'python':
        # 移除
        lines = content.split('\n')
        result = []
        for line in lines:

            if '
                line = line.split('
            result.append(line)
        return '\n'.join(result)
    else:

        content = re.sub(r'\s*/\*\s*自动注释 第\d+行\s*\*/', '', content)
        return content


def add_meaningful_comments_to_python(content):
    """为 Python 代码添加有意义的注释"""
    lines = content.split('\n')
    result = []
    in_multiline_string = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # 处理多行字符串
        if '"""' in stripped:
            count = stripped.count('"""')
            if count % 2 == 1:
                in_multiline_string = not in_multiline_string
            result.append(line)
            continue
        if in_multiline_string:
            result.append(line)
            continue

        # 跳过空行和已有注释的行
        if not stripped or stripped.startswith('#'):
            result.append(line)
            continue

        # 获取缩进
        indent = len(line) - len(line.lstrip())

        comment = None

        # 导入语句 - 解释用途
        if stripped.startswith('import '):
            module = stripped[7:].split()[0].split('.')[0]
            comment = f"# 导入{module}模块"
        elif stripped.startswith('from '):
            module = stripped[5:].split(' import')[0].split('.')[0]
            comment = f"

        # 函数定义 - 解释作用
        elif stripped.startswith('def '):
            func_name = stripped[4:].split('(')[0].strip()
            if func_name == '__init__':
                comment = "# 初始化方法：设置对象初始状态"
            elif func_name.startswith('get_'):
                comment = f"# 获取{func_name[4:]}数据"
            elif func_name.startswith('set_'):
                comment = f"# 设置{func_name[4:]}值"
            elif func_name.startswith('is_'):
                comment = f"# 检查是否为{func_name[3:]}"
            elif func_name.startswith('has_'):
                comment = f"# 检查是否包含{func_name[4:]}"
            elif func_name.startswith('create_'):
                comment = f"# 创建{func_name[7:]}"
            elif func_name.startswith('update_'):
                comment = f"# 更新{func_name[7:]}"
            elif func_name.startswith('delete_'):
                comment = f"# 删除{func_name[7:]}"
            elif func_name.startswith('search_'):
                comment = f"# 搜索{func_name[7:]}"
            elif func_name.startswith('fetch_'):
                comment = f"# 获取{func_name[6:]}"
            elif func_name.startswith('process_'):
                comment = f"# 处理{func_name[8:]}"
            elif func_name.startswith('validate_'):
                comment = f"# 验证{func_name[9:]}"
            elif func_name.startswith('format_'):
                comment = f"# 格式化{func_name[7:]}"
            elif func_name.startswith('parse_'):
                comment = f"# 解析{func_name[6:]}"
            elif func_name.startswith('convert_'):
                comment = f"# 转换{func_name[8:]}"
            elif func_name.startswith('load_'):
                comment = f"# 加载{func_name[5:]}"
            elif func_name.startswith('save_'):
                comment = f"# 保存{func_name[5:]}"
            elif func_name.startswith('handle_'):
                comment = f"# 处理{func_name[7:]}"
            elif func_name.startswith('run_'):
                comment = f"# 运行{func_name[4:]}"
            elif func_name.startswith('main'):
                comment = "# 主函数：程序入口点"
            else:
                comment = f"# 定义{func_name}函数"

        # 类定义 - 解释用途
        elif stripped.startswith('class '):
            class_name = stripped[6:].split('(')[0].split(':')[0].strip()
            if class_name.endswith('Model'):
                comment = f"# 定义{class_name}数据模型"
            elif class_name.endswith('View'):
                comment = f"# 定义{class_name}视图"
            elif class_name.endswith('Controller'):
                comment = f"# 定义{class_name}控制器"
            elif class_name.endswith('Service'):
                comment = f"# 定义{class_name}服务"
            elif class_name.endswith('Handler'):
                comment = f"# 定义{class_name}处理器"
            elif class_name.endswith('Exception'):
                comment = f"# 定义{class_name}异常"
            elif class_name.endswith('Test'):
                comment = f"# 定义{class_name}测试类"
            elif class_name.endswith('Config'):
                comment = f"# 定义{class_name}配置"
            else:
                comment = f"# 定义{class_name}类"

        # 返回语句
        elif stripped.startswith('return '):
            if stripped == 'return None':
                comment = "# 返回空值"
            elif stripped == 'return True':
                comment = "# 返回成功"
            elif stripped == 'return False':
                comment = "# 返回失败"
            elif stripped == 'return []':
                comment = "# 返回空列表"
            elif stripped == 'return {}':
                comment = "# 返回空字典"
            elif 'jsonify' in stripped:
                comment = "# 返回JSON响应"
            else:
                comment = "# 返回结果"

        # 条件判断
        elif stripped.startswith('if '):
            if 'is None' in stripped:
                comment = "# 检查是否为空"
            elif 'is not None' in stripped:
                comment = "# 检查是否不为空"
            elif '==' in stripped:
                comment = "# 判断是否相等"
            elif '!=' in stripped:
                comment = "# 判断是否不相等"
            elif 'in ' in stripped:
                comment = "# 检查是否包含"
            elif 'not in ' in stripped:
                comment = "# 检查是否不包含"
            elif stripped.startswith('if __name__'):
                comment = "# 判断是否为主程序入口"
            elif 'try:' in stripped:
                comment = "# 尝试执行代码块"
            else:
                comment = "# 条件判断"

        elif stripped.startswith('elif '):
            comment = "# 否则如果满足此条件"

        elif stripped.startswith('else:'):
            comment = "# 否则执行"

        # 循环
        elif stripped.startswith('for '):
            if 'enumerate' in stripped:
                comment = "# 遍历并获取索引"
            elif 'range(' in stripped:
                comment = "# 按范围循环"
            elif 'in ' in stripped:
                var = stripped[4:].split(' in ')[0].strip()
                comment = f"# 遍历{var}"
            else:
                comment = "# 循环遍历"

        elif stripped.startswith('while '):
            comment = "# 当条件满足时循环"

        # 异常处理
        elif stripped.startswith('try:'):
            comment = "# 尝试执行可能出错的代码"

        elif stripped.startswith('except'):
            if 'Exception' in stripped:
                comment = "# 捕获所有异常"
            else:
                comment = "# 捕获异常"

        elif stripped.startswith('finally:'):
            comment = "# 无论是否异常都执行"

        elif stripped.startswith('raise '):
            comment = "# 抛出异常"

        # 配置参数
        elif stripped.startswith('DEBUG'):
            comment = "# 调试模式开关"
        elif stripped.startswith('SECRET_KEY'):
            comment = "# 密钥配置（用于加密）"
        elif stripped.startswith('SQLALCHEMY_'):
            comment = "# SQLAlchemy数据库配置"
        elif stripped.startswith('API_KEY'):
            comment = "# API密钥配置"
        elif stripped.startswith('BASE_URL'):
            comment = "# 基础URL配置"
        elif stripped.startswith('TIMEOUT'):
            comment = "# 超时配置（秒）"
        elif stripped.startswith('MAX_'):
            comment = "# 最大值限制配置"
        elif stripped.startswith('MIN_'):
            comment = "# 最小值限制配置"

        # 装饰器
        elif stripped.startswith('@app.route'):
            comment = "# 定义路由端点"
        elif stripped.startswith('@app.'):
            comment = "# Flask应用装饰器"
        elif stripped.startswith('@property'):
            comment = "# 将方法转为属性"
        elif stripped.startswith('@staticmethod'):
            comment = "# 静态方法装饰器"
        elif stripped.startswith('@classmethod'):
            comment = "# 类方法装饰器"
        elif stripped.startswith('@login_required'):
            comment = "# 需要登录才能访问"
        elif stripped.startswith('@jwt_required'):
            comment = "# 需要JWT认证"
        elif stripped.startswith('@cache'):
            comment = "# 缓存装饰器"
        elif stripped.startswith('@'):
            comment = "# 装饰器"

        # 变量赋值
        elif '=' in stripped and not stripped.startswith('==') and not stripped.startswith('>=') and not stripped.startswith('<='):
            var_name = stripped.split('=')[0].strip()
            value = stripped.split('=')[1].strip() if '=' in stripped else ''

            # 特殊变量名
            if 'db' in var_name.lower() and 'Column' in value:
                comment = f"# 定义数据库字段{var_name}"
            elif 'config' in var_name.lower():
                comment = f"# 配置参数{var_name}"
            elif 'url' in var_name.lower():
                comment = f"# URL地址{var_name}"
            elif 'path' in var_name.lower() or 'dir' in var_name.lower():
                comment = f"# 路径配置{var_name}"
            elif 'key' in var_name.lower():
                comment = f"# 密钥配置{var_name}"
            elif 'token' in var_name.lower():
                comment = f"# 令牌配置{var_name}"
            elif 'user' in var_name.lower():
                comment = f"# 用户相关变量{var_name}"
            elif 'data' in var_name.lower():
                comment = f"# 数据变量{var_name}"
            elif 'result' in var_name.lower():
                comment = f"# 结果变量{var_name}"
            elif 'response' in var_name.lower():
                comment = f"# 响应对象{var_name}"
            elif 'request' in var_name.lower():
                comment = f"# 请求对象{var_name}"
            elif 'query' in var_name.lower():
                comment = f"# 查询对象{var_name}"
            elif 'filter' in var_name.lower():
                comment = f"# 过滤条件{var_name}"
            elif 'order' in var_name.lower():
                comment = f"# 排序条件{var_name}"
            elif 'limit' in var_name.lower():
                comment = f"# 数量限制{var_name}"
            elif 'offset' in var_name.lower():
                comment = f"# 偏移量{var_name}"
            elif 'page' in var_name.lower():
                comment = f"# 页码{var_name}"
            elif 'count' in var_name.lower():
                comment = f"# 计数变量{var_name}"
            elif 'total' in var_name.lower():
                comment = f"# 总数变量{var_name}"
            elif 'id' in var_name.lower():
                comment = f"# 标识符{var_name}"
            elif 'name' in var_name.lower():
                comment = f"# 名称变量{var_name}"
            elif 'status' in var_name.lower():
                comment = f"# 状态变量{var_name}"
            elif 'type' in var_name.lower():
                comment = f"# 类型变量{var_name}"
            elif 'error' in var_name.lower():
                comment = f"# 错误信息{var_name}"
            elif 'message' in var_name.lower():
                comment = f"# 消息内容{var_name}"
            elif 'content' in var_name.lower():
                comment = f"# 内容变量{var_name}"
            elif 'item' in var_name.lower():
                comment = f"# 单条数据{var_name}"
            elif 'items' in var_name.lower():
                comment = f"# 数据列表{var_name}"
            elif 'list' in var_name.lower():
                comment = f"# 列表数据{var_name}"
            elif 'dict' in var_name.lower():
                comment = f"# 字典数据{var_name}"
            elif 'json' in var_name.lower():
                comment = f"# JSON数据{var_name}"

        # 方法调用
        elif '(' in stripped and stripped.endswith(')'):
            if stripped.startswith('print('):
                comment = "# 输出调试信息"
            elif 'append(' in stripped:
                comment = "# 添加元素到列表"
            elif 'extend(' in stripped:
                comment = "# 扩展列表"
            elif 'remove(' in stripped:
                comment = "# 移除元素"
            elif 'pop(' in stripped:
                comment = "# 弹出元素"
            elif 'get(' in stripped:
                comment = "# 获取值"
            elif 'setdefault(' in stripped:
                comment = "# 设置默认值"
            elif 'update(' in stripped:
                comment = "# 更新数据"
            elif 'commit(' in stripped:
                comment = "# 提交事务"
            elif 'rollback(' in stripped:
                comment = "# 回滚事务"
            elif 'close(' in stripped:
                comment = "# 关闭连接"
            elif 'open(' in stripped:
                comment = "# 打开文件"
            elif 'read(' in stripped:
                comment = "# 读取数据"
            elif 'write(' in stripped:
                comment = "# 写入数据"
            elif 'jsonify(' in stripped:
                comment = "# 转换为JSON响应"
            elif 'filter(' in stripped:
                comment = "# 过滤数据"
            elif 'map(' in stripped:
                comment = "# 映射转换"
            elif 'reduce(' in stripped:
                comment = "# 归约计算"
            elif 'sort(' in stripped:
                comment = "# 排序数据"
            elif 'reverse(' in stripped:
                comment = "# 反转数据"
            elif 'join(' in stripped:
                comment = "# 连接字符串"
            elif 'split(' in stripped:
                comment = "# 分割字符串"
            elif 'strip(' in stripped:
                comment = "# 去除空白"
            elif 'replace(' in stripped:
                comment = "# 替换内容"
            elif 'find(' in stripped:
                comment = "# 查找位置"
            elif 'index(' in stripped:
                comment = "# 获取索引"
            elif 'count(' in stripped:
                comment = "# 统计数量"
            elif 'startswith(' in stripped:
                comment = "# 检查开头"
            elif 'endswith(' in stripped:
                comment = "# 检查结尾"
            elif 'encode(' in stripped:
                comment = "# 编码转换"
            elif 'decode(' in stripped:
                comment = "# 解码转换"
            elif 'format(' in stripped:
                comment = "# 格式化字符串"
            elif 'strftime(' in stripped:
                comment = "# 格式化日期"
            elif 'strptime(' in stripped:
                comment = "# 解析日期"
            elif 'now(' in stripped:
                comment = "# 获取当前时间"
            elif 'utcnow(' in stripped:
                comment = "# 获取UTC时间"
            elif 'sleep(' in stripped:
                comment = "# 休眠等待"
            elif 'time(' in stripped:
                comment = "# 获取时间戳"
            elif 'random(' in stripped:
                comment = "# 生成随机数"
            elif 'choice(' in stripped:
                comment = "# 随机选择"
            elif 'shuffle(' in stripped:
                comment = "# 随机打乱"
            elif 'uuid' in stripped:
                comment = "# 生成UUID"
            elif 'hash' in stripped:
                comment = "# 计算哈希值"
            elif 'md5' in stripped:
                comment = "# MD5哈希"
            elif 'sha256' in stripped:
                comment = "# SHA256哈希"
            elif 'base64' in stripped:
                comment = "# Base64编码"
            elif 'urlencode' in stripped:
                comment = "# URL编码"
            elif 'urldecode' in stripped:
                comment = "# URL解码"
            elif 'quote' in stripped:
                comment = "# 引用编码"
            elif 'unquote' in stripped:
                comment = "# 引用解码"
            elif 'loads(' in stripped:
                comment = "# JSON解析"
            elif 'dumps(' in stripped:
                comment = "# JSON序列化"
            elif 'request' in stripped:
                comment = "# 发送HTTP请求"
            elif 'getenv' in stripped:
                comment = "# 获取环境变量"
            elif 'environ' in stripped:
                comment = "# 环境变量"
            elif 'exit(' in stripped:
                comment = "# 退出程序"
            elif 'quit(' in stripped:
                comment = "# 退出程序"
            elif 'breakpoint(' in stripped:
                comment = "# 设置断点"

        # 添加注释
        if comment:
            result.append(f"{line}  {comment}")
        else:
            result.append(line)

    return '\n'.join(result)


def add_meaningful_comments_to_typescript(content):
    """为 TypeScript/React 代码添加有意义的注释"""
    lines = content.split('\n')
    result = []
    in_jsx = False
    in_multiline_comment = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # 处理多行注释
        if '/*' in stripped and '*/' not in stripped:
            in_multiline_comment = True
            result.append(line)
            continue
        if in_multiline_comment:
            if '*/' in stripped:
                in_multiline_comment = False
            result.append(line)
            continue

        # 处理 JSX
        if stripped.startswith('return (') or stripped.startswith('return('):
            in_jsx = True
        elif in_jsx and stripped == ')' or stripped == ');':
            in_jsx = False

        # 跳过空行和已有注释的行
        if not stripped or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
            result.append(line)
            continue

        comment = None

        # 导入语句
        if stripped.startswith('import '):
            if 'from ' in stripped:
                module = stripped.split('from')[1].strip().strip('"\';')
                comment = f"// 从{module}导入"
            else:
                comment = "// 导入模块"

        # 导出语句
        elif stripped.startswith('export '):
            if 'default' in stripped:
                comment = "// 默认导出"
            else:
                comment = "// 导出模块"

        # 函数/组件定义
        elif 'function ' in stripped or ('const ' in stripped and '=>' in stripped):
            if 'function ' in stripped:
                func_name = stripped.split('function ')[1].split('(')[0].strip()
            elif 'const ' in stripped and '=>' in stripped:
                func_name = stripped.split('const ')[1].split('=')[0].strip()
            else:
                func_name = ""

            if func_name.startswith('use'):
                comment = f"// 自定义Hook {func_name}"
            elif func_name[0].isupper():
                comment = f"// {func_name}组件"
            elif 'handle' in func_name.lower():
                comment = f"// 处理{func_name}事件"
            elif 'fetch' in func_name.lower():
                comment = f"// 获取{func_name}数据"
            elif 'get' in func_name.lower():
                comment = f"// 获取{func_name}"
            elif 'set' in func_name.lower():
                comment = f"// 设置{func_name}"
            elif 'on' in func_name.lower():
                comment = f"// {func_name}事件处理"
            elif 'validate' in func_name.lower():
                comment = f"// 验证{func_name}"
            elif 'format' in func_name.lower():
                comment = f"// 格式化{func_name}"
            elif 'parse' in func_name.lower():
                comment = f"// 解析{func_name}"
            elif 'convert' in func_name.lower():
                comment = f"// 转换{func_name}"
            elif 'load' in func_name.lower():
                comment = f"// 加载{func_name}"
            elif 'save' in func_name.lower():
                comment = f"// 保存{func_name}"
            else:
                comment = f"// {func_name}函数"

        # 类定义
        elif stripped.startswith('class '):
            class_name = stripped.split('class ')[1].split(' ')[0].split('{')[0].strip()
            if class_name.endswith('Component'):
                comment = f"// {class_name}组件类"
            elif class_name.endswith('Service'):
                comment = f"// {class_name}服务类"
            elif class_name.endswith('Controller'):
                comment = f"// {class_name}控制器类"
            elif class_name.endswith('Model'):
                comment = f"// {class_name}模型类"
            elif class_name.endswith('Store'):
                comment = f"// {class_name}状态存储"
            elif class_name.endswith('Hook'):
                comment = f"// {class_name}自定义Hook"
            else:
                comment = f"// {class_name}类"

        # 接口定义
        elif stripped.startswith('interface '):
            interface_name = stripped.split('interface ')[1].split(' ')[0].split('{')[0].strip()
            comment = f"// {interface_name}接口定义"

        # 类型定义
        elif stripped.startswith('type '):
            type_name = stripped.split('type ')[1].split('=')[0].strip()
            comment = f"// {type_name}类型定义"

        # return 语句
        elif stripped.startswith('return '):
            if stripped == 'return null':
                comment = "// 返回null"
            elif stripped == 'return undefined':
                comment = "// 返回undefined"
            elif stripped == 'return true':
                comment = "// 返回true"
            elif stripped == 'return false':
                comment = "// 返回false"
            elif 'return (' in stripped or stripped.startswith('return('):
                comment = "// 返回JSX"
            else:
                comment = "// 返回结果"

        # 条件判断
        elif stripped.startswith('if ('):
            if '===' in stripped:
                comment = "// 严格相等判断"
            elif '==' in stripped:
                comment = "// 相等判断"
            elif '!==' in stripped:
                comment = "// 严格不相等判断"
            elif '!=' in stripped:
                comment = "// 不相等判断"
            elif '&&' in stripped:
                comment = "// 逻辑与判断"
            elif '||' in stripped:
                comment = "// 逻辑或判断"
            else:
                comment = "// 条件判断"

        elif stripped.startswith('else if ('):
            comment = "// 否则如果"

        elif stripped.startswith('else'):
            comment = "// 否则"

        elif stripped.startswith('switch ('):
            comment = "// 多分支判断"

        elif stripped.startswith('case '):
            comment = "// 匹配此情况"

        elif stripped.startswith('default:'):
            comment = "// 默认情况"

        # 循环
        elif stripped.startswith('for ('):
            comment = "// 循环遍历"

        elif stripped.startswith('while ('):
            comment = "// 当条件满足时循环"

        elif stripped.startswith('do {'):
            comment = "// 执行循环"

        # 异常处理
        elif stripped.startswith('try {'):
            comment = "// 尝试执行"

        elif stripped.startswith('catch ('):
            comment = "// 捕获异常"

        elif stripped.startswith('finally {'):
            comment = "// 最终执行"

        elif stripped.startswith('throw '):
            comment = "// 抛出异常"

        # Hook 调用
        elif stripped.startswith('useState('):
            comment = "// 定义状态"

        elif stripped.startswith('useEffect('):
            comment = "// 副作用处理"

        elif stripped.startswith('useCallback('):
            comment = "// 缓存回调函数"

        elif stripped.startswith('useMemo('):
            comment = "// 缓存计算结果"

        elif stripped.startswith('useRef('):
            comment = "// 创建引用"

        elif stripped.startswith('useContext('):
            comment = "// 使用上下文"

        elif stripped.startswith('useReducer('):
            comment = "// 状态管理"

        elif stripped.startswith('useSelector('):
            comment = "// 选择状态"

        elif stripped.startswith('useDispatch('):
            comment = "// 派发动作"

        elif stripped.startswith('useRouter('):
            comment = "// 获取路由"

        elif stripped.startswith('useSearchParams('):
            comment = "// 获取查询参数"

        elif stripped.startswith('usePathname('):
            comment = "// 获取路径名"

        elif stripped.startswith('useParams('):
            comment = "// 获取路由参数"

        # JSX 组件
        elif in_jsx and stripped.startswith('<') and not stripped.startswith('</'):
            tag = stripped.split(' ')[0].split('>')[0][1:]
            if tag and tag[0].isupper():
                comment = f"// 渲染{tag}组件"
            elif tag in ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                comment = f"// {tag}元素"
            elif tag in ['button', 'input', 'form', 'label', 'select', 'option']:
                comment = f"// 表单{tag}元素"
            elif tag in ['img', 'video', 'audio']:
                comment = f"// 媒体{tag}元素"
            elif tag in ['a', 'link']:
                comment = f"// 链接元素"
            elif tag in ['ul', 'ol', 'li']:
                comment = f"// 列表元素"
            elif tag in ['table', 'tr', 'td', 'th']:
                comment = f"// 表格元素"
            elif tag in ['header', 'footer', 'nav', 'main', 'section', 'article']:
                comment = f"// 语义化{tag}元素"

        # 变量赋值
        elif '=' in stripped and not stripped.startswith('==') and not stripped.startswith('>=') and not stripped.startswith('<=') and not stripped.startswith('!='):
            var_part = stripped.split('=')[0].strip()
            if var_part and not var_part.startswith('(') and not '?' in var_part and not ':' in var_part:
                var_name = var_part.split(':')[0].strip()

                if 'const ' in var_name:
                    var_name = var_name.replace('const ', '').strip()
                elif 'let ' in var_name:
                    var_name = var_name.replace('let ', '').strip()
                elif 'var ' in var_name:
                    var_name = var_name.replace('var ', '').strip()

                # 特殊变量名
                if 'config' in var_name.lower():
                    comment = f"// {var_name}配置"
                elif 'options' in var_name.lower():
                    comment = f"// {var_name}选项"
                elif 'params' in var_name.lower():
                    comment = f"// {var_name}参数"
                elif 'props' in var_name.lower():
                    comment = f"// {var_name}属性"
                elif 'state' in var_name.lower():
                    comment = f"// {var_name}状态"
                elif 'data' in var_name.lower():
                    comment = f"// {var_name}数据"
                elif 'list' in var_name.lower() or 'arr' in var_name.lower():
                    comment = f"// {var_name}列表"
                elif 'obj' in var_name.lower() or 'dict' in var_name.lower():
                    comment = f"// {var_name}对象"
                elif 'map' in var_name.lower():
                    comment = f"// {var_name}映射"
                elif 'set' in var_name.lower():
                    comment = f"// {var_name}集合"
                elif 'ref' in var_name.lower():
                    comment = f"// {var_name}引用"
                elif 'callback' in var_name.lower():
                    comment = f"// {var_name}回调函数"
                elif 'handler' in var_name.lower():
                    comment = f"// {var_name}处理函数"
                elif 'is' in var_name.lower() and var_name.lower().startswith('is'):
                    comment = f"// {var_name}布尔标志"
                elif 'has' in var_name.lower() and var_name.lower().startswith('has'):
                    comment = f"// {var_name}存在标志"
                elif 'can' in var_name.lower() and var_name.lower().startswith('can'):
                    comment = f"// {var_name}能力标志"
                elif 'should' in var_name.lower() and var_name.lower().startswith('should'):
                    comment = f"// {var_name}条件标志"
                elif 'loading' in var_name.lower():
                    comment = f"// {var_name}加载状态"
                elif 'error' in var_name.lower():
                    comment = f"// {var_name}错误信息"
                elif 'result' in var_name.lower():
                    comment = f"// {var_name}结果"
                elif 'response' in var_name.lower():
                    comment = f"// {var_name}响应"
                elif 'request' in var_name.lower():
                    comment = f"// {var_name}请求"
                elif 'user' in var_name.lower():
                    comment = f"// {var_name}用户"
                elif 'item' in var_name.lower():
                    comment = f"// {var_name}单条数据"
                elif 'index' in var_name.lower():
                    comment = f"// {var_name}索引"
                elif 'key' in var_name.lower():
                    comment = f"// {var_name}键值"
                elif 'value' in var_name.lower():
                    comment = f"// {var_name}值"
                elif 'id' in var_name.lower():
                    comment = f"// {var_name}标识符"
                elif 'name' in var_name.lower():
                    comment = f"// {var_name}名称"
                elif 'title' in var_name.lower():
                    comment = f"// {var_name}标题"
                elif 'desc' in var_name.lower() or 'description' in var_name.lower():
                    comment = f"// {var_name}描述"
                elif 'content' in var_name.lower():
                    comment = f"// {var_name}内容"
                elif 'url' in var_name.lower():
                    comment = f"// {var_name}URL地址"
                elif 'path' in var_name.lower():
                    comment = f"// {var_name}路径"
                elif 'query' in var_name.lower():
                    comment = f"// {var_name}查询条件"
                elif 'filter' in var_name.lower():
                    comment = f"// {var_name}过滤条件"
                elif 'sort' in var_name.lower():
                    comment = f"// {var_name}排序"
                elif 'page' in var_name.lower():
                    comment = f"// {var_name}分页"
                elif 'size' in var_name.lower():
                    comment = f"// {var_name}大小"
                elif 'limit' in var_name.lower():
                    comment = f"// {var_name}限制"
                elif 'offset' in var_name.lower():
                    comment = f"// {var_name}偏移量"
                elif 'total' in var_name.lower():
                    comment = f"// {var_name}总数"
                elif 'count' in var_name.lower():
                    comment = f"// {var_name}计数"
                elif 'current' in var_name.lower():
                    comment = f"// {var_name}当前值"
                elif 'prev' in var_name.lower() or 'previous' in var_name.lower():
                    comment = f"// {var_name}上一个"
                elif 'next' in var_name.lower():
                    comment = f"// {var_name}下一个"
                elif 'first' in var_name.lower():
                    comment = f"// {var_name}第一个"
                elif 'last' in var_name.lower():
                    comment = f"// {var_name}最后一个"
                elif 'new' in var_name.lower():
                    comment = f"// {var_name}新值"
                elif 'old' in var_name.lower():
                    comment = f"// {var_name}旧值"
                elif 'temp' in var_name.lower():
                    comment = f"// {var_name}临时变量"
                elif 'tmp' in var_name.lower():
                    comment = f"// {var_name}临时变量"
                elif 'result' in var_name.lower():
                    comment = f"// {var_name}结果"

        # 方法调用
        elif '(' in stripped and stripped.endswith(')'):
            if stripped.startswith('console.'):
                if 'log(' in stripped:
                    comment = "// 控制台输出日志"
                elif 'error(' in stripped:
                    comment = "// 控制台输出错误"
                elif 'warn(' in stripped:
                    comment = "// 控制台输出警告"
                elif 'info(' in stripped:
                    comment = "// 控制台输出信息"
                elif 'debug(' in stripped:
                    comment = "// 控制台调试输出"
            elif '.push(' in stripped:
                comment = "// 添加元素到数组"
            elif '.pop(' in stripped:
                comment = "// 移除数组最后一个元素"
            elif '.shift(' in stripped:
                comment = "// 移除数组第一个元素"
            elif '.unshift(' in stripped:
                comment = "// 在数组开头添加元素"
            elif '.splice(' in stripped:
                comment = "// 修改数组内容"
            elif '.slice(' in stripped:
                comment = "// 截取数组片段"
            elif '.concat(' in stripped:
                comment = "// 连接数组"
            elif '.join(' in stripped:
                comment = "// 数组转字符串"
            elif '.split(' in stripped:
                comment = "// 字符串分割"
            elif '.replace(' in stripped:
                comment = "// 替换字符串"
            elif '.match(' in stripped:
                comment = "// 正则匹配"
            elif '.search(' in stripped:
                comment = "// 正则搜索"
            elif '.test(' in stripped:
                comment = "// 正则测试"
            elif '.trim(' in stripped:
                comment = "// 去除首尾空白"
            elif '.toLowerCase(' in stripped:
                comment = "// 转为小写"
            elif '.toUpperCase(' in stripped:
                comment = "// 转为大写"
            elif '.substring(' in stripped:
                comment = "// 截取子字符串"
            elif '.substr(' in stripped:
                comment = "// 截取子字符串"
            elif '.indexOf(' in stripped:
                comment = "// 查找索引"
            elif '.lastIndexOf(' in stripped:
                comment = "// 查找最后索引"
            elif '.includes(' in stripped:
                comment = "// 检查是否包含"
            elif '.startsWith(' in stripped:
                comment = "// 检查开头"
            elif '.endsWith(' in stripped:
                comment = "// 检查结尾"
            elif '.map(' in stripped:
                comment = "// 映射转换"
            elif '.filter(' in stripped:
                comment = "// 过滤数据"
            elif '.reduce(' in stripped:
                comment = "// 归约计算"
            elif '.find(' in stripped:
                comment = "// 查找元素"
            elif '.findIndex(' in stripped:
                comment = "// 查找索引"
            elif '.some(' in stripped:
                comment = "// 检查是否有满足条件的"
            elif '.every(' in stripped:
                comment = "// 检查是否都满足条件"
            elif '.forEach(' in stripped:
                comment = "// 遍历执行"
            elif '.sort(' in stripped:
                comment = "// 排序"
            elif '.reverse(' in stripped:
                comment = "// 反转"
            elif '.flat(' in stripped:
                comment = "// 数组扁平化"
            elif '.flatMap(' in stripped:
                comment = "// 映射并扁平化"
            elif '.fill(' in stripped:
                comment = "// 填充数组"
            elif '.copyWithin(' in stripped:
                comment = "// 数组内部复制"
            elif '.from(' in stripped:
                comment = "// 从类数组创建"
            elif '.isArray(' in stripped:
                comment = "// 检查是否为数组"
            elif '.keys(' in stripped:
                comment = "// 获取键"
            elif '.values(' in stripped:
                comment = "// 获取值"
            elif '.entries(' in stripped:
                comment = "// 获取键值对"
            elif '.hasOwnProperty(' in stripped:
                comment = "// 检查自有属性"
            elif '.toString(' in stripped:
                comment = "// 转为字符串"
            elif '.valueOf(' in stripped:
                comment = "// 获取原始值"
            elif '.parse(' in stripped:
                comment = "// 解析数据"
            elif '.stringify(' in stripped:
                comment = "// 序列化为字符串"
            elif '.fetch(' in stripped or 'fetch(' in stripped:
                comment = "// 发送网络请求"
            elif '.then(' in stripped:
                comment = "// Promise成功回调"
            elif '.catch(' in stripped:
                comment = "// Promise错误处理"
            elif '.finally(' in stripped:
                comment = "// Promise最终处理"
            elif '.async(' in stripped:
                comment = "// 异步处理"
            elif '.await(' in stripped:
                comment = "// 等待异步结果"
            elif '.setState(' in stripped:
                comment = "// 设置组件状态"
            elif '.setTimeout(' in stripped:
                comment = "// 延迟执行"
            elif '.setInterval(' in stripped:
                comment = "// 定时执行"
            elif '.clearTimeout(' in stripped:
                comment = "// 清除延迟"
            elif '.clearInterval(' in stripped:
                comment = "// 清除定时"
            elif '.preventDefault(' in stripped:
                comment = "// 阻止默认行为"
            elif '.stopPropagation(' in stripped:
                comment = "// 阻止事件冒泡"
            elif '.focus(' in stripped:
                comment = "// 获取焦点"
            elif '.blur(' in stripped:
                comment = "// 失去焦点"
            elif '.scrollTo(' in stripped:
                comment = "// 滚动到指定位置"
            elif '.scrollIntoView(' in stripped:
                comment = "// 滚动到可视区域"
            elif '.getBoundingClientRect(' in stripped:
                comment = "// 获取元素位置"
            elif '.querySelector(' in stripped:
                comment = "// 选择单个元素"
            elif '.querySelectorAll(' in stripped:
                comment = "// 选择多个元素"
            elif '.getElementById(' in stripped:
                comment = "// 通过ID获取元素"
            elif '.getElementsByClassName(' in stripped:
                comment = "// 通过类名获取元素"
            elif '.getElementsByTagName(' in stripped:
                comment = "// 通过标签名获取元素"
            elif '.createElement(' in stripped:
                comment = "// 创建元素"
            elif '.appendChild(' in stripped:
                comment = "// 添加子元素"

        # 添加注释
        if comment:
            result.append(f"{line}  {comment}")
        else:
            result.append(line)

    return '\n'.join(result)


def add_meaningful_comments_to_javascript(content):
    """为 JavaScript 代码添加有意义的注释"""
    # JavaScript 和 TypeScript 类似
    return add_meaningful_comments_to_typescript(content)


def process_file(filepath):
    """处理单个文件"""
    ext = Path(filepath).suffix.lower()

    if ext not in EXTENSIONS:
        return False

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        lang = EXTENSIONS[ext]

        # 根据文件类型添加注释
        if lang == 'python':
            new_content = add_meaningful_comments_to_python(content)
        elif lang == 'typescript':
            new_content = add_meaningful_comments_to_typescript(content)
        elif lang == 'javascript':
            new_content = add_meaningful_comments_to_javascript(content)
        else:
            return False

        # 写回文件
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"✓ 已处理: {filepath}")
        return True

    except Exception as e:
        print(f"✗ 处理失败 {filepath}: {e}")
        return False


def main():
    """主函数"""
    root_dir = Path(__file__).parent

    processed = 0
    skipped = 0
    failed = 0

    print("=" * 60)
    print("开始为项目代码添加有意义的中文注释...")
    print(f"根目录: {root_dir}")
    print("=" * 60)

    for ext in EXTENSIONS.keys():
        for filepath in root_dir.rglob(f"*{ext}"):
            filepath_str = str(filepath)

            if should_ignore(filepath_str):
                skipped += 1
                continue

            # 跳过脚本自身
            if filepath.name == 'add_meaningful_comments.py':
                skipped += 1
                continue

            if process_file(filepath_str):
                processed += 1
            else:
                failed += 1

    print("=" * 60)
    print(f"处理完成!")
    print(f"  ✓ 成功: {processed} 个文件")
    print(f"  ⏭️ 跳过: {skipped} 个文件")
    print(f"  ✗ 失败: {failed} 个文件")
    print("=" * 60)


if __name__ == '__main__':
    main()
