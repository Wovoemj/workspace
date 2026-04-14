#!/usr/bin/env python3
"""
manage.py — 智旅助手数据库管理 CLI

用法：
    python manage.py list-users                        列出所有用户
    python manage.py create-user <email>              创建普通用户（交互式输入密码）
    python manage.py create-user <email> --admin      创建管理员用户
    python manage.py set-admin <email>                将用户设为管理员
    python manage.py revoke-admin <email>             撤销管理员权限
    python manage.py set-level <email> <level>        设置会员等级
    python manage.py reset-password <email>           重置密码（交互式）
    python manage.py delete-user <email>              删除用户
    python manage.py shell                             进入 Flask shell 交互环境

示例：
    python manage.py create-user admin@example.com --admin
    python manage.py list-users
    python manage.py set-level super@example.com 10
"""
import os
import sys
import click

# ── 确保项目根目录在 Python 路径 ────────────────────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from extensions import db
from models import User
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


def _app():
    """延迟导入，避免循环依赖时过早创建表"""
    # 注意：app.py 中已完成 db.init_app(app)，直接导入 app 即可
    from app import app
    return app


def _ctx():
    app = _app()
    return app.app_context()


# ── 命令组 ────────────────────────────────────────────────────────────────────

@click.group()
def cli():
    """
  智旅助手数据库管理工具
    """
    pass


@cli.command("list-users")
def list_users():
    """列出所有用户"""
    with _ctx():
        users = User.query.order_by(User.created_at.desc()).all()
        if not users:
            click.echo("暂无用户记录。")
            return
        click.echo(f"\n{'ID':>4}  {'邮箱':<30}  {'昵称':<15}  {'管理员':<6}  {'等级':<5}  {'注册时间'}")
        click.echo("-" * 90)
        for u in users:
            is_admin = "✅" if _is_admin(u) else "  "
            created = u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "—"
            email = (u.email or "—")[:28]
            nickname = (u.nickname or "—")[:13]
            click.echo(f"{u.id:>4}  {email:<30}  {nickname:<15}  {is_admin:<6}  {u.membership_level:<5}  {created}")
        click.echo(f"\n共 {len(users)} 位用户。")


def _is_admin(user: User) -> bool:
    if getattr(user, 'is_admin', False):
        return True
    try:
        threshold = int(os.environ.get("ADMIN_MEMBERSHIP_LEVEL", "9").strip() or "9")
    except Exception:
        threshold = 9
    return int(user.membership_level or 1) >= threshold


def _prompt_password() -> str:
    while True:
        p1 = click.prompt("密码（不少于 8 位，需包含大小写字母和数字）", hide_input=True,
                          default="", show_default=False)
        if len(p1) < 8:
            click.echo("⚠  密码长度不能少于 8 位，请重新输入。")
            continue
        p2 = click.prompt("确认密码", hide_input=True)
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
    创建新用户。
    若不指定密码，将交互式输入。
    """
    with _ctx():
        # 检查邮箱是否已存在
        existing = User.query.filter_by(email=email.lower()).first()
        if existing:
            click.echo(f"❌  邮箱 {email} 已存在（用户 ID={existing.id}）。")
            sys.exit(1)

        if not password:
            password = _prompt_password()
        elif len(password) < 8:
            click.echo("❌  密码长度不能少于 8 位。")
            sys.exit(1)

        if not username:
            username = email.split("@")[0][:20]
        if not nickname:
            nickname = username

        user = User(
            username=username,
            nickname=nickname,
            email=email.lower(),
            password_hash=generate_password_hash(password),
            membership_level=10 if admin else 1,
            is_admin=admin,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.session.add(user)
        db.session.commit()

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
    """将用户设为管理员"""
    with _ctx():
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        # 将用户设为管理员
        user.is_admin = True
        # 确保 membership_level 至少为 10，兼容 None 或非整数情况
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
    """撤销用户的管理员权限"""
    with _ctx():
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        user.is_admin = False
        db.session.commit()
        click.echo(f"✅  已撤销 {email} 的管理员权限（is_admin=False）")


@cli.command("set-level")
@click.argument("email")
@click.argument("level", type=int)
def set_level(email: str, level: int):
    """设置用户会员等级"""
    with _ctx():
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        user.membership_level = max(1, level)
        db.session.commit()
        click.echo(f"✅  {email} 的会员等级已更新为 {user.membership_level}")


@cli.command("reset-password")
@click.argument("email")
def reset_password(email: str):
    """交互式重置用户密码"""
    with _ctx():
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        password = _prompt_password()
        user.password_hash = generate_password_hash(password)
        db.session.commit()
        click.echo(f"✅  {email} 的密码已重置。")


@cli.command("delete-user")
@click.argument("email")
@click.option("--force", is_flag=True, help="跳过确认直接删除")
def delete_user(email: str, force: bool):
    """删除用户（会级联删除其评论）"""
    with _ctx():
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            click.echo(f"❌  用户 {email} 不存在。")
            sys.exit(1)
        if not force:
            click.confirm(f"确认删除用户 {email}（ID={user.id}）及其所有评论？", abort=True)
        from models import DestinationComment
        DestinationComment.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        db.session.delete(user)
        db.session.commit()
        click.echo(f"✅  用户 {email} 已删除。")


@cli.command("shell")
def shell():
    """进入 Flask 应用上下文交互环境（等同于 flask shell）"""
    app = _app()
    import code
    ctx = app.test_request_context()
    ctx.push()
    code.interact(local={"app": app, "db": db, "User": User})


# ── 快捷别名 ──────────────────────────────────────────────────────────────────

@cli.command("promote")
@click.argument("email")
def promote(email: str):
    """快捷命令：将用户提升为管理员（等同于 set-admin）"""
    ctx = click.get_current_context()
    ctx.invoke(set_admin, email=email)


if __name__ == "__main__":
    cli()