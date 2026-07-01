import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useAccount,
} from 'wagmi'
import { useState, useEffect, useMemo } from 'react'  // 添加 useMemo
import BlogArtifact from '../abis/DecentralizedBlog.json'
import { CONTRACT_CONFIG } from '@/lib/wagmi'
import PostItem from './PostItem'
import { useQueries } from '@tanstack/react-query'


export default function UserProfile({ userAddress }) {
  const { address: currentUser } = useAccount()
  const [activeTab, setActiveTab] = useState('posts')

  // 1. 获取用户文章数量
  const { data: allPostIds } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getAllPostIds',
  })

  const { data: postsData } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getMultiplePosts',
    args: allPostIds ? [allPostIds] : [],
    query: {
      enabled: !!allPostIds && allPostIds.length > 0,
    }
  })

  // 计算用户文章数量
  const userPostsCount = useMemo(() => {
    if (!postsData) return 0
    return postsData.filter(post => 
      post.author.toLowerCase() === userAddress.toLowerCase()
    ).length
  }, [postsData, userAddress])

  // 2. 获取用户评论数量（使用新的合约函数）
  const { data: userComments } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getUserComments',
    args: [userAddress],
  })

  // 3. 获取用户点赞的文章数量
  const { data: likedPostIds } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getLikedPosts',
    args: [userAddress],
  })

  // 4. 获取粉丝数量
  const { data: followers } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getFollowers',
    args: [userAddress],
  })

  // 5. 获取关注数量
  const { data: following } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getFollowing',
    args: [userAddress],
  })

  // 用户统计数据
  const userStats = {
    posts: userPostsCount,
    comments: userComments?.length || 0,
    likes: likedPostIds?.length || 0,
    followers: followers?.length || 0,
    following: following?.length || 0
  }

  // 检查是否已关注
  const { data: isFollowing, refetch: refetchIsFollowing } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'isFollowing',
    args: [currentUser, userAddress],
    query: {
      enabled: !!currentUser && currentUser !== userAddress,
    }
  })

  // 关注操作
  const { data: followHash, writeContract: followUser } = useWriteContract()
  const { isLoading: isFollowingTx, isSuccess: isFollowSuccess } = useWaitForTransactionReceipt({ 
    hash: followHash 
  })

  // 关注成功后刷新状态
  useEffect(() => {
    if (isFollowSuccess) {
      refetchIsFollowing()
    }
  }, [isFollowSuccess, refetchIsFollowing])

  const handleFollow = async () => {
    if (!currentUser) return
    
    followUser({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'followUser',
      args: [userAddress],
    })
  }

  const isOwnProfile = currentUser && currentUser.toLowerCase() === userAddress.toLowerCase()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold">
            {userAddress.slice(0,8)}...{userAddress.slice(-6)}
          </h2>
          <p className="text-gray-600 text-sm">以太坊地址</p>
        </div>
        
        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollow}
            disabled={isFollowingTx || isFollowing}
            className={`px-4 py-2 rounded ${
              isFollowing 
                ? 'bg-gray-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:bg-gray-400`}
          >
            {isFollowingTx ? '处理中...' : isFollowing ? '已关注' : '关注'}
          </button>
        )}
      </div>

   {/* 用户统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
          <div className="text-2xl font-bold text-blue-600">{userStats.posts}</div>
          <div className="text-sm text-blue-500 mt-1">文章</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
          <div className="text-2xl font-bold text-green-600">{userStats.comments}</div>
          <div className="text-sm text-green-500 mt-1">评论</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-100">
          <div className="text-2xl font-bold text-yellow-600">{userStats.likes}</div>
          <div className="text-sm text-yellow-500 mt-1">喜欢</div>
        </div>
        <div className="bg-pink-50 p-4 rounded-lg text-center border border-pink-100">
          <div className="text-2xl font-bold text-pink-600">{userStats.following}</div>
          <div className="text-sm text-pink-500 mt-1">关注</div>
        </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-100">
          <div className="text-2xl font-bold text-purple-600">{userStats.followers}</div>
          <div className="text-sm text-purple-500 mt-1">粉丝</div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b mb-4">
        <nav className="flex gap-6">
          {['posts', 'comments', 'likes', 'following', 'followers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 ${
                activeTab === tab 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'posts' && '文章'}
              {tab === 'comments' && '评论'} 
              {tab === 'likes' && '喜欢'} 
              {tab === 'following' && '关注'}
              {tab === 'followers' && '粉丝'}
            </button>
          ))}
        </nav>
      </div>

      {/* 标签内容 */}
      <div>
        {activeTab === 'posts' && <UserPosts userAddress={userAddress} />}
        {activeTab === 'comments' && <UserComments userAddress={userAddress} />}
        {activeTab === 'likes' && <UserLikes userAddress={userAddress} />}
        {activeTab === 'following' && <UserFollowing userAddress={userAddress} />}
        {activeTab === 'followers' && <UserFollowers userAddress={userAddress} />}
      </div>
    </div>
  )
}

