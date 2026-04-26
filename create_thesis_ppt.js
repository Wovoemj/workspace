/**
 * 毕业答辩PPT生成脚本
 * 项目：小游智能旅行助手
 */

const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { 
  FaGlobeAsia, FaMapMarkedAlt, FaRobot, FaPlane, FaHotel, 
  FaComments, FaRoute, FaStar, FaHeart, FaUser, FaCog,
  FaDatabase, FaServer, FaLock, FaBolt, FaChartLine,
  FaCheckCircle, FaQuoteLeft, FaLaptopCode, FaRocket
} = require("react-icons/fa");
const { MdDashboard, MdSupportAgent } = require("react-icons/md");
const { BiWorld } = require("react-icons/bi");

// 图标转PNG Base64
function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// 配色方案 - Ocean Gradient (旅行/旅游主题)
const COLORS = {
  primary: "065A82",      // 深蓝
  secondary: "1C7293",    // 青色
  accent: "00A8E8",       // 亮蓝
  dark: "1A1A2E",          // 深色背景
  light: "F8FAFC",        // 浅色背景
  white: "FFFFFF",
  text: "2D3748",         // 正文文字
  muted: "718096",        // 次要文字
  gold: "F59E0B",         // 强调色
  coral: "F97316",        // 橙色
  teal: "0D9488",         // 青绿色
  purple: "7C3AED",       // 紫色
};

