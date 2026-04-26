/**
 * =====================================================
 * 管理后台 - 数据库管理模块
 * =====================================================
 * 
 * 【功能列表】
 * - 数据库表列表展示
 * - 表结构查看（列名、类型、约束）
 * - 表数据查看（分页）
 * - 数据翻页浏览
 * - 管理员权限校验
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 * 
 * 【API 接口】
 * - GET /api/admin/database/tables: 获取所有数据表列表
 * - GET /api/admin/database/tables/${name}: 获取表结构
 * - GET /api/admin/database/tables/${name}/data?page=1&per_page=50: 获取表数据
 * 
 * 【状态管理】
 * - useState: tables, selectedTable, tableData, activeTab, currentPage
 * - Tab 切换：tables(表列表) / structure(表结构) / data(表数据)
 */
'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface TableColumn {
  cid: number
  name: string
  type: string
  notnull: boolean
  default: any
  pk: boolean
}

interface TableInfo {
  name: string
  columns: TableColumn[]
  row_count: number
}

interface TableData {
  table_name: string
  columns: string[]
  data: Record<string, any>[]
  total: number
  page: number
  per_page: number
}

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState<'tables' | 'structure' | 'data'>('tables')
  const [currentPage, setCurrentPage] = useState(1)

  // 获取表列表
  const fetchTables = async () => {
    try {
      setLoading(true)
      const adminToken = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/database/tables', {
        headers: {
          'Authorization': `Bearer ${adminToken || ''}`
        }
      })
      const data = await res.json()
      if (data.success) {
        setTables(data.tables)
      }
    } catch (e) {
      console.error('获取表列表失败:', e)
    } finally {
      setLoading(false)
    }
  }

  // 获取表数据
  const fetchTableData = async (tableName: string, page: number = 1) => {
    try {
      setLoadingData(true)
      setCurrentPage(page)
      const adminToken = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/database/tables/${tableName}?page=${page}&per_page=50`, {
        headers: {
          'Authorization': `Bearer ${adminToken || ''}`
        }
      })
      const data = await res.json()
      if (data.success) {
        setTableData(data)
      }
    } catch (e) {
      console.error('获取表数据失败:', e)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable)
    }
  }, [selectedTable])

  const handleTableClick = (tableName: string) => {
    setSelectedTable(tableName)
    setActiveTab('data')
  }

  const selectedTableInfo = tables.find(t => t.name === selectedTable)

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              数据库管理
            </h1>
            <p className="text-gray-500 mt-2">查看和管理数据库表结构与数据</p>
          </div>

          <div className="card-glass rounded-2xl overflow-hidden">
            {/* 标签页 */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'tables'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                所有表 ({tables.length})
              </button>
              {selectedTable && (
                <>
                  <button
                    onClick={() => setActiveTab('structure')}
                    className={`px-6 py-4 font-medium transition-colors ${
                      activeTab === 'structure'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    表结构
                  </button>
                  <button
                    onClick={() => setActiveTab('data')}
                    className={`px-6 py-4 font-medium transition-colors ${
                      activeTab === 'data'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    数据
                  </button>
                </>
              )}
            </div>

            {/* 内容区 */}
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* 表列表 */}
                  {activeTab === 'tables' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tables.map((table) => (
                        <div
                          key={table.name}
                          onClick={() => handleTableClick(table.name)}
                          className={`p-5 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                            selectedTable === table.name
                              ? 'border-indigo-400 bg-indigo-50 shadow-md'
                              : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{table.name}</h3>
                              <span className="text-xs text-gray-400">{table.row_count} 行</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {table.columns.length} 个字段
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {table.columns.slice(0, 3).map((col) => (
                              <span
                                key={col.name}
                                className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {col.name}
                              </span>
                            ))}
                            {table.columns.length > 3 && (
                              <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-400 rounded">
                                +{table.columns.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 表结构 */}
                  {activeTab === 'structure' && selectedTableInfo && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedTableInfo.name} 表结构
                        </h2>
                        <span className="text-sm text-gray-500">
                          {selectedTableInfo.columns.length} 个字段 · {selectedTableInfo.row_count} 行数据
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">字段名</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">类型</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">非空</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">主键</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">默认值</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedTableInfo.columns.map((col) => (
                              <tr key={col.name} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="font-mono text-sm text-indigo-600 font-medium">
                                    {col.name}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                                    {col.type || 'ANY'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {col.notnull ? (
                                    <span className="text-red-500">✓</span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {col.pk ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                      PK
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                                  {col.default ?? '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 表数据 */}
                  {activeTab === 'data' && (
                    <div>
                      {loadingData ? (
                        <div className="flex justify-center py-12">
                          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : tableData ? (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                              {tableData.table_name} 数据
                            </h2>
                            <span className="text-sm text-gray-500">
                              共 {tableData.total} 条记录
                            </span>
                          </div>
                          
                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                  {tableData.columns.map((col) => (
                                    <th
                                      key={col}
                                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {tableData.data.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    {tableData.columns.map((col) => (
                                      <td
                                        key={col}
                                        className="px-4 py-2 text-gray-700 font-mono text-xs max-w-xs truncate"
                                        title={String(row[col] ?? '')}
                                      >
                                        {formatCellValue(row[col])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* 分页 */}
                          {tableData.total > tableData.per_page && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                              <button
                                onClick={() => fetchTableData(selectedTable!, currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                上一页
                              </button>
                              <span className="px-4 py-2 text-sm text-gray-600">
                                第 {currentPage} / {Math.ceil(tableData.total / tableData.per_page)} 页
                              </span>
                              <button
                                onClick={() => fetchTableData(selectedTable!, currentPage + 1)}
                                disabled={currentPage >= Math.ceil(tableData.total / tableData.per_page)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                下一页
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          选择一个表查看数据
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// 格式化单元格值
function formatCellValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">NULL</span>
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
