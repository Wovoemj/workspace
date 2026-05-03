/**
 * =====================================================
 * 管理后台 - 数据库管理模块
 * =====================================================
 *
 * 【功能列表】
 * - 数据库表列表展示
 * - 表结构查看（列名、类型、约束）
 * - 表数据查看（分页）
 * - 数据增删改查
 * - 管理员权限校验
 *
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 *
 * 【API 接口】
 * - GET /api/admin/database/tables: 获取所有数据表列表
 * - GET /api/admin/database/tables/${name}: 获取表数据
 * - POST /api/admin/database/tables/${name}/row: 插入数据
 * - PUT /api/admin/database/tables/${name}/row: 更新数据
 * - DELETE /api/admin/database/tables/${name}/row: 删除数据
 */
'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Pencil, Trash2, Plus, X, Check, AlertCircle } from 'lucide-react'

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

  // 编辑/新增状态
  const [editMode, setEditMode] = useState<'none' | 'add' | 'edit'>('none')
  const [editRow, setEditRow] = useState<Record<string, any>>({})
  const [originalRow, setOriginalRow] = useState<Record<string, any>>({})
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''

  // 获取表列表
  const fetchTables = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/database/tables', {
        headers: { 'Authorization': `Bearer ${adminToken || ''}` }
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
      const res = await fetch(`/api/admin/database/tables/${tableName}?page=${page}&per_page=50`, {
        headers: { 'Authorization': `Bearer ${adminToken || ''}` }
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

  // 获取主键列
  const getPkColumn = (tableInfo?: TableInfo): string | null => {
    if (!tableInfo) return null
    const pk = tableInfo.columns.find(c => c.pk)
    return pk ? pk.name : null
  }

  // 开始新增
  const handleAdd = () => {
    if (!selectedTableInfo) return
    const emptyRow: Record<string, any> = {}
    selectedTableInfo.columns.forEach(col => {
      emptyRow[col.name] = col.default ?? ''
    })
    setEditRow(emptyRow)
    setOriginalRow({})
    setEditMode('add')
    setEditError('')
  }

  // 开始编辑
  const handleEdit = (row: Record<string, any>) => {
    const copy = { ...row }
    // 尝试解析 JSON 字符串以便编辑
    selectedTableInfo?.columns.forEach(col => {
      if (col.type?.toLowerCase().includes('text') && typeof copy[col.name] === 'string') {
        try {
          const parsed = JSON.parse(copy[col.name])
          if (typeof parsed === 'object') {
            copy[col.name] = JSON.stringify(parsed, null, 2)
          }
        } catch {
          // 不是 JSON，保持原样
        }
      }
    })
    // 密码哈希不在编辑框显示，留空表示不修改
    if (copy.password_hash !== undefined) copy.password_hash = ''
    if (copy.password !== undefined) copy.password = ''
    setEditRow(copy)
    setOriginalRow({ ...row })
    setEditMode('edit')
    setEditError('')
  }

  // 保存（新增或更新）
  const handleSave = async () => {
    if (!selectedTable) return
    setEditLoading(true)
    setEditError('')

    try {
      const pkCol = getPkColumn(selectedTableInfo)

      if (editMode === 'add') {
        // 过滤空值
        const values: Record<string, any> = {}
        Object.entries(editRow).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) {
            // 尝试解析 JSON
            if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
              try { JSON.parse(v) } catch { /* 不是 JSON */ }
            }
            values[k] = v
          }
        })

        const res = await fetch(`/api/admin/database/tables/${selectedTable}/row`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken || ''}`
          },
          body: JSON.stringify(values)
        })
        const data = await res.json()
        if (data.success) {
          setEditMode('none')
          fetchTableData(selectedTable, currentPage)
        } else {
          setEditError(data.error || '插入失败')
        }
      } else if (editMode === 'edit') {
        const where: Record<string, any> = {}
        if (pkCol && originalRow[pkCol] !== undefined) {
          where[pkCol] = originalRow[pkCol]
        } else {
          // 没有主键，用所有原始值做 WHERE
          Object.entries(originalRow).forEach(([k, v]) => {
            if (v !== null && v !== undefined) where[k] = v
          })
        }

        const values: Record<string, any> = {}
        Object.entries(editRow).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) {
            values[k] = v
          }
        })

        const res = await fetch(`/api/admin/database/tables/${selectedTable}/row`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken || ''}`
          },
          body: JSON.stringify({ where, values })
        })
        const data = await res.json()
        if (data.success) {
          setEditMode('none')
          fetchTableData(selectedTable, currentPage)
        } else {
          setEditError(data.error || '更新失败')
        }
      }
    } catch (e) {
      setEditError(String(e))
    } finally {
      setEditLoading(false)
    }
  }

  // 删除
  const handleDelete = async (row: Record<string, any>) => {
    if (!selectedTable) return
    setEditLoading(true)
    try {
      const pkCol = getPkColumn(selectedTableInfo)
      const where: Record<string, any> = {}
      if (pkCol && row[pkCol] !== undefined) {
        where[pkCol] = row[pkCol]
      } else {
        Object.entries(row).forEach(([k, v]) => {
          if (v !== null && v !== undefined) where[k] = v
        })
      }

      const res = await fetch(`/api/admin/database/tables/${selectedTable}/row`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || ''}`
        },
        body: JSON.stringify(where)
      })
      const data = await res.json()
      if (data.success) {
        setDeleteConfirm(null)
        fetchTableData(selectedTable, currentPage)
      } else {
        alert(data.error || '删除失败')
      }
    } catch (e) {
      alert(String(e))
    } finally {
      setEditLoading(false)
    }
  }

  // 编辑表单输入处理
  const handleInputChange = (colName: string, value: string) => {
    setEditRow(prev => ({ ...prev, [colName]: value }))
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-24">
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
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">
                                共 {tableData.total} 条记录
                              </span>
                              <button
                                onClick={handleAdd}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                                新增数据
                              </button>
                            </div>
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
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap w-24">
                                    操作
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {tableData.data.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                    {tableData.columns.map((col) => (
                                      <td
                                        key={col}
                                        className="px-4 py-2 text-gray-700 font-mono text-xs max-w-xs truncate"
                                        title={String(row[col] ?? '')}
                                      >
                                        {formatCellValue(row[col])}
                                      </td>
                                    ))}
                                    <td className="px-4 py-2">
                                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => handleEdit(row)}
                                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                          title="编辑"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirm(String(idx))}
                                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title="删除"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
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

      {/* 编辑/新增弹窗 */}
      {editMode !== 'none' && selectedTableInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editMode === 'add' ? '新增数据' : '编辑数据'} — {selectedTableInfo.name}
              </h3>
              <button
                onClick={() => setEditMode('none')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {editError && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {editError}
                </div>
              )}

              <div className="space-y-4">
                {selectedTableInfo.columns.map((col) => (
                  <div key={col.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {col.name}
                      {col.pk && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded-full">主键</span>}
                      {col.notnull && <span className="ml-1.5 text-red-500">*</span>}
                    </label>
                    {col.name === 'password_hash' || col.name === 'password' ? (
                      <>
                        <input
                          type="password"
                          value={editRow[col.name] ?? ''}
                          onChange={(e) => handleInputChange(col.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                          placeholder={editMode === 'edit' ? '留空则不修改密码，输入新密码将自动加密' : '请输入密码'}
                        />
                        <span className="text-xs text-gray-400 mt-0.5">{col.type} · 输入明文密码，保存时自动哈希</span>
                      </>
                    ) : col.type?.toLowerCase().includes('text') && (editRow[col.name] === null || String(editRow[col.name] ?? '').length > 50) ? (
                      <textarea
                        value={editRow[col.name] ?? ''}
                        onChange={(e) => handleInputChange(col.name, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                        placeholder={col.default ?? ''}
                      />
                    ) : (
                      <input
                        type={col.type?.toLowerCase().includes('int') ? 'number' : 'text'}
                        value={editRow[col.name] ?? ''}
                        onChange={(e) => handleInputChange(col.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                        placeholder={col.default ?? ''}
                      />
                    )}
                    {!(col.name === 'password_hash' || col.name === 'password') && (
                      <span className="text-xs text-gray-400 mt-0.5">{col.type}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setEditMode('none')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={editLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {editLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500">此操作不可撤销</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const idx = parseInt(deleteConfirm)
                  if (tableData && !isNaN(idx)) {
                    handleDelete(tableData.data[idx])
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

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
