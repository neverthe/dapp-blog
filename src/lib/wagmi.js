// lib/wagmi.js
import { createConfig, http } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const CONTRACT_CONFIG = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xxxx',
  chainId: process.env.NEXT_PUBLIC_NETWORK === 'sepolia' ? 11155111 : 31337,
}

export const config = createConfig({
  chains: [sepolia, hardhat],
  connectors: [
    metaMask({
      dappMetadata: {
        name: '去中心化博客',
        url: 'http://localhost:3000',
      },
      // 禁用分析数据上报
      enableAnalytics: false,
    }),
  ],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
})

// //前端开发服务器http://localhost:3000 Next.js 前端 运行在这里处理网页显示、用户界面
// //区块链节点http://localhost:8545  你的 Hardhat 本地区块链 运行在这里处理智能合约、交易、区块链数据
// // 打开 MetaMask  点击网络选择 → 添加网络
// // 填写：网络名称: Hardhat Local   RPC URL: http://localhost:8545  链 ID: 31337  货币符号: ETH
// })