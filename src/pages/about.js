import Link from 'next/link'
import { CONTRACT_CONFIG } from '@/lib/wagmi'

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold">去中心化博客</h1>
              <div className="flex gap-4 text-sm">
                <Link
                  href="/"
                  className="px-3 py-2 rounded text-gray-600 hover:text-gray-800"
                >
                  ← 返回首页
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 内容 */}
      <main className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-2xl font-bold mb-6">关于</h2>

          <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-700 text-base">
                一个基于以太坊的去中心化博客平台
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">📝 如何运作</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>文章内容存储在 IPFS（去中心化存储），永久保存</li>
                <li>文章元数据（标题、标签、作者）上链存证</li>
                <li>所有操作通过智能合约执行，公开透明</li>
                <li>评论、点赞、关注数据全部在链上</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">🔧 技术栈</h3>
              <div className="flex flex-wrap gap-2">
                {['Solidity', 'Ethereum', 'Wagmi', 'Next.js', 'Tailwind CSS', 'Pinata IPFS', 'MetaMask'].map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">⚡ 特点</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li><strong>内容不可篡改</strong> — 发布后任何人无法修改或删除你的文章</li>
                <li><strong>去中心化存储</strong> — 不依赖任何中心化服务器</li>
                <li><strong>数据自主权</strong> — 你的内容完全由你掌控</li>
                <li><strong>公开透明</strong> — 所有数据可在区块链浏览器上验证</li>
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-5 text-center text-gray-400 text-xs space-y-1">
              <p>Built on Ethereum Sepolia Testnet</p>
              <p className="font-mono">合约地址: {CONTRACT_CONFIG.address}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
