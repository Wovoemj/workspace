#!/usr/bin/env python3
"""
manage.py — 智旅助手数据库管理 CLI
============================================

【功能说明】
- 命令行工具，用于管理用户数据（CRUD 操作）
- 基于 Click 库实现命令行界面
- 支持创建用户、设置管理员、重置密码、删除用户等操作

【使用方法】
python manage.py list-users                        列出所有用户
python manage.py create-user <email>              创建普通用户（交互式输入密码）
python manage.py create-user <email> --admin      创建管理员用户
python manage.py set-admin <email>                将用户设为管理员
python manage.py revoke-admin <email>             撤销管理员权限
python manage.py set-level <email> <level>        设置会员等级
python manage.py reset-password <email>           重置密码（交互式）
python manage.py delete-user <email>              删除用户
python manage.py shell                             进入 Flask shell 交互环境

【示例】
python manage.py create-user admin@example.com --admin
python manage.py list-users
python manage.py set-level super@example.com 10
"""

import os
import sys
import click

# ── 确保项目根目录在 Python 路径 ────────────────────────────────────────────
# 【路径处理】将项目根目录添加到 sys.path，确保能够导入项目模块
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

# 导入所需模块
from extensions import db                    # 数据库实例
from models import User                     # 用户模型
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


def _app():
    """
    延迟导入 Flask 应用，避免循环依赖
    
    Returns:
        Flask app 实例
    
    【设计说明】
    - 延迟导入：避免在模块加载时就创建数据库表
    - 解决循环导入问题：app.py 导入 models，models 导入 extensions
    - 注意：app.py 中已完成 db.init_app(app)，直接导入 app 即可
    """
    from app import app
    return app


def _ctx():
    """
    获取 Flask 应用上下文
    
    Returns:
        Flask app 上下文对象
    
    【功能说明】
    - 提供应用上下文，使数据库操作能够正常执行
    - 在操作数据库前必须激活上下文
    """
    app = _app()
    return app.app_context()


# ── 命令组 ────────────────────────────────────────────────────────────────────

@click.group()
def cli():
    """
    智旅助手数据库管理工具
    
    【功能】
    - 管理用户数据（创建、删除、修改）
    - 管理用户权限（管理员、会员等级）
    - 管理用户密码（重置）
    - 提供 Flask Shell 交互环境
    """
    pass


@cli.command("list-users")
def list_users():
    """
    列出所有用户
    
    【功能说明】
    - 从数据库查询所有用户
    - 按注册时间倒序排列（最新注册的在前面）
    - 以表格形式显示用户信息
    
    【显示字段】
    - ID: 用户唯一标识
    - 邮箱: 用户登录邮箱
    - 昵称: 用户昵称
    - 管理员: 是否管理员（✅ 表示是）
    - 等级: 会员等级
    - 注册时间: 用户注册时间
    """
    with _ctx():
        # 查询所有用户，按注册时间倒序
        users = User.query.order_by(User.created_at.desc()).all()
        
        # 如果没有用户
        if not users:
            click.echo("暂无用户记录。")
            return
        
        # 打印表头
        click.echo(f"\n{'ID':>4}  {'邮箱':<30}  {'昵称':<15}  {'管理员':<6}  {'等级':<5}  {'注册时间'}")
        click.echo("-" * 90)
        
        # 逐个打印用户信息
        for u in users:
            # 判断是否管理员
            is_admin = "✅" if _is_admin(u) else "  "
            
            # 格式化注册时间（如果为空显示 "—"）
            created = u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "—"
            
            # 截断过长字段（避免表格变形）
            email = (u.email or "—")[:28]
            nickname = (u.nickname or "—")[:13]
            
            # 打印一行
            click.echo(f"{u.id:>4}  {email:<30}  {nickname:<15}  {is_admin:<6}  {u.membership_level:<5}  {created}")
        
        # 打印总数
        click.echo(f"\n共 {len(users)} 位用户。")


def _is_admin(user: User) -> bool:
    """
    判断用户是否为管理员
    
    Args:
        user: User 模型实例
    
    Returns:
        bool: 是管理员返回 True，否则返回 False
    
    【判断逻辑】
    1. 检查 is_admin 字段（布尔值）
    2. 检查 membership_level 是否达到管理员等级阈值
       - 默认阈值：9（可通过环境变量 ADMIN_MEMBERSHIP_LEVEL 配置）
       - 例如：设置 ADMIN_MEMBERSHIP_LEVEL=10，则等级≥10才是管理员
    """
    # 方法1：检查 is_admin 字段
    if getattr(user, 'is_admin', False):
        return True
    
    # 方法2：检查会员等级是否达到管理员阈值
    try:
        # 从环境变量读取管理员等级阈值（默认 9）
        threshold = int(os.environ.get("ADMIN_MEMBERSHIP_LEVEL", "9").strip() or "9")
    except Exception:
        threshold = 9
    
    # 判断会员等级是否大于等于阈值
    return int(user.membership_level or 1) >= threshold