// 用户文章组件
function UserPosts({ userAddress }) {
  // 获取所有文章
  const { data: allPostIds, refetch: refetchPosts } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getAllPostIds',
  })

  // 获取文章详情
  const { data: postsData } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getMultiplePosts',
    args: allPostIds ? [allPostIds] : [],
    query: {
      enabled: !!allPostIds && allPostIds.length > 0,
    }
  })

  // 过滤出该用户的文章
  const userPosts = postsData?.filter(post => 
    post.author.toLowerCase() === userAddress.toLowerCase()
  ) || []

  return (
    <div>
      <h4 className="font-semibold mb-3">发布的文章 ({userPosts.length})</h4>
      <div className="space-y-4">
        {userPosts.map((post) => (
          <PostItem 
            key={post.id.toString()} 
            postId={post.id} 
            showActions={false}
            onUpdate={refetchPosts}
          />
        ))}
        {userPosts.length === 0 && (
          <p className="text-gray-500 text-center py-8">暂无发布的文章</p>
        )}
      </div>
    </div>
  )
}

// 用户评论组件 从 O(n) 次查询变为 1 次查询 不再需要遍历所有文章
function UserComments({ userAddress }) {
  // 直接获取用户的所有评论
  const { data: userComments, isLoading } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getUserComments',
    args: [userAddress],
  })

  return (
    <div>
      <h4 className="font-semibold mb-3">发表的评论 ({userComments?.length || 0})</h4>
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">加载评论中...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {userComments?.map((comment) => (
            <div key={`${comment.postId}-${comment.commentId}`} className="border-l-4 border-blue-200 pl-4 py-3 bg-gray-50 rounded">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-600">
                  在 <span className="font-medium">文章 #{comment.postId.toString()}</span> 中评论
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(Number(comment.timestamp) * 1000).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-800 bg-white p-3 rounded border">{comment.content}</p>
            </div>
          ))}
          {(!userComments || userComments.length === 0) && (
            <p className="text-gray-500 text-center py-8">暂无发表的评论</p>
          )}
        </div>
      )}
    </div>
  )
}
// 用户喜欢的文章组件 
function UserLikes({ userAddress }) {
  // 获取用户点赞的文章
  const { data: likedPostIds, refetch: refetchLikes } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getLikedPosts',
    args: [userAddress],
  })

  //console.log('用户点赞的文章ID:', likedPostIds)

  // 获取点赞文章的详情
  const { data: likedPostsData } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getMultiplePosts',
    args: likedPostIds ? [likedPostIds] : [],
    query: {
      enabled: !!likedPostIds && likedPostIds.length > 0,
    }
  })

  //console.log('点赞文章详情:', likedPostsData)

  return (
    <div>
      <h4 className="font-semibold mb-3">喜欢的文章 ({likedPostIds?.length || 0})</h4>
      <div className="space-y-4">
        {likedPostsData?.map((post) => (
          <PostItem 
            key={post.id.toString()} 
            postId={post.id} 
            showActions={false}
            onUpdate={refetchLikes}
          />
        ))}
        {(!likedPostIds || likedPostIds.length === 0) && (
          <p className="text-gray-500 text-center py-8">暂无喜欢的文章</p>
        )}
      </div>
    </div>
  )
}

