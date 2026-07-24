import { useMemo, useState } from 'react'

/**
 * 文章搜索 Hook
 * @param {Array} posts - 文章列表
 * @returns {Object} 搜索相关状态和方法
 */
export function usePostSearch(posts = []) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all') // all, title, author, content, tag

  // 搜索过滤逻辑
  //useMemo 是 React 内置的一个 性能优化 Hook，用来缓存计算结果，避免在每次渲染时都重新计算。
  const filteredPosts = useMemo(() => {
      // 搜索词为空 → 返回全部
    if (!searchTerm.trim()) return posts
//把用户输入的搜索词全部转换成小写字母。
    const lowercasedSearch = searchTerm.toLowerCase()
    
    return posts.filter(post => {
      const { title, author, contentHash, tags } = post
      
      switch (filterBy) {
        case 'title':
          return title.toLowerCase().includes(lowercasedSearch)
        
        case 'author':
          return author.toLowerCase().includes(lowercasedSearch)
        
        case 'content':
          // 注意：contentHash 是 IPFS hash，实际使用时可能需要从 IPFS 获取内容
          return contentHash.toLowerCase().includes(lowercasedSearch)

        case 'tag':
          return (tags || []).some(tag => tag.toLowerCase().includes(lowercasedSearch))
        
        case 'all':
        default:
          return (
            title.toLowerCase().includes(lowercasedSearch) ||
            author.toLowerCase().includes(lowercasedSearch) ||
            contentHash.toLowerCase().includes(lowercasedSearch) ||
            (tags || []).some(tag => tag.toLowerCase().includes(lowercasedSearch))
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