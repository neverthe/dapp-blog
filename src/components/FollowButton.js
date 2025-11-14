import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useState, useEffect } from 'react'
import BlogArtifact from '../../artifacts/contracts/Blog.sol/DecentralizedBlog.json'
import { CONTRACT_CONFIG } from '@/lib/wagmi'

/**
 * 关注按钮组件
 * @param {Object} props
 * @param {string} props.targetUser - 要关注的目标用户地址
 * @param {string} props.size - 按钮大小 'sm' | 'md' | 'lg'
 * @param {string} props.variant - 按钮样式 'default' | 'outline'
 * @param {function} props.onSuccess - 关注成功后的回调
 */
export default function FollowButton({ 
  targetUser, 
  size = "md", 
  variant = "default",
  onSuccess 
}) {
  const { address: currentUser } = useAccount()
  
  // 检查关注状态
  const { data: isFollowing, refetch: refetchIsFollowing } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'isFollowing',
    args: [currentUser, targetUser],
    query: {
      enabled: !!currentUser && !!targetUser && currentUser !== targetUser,
    }
  })

  // 关注操作
  const { 
    data: followHash, 
    writeContract: followUser, 
    isPending: isFollowingTx,
    error: followError 
  } = useWriteContract()

  // 取消关注操作
  const { 
    data: unfollowHash, 
    writeContract: unfollowUser, 
    isPending: isUnfollowingTx,
    error: unfollowError 
  } = useWriteContract()

  // 监听交易状态
  const { isLoading: isConfirming, isSuccess: isFollowSuccess } = useWaitForTransactionReceipt({ 
    hash: followHash 
  })

  const { isLoading: isUnfollowConfirming, isSuccess: isUnfollowSuccess } = useWaitForTransactionReceipt({ 
    hash: unfollowHash 
  })

  // 交易成功后刷新状态
  useEffect(() => {
    if (isFollowSuccess || isUnfollowSuccess) {
      refetchIsFollowing()
      if (onSuccess) {
        onSuccess()
      }
    }
  }, [isFollowSuccess, isUnfollowSuccess, refetchIsFollowing, onSuccess])

  const handleFollow = async () => {
    if (!currentUser) {
      alert('请先连接钱包')
      return
    }
    
    followUser({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'followUser',
      args: [targetUser],
    })
  }

  const handleUnfollow = async () => {
    if (!window.confirm('确定要取消关注吗？')) return
    
    unfollowUser({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'unfollowUser',
      args: [targetUser],
    })
  }

  const isProcessing = isFollowingTx || isConfirming || isUnfollowingTx || isUnfollowConfirming
  const isOwnProfile = currentUser && currentUser.toLowerCase() === targetUser.toLowerCase()

  // 如果不是自己的资料且已连接钱包，才显示关注按钮
  if (isOwnProfile || !currentUser) {
    return null
  }

  // 按钮样式配置
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5', 
    lg: 'text-base px-4 py-2'
  }

  const variantClasses = {
    default: {
      following: 'bg-gray-500 text-white hover:bg-gray-600',
      notFollowing: 'bg-blue-500 text-white hover:bg-blue-600'
    },
    outline: {
      following: 'border border-gray-500 text-gray-600 hover:bg-gray-50',
      notFollowing: 'border border-blue-500 text-blue-600 hover:bg-blue-50'
    }
  }

  const buttonClass = `
    ${sizeClasses[size]} 
    rounded font-medium transition-colors duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isFollowing 
      ? variantClasses[variant].following 
      : variantClasses[variant].notFollowing
    }
  `

  // 显示错误信息
  const error = followError || unfollowError
  if (error) {
    console.error('关注操作错误:', error)
  }

  if (isFollowing) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={handleUnfollow}
          disabled={isProcessing}
          className={buttonClass}
        >
          {isProcessing ? '处理中...' : '已关注'}
        </button>
        {error && (
          <span className="text-xs text-red-500">操作失败，请重试</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleFollow}
        disabled={isProcessing}
        className={buttonClass}
      >
        {isProcessing ? '关注中...' : '关注'}
      </button>
      {error && (
        <span className="text-xs text-red-500">关注失败，请重试</span>
      )}
    </div>
  )
}