async function createPresentation() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = '小游智能旅行助手 - 毕业答辩';
  pres.author = '毕业设计答辩';

  // 预加载图标
  console.log("Loading icons...");
  const icons = {
    globe: await iconToBase64Png(FaGlobeAsia, "#FFFFFF", 256),
    map: await iconToBase64Png(FaMapMarkedAlt, "#FFFFFF", 256),
    robot: await iconToBase64Png(FaRobot, "#FFFFFF", 256),
    plane: await iconToBase64Png(FaPlane, "#FFFFFF", 256),
    hotel: await iconToBase64Png(FaHotel, "#FFFFFF", 256),
    chat: await iconToBase64Png(FaComments, "#FFFFFF", 256),
    route: await iconToBase64Png(FaRoute, "#FFFFFF", 256),
    star: await iconToBase64Png(FaStar, "#F59E0B", 256),
    heart: await iconToBase64Png(FaHeart, "#F97316", 256),
    user: await iconToBase64Png(FaUser, "#FFFFFF", 256),
    database: await iconToBase64Png(FaDatabase, "#FFFFFF", 256),
    server: await iconToBase64Png(FaServer, "#FFFFFF", 256),
    lock: await iconToBase64Png(FaLock, "#FFFFFF", 256),
    bolt: await iconToBase64Png(FaBolt, "#F59E0B", 256),
    chart: await iconToBase64Png(FaChartLine, "#FFFFFF", 256),
    check: await iconToBase64Png(FaCheckCircle, "#10B981", 256),
    quote: await iconToBase64Png(FaQuoteLeft, "#CBD5E1", 256),
    code: await iconToBase64Png(FaLaptopCode, "#FFFFFF", 256),
    rocket: await iconToBase64Png(FaRocket, "#FFFFFF", 256),
    dashboard: await iconToBase64Png(MdDashboard, "#FFFFFF", 256),
    support: await iconToBase64Png(MdSupportAgent, "#FFFFFF", 256),
    world: await iconToBase64Png(BiWorld, "#FFFFFF", 256),
  };

  // ============ 幻灯片1: 封面 ============
  console.log("Creating slide 1: Cover...");
  let slide1 = pres.addSlide();
  slide1.background = { color: COLORS.dark };

  // 装饰圆形
  slide1.addShape(pres.shapes.OVAL, {
    x: -1, y: -1, w: 4, h: 4,
    fill: { color: COLORS.primary, transparency: 70 }
  });
  slide1.addShape(pres.shapes.OVAL, {
    x: 7, y: 3, w: 5, h: 5,
    fill: { color: COLORS.secondary, transparency: 70 }
  });

  // 主标题
  slide1.addText("小游智能旅行助手", {
    x: 0.5, y: 1.8, w: 9, h: 1.2,
    fontSize: 48, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "center"
  });

  // 副标题
  slide1.addText("基于AI的个性化旅行规划平台", {
    x: 0.5, y: 3.0, w: 9, h: 0.6,
    fontSize: 24, fontFace: "Microsoft YaHei",
    color: COLORS.accent, align: "center"
  });

  // 分隔线
  slide1.addShape(pres.shapes.RECTANGLE, {
    x: 3.5, y: 3.8, w: 3, h: 0.03,
    fill: { color: COLORS.accent }
  });

  // 答辩信息
  slide1.addText("毕业设计答辩", {
    x: 0.5, y: 4.2, w: 9, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei",
    color: COLORS.muted, align: "center"
  });

  slide1.addText("2026年4月", {
    x: 0.5, y: 4.8, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: COLORS.muted, align: "center"
  });

  // ============ 幻灯片2: 目录 ============
  console.log("Creating slide 2: Table of Contents...");
  let slide2 = pres.addSlide();
  slide2.background = { color: COLORS.light };

  // 标题
  slide2.addText("目录", {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 目录项
  const tocItems = [
    { num: "01", title: "项目概述", desc: "项目背景与目标" },
    { num: "02", title: "系统架构", desc: "整体架构设计" },
    { num: "03", title: "技术选型", desc: "后端与前端技术栈" },
    { num: "04", title: "核心功能", desc: "20个功能模块详解" },
    { num: "05", title: "AI对话系统", desc: "流式响应技术实现" },
    { num: "06", title: "数据库设计", desc: "ER图与数据表" },
    { num: "07", title: "性能优化", desc: "缓存与限流机制" },
    { num: "08", title: "项目总结", desc: "亮点与展望" },
  ];

  tocItems.forEach((item, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 0.8 + col * 4.5;
    const y = 1.5 + row * 1.0;

    // 编号
    slide2.addText(item.num, {
      x: x, y: y, w: 0.8, h: 0.8,
      fontSize: 28, fontFace: "Arial", bold: true,
      color: COLORS.primary, align: "left", valign: "middle"
    });

    // 标题
    slide2.addText(item.title, {
      x: x + 0.9, y: y, w: 2.5, h: 0.45,
      fontSize: 18, fontFace: "Microsoft YaHei", bold: true,
      color: COLORS.dark, align: "left", valign: "middle"
    });

    // 描述
    slide2.addText(item.desc, {
      x: x + 0.9, y: y + 0.4, w: 3, h: 0.35,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: COLORS.muted, align: "left", valign: "top"
    });
  });

  // ============ 幻灯片3: 项目概述 ============
  console.log("Creating slide 3: Project Overview...");
  let slide3 = pres.addSlide();
  slide3.background = { color: COLORS.white };

  // 顶部装饰条
  slide3.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  // 标题
  slide3.addText("01  项目概述", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 项目背景卡片
  slide3.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.3, w: 4.3, h: 2.0,
    fill: { color: COLORS.primary },
    shadow: { type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.15 }
  });

  slide3.addText("项目背景", {
    x: 0.7, y: 1.5, w: 4, h: 0.5,
    fontSize: 20, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "left"
  });

  slide3.addText([
    { text: "旅游业蓬勃发展，个性化需求日益增长", options: { bullet: true, breakLine: true } },
    { text: "传统旅行规划耗时费力，信息分散", options: { bullet: true, breakLine: true } },
    { text: "AI技术成熟，智能助手成为趋势", options: { bullet: true } }
  ], {
    x: 0.7, y: 2.0, w: 3.9, h: 1.2,
    fontSize: 13, fontFace: "Microsoft YaHei",
    color: COLORS.white, align: "left", valign: "top"
  });

  // 项目目标卡片
  slide3.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.3, w: 4.3, h: 2.0,
    fill: { color: COLORS.secondary },
    shadow: { type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.15 }
  });

  slide3.addText("项目目标", {
    x: 5.4, y: 1.5, w: 4, h: 0.5,
    fontSize: 20, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "left"
  });

  slide3.addText([
    { text: "打造AI驱动的个性化旅行规划平台", options: { bullet: true, breakLine: true } },
    { text: "提供智能问答、行程规划、景点推荐", options: { bullet: true, breakLine: true } },
    { text: "整合航班、酒店、天气等出行信息", options: { bullet: true } }
  ], {
    x: 5.4, y: 2.0, w: 3.9, h: 1.2,
    fontSize: 13, fontFace: "Microsoft YaHei",
    color: COLORS.white, align: "left", valign: "top"
  });

  // 项目定位
  slide3.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.5, w: 9, h: 1.8,
    fill: { color: COLORS.light },
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.1 }
  });

  slide3.addText("项目定位", {
    x: 0.7, y: 3.7, w: 8.6, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.primary, align: "left"
  });

  slide3.addText("智能旅游助手（Travel Assistant）是一个AI驱动的个性化旅行规划平台，通过人工智能技术为用户提供智能化的旅行咨询、行程规划和景点推荐服务。项目采用前后端分离架构，前端基于Next.js 14构建，后端采用Flask微服务架构，深度集成Kimi、智谱、OpenAI等多个AI大模型。", {
    x: 0.7, y: 4.2, w: 8.6, h: 1.0,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: COLORS.text, align: "left", valign: "top"
  });

  // ============ 幻灯片4: 系统架构 ============
  console.log("Creating slide 4: System Architecture...");
  let slide4 = pres.addSlide();
  slide4.background = { color: COLORS.white };

  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  slide4.addText("02  系统架构", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 客户端层
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.3, w: 9, h: 0.8,
    fill: { color: COLORS.coral }
  });
  slide4.addText("客户端层 (Client Layer)  -  用户Web前端 (Next.js 14) | 管理Web前端 (Ant Design) | 移动端 (PWA)", {
    x: 0.5, y: 1.3, w: 9, h: 0.8,
    fontSize: 13, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "center", valign: "middle"
  });

  // 箭头
  slide4.addShape(pres.shapes.LINE, {
    x: 5, y: 2.1, w: 0, h: 0.3,
    line: { color: COLORS.muted, width: 2 }
  });

  // 网关层
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 2.4, w: 9, h: 0.7,
    fill: { color: COLORS.purple }
  });
  slide4.addText("网关层 (Gateway Layer)  -  API Gateway  |  请求路由  |  负载均衡  |  限流熔断", {
    x: 0.5, y: 2.4, w: 9, h: 0.7,
    fontSize: 13, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "center", valign: "middle"
  });

  // 箭头
  slide4.addShape(pres.shapes.LINE, {
    x: 5, y: 3.1, w: 0, h: 0.3,
    line: { color: COLORS.muted, width: 2 }
  });

  // 应用层
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.4, w: 9, h: 0.9,
    fill: { color: COLORS.primary }
  });
  slide4.addText("应用层 (Application Layer)  -  Flask主应用  |  AI服务模块  |  数据服务  |  通知服务", {
    x: 0.5, y: 3.4, w: 9, h: 0.9,
    fontSize: 13, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "center", valign: "middle"
  });

  // 箭头
  slide4.addShape(pres.shapes.LINE, {
    x: 5, y: 4.3, w: 0, h: 0.3,
    line: { color: COLORS.muted, width: 2 }
  });

  // 数据层
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.6, w: 9, h: 0.7,
    fill: { color: COLORS.teal }
  });
  slide4.addText("数据层 (Data Layer)  -  主数据库 (SQLite/MySQL)  |  缓存数据库 (Redis)  |  文件存储", {
    x: 0.5, y: 4.6, w: 9, h: 0.7,
    fontSize: 13, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "center", valign: "middle"
  });

  // ============ 幻灯片5: 技术选型 ============
  console.log("Creating slide 5: Tech Stack...");
  let slide5 = pres.addSlide();
  slide5.background = { color: COLORS.white };

  slide5.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  slide5.addText("03  技术选型", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 后端技术栈
  slide5.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.2, w: 4.3, h: 3.8,
    fill: { color: COLORS.light },
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.1 }
  });

  slide5.addText("后端技术栈", {
    x: 0.7, y: 1.4, w: 4, h: 0.5,
    fontSize: 20, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.primary, align: "left"
  });

  const backendTech = [
    { name: "Flask 2.3.3", desc: "轻量级Web框架" },
    { name: "SQLAlchemy 2.0", desc: "ORM数据库映射" },
    { name: "SQLite/MySQL", desc: "主数据库存储" },
    { name: "Redis 7", desc: "缓存与限流" },
    { name: "JWT Auth", desc: "身份认证" },
    { name: "Kimi/智谱/OAI", desc: "AI大模型集成" },
  ];

  backendTech.forEach((tech, i) => {
    slide5.addShape(pres.shapes.RECTANGLE, {
      x: 0.7, y: 2.0 + i * 0.5, w: 0.08, h: 0.35,
      fill: { color: COLORS.accent }
    });
    slide5.addText(tech.name, {
      x: 0.9, y: 2.0 + i * 0.5, w: 2, h: 0.35,
      fontSize: 13, fontFace: "Microsoft YaHei", bold: true,
      color: COLORS.dark, align: "left", valign: "middle"
    });
    slide5.addText(tech.desc, {
      x: 2.9, y: 2.0 + i * 0.5, w: 1.7, h: 0.35,
      fontSize: 11, fontFace: "Microsoft YaHei",
      color: COLORS.muted, align: "left", valign: "middle"
    });
  });

  // 前端技术栈
  slide5.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.2, w: 4.3, h: 3.8,
    fill: { color: COLORS.light },
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.1 }
  });

  slide5.addText("前端技术栈", {
    x: 5.4, y: 1.4, w: 4, h: 0.5,
    fontSize: 20, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.secondary, align: "left"
  });

  const frontendTech = [
    { name: "Next.js 14", desc: "React SSR框架" },
    { name: "React 18.2", desc: "UI组件库" },
    { name: "Zustand 4.4", desc: "状态管理" },
    { name: "Axios 1.5", desc: "HTTP客户端" },
    { name: "TypeScript", desc: "类型安全" },
    { name: "Tailwind CSS", desc: "样式框架" },
  ];

  frontendTech.forEach((tech, i) => {
    slide5.addShape(pres.shapes.RECTANGLE, {
      x: 5.4, y: 2.0 + i * 0.5, w: 0.08, h: 0.35,
      fill: { color: COLORS.secondary }
    });
    slide5.addText(tech.name, {
      x: 5.6, y: 2.0 + i * 0.5, w: 2, h: 0.35,
      fontSize: 13, fontFace: "Microsoft YaHei", bold: true,
      color: COLORS.dark, align: "left", valign: "middle"
    });
    slide5.addText(tech.desc, {
      x: 7.6, y: 2.0 + i * 0.5, w: 1.7, h: 0.35,
      fontSize: 11, fontFace: "Microsoft YaHei",
      color: COLORS.muted, align: "left", valign: "middle"
    });
  });

  // ============ 幻灯片6: 核心功能模块 ============
  console.log("Creating slide 6: Core Features...");
  let slide6 = pres.addSlide();
  slide6.background = { color: COLORS.white };

  slide6.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  slide6.addText("04  核心功能模块", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 功能模块网格
  const features = [
    { icon: icons.user, name: "用户系统", desc: "注册登录/会员等级", color: COLORS.primary },
    { icon: icons.map, name: "景点管理", desc: "列表/详情/推荐", color: COLORS.secondary },
    { icon: icons.robot, name: "AI对话", desc: "智能问答/流式响应", color: COLORS.coral },
    { icon: icons.route, name: "行程规划", desc: "AI生成/手动规划", color: COLORS.purple },
    { icon: icons.hotel, name: "酒店预订", desc: "搜索/房型/预订", color: COLORS.teal },
    { icon: icons.plane, name: "机票预订", desc: "航班/特价票", color: COLORS.accent },
    { icon: icons.heart, name: "用户收藏", desc: "收藏/足迹", color: COLORS.gold },
    { icon: icons.chat, name: "旅行游记", desc: "发布/点赞/评论", color: COLORS.coral },
    { icon: icons.star, name: "优惠券", desc: "领取/使用/验证", color: COLORS.primary },
    { icon: icons.database, name: "天气查询", desc: "实时天气/预报", color: COLORS.secondary },
  ];

  features.forEach((feat, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = 0.5 + col * 1.85;
    const y = 1.3 + row * 2.0;

    // 卡片背景
    slide6.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: 1.7, h: 1.7,
      fill: { color: COLORS.light },
      shadow: { type: "outer", color: "000000", blur: 4, offset: 2, angle: 135, opacity: 0.1 }
    });

    // 顶部色条
    slide6.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: 1.7, h: 0.08,
      fill: { color: feat.color }
    });

    // 图标
    slide6.addImage({
      data: feat.icon,
      x: x + 0.6, y: y + 0.25, w: 0.5, h: 0.5
    });

    // 名称
    slide6.addText(feat.name, {
      x: x, y: y + 0.85, w: 1.7, h: 0.4,
      fontSize: 12, fontFace: "Microsoft YaHei", bold: true,
      color: COLORS.dark, align: "center", valign: "middle"
    });

    // 描述
    slide6.addText(feat.desc, {
      x: x, y: y + 1.2, w: 1.7, h: 0.35,
      fontSize: 9, fontFace: "Microsoft YaHei",
      color: COLORS.muted, align: "center", valign: "top"
    });
  });

  // 功能统计
  slide6.addText("共计 20 个功能模块，覆盖旅游全场景", {
    x: 0.5, y: 5.2, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: COLORS.muted, align: "center"
  });

  // ============ 幻灯片7: AI对话系统 ============
  console.log("Creating slide 7: AI Chat System...");
  let slide7 = pres.addSlide();
  slide7.background = { color: COLORS.white };

  slide7.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  slide7.addText("05  AI对话系统", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 左侧：技术特点
  slide7.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.2, w: 4.5, h: 4.0,
    fill: { color: COLORS.light }
  });

  slide7.addText("技术特点", {
    x: 0.7, y: 1.4, w: 4, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.primary, align: "left"
  });

  const aiFeatures = [
    { title: "多模型支持", desc: "Kimi / 智谱 / OpenAI 自动降级" },
    { title: "流式响应", desc: "SSE技术实现逐字显示" },
    { title: "联网搜索", desc: "实时获取景点最新信息" },
    { title: "P0-P3优先级", desc: "信息分层，重要信息优先" },
  ];

  aiFeatures.forEach((feat, i) => {
    slide7.addImage({
      data: icons.check,
      x: 0.7, y: 2.0 + i * 0.8, w: 0.35, h: 0.35
    });
    slide7.addText(feat.title, {
      x: 1.15, y: 2.0 + i * 0.8, w: 3.5, h: 0.35,
      fontSize: 14, fontFace: "Microsoft YaHei", bold: true,
      color: COLORS.dark, align: "left", valign: "middle"
    });
    slide7.addText(feat.desc, {
      x: 1.15, y: 2.35 + i * 0.8, w: 3.5, h: 0.35,
      fontSize: 11, fontFace: "Microsoft YaHei",
      color: COLORS.muted, align: "left", valign: "top"
    });
  });

  // 右侧：流程图
  slide7.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.2, w: 4.3, h: 4.0,
    fill: { color: COLORS.dark }
  });

  slide7.addText("对话流程", {
    x: 5.4, y: 1.4, w: 4, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "left"
  });

  const flowSteps = [
    "用户发送消息",
    "AI接收并处理",
    "调用联网搜索",
    "生成回复内容",
    "SSE流式返回"
  ];

  flowSteps.forEach((step, i) => {
    // 圆形编号
    slide7.addShape(pres.shapes.OVAL, {
      x: 5.5, y: 2.0 + i * 0.6, w: 0.35, h: 0.35,
      fill: { color: COLORS.accent }
    });
    slide7.addText(String(i + 1), {
      x: 5.5, y: 2.0 + i * 0.6, w: 0.35, h: 0.35,
      fontSize: 12, fontFace: "Arial", bold: true,
      color: COLORS.white, align: "center", valign: "middle"
    });

    // 步骤文字
    slide7.addText(step, {
      x: 5.95, y: 2.0 + i * 0.6, w: 3.3, h: 0.35,
      fontSize: 13, fontFace: "Microsoft YaHei",
      color: COLORS.white, align: "left", valign: "middle"
    });

    // 连接线
    if (i < flowSteps.length - 1) {
      slide7.addShape(pres.shapes.LINE, {
        x: 5.675, y: 2.35 + i * 0.6, w: 0, h: 0.25,
        line: { color: COLORS.accent, width: 1, dashType: "dash" }
      });
    }
  });

  // ============ 幻灯片8: 数据库设计 ============
  console.log("Creating slide 8: Database Design...");
  let slide8 = pres.addSlide();
  slide8.background = { color: COLORS.white };

  slide8.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  slide8.addText("06  数据库设计", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 数据表卡片
  const tables = [
    { name: "users", desc: "用户表", fields: "id, username, email, phone, membership_level, points", color: COLORS.primary },
    { name: "destinations", desc: "景点表", fields: "id, name, city, rating, ticket_price, lng, lat", color: COLORS.secondary },
    { name: "trips", desc: "行程表", fields: "id, user_id, title, start_date, end_date, status", color: COLORS.coral },
    { name: "favorites", desc: "收藏表", fields: "id, user_id, destination_id, created_at", color: COLORS.purple },
    { name: "travel_note", desc: "游记表", fields: "id, user_id, title, content, likes_count", color: COLORS.teal },
    { name: "coupon", desc: "优惠券表", fields: "id, code, discount_amount, valid_from, valid_until", color: COLORS.gold },
    { name: "order", desc: "订单表", fields: "id, user_id, order_no, total_amount, status", color: COLORS.accent },
    { name: "notification", desc: "通知表", fields: "id, user_id, type, title, content, is_read", color: COLORS.primary },
  ];

  tables.forEach((table, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = 0.5 + col * 2.35;
    const y = 1.2 + row * 2.1;

    // 卡片
    slide8.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: 2.2, h: 1.9,
      fill: { color: COLORS.light },
      shadow: { type: "outer", color: "000000", blur: 4, offset: 2, angle: 135, opacity: 0.1 }
    });

    // 顶部色条
    slide8.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: 2.2, h: 0.06,
      fill: { color: table.color }
    });

    // 表名
    slide8.addText(table.name, {
      x: x, y: y + 0.15, w: 2.2, h: 0.4,
      fontSize: 13, fontFace: "Consolas", bold: true,
      color: table.color, align: "center", valign: "middle"
    });

    // 描述
    slide8.addText(table.desc, {
      x: x, y: y + 0.5, w: 2.2, h: 0.3,
      fontSize: 10, fontFace: "Microsoft YaHei",
      color: COLORS.dark, align: "center", valign: "middle"
    });

    // 分隔线
    slide8.addShape(pres.shapes.LINE, {
      x: x + 0.2, y: y + 0.85, w: 1.8, h: 0,
      line: { color: COLORS.muted, width: 0.5 }
    });

    // 字段
    slide8.addText(table.fields, {
      x: x + 0.1, y: y + 0.95, w: 2.0, h: 0.85,
      fontSize: 8, fontFace: "Consolas",
      color: COLORS.muted, align: "left", valign: "top"
    });
  });

  // 统计
  slide8.addText("共计 15 张数据表，支持完整业务逻辑", {
    x: 0.5, y: 5.2, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: COLORS.muted, align: "center"
  });

  // ============ 幻灯片9: 性能优化 ============
  console.log("Creating slide 9: Performance Optimization...");
  let slide9 = pres.addSlide();
  slide9.background = { color: COLORS.white };

  slide9.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  slide9.addText("07  性能优化", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  // 三大优化策略
  const optimizations = [
    {
      icon: icons.bolt,
      title: "Redis缓存",
      items: ["景点列表缓存 5分钟", "景点详情缓存 10分钟", "元数据缓存 1小时"],
      color: COLORS.gold
    },
    {
      icon: icons.server,
      title: "API限流",
      items: ["景点查询 100次/分钟", "AI对话 20次/分钟", "外部API 30次/分钟"],
      color: COLORS.coral
    },
    {
      icon: icons.database,
      title: "数据库优化",
      items: ["复合索引设计", "连接池配置", "预编译语句"],
      color: COLORS.teal
    }
  ];

  optimizations.forEach((opt, i) => {
    const x = 0.5 + i * 3.1;

    // 卡片
    slide9.addShape(pres.shapes.RECTANGLE, {
      x: x, y: 1.2, w: 2.9, h: 3.5,
      fill: { color: COLORS.light },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.1 }
    });

    // 图标背景
    slide9.addShape(pres.shapes.OVAL, {
      x: x + 0.95, y: 1.4, w: 1.0, h: 1.0,
      fill: { color: opt.color }
    });

    slide9.addImage({
      data: opt.icon,
      x: x + 1.1, y: 1.55, w: 0.7, h: 0.7
    });

    // 标题
    slide9.addText(opt.title, {
      x: x, y: 2.5, w: 2.9, h: 0.5,
      fontSize: 18, fontFace: "Microsoft YaHei", bold: true,
      color: COLORS.dark, align: "center", valign: "middle"
    });

    // 列表项
    opt.items.forEach((item, j) => {
      slide9.addText("• " + item, {
        x: x + 0.2, y: 3.1 + j * 0.4, w: 2.5, h: 0.35,
        fontSize: 12, fontFace: "Microsoft YaHei",
        color: COLORS.text, align: "left", valign: "middle"
      });
    });
  });

  // 安全机制
  slide9.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.85, w: 9, h: 0.6,
    fill: { color: COLORS.dark }
  });

  slide9.addImage({
    data: icons.lock,
    x: 0.7, y: 4.95, w: 0.4, h: 0.4
  });

  slide9.addText("安全机制：JWT认证  |  密码加密(pbkdf2:sha256)  |  全局安全头  |  轮转日志", {
    x: 1.2, y: 4.85, w: 8, h: 0.6,
    fontSize: 13, fontFace: "Microsoft YaHei",
    color: COLORS.white, align: "left", valign: "middle"
  });

  // ============ 幻灯片10: 项目亮点 ============
  console.log("Creating slide 10: Highlights...");
  let slide10 = pres.addSlide();
  slide10.background = { color: COLORS.white };

  slide10.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: COLORS.primary }
  });

  slide10.addText("08  项目亮点与创新", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.dark, align: "left"
  });

  const highlights = [
    { title: "AI深度集成", desc: "支持Kimi、智谱、OpenAI三个AI服务商，自动降级策略保障服务稳定性", icon: icons.robot },
    { title: "流式响应体验", desc: "AI对话采用SSE实现逐字显示效果，媲美ChatGPT交互体验", icon: icons.chat },
    { title: "完整业务闭环", desc: "20个功能模块覆盖旅游全场景，从规划到预订到分享完整链路", icon: icons.route },
    { title: "性能优化体系", desc: "Redis缓存 + API限流 + 数据库索引，三位一体保障系统性能", icon: icons.bolt },
  ];

  highlights.forEach((hl, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 0.5 + col * 4.7;
    const y = 1.2 + row * 2.0;

    // 卡片
    slide10.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: 4.4, h: 1.8,
      fill: { color: COLORS.light }
    });

    // 左侧色条
    slide10.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: 0.08, h: 1.8,
      fill: { color: COLORS.accent }
    });

    // 图标
    slide10.addShape(pres.shapes.OVAL, {
      x: x + 0.25, y: y + 0.25, w: 0.7, h: 0.7,
      fill: { color: COLORS.primary }
    });
    slide10.addImage({
      data: hl.icon,
      x: x + 0.35, y: y + 0.35, w: 0.5, h: 0.5
    });

    // 标题
    slide10.addText(hl.title, {
      x: x + 1.1, y: y + 0.3, w: 3.1, h: 0.5,
      fontSize: 16, fontFace: "Microsoft YaHei", bold: true,
      color: COLORS.dark, align: "left", valign: "middle"
    });

    // 描述
    slide10.addText(hl.desc, {
      x: x + 0.25, y: y + 1.0, w: 3.9, h: 0.65,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: COLORS.text, align: "left", valign: "top"
    });
  });

  // ============ 幻灯片11: 总结与展望 ============
  console.log("Creating slide 11: Summary...");
  let slide11 = pres.addSlide();
  slide11.background = { color: COLORS.dark };

  // 装饰
  slide11.addShape(pres.shapes.OVAL, {
    x: -2, y: 3, w: 5, h: 5,
    fill: { color: COLORS.primary, transparency: 70 }
  });
  slide11.addShape(pres.shapes.OVAL, {
    x: 8, y: -1, w: 4, h: 4,
    fill: { color: COLORS.secondary, transparency: 70 }
  });

  slide11.addText("总结与展望", {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "center"
  });

  // 项目总结
  slide11.addText("项目已完成核心功能的开发，实现了AI驱动的个性化旅行规划平台。系统具备完善的20个功能模块，覆盖用户管理、景点推荐、AI对话、行程规划等旅游全场景。", {
    x: 1, y: 1.5, w: 8, h: 0.9,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: COLORS.white, align: "center", valign: "middle"
  });

  // 未来展望
  slide11.addText("未来展望", {
    x: 0.5, y: 2.6, w: 9, h: 0.5,
    fontSize: 20, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.accent, align: "center"
  });

  const futures = [
    "接入更多AI模型，提升智能对话能力",
    "开发移动端APP，实现跨平台体验",
    "引入知识图谱，实现更深度的景点关联推荐",
    "增加社交功能，打造旅行社区"
  ];

  futures.forEach((f, i) => {
    slide11.addText("▸ " + f, {
      x: 2.5, y: 3.2 + i * 0.45, w: 5, h: 0.4,
      fontSize: 13, fontFace: "Microsoft YaHei",
      color: COLORS.white, align: "left", valign: "middle"
    });
  });

  // ============ 幻灯片12: 致谢 ============
  console.log("Creating slide 12: Thanks...");
  let slide12 = pres.addSlide();
  slide12.background = { color: COLORS.dark };

  // 装饰
  slide12.addShape(pres.shapes.OVAL, {
    x: -1, y: -1, w: 4, h: 4,
    fill: { color: COLORS.secondary, transparency: 70 }
  });
  slide12.addShape(pres.shapes.OVAL, {
    x: 7, y: 3.5, w: 5, h: 5,
    fill: { color: COLORS.primary, transparency: 70 }
  });

  // 引用图标
  slide12.addImage({
    data: icons.quote,
    x: 4.5, y: 1.2, w: 1, h: 1
  });

  slide12.addText("感谢聆听", {
    x: 0.5, y: 2.0, w: 9, h: 1.0,
    fontSize: 48, fontFace: "Microsoft YaHei", bold: true,
    color: COLORS.white, align: "center"
  });

  slide12.addText("THANK YOU", {
    x: 0.5, y: 2.9, w: 9, h: 0.6,
    fontSize: 24, fontFace: "Arial",
    color: COLORS.accent, align: "center", charSpacing: 8
  });

  // 分隔线
  slide12.addShape(pres.shapes.RECTANGLE, {
    x: 4, y: 3.7, w: 2, h: 0.03,
    fill: { color: COLORS.accent }
  });

  slide12.addText("欢迎各位老师提问", {
    x: 0.5, y: 4.0, w: 9, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei",
    color: COLORS.muted, align: "center"
  });

  slide12.addText("小游智能旅行助手  |  毕业设计答辩  |  2026年4月", {
    x: 0.5, y: 5.0, w: 9, h: 0.4,
    fontSize: 12, fontFace: "Microsoft YaHei",
    color: COLORS.muted, align: "center"
  });

  // 保存
  console.log("Saving presentation...");
  await pres.writeFile({ fileName: "毕业答辩PPT_小游智能旅行助手.pptx" });
  console.log("Done! Presentation saved as: 毕业答辩PPT_小游智能旅行助手.pptx");
}

// 执行
createPresentation().catch(console.error);
