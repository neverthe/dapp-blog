import { useRouter } from 'next/router'
import { useReadContract, useAccount } from 'wagmi'
import { useState, useEffect } from 'react'
import BlogArtifact from '../../abis/DecentralizedBlog.json'
import { CONTRACT_CONFIG } from '@/lib/wagmi'
import CommentSection from '@/components/CommentSection'
import FollowButton from '@/components/FollowButton'
import { useIPFSContent } from '../../hooks/useIPFSContent'
export default function PostDetail() {
  const router = useRouter()
  const { id } = router.query
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(true)


  // 读取文章详情
  const { data: post, error, refetch: refetchPost } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getPost',
    args: id ? [BigInt(id)] : [],
    query: {
      enabled: !!id,
    }
  })
  const { ipfsContent, isLoading: isLoadingContent } = useIPFSContent(post?.contentHash)


  // 读取点赞数
  const { data: likeCount } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getLikeCount',
    args: id ? [BigInt(id)] : [],
    query: {
      enabled: !!id,
    }
  })

  // 检查是否已点赞
  const { data: hasLiked } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'hasLiked',
    args: id && address ? [BigInt(id), address] : [],
    query: {
      enabled: !!id && !!address,
    }
  })

  useEffect(() => {
    if (id) {
      setIsLoading(false)
    }
  }, [id])

  // 查看用户资料
  const handleViewProfile = (authorAddress) => {
    if (authorAddress) {
      window.dispatchEvent(new CustomEvent('viewUserProfile', { detail: authorAddress }))
    }
  }

  // 返回首页
  const handleBackToHome = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">加载文章失败</div>
          <button
            onClick={handleBackToHome}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-4">文章不存在</div>
          <button
            onClick={handleBackToHome}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const displayTitle = post.title || '无标题'
  const displayAuthor = post.author ? `${post.author.slice(0,8)}...${post.author.slice(-6)}` : '未知作者'
  const displayTimestamp = post.timestamp ? new Date(Number(post.timestamp) * 1000).toLocaleString() : '未知时间'
  const isAuthor = post.author && address && post.author.toLowerCase() === address.toLowerCase()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <span>←</span>
                返回首页
              </button>
              <h1 className="text-xl font-bold">文章详情</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* 文章内容 */}
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 文章头部 */}
          <div className="border-b p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{displayTitle}</h1>
                
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <button
                    onClick={() => handleViewProfile(post.author)}
                    className="flex items-center gap-2 hover:text-blue-600 hover:underline"
                  >
                    <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      👤
                    </span>
                    <span>{displayAuthor}</span>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">🗓️</span>
                    <span>{displayTimestamp}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">❤️</span>
                    <span>{likeCount?.toString() || 0} 个点赞</span>
                  </div>
                </div>
              </div>
              
              {/* 关注按钮 */}
              {post.author && address && post.author.toLowerCase() !== address.toLowerCase() && (
                <div className="ml-4">
                  <FollowButton 
                    targetUser={post.author}
                    size="md"
                    variant="default"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 文章正文 */}
          <div className="p-8">
            <div className="prose max-w-none">
              {isLoadingContent ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">正在从IPFS加载内容...</div>
                </div>
              ) : (
                <div 
                  className="post-content text-gray-800 leading-7 text-lg"
                  dangerouslySetInnerHTML={{ __html: ipfsContent || '暂无内容' }}
                />
              )}
            </div>
            
            {/* 文章底部信息 */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>
                  文章ID: #{post.id?.toString()}
                  {isAuthor && (
                    <span className="ml-3 bg-green-100 text-green-600 px-2 py-1 rounded text-xs">
                      我的文章
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {post.contentHash && !post.contentHash.startsWith('ipfs-') && (
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">
                      IPFS存储
                    </span>
                  )}
                  {hasLiked && (
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
                      已点赞
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 评论区域 */}
        <div className="mt-8">
          <CommentSection postId={BigInt(id)} />
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>去中心化博客 - 基于区块链的永久存储平台</p>
            <p className="text-sm mt-2">所有内容永久存储在以太坊区块链上</p>
          </div>
        </div>
      </footer>
    </div>
  )
}