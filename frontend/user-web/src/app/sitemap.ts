import { MetadataRoute } from 'next'

// 静态页面路?
const staticPaths = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/careers',
  '/partners',
  '/services',
  '/help',
  '/feedback',
  '/news',
  '/deals',
  '/destinations',
  '/planner',
  '/assistant'
]

// 获取动态路?
async function getDynamicPaths() {
  try {
    // 获取所有目的地
    const destinationsRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5001'}/api/destinations?per_page=100`,
      { cache: 'force-cache' }
    )
    const destinationsData = await destinationsRes.json()
    const destinations = destinationsData?.destinations || destinationsData?.items || []

    const destinationPaths = destinations.map((destination: any) => ({
      url: `/destinations/${destination.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8
    }))

    // 获取所有产?
    const productsRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5001'}/api/products?status=active&limit=100`,
      { cache: 'force-cache' }
    )
    const productsData = await productsRes.json()
    const products = productsData?.products || productsData?.items || []

    const productPaths = products.map((product: any) => ({
      url: `/products/${product.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7
    }))

    return [...destinationPaths, ...productPaths]
  } catch (error) {
    console.warn('Failed to fetch dynamic paths for sitemap:', error)
    // 返回空数组而不是抛出错误，这样sitemap仍能生成
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicPaths = await getDynamicPaths()

  const staticSitemap = staticPaths.map(path => ({
    url: `${process.env.NEXT_PUBLIC_SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: path === '/' ? 1 : 0.5
  }))

  return [...staticSitemap, ...dynamicPaths]
}
