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
  //hre.ethers：Hardhat 内置的 Ethers.js 库。provider网络提供者,连接区块链的节点,getCode存储的字节码
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

  // 只有 owner 才能升级，确认调用者权限.owner()：这是 DecentralizedBlog 合约中的一个函数
  const owner = await blogProxy.owner();
  const [deployer] = await hre.ethers.getSigners();
  console.log("   合约 owner:", owner);
  console.log("   当前签名者:", deployer.address);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ 当前签名者不是合约 owner，无法升级");
    process.exitCode = 1;
    return;
  }

  //执行代理合约的升级操作
  // UUPS v5 使用 upgradeToAndCall(newImpl, data)
  //第一个参数 newImplAddress：新的逻辑合约地址，升级后代理会把所有调用委托给这个新合约。
//第二个参数 "0x"：初始化调用数据（calldata）。"0x" 表示空数据，即升级后不执行任何初始化函数。
  // data 传空字节表示升级后不执行额外调用
  const tx = await blogProxy.upgradeToAndCall(newImplAddress, "0x");
  console.log("   交易已发送:", tx.hash);
  //await：等待交易被提交到区块链，返回一个交易响应对象 tx。
  await tx.wait();
  console.log("   ✅ 交易已确认");

  // 4. 验证升级后的实现地址是否已更新
  console.log("\n验证升级结果...");
  //定义 EIP-1967 标准的实现合约存储槽。代理合约会将逻辑合约地址存储在这个特定的存储槽中。
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  //直接读取链上指定地址的特定存储槽内容。getStorage访问以太坊账户的存储空间。返回一个 32 字节（64 位十六进制）的字符串。
  const currentImplRaw = await hre.ethers.provider.getStorage(proxyAddress, IMPLEMENTATION_SLOT);
  //从 32 字节存储值中提取出 20 字节的地址
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
