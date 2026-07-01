import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain
} from "wagmi";
import { metaMask } from "wagmi/connectors";
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from '@tanstack/react-query'
import BlogArtifact from "../../artifacts/contracts/Blog.sol/DecentralizedBlog.json";
import { usePostSearch } from '@/hooks/usePostSearch'
import { CONTRACT_CONFIG } from '@/lib/wagmi'
import { PostItem, CommentSection, UserProfile, Pagination } from "@/components/index";
import RichTextEditor from '@/components/RichTextEditor'
import { uploadToPinata } from '../../utils/pinata';


export default function Home() {
  const chainId = useChainId();


  const queryClient = useQueryClient()
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeView, setActiveView] = useState('home');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 5; // 每页显示5篇文章

  // 添加网络提示
  if (isConnected && chainId !== 11155111 && chainId !== 31337) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold mb-4">请切换到正确的网络</h2>
          <p className="text-gray-600 mb-4">
            当前网络不支持，请切换到 Sepolia 测试网
          </p>
          <div className="text-sm text-gray-500 mb-6">
            <p>Sepolia 链ID: 11155111</p>
            <p>Hardhat 链ID: 31337</p>
          </div>
          <button
            onClick={() => switchChain({ chainId: 11155111 })}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            一键切换到 Sepolia 测试网
          </button>
        </div>
      </div>
    );
  }

  // 读取文章列表
  const { 
    data: postIds, 
    refetch: refetchPosts,
    isLoading: isLoadingPosts,
    error: postIdsError
  } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: "getAllPostIds",
    queryKey: ['posts', 'allIds', chainId], // 添加 chainId 到 queryKey
  });

  // 获取文章详情（批量）
  const { data: postsData } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BlogArtifact.abi,
    functionName: "getMultiplePosts",
    args: postIds ? [postIds] : [],
    query: {
      enabled: !!postIds && postIds.length > 0,
    }
  });

