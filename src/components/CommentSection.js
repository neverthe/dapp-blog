import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useState,useEffect } from 'react'
import BlogArtifact from '../abis/DecentralizedBlog.json'
import { CONTRACT_CONFIG } from '@/lib/wagmi'
export default function CommentSection({ postId }) {
  const { address } = useAccount()
  const [commentText, setCommentText] = useState('')

 // 读取评论列表。refetch: refetchComments: 获取一个可以手动刷新数据的函数
  const { data: comments, refetch: refetchComments } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getComments',
    args: [postId],
  })

  // 添加评论
  //解构赋值。data: comments: 将返回的 data 重命名为 comments，这样更语义化
  //refetch: refetchComments: 将返回的 refetch 函数重命名为 refetchComments
  const { data: commentHash, writeContract: addComment } = useWriteContract()
  //监听交易的确认状态，等待交易被矿工打包进区块。hash: commentHash: 要监听的交易哈希
  const { isLoading: isCommenting, isSuccess: isCommentSuccess } = useWaitForTransactionReceipt({ 
    hash: commentHash 
  })


  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !address) return

    addComment({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'addComment',
      args: [postId, commentText],
    })
  }

    // 删除评论功能（如果需要的话）
  const { data: deleteCommentHash, writeContract: deleteComment } = useWriteContract()
  const { isLoading: isDeletingComment, isSuccess: isDeleteSuccess } = useWaitForTransactionReceipt({
    hash: deleteCommentHash
  })

// 在 CommentSection.js 中确保有完整的刷新逻辑
useEffect(() => {
  if (isCommentSuccess) {
    //console.log('评论成功，刷新列表')
    refetchComments()
    setCommentText('')
  }
}, [isCommentSuccess, refetchComments])

  return (
    <div className="mt-6 border-t pt-6">
      <h4 className="font-semibold mb-4">评论 ({comments?.length || 0})</h4>
      
      {/* 评论表单 */}
      {address && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下你的评论..."
            rows={3}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={isCommenting || !commentText.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isCommenting ? '提交中...' : '发表评论'}
            </button>
          </div>
        </form>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {comments?.map((comment) => (
          <div key={comment.id.toString()} className="border-l-4 border-blue-200 pl-4 py-2">
            <div className="flex justify-between items-start">
              <span className="text-sm text-gray-600">
                {comment.author.slice(0,6)}...{comment.author.slice(-4)}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(Number(comment.timestamp) * 1000).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-gray-800">{comment.content}</p>
          </div>
        ))}
        
        {(!comments || comments.length === 0) && (
          <p className="text-gray-500 text-center py-4">暂无评论</p>
        )}
      </div>
    </div>
  )
}