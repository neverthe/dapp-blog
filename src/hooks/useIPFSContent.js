// hooks/useIPFSContent.js
import { useState, useEffect } from 'react'
import { fetchFromIPFS } from '../../utils/pinata' // 导入 IPFS 获取函数
export function useIPFSContent(contentHash) { // 导出自定义 Hook，接收 IPFS 内容哈希值
  const [ipfsContent, setIpfsContent] = useState('')// 存储文章内容（HTML 富文本）
  const [coverImage, setCoverImage] = useState('')// 🆕 存储封面图片的 CID，，方便组件显示封面图片。
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadContent = async () => {
      if (!contentHash) {
        setIpfsContent('暂无内容')
        setCoverImage('')
        return
      }

      // 检查是否是模拟的 contentHash
      if (contentHash.startsWith('ipfs-')) {
        setIpfsContent('这是旧版本的文章内容，当时还未集成IPFS存储。')
        setCoverImage('')
        return
      }

      setIsLoading(true)
      setError(null)
      
      try {
          // 调用 IPFS 获取函数，获得内容和图片
        const contentData = await fetchFromIPFS(contentHash)
        
        // 安全地获取内容
        if (contentData && typeof contentData === 'object') {
          // 提取封面图 CID
          const coverCid = contentData.coverImage ||
                          contentData.pinataContent?.coverImage || ''
          setCoverImage(coverCid)

          const content = contentData.content || 
                         contentData.pinataContent?.content ||
                         contentData.data ||
                         JSON.stringify(contentData)
          setIpfsContent(content || '无法解析内容')
        } else if (typeof contentData === 'string') {
          setIpfsContent(contentData)
          setCoverImage('')
        } else {
          setIpfsContent('内容格式不支持')
          setCoverImage('')
        }
      } catch (err) {
        console.error('加载IPFS内容失败:', err)
        setError(err.message)
        setIpfsContent('⚠️ 无法加载文章内容，请检查网络连接或IPFS网关状态。\n\nIPFS CID: ' + contentHash)
        setCoverImage('')
      } finally {
        setIsLoading(false)
      }
    }

    loadContent()
  }, [contentHash])

  return { ipfsContent, coverImage, isLoading, error }
}