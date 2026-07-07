'use client'

import { useEditor, EditorContent } from '@tiptap/react'// 导入 TipTap React 核心钩子和组件
import StarterKit from '@tiptap/starter-kit' // 导入基础扩展包（包含段落、标题、列表等）
import Image from '@tiptap/extension-image' 
import { useEffect, useRef, useState } from 'react'// 导入 React 钩子

// 定义工具栏按钮组件，接收点击事件、激活状态、标题和子元素
const ToolbarButton = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-2 rounded hover:bg-gray-100 transition-colors ${
      active ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
    }`}
  >
    {children}
  </button>
)
// 定义分隔线组件
const Divider = () => (
  <div className="w-px h-6 bg-gray-300 mx-1" />
)
// 导出主组件，接收内容值、变化回调和占位符
export default function RichTextEditor({ value, onChange, placeholder }) {
  const prevValueRef = useRef(value) // 用 ref 保存上一次的内容值，用于比较变化
  const isInternalChangeRef = useRef(false)// 标记是否是编辑器内部触发的变化，防止循环更新
  // 强制 React 在编辑器状态变化时重新渲染（让 isActive 拿到最新状态）
 // 数组解构的"占位符"写法  逗号前是空的，表示"我不需要这个值"
  const [, forceRender] = useState(0)
 // 使用 TipTap 的 useEditor 钩子创建编辑器
  const editor = useEditor({
    extensions: [ // 配置扩展
      StarterKit.configure({// 配置基础扩展包
        heading: { levels: [1, 2, 3] },// 只启用 1-3 级标题
      }),
      Image.configure({
        inline: false,// 图片不能内联，独立成块
        allowBase64: false,// 不允许 base64 图片（提高性能）
      }),
    ],
    content: value || '', // 初始内容，如果 value 为空则设为空字符串
    onUpdate: ({ editor }) => {// 编辑器内容变化时的回调
      isInternalChangeRef.current = true// 标记为内部变化
      const html = editor.getHTML()// 获取编辑器内容的 HTML
      prevValueRef.current = html// 更新 ref 中的值
      onChange(html) // 调用父组件传入的 onChange 回调
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none p-4 min-h-[300px] focus:outline-none',
      },
    },
  })

  // 监听所有编辑器事务，触发 React 重新渲染
  useEffect(() => {
    if (!editor) return

    const onTransaction = () => {// 定义事务处理函数
      forceRender(n => n + 1) // 增加 state 值，State 变化,触发组件重新渲染
    }

    editor.on('transaction', onTransaction)// 这个事件在每次编辑器操作时都会触发
    return () => {
      editor.off('transaction', onTransaction)// 组件卸载时移除监听
    }
  }, [editor])// 依赖 editor，当 editor 变化s时重新执行

  // 当外部 value 变化时同步到编辑器
  useEffect(() => {
    // 条件：编辑器存在、值变化、且不是内部变化
    if (editor && value !== prevValueRef.current && !isInternalChangeRef.current) {
      prevValueRef.current = value // 更新 ref  
      editor.commands.setContent(value || '') // 使用命令设置编辑器内容
    }
    isInternalChangeRef.current = false // 重置内部变化标记
  }, [value, editor])
// 组件挂载时
  useEffect(() => {
    //  return () 这里是在组件卸载时执行的清理代码（
    return () => editor?.destroy() // 销毁编辑器实例
    //editor变化时,先执行清理函数（return 的函数），再执行 useEffect 主体
  }, [editor])

  if (!editor) return null

  // 检查 Mark（加粗/斜体/删除线/行内代码）激活状态
  // TipTap 在空内容时 isActive() 不返回 true（因为没有实际文字被标记）
  // 需要额外检查 storedMarks（即将输入的文字会被应用哪些 Mark）
  const isMarkActive = (name) => {// 定义检查标记（加粗、斜体等）是否激活的函数
     // 情况1：检查已选中的文字是否有该标记
    if (editor.isActive(name)) return true

     // 情况2：检查即将输入的文字将会应用什么标记
    // 获取待应用的标记（即将输入的文字会被应用哪些格式）
    const storedMarks = editor.view.state.storedMarks
    if (storedMarks) {
      return storedMarks.some(mark => mark.type.name === name)
    }
    return false
  }

  const addImage = () => {
    const url = window.prompt('输入图片链接')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()// 使用命令链：聚焦编辑器、设置图片、执行
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* 文本格式 toggle是一个切换命令，它会在两种状态之间切换（确定、取消）*/}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={isMarkActive('bold')}// 检查加粗是否激活
          title="加粗"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={isMarkActive('italic')}
          title="斜体"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={isMarkActive('strike')}
          title="删除线"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={isMarkActive('code')}
          title="行内代码"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
        </ToolbarButton>

        <Divider />

        {/* 标题 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="标题 1"
        >
          <span className="text-sm font-bold">H1</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="标题 2"
        >
          <span className="text-sm font-bold">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="标题 3"
        >
          <span className="text-sm font-bold">H3</span>
        </ToolbarButton>

        <Divider />

        {/* 列表 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="无序列表"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="有序列表"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
        </ToolbarButton>

        <Divider />

        {/* 块引用 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="引用"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
        </ToolbarButton>

        {/* 分割线 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          active={false}
          title="分割线"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17h18v-2H3v2zm0-3h18v-2H3v2zm0-5h18V7H3v2z"/></svg>
        </ToolbarButton>

        {/* 图片 */}
        <ToolbarButton
          onClick={addImage}
          active={false}
          title="插入图片"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </ToolbarButton>

        <div className="flex-1" />

        {/* 撤销 / 重做 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          active={false}
          title="撤销"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          active={false}
          title="重做"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 8c-4.65 0-8.58 3.03-9.97 7.22l2.37.78C5.45 12.31 8.46 10 12 10c1.96 0 3.73.72 5.12 1.88L13.5 15.5h9v-9l-3.62 3.62C16.55 8.99 14.15 8 11.5 8z"/></svg>
        </ToolbarButton>
      </div>

      {/* 编辑器区域 */}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  )
}