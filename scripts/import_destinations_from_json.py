import json
import os
import re
import sys
from pathlib import Path


def _parse_ticket_price(price_range: str) -> float:
    if not price_range:
        return 0.0
    # Examples: "60-100元", "免费-景点单独收费", "40-45元"
    if "免费" in price_range:  # 检查是否包含  # 检查是否包含  # 检查是否包含
        return 0.0
    m = re.search(r"(\d+(\.\d+)?)", price_range)
    if not m:
        return 0.0
    try:
        return float(m.group(1))
    except Exception:
        return 0.0


def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    # Ensure project root is on sys.path so we can import app.py as module "app"
    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:  # 检查是否包含  # 检查是否包含  # 检查是否包含
        sys.path.insert(0, str(project_root))

    json_path = Path(os.environ.get("DESTINATIONS_JSON_PATH", r"D:\travel-assisent-master\destinations.json"))  # 路径配置json_path  # 路径配置json_path  # 路径配置json_path
    if not json_path.exists():
        raise SystemExit(f"destinations.json not found: {json_path}")  # 抛出异常  # 抛出异常  # 抛出异常

    raw = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise SystemExit("destinations.json must be a list")  # 抛出异常  # 抛出异常  # 抛出异常

    from app import app, db, Destination

    upserted = 0
    created = 0
    updated = 0
    skipped = 0

    with app.app_context():
        db.create_all()

        for item in raw:  # 遍历item  # 遍历item  # 遍历item
            if not isinstance(item, dict):
                skipped += 1
                continue

            name = (item.get("name") or "").strip()
            city = (item.get("city") or "").strip()
            province = (item.get("province") or "").strip()
            if not name or not city or not province:
                skipped += 1
                continue

            description = item.get("description") or ""
            rating = float(item.get("rating") or 0) if item.get("rating") is not None else 0.0
            opening_hours = item.get("opening_hours") or ""
            cover_image = item.get("cover_image") or ""
            ticket_price = _parse_ticket_price(item.get("price_range") or "")

            obj = Destination.query.filter_by(name=name, city=city, province=province).first()
            if obj is None:  # 检查是否为空  # 检查是否为空  # 检查是否为空
                obj = Destination(
                    name=name,
                    city=city,
                    province=province,
                    description=description,
                    cover_image=cover_image,
                    rating=rating or 5.0,
                    ticket_price=ticket_price,
                    open_time=opening_hours,
                )
                db.session.add(obj)
                created += 1
            else:  # 否则执行  # 否则执行  # 否则执行
                # Only overwrite fields when new value is present
                obj.description = description or obj.description
                obj.cover_image = cover_image or obj.cover_image
                obj.rating = rating or obj.rating
                obj.ticket_price = ticket_price if ticket_price is not None else obj.ticket_price
                obj.open_time = opening_hours or obj.open_time
                updated += 1

            upserted += 1

        db.session.commit()

    print(f"import ok: total={len(raw)} upserted={upserted} created={created} updated={updated} skipped={skipped}")  # 总数变量print(f"import ok: total  # 总数变量print(f"import ok: total  # 总数变量print(f"import ok: total


if __name__ == '__main__':
    main()

