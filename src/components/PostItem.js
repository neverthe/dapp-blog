import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { CONTRACT_CONFIG } from '@/lib/wagmi'
import { useState, useEffect } from 'react'
import BlogArtifact from '../abis/DecentralizedBlog.json'
import FollowButton from './FollowButton'
import RichTextEditor from './RichTextEditor'
import TagInput from './TagInput'
import { useRouter } from 'next/router'
import { useIPFSContent } from '@/hooks/useIPFSContent'
import { uploadToPinata, uploadImageToPinata } from '../../utils/pinata'

// 去除 HTML 标签，用于纯文本预览
const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

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
 const { ipfsContent, coverImage, isLoading: isLoadingContent } = useIPFSContent(post?.contentHash)

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
  const { data: likeHash, writeContract: likePost, isError: isLikeError, error: likeError, reset: resetLike } = useWriteContract()
  const { isLoading: isLiking, isSuccess: isLikeSuccess } = useWaitForTransactionReceipt({ 
    hash: likeHash 
  })

  // 编辑交易
  const { data: editHash, writeContract: editPost, isError: isEditError, error: editError, reset: resetEdit } = useWriteContract()
  const { isLoading: isEditingTx, isSuccess: isEditSuccess } = useWaitForTransactionReceipt({ 
    hash: editHash 
  })

  // 删除交易
  const { data: deleteHash, writeContract: deletePost, isError: isDeleteError, error: deleteError, reset: resetDelete } = useWriteContract()
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

  // 处理交易错误（如用户取消签名、拒绝交易等）
  useEffect(() => {
    if (isEditError) {
      if (editError?.message?.includes('rejected') || editError?.message?.includes('denied') || editError?.code === 4001) {
        // 用户主动取消，不弹错误提示，只需恢复按钮状态
      } else {
        console.error('编辑交易失败:', editError?.message)
      }
      resetEdit()
    }
  }, [isEditError, editError, resetEdit])

  useEffect(() => {
    if (isDeleteError) {
      if (deleteError?.message?.includes('rejected') || deleteError?.message?.includes('denied') || deleteError?.code === 4001) {
        // 用户取消
      } else {
        console.error('删除交易失败:', deleteError?.message)
      }
      resetDelete()
    }
  }, [isDeleteError, deleteError, resetDelete])

  useEffect(() => {
    if (isLikeError) {
      resetLike()
    }
  }, [isLikeError, likeError, resetLike])
// post?.contentHash,
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState([])
  const [editCoverImage, setEditCoverImage] = useState(null)
  const [editCoverImagePreview, setEditCoverImagePreview] = useState('')
  const [editUploadProgress, setEditUploadProgress] = useState(0)
  const [editUploadPhase, setEditUploadPhase] = useState('') // 'cover' | 'content' | ''

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
    setEditContent(ipfsContent || '')
    setEditTags(post.tags ? [...post.tags] : [])
    setEditCoverImage(null)
    setEditCoverImagePreview(coverImage ? `https://gateway.pinata.cloud/ipfs/${coverImage}` : '')
    setIsEditing(true)
  }

const handleSaveEdit = async () => {
  if (!editTitle.trim() || !editContent.trim()) return
  
  try {
    // 1. 如果有新的封面图，先上传
    let coverImageCid = '';
    if (editCoverImage) {
      setEditUploadPhase('cover');
      setEditUploadProgress(0);
      coverImageCid = await uploadImageToPinata(editCoverImage, (pct) => {
        setEditUploadProgress(pct);
      });
    } else if (editCoverImagePreview) {
      const match = editCoverImagePreview.match(/\/ipfs\/(.+)$/);
      coverImageCid = match ? match[1] : '';
    }
    
    // 2. 上传新内容到IPFS
    setEditUploadPhase('content');
    setEditUploadProgress(0);
    const newContentHash = await uploadToPinata(editTitle, editContent, coverImageCid, (pct) => {
      setEditUploadProgress(pct);
    });
    
    // 3. 调用合约更新
    setEditUploadPhase('');
    setEditUploadProgress(0);
    editPost({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'updatePost',
      args: [postId, editTitle, newContentHash, editTags],
    });
    
  } catch (error) {
    console.error('编辑失败:', error);
    alert(`编辑失败: ${error.message}`);
    setEditUploadPhase('');
    setEditUploadProgress(0);
  }
}

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditTitle('')
    setEditContent('')
    setEditTags([])
    setEditCoverImage(null)
    setEditCoverImagePreview('')
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
          <RichTextEditor
            value={editContent}
            onChange={setEditContent}
            placeholder="文章内容"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签
            </label>
            <TagInput
              tags={editTags}
              onChange={setEditTags}
              placeholder="如：区块链、DeFi、NFT..."
            />
          </div>
          {/* 编辑封面图 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              封面图 <span className="text-gray-400 text-xs">（可选）</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors">
                <span>选择图片</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setEditCoverImage(file)
                      setEditCoverImagePreview(URL.createObjectURL(file))
                    }
                  }}
                  disabled={isEditingTx}
                />
              </label>
              {editCoverImagePreview && (
                <button
                  onClick={() => {
                    setEditCoverImage(null)
                    setEditCoverImagePreview('')
                  }}
                  disabled={isEditingTx}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  移除封面
                </button>
              )}
            </div>
            {editCoverImagePreview && (
              <div className="mt-2 relative rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={editCoverImagePreview}
                  alt="封面预览"
                  className="w-full max-h-36 object-contain bg-gray-50"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveEdit}
              disabled={isEditingTx || editUploadPhase !== ''}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors duration-200 font-medium"
            >
              {editUploadPhase === 'cover' ? `封面图 ${editUploadProgress}%` : 
               editUploadPhase === 'content' ? `上传中 ${editUploadProgress}%` :
               isEditingTx ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isEditingTx || editUploadPhase !== ''}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 transition-colors duration-200 font-medium"
            >
              取消
            </button>
          </div>
          {(editUploadPhase === 'cover' || editUploadPhase === 'content') && (
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${editUploadProgress}%` }}
              />
            </div>
          )}
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
              
              {/* 标签显示 */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {post.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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

{/* 封面图展示 */}
{!isLoadingContent && coverImage && (
  <div 
    onClick={handleViewDetail}
    className="mt-3 cursor-pointer rounded-lg overflow-hidden bg-gray-100"
  >
    <div className="aspect-video relative">
      <img
        src={`https://gateway.pinata.cloud/ipfs/${coverImage}`}
        alt="文章封面"
        className="w-full h-full object-contain hover:opacity-90 transition-opacity"
        onError={(e) => {
          e.target.style.display = 'none'
        }}
      />
    </div>
  </div>
)}

{/* 内容预览 */}
<div 
  onClick={handleViewDetail}
  className="mt-3 text-gray-700 cursor-pointer"
>
  <div className="line-clamp-3">
    {isLoadingContent ? (
      <div className="text-gray-400">加载内容中...</div>
    ) : ipfsContent ? (
      <div className="post-content text-base leading-relaxed">
        {stripHtml(ipfsContent).substring(0, 200)}
        {stripHtml(ipfsContent).length > 200 ? '...' : ''}
      </div>
    ) : (
      <span>暂无内容</span>
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