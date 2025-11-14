import { useMemo, useState } from 'react'

/**
 * 文章搜索 Hook
 * @param {Array} posts - 文章列表
 * @returns {Object} 搜索相关状态和方法
 */
export function usePostSearch(posts = []) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all') // all, title, author, content

  // 搜索过滤逻辑
  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return posts

    const lowercasedSearch = searchTerm.toLowerCase()
    
    return posts.filter(post => {
      const { title, author, contentHash } = post
      
      switch (filterBy) {
        case 'title':
          return title.toLowerCase().includes(lowercasedSearch)
        
        case 'author':
          return author.toLowerCase().includes(lowercasedSearch)
        
        case 'content':
          // 注意：contentHash 是 IPFS hash，实际使用时可能需要从 IPFS 获取内容
          return contentHash.toLowerCase().includes(lowercasedSearch)
        
        case 'all':
        default:
          return (
            title.toLowerCase().includes(lowercasedSearch) ||
            author.toLowerCase().includes(lowercasedSearch) ||
            contentHash.toLowerCase().includes(lowercasedSearch)
          )
      }
    })
  }, [posts, searchTerm, filterBy])

  // 清空搜索
  const clearSearch = () => {
    setSearchTerm('')
    setFilterBy('all')
  }

  return {
    searchTerm,
    setSearchTerm,
    filterBy,
    setFilterBy,
    filteredPosts,
    clearSearch,
    hasSearch: searchTerm.trim().length > 0,
    resultCount: filteredPosts.length
  }
}