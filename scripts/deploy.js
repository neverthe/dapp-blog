// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("开始部署去中心化博客合约...");
  // 获取合约工厂 ,"DecentralizedBlog"：你的合约名称（必须完全匹配）,创建一个合约工厂实例
  const Blog = await hre.ethers.getContractFactory("DecentralizedBlog");
  // 部署合约到区块链
  const blog = await Blog.deploy();
  // 等待部署完成,等待交易被区块链确认,打包进区块
  await blog.waitForDeployment();
  // 获取合约地址
  const address = await blog.getAddress();
  
  console.log("✅ 去中心化博客合约部署成功！");
  console.log("合约地址:", address);
}
// 错误处理
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});