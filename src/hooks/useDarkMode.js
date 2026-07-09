// hooks/useDarkMode.js
import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored !== null ? stored === 'true' : prefersDark
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem('darkMode', next)
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  return { isDark, toggle }
}
