/** 用于目的地列表的大洲筛选（数据以国内为主时，默认归入亚洲） */

export type ContinentKey = 'all' | 'asia' | 'europe' | 'americas' | 'africa'

const EUROPE_HINTS =
  /巴黎|伦敦|罗马|柏林|马德里|阿姆斯特丹|维也纳|布拉格|巴塞罗那|爱丁堡|莫斯科|圣彼得堡|瑞士|挪威|芬兰|丹麦|瑞典|冰岛|希腊|意大利|法国|德国|英国|西班牙|葡萄牙|荷兰|比利时|卢森堡|爱尔兰|捷克|匈牙利|波兰|克罗地亚|塞尔维亚/i

const AMERICAS_HINTS =
  /纽约|洛杉矶|旧金山|西雅图|迈阿密|芝加哥|多伦多|温哥华|墨西哥|里约|布宜诺斯|秘鲁|智利|古巴|夏威夷|美国|加拿大|巴西|阿根廷/i

const AFRICA_HINTS =
  /开罗|卢克索|卡萨布兰卡|马拉喀什|肯尼亚|坦桑尼亚|南非|开普敦|埃及|摩洛哥|突尼斯|毛里求斯|塞舌尔/i

const ASIA_HINTS =
  /北京|上海|广州|深圳|成都|杭州|西安|南京|武汉|重庆|天津|苏州|青岛|厦门|三亚|昆明|拉萨|乌鲁木齐|香港|澳门|台湾|东京|大阪|京都|首尔|釜山|曼谷|清迈|普吉|新加坡|吉隆坡|河内|胡志明|巴厘岛|德里|孟买/i

/** 根据城市/省份/名称粗略判断大洲，便于后续扩展国际目的地 */
export function continentForDestination(parts: { city: string; province: string; name: string }): Exclude<
  ContinentKey,
  'all'
> {
  const blob = `${parts.city} ${parts.province} ${parts.name}`

  if (EUROPE_HINTS.test(blob)) return 'europe'
  if (AMERICAS_HINTS.test(blob)) return 'americas'
  if (AFRICA_HINTS.test(blob)) return 'africa'
  if (ASIA_HINTS.test(blob)) return 'asia'

  // 国内常见行政区划：无海外关键词时默认亚洲（与中国数据一致）
  return 'asia'
}

export const CONTINENT_OPTIONS: Array<{ key: ContinentKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'asia', label: '亚洲' },
  { key: 'europe', label: '欧洲' },
  { key: 'americas', label: '美洲' },
  { key: 'africa', label: '非洲' },
]
