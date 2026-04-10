export async function generateMetadata({ params }: { params: { id: string } }) {
  // 获取目的地信息的API调用
  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5001'}/api/destinations/${params.id}`;

  try {
    const res = await fetch(apiUrl, {
      cache: 'force-cache',
      next: { revalidate: 3600 } // 1小时重新验证
    });

    if (!res.ok) {
      return {
        title: '目的地未找到',
        description: '该目的地不存在或已被移除',
      };
    }

    const data = await res.json();
    const destination = data?.destination;

    if (!destination) {
      return {
        title: '目的地未找到',
        description: '该目的地不存在或已被移除',
      };
    }

    const title = `${destination.name} - 完美旅程目的地详情`;
    const description = destination.description || `${destination.name}位于${destination.city}，是一个值得游览的旅游目的地。`;

    return {
      title,
      description,
      keywords: `${destination.name}, 旅游景点, ${destination.city}旅游, 旅行攻略`,
      openGraph: {
        title,
        description,
        images: [destination.cover_image || '/api/media/fallback-hero.webp'],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    return {
      title: '目的地详情',
      description: '查看旅游目的地的详细信息',
    };
  }
}

export default function DestinationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
