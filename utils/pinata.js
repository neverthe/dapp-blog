// utils/pinata.js
import axios from 'axios';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
//导出异步函数，接收三个参数：标题、内容、封面图CID（默认为空字符串）
export const uploadToPinata = async (title, content, coverImageCid = '') => {
  const data = JSON.stringify({ // 将对象转为 JSON 字符串（API 要求）
    pinataContent: {// Pinata 要求的数据结构：实际存储的内容
      title: title,
      content: content,
      coverImage: coverImageCid,
      timestamp: new Date().toISOString(),
    },
    pinataMetadata: { // 元数据（用于在 Pinata 平台搜索和管理）
      name: `post-${Date.now()}`,  // 文件名称，用时间戳确保唯一
    }
  });

  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );
    return response.data.IpfsHash;// 返回 IPFS CID（内容哈希）
    //CID = Content Identifier（内容标识符）,Pinata 服务器根据文件内容计算出来的唯一哈希值，存储到 IPFS 网络
  } catch (error) {
    throw new Error(`上传失败: ${error.response?.data?.error?.details || error.message}`);
  }
};

/**
 * 上传图片文件到 Pinata IPFS
 * @param {File} file - 图片文件对象
 * @returns {Promise<string>} IPFS CID
 */
export const uploadImageToPinata = async (file) => {
  const formData = new FormData();// 创建 FormData 对象（用于文件上传）
  formData.append('file', file); // 添加文件到 FormData，key 必须是 'file'

  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxContentLength: Infinity,// 不限制内容大小（允许大文件）
        headers: {
          'Content-Type': 'multipart/form-data',// 文件上传专用格式
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );
    return response.data.IpfsHash;
  } catch (error) {
    throw new Error(`图片上传失败: ${error.response?.data?.error?.details || error.message}`);
  }
};

export const fetchFromIPFS = async (cid) => {
  // 先检查 CID 是否有效
  if (!cid || cid.startsWith('ipfs-')) {
    console.warn('无效的CID:', cid)
    return null
  }

  const gateways = [ // IPFS 网关列表（去中心化存储需要网关来访问）
    `https://gateway.pinata.cloud/ipfs/${cid}`, // Pinata 官方网关（最快）
    `https://ipfs.io/ipfs/${cid}`,  // IPFS 官方网关
    `https://cloudflare-ipfs.com/ipfs/${cid}`// Cloudflare 提供的网关
  ];

  for (const gateway of gateways) {
    try {
      //console.log(`尝试从网关获取: ${gateway}`)
      const response = await fetch(gateway) // 使用原生 fetch API 请求
      if (response.ok) {
        const data = await response.json()// 解析 JSON 数据
        //console.log('从IPFS获取的数据:', data) // 调试用
        return data
      }
    } catch (error) {
      console.warn(`网关 ${gateway} 失败:`, error)// 警告但继续尝试下一个
      continue
    }
  }
  
  throw new Error('所有IPFS网关都无法访问')
}