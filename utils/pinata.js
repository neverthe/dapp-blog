// utils/pinata.js
import axios from 'axios';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const MAX_RETRIES = 2;//上传失败自动重试 2 次，每次间隔 1 秒
const RETRY_DELAY = 1000;

/**
 * 带重试机制的异步请求
 */
const withRetry = async (fn, retries = MAX_RETRIES) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
};

//导出异步函数，接收三个参数：标题、内容、封面图CID（默认为空字符串）
export const uploadToPinata = async (title, content, coverImageCid = '', onProgress) => {
  const data = JSON.stringify({
    pinataContent: {
      title: title,
      content: content,
      coverImage: coverImageCid,
      timestamp: new Date().toISOString(),
    },
    pinataMetadata: {
      name: `post-${Date.now()}`,
    }
  });

  return withRetry(async () => {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      }
    );
    return response.data.IpfsHash;
  });
};

/**
 * 上传图片文件到 Pinata IPFS
 * @param {File} file - 图片文件对象
 * @param {function} onProgress - 进度回调 (0-100)
 * @returns {Promise<string>} IPFS CID
 */
export const uploadImageToPinata = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return withRetry(async () => {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxContentLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      }
    );
    return response.data.IpfsHash;
  });
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