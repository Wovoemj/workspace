'use client'

interface TimelineItem {
  id: string | number
  timeLabel: string
  title: string
  description: string
  tags?: string[]
}

interface TimelineProps {
  title?: string
  items: TimelineItem[]
}

export default function Timeline({ title = '一日游时间轴', items }: TimelineProps) {
  return (
    <div className="card p-6">
      <h3 className="text-h3 text-gray-900 mb-6">{title}</h3>
      <div className="relative">

        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {items.map((item, index) => (
          <div key={item.id} className="relative pl-12 pb-8 last:pb-0">

            <div className="absolute left-4 top-0 w-3 h-3 rounded-full bg-primary border-2 border-white shadow"></div>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="text-small font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {item.timeLabel}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <p className="text-small text-gray-600 mt-1">{item.description}</p>
                {item.tags && item.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.tags.map((tag, tagIdx) => (
                      <span
                        key={tagIdx}
                        className="text-tiny bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
