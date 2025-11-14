// components/RichTextEditor.js
'use client'

export default function RichTextEditor({ value, onChange }) {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        className="w-full p-4 focus:outline-none resize-none"
        placeholder="请输入文章内容..."
      />
    </div>
  )
}