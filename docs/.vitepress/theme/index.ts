import DefaultTheme from 'vitepress/theme'
import './custom.css'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const STORAGE_KEY = 'openchat-os-preference'

const osMappings = [
  { keys: ['windows', 'win', 'powershell', 'ps1', 'cmd', 'bat'], name: 'Windows' },
  { keys: ['linux', 'ubuntu', 'debian', 'centos', 'rhel', 'unix', 'bash', 'sh'], name: 'Linux' },
  { keys: ['macos', 'mac', 'darwin', 'osx'], name: 'macOS' },
  { keys: ['linux/macos', 'linux/mac'], name: 'Linux/macOS' },
  { keys: ['ubuntu/debian'], name: 'Ubuntu/Debian' },
  { keys: ['centos/rhel'], name: 'CentOS/RHEL' }
]

function normalizeOsName(label) {
  if (!label) return null
  const lower = label.toLowerCase().trim()
  
  for (const mapping of osMappings) {
    if (mapping.keys.some(k => lower.includes(k))) {
      return mapping.name
    }
  }
  return null
}

function getStoredOs() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredOs(os) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, os)
  } catch {}
}

function applyOsPreference() {
  const storedOs = getStoredOs()
  if (!storedOs) return
  
  const codeGroups = document.querySelectorAll('.vp-code-group')
  
  for (const group of codeGroups) {
    const labels = group.querySelectorAll('.tabs label')
    
    for (const label of labels) {
      const tabOsName = normalizeOsName(label.textContent)
      if (tabOsName === storedOs) {
        const inputId = label.getAttribute('for')
        if (inputId) {
          const input = group.querySelector(`input#${inputId}`)
          if (input && !input.checked) {
            input.checked = true
            input.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
        break
      }
    }
  }
}

function setupOsSelector() {
  const codeGroups = document.querySelectorAll('.vp-code-group')
  
  codeGroups.forEach(group => {
    const inputs = group.querySelectorAll('.tabs input[type="radio"]')
    
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked) {
          const label = group.querySelector(`label[for="${input.id}"]`)
          if (label) {
            const osName = normalizeOsName(label.textContent)
            if (osName) {
              setStoredOs(osName)
            }
          }
        }
      })
    })
  })
  
  applyOsPreference()
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()

    onMounted(() => {
      setTimeout(setupOsSelector, 100)
    })

    watch(
      () => route.path,
      () => {
        nextTick(() => {
          setTimeout(setupOsSelector, 150)
        })
      }
    )
  }
}