// 用户关注组件 - 完整功能
function UserFollowing({ userAddress }) {
  const { data: following, refetch: refetchFollowing } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getFollowing',
    args: [userAddress],
  })

  //console.log('关注列表:', following)

  const { address: currentUser } = useAccount()

  // 取消关注功能
  const { data: unfollowHash, writeContract: unfollowUser } = useWriteContract()
  const { isLoading: isUnfollowing, isSuccess: isUnfollowSuccess } = useWaitForTransactionReceipt({
    hash: unfollowHash
  })

  // 关注其他用户功能
  const { data: followHash, writeContract: followUser } = useWriteContract()
  const { isLoading: isFollowing, isSuccess: isFollowSuccess } = useWaitForTransactionReceipt({
    hash: followHash
  })

  // 交易成功后刷新数据
  useEffect(() => {
    if (isUnfollowSuccess || isFollowSuccess) {
      refetchFollowing()
    }
  }, [isUnfollowSuccess, isFollowSuccess, refetchFollowing])

  const handleUnfollow = async (addressToUnfollow) => {
    if (!window.confirm('确定要取消关注吗？')) return
    
    unfollowUser({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'unfollowUser',
      args: [addressToUnfollow],
    })
  }

  const handleFollowUser = async (addressToFollow) => {
    followUser({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'followUser',
      args: [addressToFollow],
    })
  }

  const isOwnProfile = currentUser && currentUser.toLowerCase() === userAddress.toLowerCase()

  return (
   <div>
      <h4 className="font-semibold mb-3">关注列表 ({following?.length || 0})</h4>
      <div className="space-y-2">
        {following?.map((address) => (
          <FollowingItem 
            key={address} 
            address={address} 
            currentUser={currentUser}
            isOwnProfile={isOwnProfile}
            onUnfollow={handleUnfollow}
            onFollow={handleFollowUser}
            isUnfollowing={isUnfollowing}
            isFollowing={isFollowing}
          />
        ))}
        {(!following || following.length === 0) && (
          <p className="text-gray-500 text-center py-8">暂无关注</p>
        )}
      </div>
    </div>
  )
}
// 新增：关注项子组件
function FollowingItem({ address, currentUser, isOwnProfile, onUnfollow, onFollow, isUnfollowing, isFollowing }) {
  // 为每个关注用户单独检查关注状态
  const { data: isMutualFollow, isLoading: isCheckingStatus } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'isFollowing',
    args: [currentUser, address],
    query: {
      enabled: !!currentUser && currentUser !== address,
    }
  })

  return (
    <div className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono">{address.slice(0,8)}...{address.slice(-6)}</span>
        {!isOwnProfile && isMutualFollow && (
          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">互相关注</span>
        )}
        {isCheckingStatus && (
          <span className="text-xs text-gray-400">检查中...</span>
        )}
      </div>
      <div className="flex gap-2">
        <button 
          className="text-xs text-blue-500 hover:text-blue-700"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('viewUserProfile', { detail: address }))
          }}
        >
          查看资料
        </button>
        
        {isOwnProfile ? (
          <button
            onClick={() => onUnfollow(address)}
            disabled={isUnfollowing}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {isUnfollowing ? '取消中...' : '取消关注'}
          </button>
        ) : (
          currentUser && !isMutualFollow && (
            <button
              onClick={() => onFollow(address)}
              disabled={isFollowing}
              className="text-xs text-green-500 hover:text-green-700 disabled:opacity-50"
            >
              {isFollowing ? '关注中...' : '关注Ta'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
// 用户粉丝组件 - 完整功能
function UserFollowers({ userAddress }) {
  const { data: followers, refetch: refetchFollowers } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getFollowers',
    args: [userAddress],
  })

  const { data: followerCount } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'getFollowerCount',
    args: [userAddress],
  })

  //console.log('粉丝列表:', followers)
  //console.log('粉丝数量:', followerCount)

  const { address: currentUser } = useAccount()

  // 关注粉丝功能
  const { data: followHash, writeContract: followUser } = useWriteContract()
  const { isLoading: isFollowing, isSuccess: isFollowSuccess } = useWaitForTransactionReceipt({
    hash: followHash
  })

  useEffect(() => {
    if (isFollowSuccess) {
      refetchFollowers()
    }
  }, [isFollowSuccess, refetchFollowers])

  const handleFollowFollower = async (followerAddress) => {
    followUser({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: 'followUser',
      args: [followerAddress],
    })
  }

  const isOwnProfile = currentUser && currentUser.toLowerCase() === userAddress.toLowerCase()

  return (
      <div>
      <h4 className="font-semibold mb-3">粉丝 ({followerCount?.toString() || followers?.length || 0})</h4>
      <div className="space-y-2">
        {followers?.map((followerAddress) => (
          <FollowerItem 
            key={followerAddress}
            address={followerAddress}
            currentUser={currentUser}
            isOwnProfile={isOwnProfile}
            onFollow={handleFollowFollower}
            isFollowing={isFollowing}
          />
        ))}
        {(!followers || followers.length === 0) && (
          <p className="text-gray-500 text-center py-8">暂无粉丝</p>
        )}
      </div>
    </div>
  )
}

// 新增：粉丝项子组件
function FollowerItem({ address, currentUser, isOwnProfile, onFollow, isFollowing }) {
  // 为每个粉丝单独检查关注状态
  const { data: isAlreadyFollowing, isLoading: isCheckingStatus } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: 'isFollowing',
    args: [currentUser, address],
    query: {
      enabled: !!currentUser && currentUser !== address,
    }
  })

  return (
    <div className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono">{address.slice(0,8)}...{address.slice(-6)}</span>
        {isAlreadyFollowing && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">已关注</span>
        )}
        {isCheckingStatus && (
          <span className="text-xs text-gray-400">检查中...</span>
        )}
      </div>
      <div className="flex gap-2">
        <button 
          className="text-xs text-blue-500 hover:text-blue-700"
          //不需要直接的父子关系,适合简单的跨组件通信，任何组件都可以监听和触发
          //'viewUserProfile'：事件名称。{ detail: address }：事件数据
          onClick={() => {
            window.dispatchEvent(new CustomEvent('viewUserProfile', { detail: address }))
          }}
        >
          查看资料
        </button>
        {isOwnProfile && !isAlreadyFollowing && (
          <button
            onClick={() => onFollow(address)}
            disabled={isFollowing}
            className="text-xs text-green-500 hover:text-green-700 disabled:opacity-50"
          >
            {isFollowing ? '关注中...' : '回关'}
          </button>
        )}
      </div>
    </div>
  )
}