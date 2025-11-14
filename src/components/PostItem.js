import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { CONTRACT_CONFIG } from '@/lib/wagmi'
import { useState, useEffect } from 'react'
import BlogArtifact from '../../artifacts/contracts/Blog.sol/DecentralizedBlog.json'
import FollowButton from './FollowButton'
import { useRouter } from 'next/router'
import { useIPFSContent } from '@/hooks/useIPFSContent'
import { uploadToPinata } from '../../utils/pinata' // 添加这行导入

export default function PostItem({ postId, onUpdate, showActions = true }) {
  const { address } = useAccount()
  const router = useRouter()
  


  // 查看详情
  const handleViewDetail = () => {
    router.push(`/post/${postId}`)
  }

  const { data: post, isLoading, error, refetch: refetchPost } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getPost',
    args: [postId],
  })
 const { ipfsContent, isLoading: isLoadingContent } = useIPFSContent(post?.contentHash)

  const { data: likeCount, refetch: refetchLikeCount } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getLikeCount',
    args: [postId],
  })

  const { data: hasLiked, refetch: refetchHasLiked } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'hasLiked',
    args: [postId, address],
    query: {
      enabled: !!address,
    }
  })

  // 点赞交易
  const { data: likeHash, writeContract: likePost } = useWriteContract()
  const { isLoading: isLiking, isSuccess: isLikeSuccess } = useWaitForTransactionReceipt({ 
    hash: likeHash 
  })

  // 编辑交易
  const { data: editHash, writeContract: editPost } = useWriteContract()
  const { isLoading: isEditingTx, isSuccess: isEditSuccess } = useWaitForTransactionReceipt({ 
    hash: editHash 
  })

  // 删除交易
  const { data: deleteHash, writeContract: deletePost } = useWriteContract()
  const { isLoading: isDeleting, isSuccess: isDeleteSuccess } = useWaitForTransactionReceipt({ 
    hash: deleteHash 
  })

  // ✅ 关键：交易成功后自动刷新数据
  useEffect(() => {

  // 在组件内部添加状态来存储IPFS内容


    if (isLikeSuccess || isEditSuccess || isDeleteSuccess) {
      //console.log('操作成功，刷新数据...')
      
      // 刷新所有相关数据
      refetchPost()
      refetchLikeCount()
      refetchHasLiked()
      
      // 通知父组件刷新列表
      if (onUpdate && (isEditSuccess || isDeleteSuccess)) {
        onUpdate()
      }
      
      // 如果是编辑成功，退出编辑模式
      if (isEditSuccess) {
        setIsEditing(false)
      }
    }
  }, [isLikeSuccess, isEditSuccess, isDeleteSuccess, refetchPost, refetchLikeCount, refetchHasLiked, onUpdate])
// post?.contentHash,
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const handleLike = async () => {
    if (!address) return
    
    likePost({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'likePost',
      args: [postId],
    })
  }

  const handleEdit = () => {
    if (!post) return
    setEditTitle(post.title || '')
  setEditContent(ipfsContent || '') // 改为从ipfsContent获取
    setIsEditing(true)
  }

// 在 PostItem.js 中修改 handleSaveEdit
const handleSaveEdit = async () => {
  if (!editTitle.trim() || !editContent.trim()) return
  
  try {
    // 1. 上传新内容到IPFS
    const newContentHash = await uploadToPinata(editTitle, editContent);
    
    // 2. 调用合约更新
    editPost({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'updatePost',
      args: [postId, editTitle, newContentHash], // 传递新的CID
    });
    
  } catch (error) {
    console.error('编辑失败:', error);
    alert(`编辑失败: ${error.message}`);
  }
}

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditTitle('')
    setEditContent('')
  }

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇文章吗？')) return
    
    deletePost({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'deletePost',
      args: [postId],
    })
  }

  // 安全的作者检查
  const isAuthor = post?.author && address && post.author.toLowerCase() === address.toLowerCase()

  // 安全的显示数据
  const displayTitle = post?.title || '无标题'
  const displayAuthor = post?.author ? `${post.author.slice(0,6)}...${post.author.slice(-4)}` : '未知作者'
  const displayTimestamp = post?.timestamp ? new Date(Number(post.timestamp) * 1000).toLocaleString() : '未知时间'
  const displayContent = post?.contentHash || '无内容'

  // 查看用户资料
  const handleViewProfile = (authorAddress) => {
    if (authorAddress) {
      window.dispatchEvent(new CustomEvent('viewUserProfile', { detail: authorAddress }))
    }
  }

  if (isLoading) return (
    <div className="border border-gray-200 rounded-xl p-6 mb-4 bg-white shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
  )
  
  if (error) return (
    <div className="border border-red-200 rounded-xl p-6 mb-4 bg-red-50 text-red-700">
      加载失败: {error.message}
    </div>
  )
  
  if (!post) return (
    <div className="border border-gray-200 rounded-xl p-6 mb-4 bg-gray-50 text-gray-500">
      文章 {postId.toString()} 不存在
    </div>
  )

  return (
    <div className="border border-gray-200 rounded-xl p-6 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
      {isEditing ? (
        // 编辑模式
        <div className="space-y-4">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="文章标题"
            disabled={isEditingTx}
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="文章内容"
            disabled={isEditingTx}
          />
          <div className="flex gap-3">
            <button
              onClick={handleSaveEdit}
              disabled={isEditingTx}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors duration-200 font-medium"
            >
              {isEditingTx ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isEditingTx}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 transition-colors duration-200 font-medium"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        // 显示模式
        <>
          {/* 文章头部 - 包含作者信息和关注按钮 */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              {/* 可点击的标题 */}
              <h3 
                onClick={handleViewDetail}
                className="font-bold text-xl mb-2 text-gray-800 hover:text-blue-600 hover:underline cursor-pointer transition-all duration-200"
              >
                {displayTitle}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button
                  onClick={() => handleViewProfile(post.author)}
                  className="hover:text-blue-600 hover:underline transition-colors duration-200 flex items-center gap-1"
                  title="查看作者资料"
                >
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  👤 {displayAuthor}
                </button>
                <span>•</span>
                <span>{displayTimestamp}</span>
              </div>
            </div>
            
            {/* 关注按钮 - 只在不是自己的文章时显示 */}
            {post.author && address && post.author.toLowerCase() !== address.toLowerCase() && (
              <FollowButton 
                targetUser={post.author}
                size="sm"
                variant="outline"
              />
            )}
          </div>

{/* // 修改显示内容的部分 - */}
<div 
  onClick={handleViewDetail}
  className="mt-3 text-gray-700 cursor-pointer"
>
  <div className="line-clamp-3 leading-relaxed">
    {isLoadingContent ? (
      <div className="text-gray-400">加载内容中...</div>
    ) : (
      ipfsContent || '暂无内容'
    )}
  </div>
  <div className="mt-2 text-blue-500 text-sm font-medium hover:text-blue-600 transition-colors duration-200">
    阅读全文 →
  </div>
</div>


          {/* 互动按钮 */}
          {showActions && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  disabled={isLiking || !address || hasLiked}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    hasLiked 
                      ? 'bg-red-50 text-red-600 border border-red-200' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className={`${hasLiked ? 'text-red-500' : 'text-gray-400'}`}>
                    {hasLiked ? '❤️' : '🤍'}
                  </span>
                  <span className="font-medium">{likeCount?.toString() || 0}</span>
                </button>
              </div>

              {/* 作者操作按钮 */}
              {isAuthor && (
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 text-sm font-medium transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    编辑
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 text-sm font-medium transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    {isDeleting ? '删除中...' : '删除'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}