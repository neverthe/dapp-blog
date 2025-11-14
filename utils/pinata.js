// utils/pinata.js
import axios from 'axios';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

export const uploadToPinata = async (title, content) => {
  const data = JSON.stringify({
    pinataContent: {
      title: title,
      content: content,
      timestamp: new Date().toISOString(),
    },
    pinataMetadata: {
      name: `post-${Date.now()}`,
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
    return response.data.IpfsHash;
  } catch (error) {
    throw new Error(`上传失败: ${error.response?.data?.error?.details || error.message}`);
  }
};

export const fetchFromIPFS = async (cid) => {
  // 先检查 CID 是否有效
  if (!cid || cid.startsWith('ipfs-')) {
    console.warn('无效的CID:', cid)
    return null
  }

  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`
  ];

  for (const gateway of gateways) {
    try {
      //console.log(`尝试从网关获取: ${gateway}`)
      const response = await fetch(gateway)
      if (response.ok) {
        const data = await response.json()
        //console.log('从IPFS获取的数据:', data) // 调试用
        return data
      }
    } catch (error) {
      console.warn(`网关 ${gateway} 失败:`, error)
      continue
    }
  }
  
  throw new Error('所有IPFS网关都无法访问')
}