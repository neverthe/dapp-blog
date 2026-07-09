const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署可升级去中心化博客合约 (UUPS)...\n");

  // 1. 部署实现合约（逻辑合约）
  console.log("1/3 部署实现合约...");
  const Blog = await hre.ethers.getContractFactory("DecentralizedBlog");
  const implementation = await Blog.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("   实现合约地址:", implAddress);

  // 2. 编码 initialize 调用数据
  console.log("2/3 部署 ERC1967 代理合约...");
  const initData = implementation.interface.encodeFunctionData("initialize", []);

  // 3. 部署 ERC1967Proxy（OpenZeppelin 标准代理）
  const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ERC1967Proxy.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("   代理合约地址:", proxyAddress);

  // 4. 通过代理获取合约实例（验证）
  console.log("3/3 验证部署...");
  const blogProxy = await hre.ethers.getContractAt(
    "DecentralizedBlog",
    proxyAddress
  );

  // 验证初始化是否成功（_nextPostId 应为 1）
  const postCount = await blogProxy.getPostCount();
  const tagCount = await blogProxy.getTagCount();
  console.log("   验证通过 — 文章数量:", Number(postCount), "标签数量:", Number(tagCount));

  console.log("\n✅ 部署成功！");
  console.log("═══════════════════════════════════════");
  console.log("代理合约地址（永久的，前端用这个）:");
  console.log(proxyAddress);
  console.log("═══════════════════════════════════════");
  console.log("实现合约地址（升级时才需要）:");
  console.log(implAddress);
  console.log("");
  console.log("请将 .env 中 NEXT_PUBLIC_CONTRACT_ADDRESS 更新为:");
  console.log(proxyAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
