#!/usr/bin/env python3
"""
景点评论数据生成脚本
"""
import os
import random
from datetime import datetime, timedelta

# 设置路径
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db, User, DestinationComment

# 评论模板
TEMPLATES = [
    "专程过来玩的，{name}果然没让人失望！风景特别美，拍照特别出片，推荐给大家！",
    "周末过来人还挺多的，不过体验还不错。{name}的景色很壮观，值得一看。",
    "第二次来了，每次来都有不同的感受。{name}越来越好了，设施也在完善。",
    "开车过来的，路比较好找。{name}比想象中大，建议早点出发可以逛更久。",
    "带爸妈一起过来的，他们玩得很开心。{name}适合各个年龄段，不错的选择。",
    "看网上推荐来的，{name}确实很漂亮！不过建议大家避开节假日，人太多了。",
    "性价比很高的景点，{name}的门票价格很合理。下次还会再来！",
    "{name}的空气特别好，远离城市喧嚣，很适合放松心情。",
    "景点管理很规范，{name}的卫生状况也很好。工作人员态度热情。",
    "专门来拍日出的，{name}的位置绝佳，日落超级美！照片根本拍不出它的美。",
    "大自然的鬼斧神工！{name}的景色让人震撼，不虚此行。",
    "{name}的山水真的很美，感觉心灵都被洗涤了。",
    "爬山虽然累但是很值得，{name}的风景太美了！",
    "非常推荐！设施完善，服务态度好，值得再来。",
    "风景超美，自然风光非常震撼，下次还来！",
]

USERNAMES = [
    "旅行者小王", "爱旅游的鱼", "摄影爱好者", "周末去哪玩", "带着娃去旅行",
    "户外探险家", "美食侦探", "历史爱好者", "风景这边独好", "快乐的一家人",
    "暴走的小脚丫", "世界那么大", "行走的力量", "阳光下的向日葵", "风中的纸飞机",
    "背包客老李", "城市漫游者", "山水间", "云端漫步", "星光大道",
]


def get_or_create_user(username):
    """获取或创建用户"""
    user = User.query.filter_by(username=username).first()
    if not user:
        user = User(
            username=username,
            email=f"{username.lower()}@example.com",
            is_admin=False,
            membership_level=1,
            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
    return user


def generate_comment(dest_id, dest_name, count=5):
    """为景点生成评论"""
    for i in range(count):
        template = random.choice(TEMPLATES)
        content = template.format(name=dest_name)
        rating = round(random.uniform(3.5, 5.0), 1)
        if random.random() > 0.8:
            rating = round(random.uniform(3.0, 3.9), 1)

        username = random.choice(USERNAMES)
        user = get_or_create_user(username)

        # 检查是否已存在
        existing = DestinationComment.query.filter_by(
            destination_id=dest_id,
            user_id=user.id
        ).first()
        if existing:
            continue

        days_ago = random.randint(1, 180)
        created_at = datetime.now() - timedelta(days=days_ago)

        comment = DestinationComment(
            destination_id=dest_id,
            user_id=user.id,
            content=content,
            created_at=created_at,
            updated_at=created_at
        )
        db.session.add(comment)

    db.session.commit()


def main():
    print("=" * 60)
    print("景点评论数据生成脚本")
    print("=" * 60)

    with app.app_context():
        # 获取所有景点
        destinations = db.session.execute(db.text(
            "SELECT id, name, city, province FROM destinations"
        )).fetchall()

        total = len(destinations)
        print(f"找到 {total} 个景点")
        print()

        generated = 0
        skipped = 0

        for i, (dest_id, name, city, province) in enumerate(destinations, 1):
            # 检查已有评论数
            existing = DestinationComment.query.filter_by(destination_id=dest_id).count()

            if existing >= 5:
                skipped += 1
                continue

            need = max(5, 10 - existing)
            print(f"[{i}/{total}] {name} (已有{existing}条, 生成{need}条)...")

            try:
                generate_comment(dest_id, name, need)
                generated += need
            except Exception as e:
                print(f"  Error: {e}")
                db.session.rollback()

        total_comments = DestinationComment.query.count()
        print()
        print("=" * 60)
        print(f"完成！新增 {generated} 条评论，数据库共有 {total_comments} 条")
        print(f"跳过的景点（已有足够评论）: {skipped}")
        print("=" * 60)


if __name__ == '__main__':
    main()