// 在 Home.js 中修改文章数据处理
// 处理文章数据
const posts = useMemo(() => {
  if (!postsData) return []
  
  return postsData.map(post => ({
    id: post.id.toString(),
    author: post.author,
    title: post.title,
    contentHash: post.contentHash, // 现在这是IPFS CID
    timestamp: Number(post.timestamp),
    published: post.published
  }))
}, [postsData])

  // 使用搜索 Hook
  const {
    searchTerm,
    setSearchTerm,
    filterBy,
    setFilterBy,
    filteredPosts,
    clearSearch,
    hasSearch,
    resultCount
  } = usePostSearch(posts)

  // 分页逻辑
  const displayPosts = useMemo(() => {
    const postsToDisplay = hasSearch ? filteredPosts : posts
    
    // 按时间倒序排序（最新的在前面）
    const sortedPosts = [...postsToDisplay].sort((a, b) => b.timestamp - a.timestamp)
    
    // 分页
    const startIndex = (currentPage - 1) * postsPerPage
    const endIndex = startIndex + postsPerPage
    
    return sortedPosts.slice(startIndex, endIndex)
  }, [hasSearch, filteredPosts, posts, currentPage])

  // 总页数
  const totalPages = useMemo(() => {
    const totalPosts = hasSearch ? filteredPosts.length : posts.length
    return Math.ceil(totalPosts / postsPerPage)
  }, [hasSearch, filteredPosts, posts])

  // 搜索或数据变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, posts])

  // 发布文章相关逻辑
  const { 
    writeContract, 
    isPending: isPublishing, 
    error: publishError,
    data: writeData
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({
      hash: writeData,
    })

  // 交易确认后刷新数据
  useEffect(() => {
   if (isConfirmed) {
     //console.log('✅ 交易已确认，刷新数据')
    
    const refreshAllData = async () => {
      try {
        // 等待区块链确认
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 刷新文章ID列表 - 正确获取数据
        const result = await refetchPosts()
         //console.log('刷新结果:', result)
         //console.log('刷新后的文章ID列表:', result.data) // 从 data 属性获取
        
        // 刷新所有相关查询
        queryClient.invalidateQueries({ queryKey: ['posts'] })
        queryClient.invalidateQueries({ queryKey: ['readContract'] })
        
         //console.log('✅ 数据刷新完成')
        
      } catch (error) {
        console.error('刷新失败:', error)
      }
    }
    
    refreshAllData()
      
      setTitle('')
      setContent('')
      setShowPublishModal(false)
    }
  }, [isConfirmed, queryClient, refetchPosts])

  // 用户资料跳转事件监听
  useEffect(() => {
    const handleViewUserProfile = (event) => {
      const userAddress = event.detail;
       //console.log('跳转到用户资料:', userAddress);
      setSelectedUser(userAddress);
       setActiveView('profile');    // 默认是首页，切换到资料页面视图
    };

    window.addEventListener('viewUserProfile', handleViewUserProfile);

    return () => {
      window.removeEventListener('viewUserProfile', handleViewUserProfile);
    };
  }, []);

const handlePublish = async () => {
     //console.log('发布前的文章数量:', postIds?.length)
  if (!title || !content) {
    alert('请填写标题和内容');
    return;
  }

  try {
    // 1. 显示上传状态
     //console.log('📤 正在上传到IPFS...');
    
    // 2. 上传到IPFS
    const contentHash = await uploadToPinata(title, content);
     //console.log('✅ 获得IPFS CID:', contentHash);
    
    // 3. 调用智能合约，存储标题和CID
    writeContract({
      address: CONTRACT_CONFIG.address,
      abi: BlogArtifact.abi,
      functionName: "createPost",
      args: [title, contentHash], // contentHash 现在是IPFS CID
    });
    
  } catch (error) {
    console.error('发布失败:', error);
    alert(`发布失败: ${error.message}`);
  }
};


  const handleViewProfile = (userAddress) => {
     //console.log('查看用户资料:', userAddress)
    setSelectedUser(userAddress)
    setActiveView('profile')
  }

  const handleBackToHome = () => {
    setActiveView('home')
    setSelectedUser(null)
  }

  const isProcessing = isPublishing || isConfirming

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold">去中心化博客</h1>
              
              {/* 导航菜单 */}
              {isConnected && (
                <div className="flex gap-4 text-sm">
                  <button
                    onClick={handleBackToHome}
                    className={`px-3 py-2 rounded ${
                      activeView === 'home' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    首页
                  </button>
                  <button
                    onClick={() => handleViewProfile(address)}
                    className={`px-3 py-2 rounded ${
                      activeView === 'profile' && selectedUser === address
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    我的资料
                  </button>
                </div>
              )}
            </div>

            {isConnected ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  ✏️ 发布文章
                </button>
                <span className="text-sm text-gray-600">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="bg-red-500 text-white px-4 py-2 rounded text-sm"
                >
                  断开连接
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: metaMask(), chainId: 11155111 })}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                连接钱包
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 发布文章模态框 */}
{showPublishModal && (
  <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">发布新文章</h2>
          <button
            onClick={() => setShowPublishModal(false)}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章标题
            </label>
            <input
              type="text"
              placeholder="请输入文章标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章内容
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={handlePublish}
              disabled={isProcessing}
              className={`flex-1 py-3 rounded-lg font-medium ${
                isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white transition-colors`}
            >
              {isPublishing ? '提交中...' : 
               isConfirming ? '确认中...' : 
               '发布到区块链'}
            </button>
            <button
              onClick={() => setShowPublishModal(false)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto py-8 px-4">
        {!isConnected ? (
          // 未连接钱包状态
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">欢迎来到去中心化博客</h2>
            <p className="text-gray-600 mb-8">连接钱包开始发布和阅读文章</p>
            <button
              onClick={() => connect({ connector: metaMask(), chainId: 11155111 })}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
            >
              连接 MetaMask 钱包
            </button>
          </div>
        ) : activeView === 'profile' ? (
          // 用户资料页面
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <span>←</span>
                返回首页
              </button>
              <h2 className="text-xl font-bold">
                {selectedUser === address ? '我的资料' : '用户资料'}
              </h2>
            </div>
            <UserProfile userAddress={selectedUser} />
          </div>
        ) : (
          // 首页内容
          <div>
            {/* 搜索区域 */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold">所有文章</h2>
                <div className="text-sm text-gray-500">
                  {hasSearch ? `${resultCount} 个搜索结果` : `共 ${posts.length} 篇文章`}
                </div>
              </div>

              {/* 搜索框 */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="搜索文章标题、作者或内容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {hasSearch && (
                    <button
                      onClick={clearSearch}
                      className="px-4 py-3 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      清空
                    </button>
                  )}
                </div>
                
                {/* 搜索筛选选项 */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-gray-600 whitespace-nowrap">搜索范围:</span>
                  {[
                    { value: 'all', label: '全部' },
                    { value: 'title', label: '标题' },
                    { value: 'author', label: '作者' },
                    { value: 'content', label: '内容' }
                  ].map((filter) => (
                    <label key={filter.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={filter.value}
                        checked={filterBy === filter.value}
                        onChange={(e) => setFilterBy(e.target.value)}
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      <span className="whitespace-nowrap">{filter.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 文章列表 */}
            {isLoadingPosts ? (
              // 加载状态
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="border rounded-lg p-6 bg-white animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : displayPosts && displayPosts.length > 0 ? (
              // 文章列表
              <div className="space-y-6">
                {displayPosts.map((post) => (
                  <div key={post.id} className="border rounded-lg overflow-hidden bg-white">
                    <PostItem 
                      postId={post.id} 
                      onUpdate={refetchPosts}
                      showActions={true}
                    />
                    <div className="px-6 pb-6">
                      <CommentSection postId={post.id} />
                    </div>
                  </div>
                ))}
                
                {/* 分页 */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </div>
            ) : hasSearch ? (
              // 无搜索结果
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-gray-500 text-lg mb-2">没有找到匹配的文章</div>
                <button 
                  onClick={clearSearch}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  清空搜索条件
                </button>
              </div>
            ) : (
              // 无文章状态
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">还没有文章</h3>
                <p className="text-gray-500 mb-6">发布第一篇博客文章，开始你的去中心化写作之旅</p>
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
                >
                  ✏️ 发布第一篇文章
                </button>
              </div>
            )}
          </div>
        )}
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
  );
}