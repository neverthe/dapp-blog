import { useState } from 'react'

/**
 * 标签输入组件
 * @param {Array} tags - 当前标签列表
 * @param {Function} onChange - 标签变化回调
 * @param {string} placeholder - 输入框占位文本
 * @param {number} maxTags - 最大标签数量，默认5
 */
export default function TagInput({ tags = [], onChange, placeholder = '输入标签后按回车添加...', maxTags = 5 }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (tags.length >= maxTags) {
      alert(`最多只能添加 ${maxTags} 个标签`)
      return
    }
    // 去重（不区分大小写）
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setInput('')
      return
    }
    onChange([...tags, trimmed])
    setInput('')
  }

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className="border rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-blue-400 hover:text-blue-600"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
        />
      </div>
      {tags.length > 0 && (
        <div className="text-xs text-gray-400 mt-1">
          共 {tags.length}/{maxTags} 个标签，按回车添加
        </div>
      )}
    </div>
  )
}
