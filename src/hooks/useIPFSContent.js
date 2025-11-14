// hooks/useIPFSContent.js
import { useState, useEffect } from 'react'
import { fetchFromIPFS } from '../../utils/pinata'
export function useIPFSContent(contentHash) {
  const [ipfsContent, setIpfsContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadContent = async () => {
      if (!contentHash) {
        setIpfsContent('暂无内容')
        return
      }

      // 检查是否是模拟的 contentHash
      if (contentHash.startsWith('ipfs-')) {
        setIpfsContent('这是旧版本的文章内容，当时还未集成IPFS存储。')
        return
      }

      setIsLoading(true)
      setError(null)
      
      try {
        const contentData = await fetchFromIPFS(contentHash)
        
        // 安全地获取内容
        if (contentData && typeof contentData === 'object') {
          const content = contentData.content || 
                         contentData.pinataContent?.content ||
                         contentData.data ||
                         JSON.stringify(contentData)
          setIpfsContent(content || '无法解析内容')
        } else if (typeof contentData === 'string') {
          setIpfsContent(contentData)
        } else {
          setIpfsContent('内容格式不支持')
        }
      } catch (err) {
        console.error('加载IPFS内容失败:', err)
        setError(err.message)
        setIpfsContent('⚠️ 无法加载文章内容，请检查网络连接或IPFS网关状态。\n\nIPFS CID: ' + contentHash)
      } finally {
        setIsLoading(false)
      }
    }

    loadContent()
  }, [contentHash])

  return { ipfsContent, isLoading, error }
}