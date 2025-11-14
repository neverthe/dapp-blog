// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();  // 添加这行dotenv 包的作用是从 .env 文件加载环境变量到 process.env 中。

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    // 保留本地网络配置
    hardhat: {
      chainId: 31337
    },
    // 添加 Sepolia 测试网配置
    sepolia: {
       url: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL, // 直接使用同一个
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    }
  },
  // 添加 Etherscan 验证（可选）
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "YOUR_ETHERSCAN_API_KEY"
  }
};