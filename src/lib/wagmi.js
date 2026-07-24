// lib/wagmi.js  wagmi 是一个 React Hooks 库，用于在前端应用中连接以太坊钱包（MetaMask）并与智能合约交互,否则得用原生 Ethers.js或者web3.js底层库
//例如 钱包连接useConnect  账户信息useAccount   读取合约useReadContract   写入合约useWriteContract
//Viem 是 Wagmi v2 的 底层基础设施 。

//React（纯前端库）Next.js（全栈框架）能做后端，SEO 友好，支持 SSR/SSG，路由内置（基于文件系统），内置API接口，零配置，开箱即用
//CSR（客户端渲染）传统 React   浏览器请求 → 拿到空的 HTML → 下载 JS → 执行 JS → 渲染页面
//SSR（服务器端渲染） 浏览器请求 → 服务器实时生成 HTML → 返回完整页面（已含内容）→ 浏览器直接显示
//SEO 优秀（搜索引擎直接看到完整内容） 首屏加载快,只是每次请求都要服务器渲染，有服务器压力
//SSG（静态站点生成）编译时生成静态 HTML → 直接存成文件 → 浏览器请求时秒开。零服务器压力,只是内容更新需要重新构建
//数据全在链上的 DApp 服务端渲染不了合约数据.服务端没有用户钱包、没有 RPC 节点连接，拿不到每个人的 useAccount 信息。
// 所以所有页面只能在用户浏览器里、连上钱包后才能渲染。
//Next.js从 14 到 16，Next.js 的核心变化是 构建速度和缓存策略的升级 。
//用了 Next.js 16，把 --webpack 去掉改用 Turbopack，开发启动快很多。
//Tailwind CSS响应式 （实用优先的 CSS 框架）提供大量功能单一的 CSS 类名.不用想类名,不用来回切heml/css文件,打包体积小
//移动优先 不加前缀 = 对所有尺寸生效（尤其是手机） 加前缀 = 在该尺寸及以上的屏幕生效( sm:（640px）、md:（768px）、lg:（1024px）)
//@tanstack/react-query一个 数据请求缓存库 _app.js — QueryClientProvider 包裹整个应用，发布文章成功后，手动刷新缓存queryClient.invalidateQueries
//wagmi 依赖它来工作 所有数据查询 hooks底层都是用 @tanstack/react-query 的 useQuery 实现的  
import { createConfig, http, fallback } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

//定义合约地址和链 ID
export const CONTRACT_CONFIG = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xxxx',
  chainId: process.env.NEXT_PUBLIC_NETWORK === 'sepolia' ? 11155111 : 31337,
}

// Sepolia RPC 列表（Infura 优先，公共 RPC 做备选）
const sepoliaRpcUrls = [
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,  // Infura 优先
  'https://ethereum-sepolia.publicnode.com',
  'https://1rpc.io/sepolia',
  'https://rpc.sepolia.ethpandaops.io',
  'https://endpoints.omniatech.io/1/ethereum/sepolia/public',
].filter(Boolean)
//创建 wagmi 配置
export const config = createConfig({
  chains: [sepolia, hardhat], // 支持的链
  connectors: [// 钱包连接器
    metaMask({
      dappMetadata: {//在 MetaMask 中显示的 DApp 信息。
        name: '去中心化博客',
        url: 'http://localhost:3000',
      },
      enableAnalytics: false,//关闭分析功能
    }),
  ],
  //定义每个网络如何连接区块链
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    //多个 RPC 做故障转移
    [sepolia.id]: fallback(sepoliaRpcUrls.map(url => http(url, {
      timeout: 60_000,     // 60秒超时，代理慢也能等
      retryCount: 2,       // 失败重试2次
      retryDelay: 1000,    // 重试间隔1秒
    }))),
  },
  // 禁用批量请求，减少 fetch 失败的连锁影响
  batch: {
    multicall: false,
  },
})

// //前端开发服务器http://localhost:3000 Next.js 前端 运行在这里处理网页显示、用户界面
// //区块链节点http://localhost:8545  你的 Hardhat 本地区块链 运行在这里处理智能合约、交易、区块链数据
// // 打开 MetaMask  点击网络选择 → 添加网络
// // 填写：网络名称: Hardhat Local   RPC URL: http://localhost:8545  链 ID: 31337  货币符号: ETH
// })