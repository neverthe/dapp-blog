// scripts/upgrade.js
// 用法: npx hardhat run scripts/upgrade.js --network sepolia
// 前置条件: .env 中 NEXT_PUBLIC_CONTRACT_ADDRESS 必须指向已部署的代理合约地址

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const proxyAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  if (!proxyAddress) {
    console.error("❌ 请在 .env 中设置 NEXT_PUBLIC_CONTRACT_ADDRESS（代理合约地址）");
    process.exitCode = 1;
    return;
  }

  console.log("开始升级合约...\n");
  console.log("当前代理合约地址:", proxyAddress);

  // 1. 验证代理合约存在且可连接
  console.log("\n1/3 验证代理合约...");
  const proxyCode = await hre.ethers.provider.getCode(proxyAddress);
  if (proxyCode === "0x" || proxyCode === "0x0") {
    console.error("❌ 代理合约地址不存在，请检查 .env");
    process.exitCode = 1;
    return;
  }
  console.log("   ✅ 代理合约已存在");

  // 2. 部署新的实现合约
  console.log("\n2/3 部署新版实现合约...");
  const Blog = await hre.ethers.getContractFactory("DecentralizedBlog");
  const newImplementation = await Blog.deploy();
  await newImplementation.waitForDeployment();
  const newImplAddress = await newImplementation.getAddress();
  console.log("   新版实现合约地址:", newImplAddress);

  // 3. 通过代理调用 upgradeToAndCall 升级
  console.log("\n3/3 执行升级（调用 upgradeToAndCall）...");
  const blogProxy = await hre.ethers.getContractAt("DecentralizedBlog", proxyAddress);

  // 只有 owner 才能升级，确认调用者权限
  const owner = await blogProxy.owner();
  const [deployer] = await hre.ethers.getSigners();
  console.log("   合约 owner:", owner);
  console.log("   当前签名者:", deployer.address);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ 当前签名者不是合约 owner，无法升级");
    process.exitCode = 1;
    return;
  }

  // UUPS v5 使用 upgradeToAndCall(newImpl, data)
  // data 传空字节表示升级后不执行额外调用
  const tx = await blogProxy.upgradeToAndCall(newImplAddress, "0x");
  console.log("   交易已发送:", tx.hash);
  await tx.wait();
  console.log("   ✅ 交易已确认");

  // 4. 验证升级后的实现地址是否已更新
  console.log("\n验证升级结果...");
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const currentImplRaw = await hre.ethers.provider.getStorage(proxyAddress, IMPLEMENTATION_SLOT);
  const actualImpl = "0x" + currentImplRaw.slice(26).toLowerCase();
  console.log("   当前实现合约地址:", actualImpl);
  console.log("   预期实现合约地址:", newImplAddress.toLowerCase());

  if (actualImpl === newImplAddress.toLowerCase()) {
    console.log("\n✅ 升级成功！");
    console.log("═══════════════════════════════════════");
    console.log("代理合约地址（不变）:", proxyAddress);
    console.log("新实现合约地址:", newImplAddress);
    console.log("═══════════════════════════════════════");
  } else {
    console.log("\n❌ 升级验证失败，实现地址不匹配");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
