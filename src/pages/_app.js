import '@/styles/globals.css'
import { config } from '@/lib/wagmi'   // 之前创建的区块链配置
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'// 数据缓存
import { useState, useEffect } from 'react' // React Hooks
import { WagmiProvider } from 'wagmi' // 区块链 Provider

// 定义根组件 - 每个页面都会经过这个组件.App：Next.js 的特殊组件，包装所有页面.
//Component：当前要渲染的页面（如首页、关于页），pageProps：页面的属性数据
export default function App({ Component, pageProps }) {
    // 创建 React Query 客户端（用于数据缓存）
  const [queryClient] = useState(() => new QueryClient())
    // 跟踪组件是否已在客户端挂载
  const [mounted, setMounted] = useState(false)

   // 组件加载后标记为已挂载
  useEffect(() => {
    setMounted(true)
  }, [])

  // 在客户端挂载完成前不渲染钱包相关组件。钱包功能只能在浏览器运行，在服务器会报错。
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }
  // 主渲染 - 包装所有页面提供区块链功能
  //WagmiProvider：提供区块链功能给所有子组件。QueryClientProvider：提供数据缓存功能。Component：渲染实际的页面内容
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  )
}