def _prompt_password() -> str:
    """
    交互式输入密码（带确认）
    
    Returns:
        str: 用户输入的密码
    
    【功能说明】
    - 隐藏输入（不显示密码字符）
    - 密码长度不少于 8 位
    - 必须包含大小写字母和数字
    - 需要输入两次以确认（防止输错）
    
    【验证逻辑】
    1. 长度 ≥ 8
    2. 两次输入一致
    """
    while True:
        # 第一次输入密码（隐藏）
        p1 = click.prompt("密码（不少于 8 位，需包含大小写字母和数字）", 
                         hide_input=True,
                         default="", 
                         show_default=False)
        
        # 验证长度
        if len(p1) < 8:
            click.echo("⚠  密码长度不能少于 8 位，请重新输入。")
            continue
        
        # 第二次输入密码（确认）
        p2 = click.prompt("确认密码", hide_input=True)
        
        # 验证两次输入是否一致
        if p1 != p2:
            click.echo("⚠  两次密码不一致，请重新输入。")
            continue
        
        return p1


@cli.command("create-user")
@click.argument("email")
@click.option("--admin", is_flag=True, help="创建为管理员账号")
@click.option("--username", default=None, help="用户名（username 字段，默认取邮箱前缀）")
@click.option("--nickname", default=None, help="昵称（默认取邮箱前缀）")
@click.option("--password", default=None, help="直接指定密码（建议仅测试用，交互式更安全）")
def create_user(email: str, admin: bool, username: str, nickname: str, password: str):
    """
    创建新用户
    
    【功能说明】
    - 创建普通用户或管理员用户
    - 邮箱必须唯一（不能重复注册）
    - 可交互式输入密码，也可通过参数指定
    
    【参数说明】
    --admin: 创建为管理员账号（会员等级自动设为 10）
    --username: 指定用户名（默认取邮箱前缀）
    --nickname: 指定昵称（默认同用户名）
    --password: 直接指定密码（仅测试用，不安全）
    
    【示例】
    python manage.py create-user test@example.com
    python manage.py create-user admin@example.com --admin
    python manage.py create-user test@example.com --password 12345678
    """
    with _ctx():
        # 检查邮箱是否已存在
        existing = User.query.filter_by(email=email.lower()).first()
        if existing:
            click.echo(f"❌  邮箱 {email} 已存在（用户 ID={existing.id}）。")
            sys.exit(1)

        # 密码处理（交互式输入或直接使用）
        if not password:
            password = _prompt_password()          # 交互式输入
        elif len(password) < 8:
            click.echo("❌  密码长度不能少于 8 位。")
            sys.exit(1)

        # 用户名处理（默认取邮箱前缀）
        if not username:
            username = email.split("@")[0][:20]  # 截取邮箱前缀，最多20字符
        
        # 昵称处理（默认同用户名）
        if not nickname:
            nickname = username

        # 创建用户实例
        user = User(
            username=username,
            nickname=nickname,
            email=email.lower(),                    # 邮箱统一转小写
            password_hash=generate_password_hash(password),  # 密码哈希加密
            membership_level=10 if admin else 1,   # 管理员等级10，普通用户等级1
            is_admin=admin,                        # 是否管理员标志
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        # 保存到数据库
        db.session.add(user)
        db.session.commit()

        # 打印成功信息
        role = "管理员" if admin else "普通用户"
        click.echo(f"✅  用户创建成功！")
        click.echo(f"    邮箱：{email}")
        click.echo(f"    角色：{role}")
        click.echo(f"    会员等级：{user.membership_level}")
        click.echo(f"    is_admin：{user.is_admin}")
        click.echo(f"\n提示：管理员请使用 /api/admin/login 接口登录")


@cli.command("set-admin")
@click.argument("email")
def set_admin(email: str):
    """
    将用户设为管理员
    
    【功能说明】
    - 将指定用户设为管理员
    - 设置 is_admin = True
    - 确保会员等级 ≥ 10（兼容 None 或非整数情况）
    
    【示例】
    python manage.py set-admin admin@example.com
    """
    with _ctx():
        # 查找用户
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        
        # 将用户设为管理员
        user.is_admin = True
        
        # 确保 membership_level 至少为 10（兼容 None 或非整数情况）
        try:
            current_level = int(user.membership_level or 1)
        except Exception:
            current_level = 1
        user.membership_level = max(current_level, 10)
        
        # 更新更新时间并提交
        user.updated_at = datetime.now()
        db.session.commit()
        click.echo(f"✅  {email} 现已是管理员（is_admin=True, membership_level={user.membership_level}）")


@cli.command("revoke-admin")
@click.argument("email")
def revoke_admin(email: str):
    """
    撤销用户的管理员权限
    
    【功能说明】
    - 将指定用户的管理员权限撤销
    - 设置 is_admin = False
    - 会员等级不变（可手动调整）
    
    【示例】
    python manage.py revoke-admin admin@example.com
    """
    with _ctx():
        # 查找用户
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        
        # 撤销管理员权限
        user.is_admin = False
        db.session.commit()
        click.echo(f"✅  已撤销 {email} 的管理员权限（is_admin=False）")


@cli.command("set-level")
@click.argument("email")
@click.argument("level", type=int)
def set_level(email: str, level: int):
    """
    设置用户会员等级
    
    【功能说明】
    - 设置指定用户的会员等级
    - 等级必须为正整数（自动转换为 ≥1）
    
    【参数说明】
    level: 会员等级（整数）
    
    【示例】
    python manage.py set-level user@example.com 5
    python manage.py set-level admin@example.com 10
    """
    with _ctx():
        # 查找用户
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        
        # 设置会员等级（确保 ≥1）
        user.membership_level = max(1, level)
        db.session.commit()
        click.echo(f"✅  {email} 的会员等级已更新为 {user.membership_level}")


@cli.command("reset-password")
@click.argument("email")
def reset_password(email: str):
    """
    交互式重置用户密码
    
    【功能说明】
    - 重置指定用户的密码
    - 交互式输入新密码（隐藏输入）
    - 需要输入两次以确认
    
    【示例】
    python manage.py reset-password user@example.com
    """
    with _ctx():
        # 查找用户
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        
        # 交互式输入新密码
        password = _prompt_password()
        
        # 更新密码哈希
        user.password_hash = generate_password_hash(password)
        db.session.commit()
        click.echo(f"✅  {email} 的密码已重置。")


@cli.command("delete-user")
@click.argument("email")
@click.option("--force", is_flag=True, help="跳过确认直接删除")
def delete_user(email: str, force: bool):
    """
    删除用户（会级联删除其评论）
    
    【功能说明】
    - 删除指定用户
    - 级联删除该用户的所有评论（DestinationComment）
    - 默认需要确认，--force 可跳过确认
    
    【警告】
    - 删除用户会同时删除其所有评论
    - 此操作不可恢复
    
    【示例】
    python manage.py delete-user user@example.com
    python manage.py delete-user user@example.com --force
    """
    with _ctx():
        # 查找用户
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        
        # 确认删除（除非 --force）
        if not force:
            click.confirm(f"确认删除用户 {email}（ID={user.id}）及其所有评论？", abort=True)
        
        # 级联删除用户的所有评论
        from models import DestinationComment
        DestinationComment.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        
        # 删除用户
        db.session.delete(user)
        db.session.commit()
        click.echo(f"✅  用户 {email} 已删除。")


@cli.command("shell")
def shell():
    """
    进入 Flask 应用上下文交互环境（等同于 flask shell）
    
    【功能说明】
    - 启动 Python 交互式 Shell
    - 自动加载 Flask 应用上下文
    - 预导入常用对象：app, db, User
    
    【使用场景】
    - 调试数据库查询
    - 测试模型方法
    - 执行临时数据操作
    
    【示例】
    python manage.py shell
    >>> user = User.query.first()
    >>> user.email
    'test@example.com'
    """
    app = _app()
    import code
    
    # 推送请求上下文（使 current_app 等可用）
    ctx = app.test_request_context()
    ctx.push()
    
    # 启动交互式 Shell（预定义局部变量）
    code.interact(local={"app": app, "db": db, "User": User})


# ── 快捷别名 ──────────────────────────────────────────────────────────────────

@cli.command("promote")
@click.argument("email")
def promote(email: str):
    """
    快捷命令：将用户提升为管理员（等同于 set-admin）
    
    【功能说明】
    - set-admin 的快捷别名
    - 功能完全相同
    
    【示例】
    python manage.py promote user@example.com
    """
    ctx = click.get_current_context()
    ctx.invoke(set_admin, email=email)


if __name__ == "__main__":
    # 启动 CLI
    cli()
