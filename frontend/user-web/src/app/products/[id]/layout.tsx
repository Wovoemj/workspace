export async function generateMetadata({ params }: { params: { id: string } }) {
  // 获取产品信息的API调用
  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5001'}/api/products/${params.id}`;

  try {
    const res = await fetch(apiUrl, {
      cache: 'force-cache',
      next: { revalidate: 3600 } // 1小时重新验证
    });

    if (!res.ok) {
      return {
        title: '产品未找到',
        description: '该旅游产品不存在或已被移除',
      };
    }

    const data = await res.json();
    const product = data?.product;

    if (!product) {
      return {
        title: '产品未找到',
        description: '该旅游产品不存在或已被移除',
      };
    }

    const title = `${product.name} - 完美旅程产品详情`;
    const description = product.description || product.short_description || `${product.name}是一个优质的旅游产品，为您提供难忘的旅行体验。`;

    return {
      title,
      description,
      keywords: `${product.name}, 旅游产品, ${product.category || ''}, ${product.location?.city || ''}旅游`,
      openGraph: {
        title,
        description,
        images: product.images?.length > 0 ? [product.images[0]] : ['/api/media/fallback-hero.webp'],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    return {
      title: '产品详情',
      description: '查看旅游产品的详细信息',
    };
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
