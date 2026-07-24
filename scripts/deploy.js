const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署可升级去中心化博客合约 (UUPS)...\n");
  //这个脚本 只在第一次部署时跑一次 。以后升级用的是 upgrade.js ，它只换实现合约、不动代理，所以数据不丢。
//造实现合约（逻辑） → 写好"执行initialize"的纸条 → 造代理合约（同时塞纸条+指向实现）→ 读一下确认成功
  // 1. 部署实现合约
  console.log("1/3 部署实现合约...");
  //getContractFactory 要的是Blog.sol里的合约名，读取Hardhat编译后的 JSON 产物做成一个"工厂"（汽车的 生产线）
  //hre.ethers.getContractFactory / getContractAt 这两个方法，会自动去编译后的 artifacts 文件夹找同名的 .json
  
  const Blog = await hre.ethers.getContractFactory("DecentralizedBlog");
  //implementation是已经部署到链上的实现合约实例对象（生产线造出来的 那一辆具体的车）
  const implementation = await Blog.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("   实现合约地址:", implAddress);

  // 2. 编码 initialize 调用数据
  console.log("2/3 部署 ERC1967 代理合约...");
  //普通合约用 constructor() 初始化，但代理模式下构造函数不生效，所以要 手动调用 initialize() 函数 来做初始化
  //但这里还没调用，只是 把"调用 initialize()"这个动作编码成一串十六进制数据， [] 表示 initialize() 不需要参数
  //用实现合约具体的车它的接口编码数据
  const initData = implementation.interface.encodeFunctionData("initialize", []);

  // 3. 部署 ERC1967Proxy（OpenZeppelin 标准代理）
  const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
  //implAddress告诉代理："你的逻辑要去 这个实现合约 找"
  //initData刚才那张"待办纸条"，代理一部署就 立刻执行 initialize() 完成初始化
  //代理合约的核心职责就是"把请求转发给实现合约"
  const proxy = await ERC1967Proxy.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  //proxyAddress 就是你 前端要用的永久地址 、也是 数据存储的地方 。
  //用户访问代理 → 代理委托给实现执行 → 数据存代理。
  const proxyAddress = await proxy.getAddress();
  console.log("   代理合约地址:", proxyAddress);

  // 4. 通过代理获取合约实例（验证）
  console.log("3/3 验证部署...");
  //getContractAt,连接 已存在 的合约  // 用哪套 ABI（接口）  // 连到代理地址
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
