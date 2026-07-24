// hooks/useDarkMode.js
import { useState, useEffect } from 'react'
//自定义 React Hook，用于管理暗色模式的状态逻辑。
//自定义 Hook 是把带状态逻辑的代码封装成一个函数，方便在多个组件中复用。
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // 1. 从 localStorage 读取用户偏好
    const stored = localStorage.getItem('darkMode')
    // 2. 读取系统偏好（用户操作系统是否设为暗色）
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    // 3. 决定最终模式：localStorage 优先，没有则用系统偏好
    const shouldBeDark = stored !== null ? stored === 'true' : prefersDark
    // 4. 更新 React 状态
    setIsDark(shouldBeDark)
    // 5. 在 <html> 上添加/移除 dark 类
    document.documentElement.classList.toggle('dark', shouldBeDark)
    //[] 空依赖数组：这个 useEffect 只在组件首次挂载时执行一次，不会重复运行。
  }, [])

  const toggle = () => {
    //setIsDark(prev => ...)总是基于最新状态，更安全 
    setIsDark(prev => {
      const next = !prev // 取反
      localStorage.setItem('darkMode', next)  // 保存偏好
      document.documentElement.classList.toggle('dark', next) // 更新 DOM
      return next // 更新状态
    })
  }

  return { isDark, toggle }
}
