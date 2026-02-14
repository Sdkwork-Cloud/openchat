import { defineConfig } from 'vitepress'

const sharedConfig = {
  title: 'OpenChat',
  lastUpdated: true,
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3c3c3c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ]
}

const zhConfig = {
  label: '简体中文',
  lang: 'zh-CN',
  description: '开源即时通讯解决方案 - 服务端、SDK、应用一体化',
  themeConfig: {
    nav: [
      { text: '概览', link: '/zh/guide/overview' },
      { text: '快速开始', link: '/zh/guide/quickstart' },
      {
        text: '服务端',
        items: [
          { text: 'API 文档', link: '/zh/api/' },
          { text: '部署指南', link: '/zh/deploy/' },
          { text: '配置说明', link: '/zh/config/' },
          { text: '扩展插件', link: '/zh/extension/' }
        ]
      },
      {
        text: 'SDK',
        items: [
          { text: 'TypeScript SDK', link: '/zh/sdk/typescript' },
          { text: 'Java SDK', link: '/zh/sdk/java' },
          { text: 'Go SDK', link: '/zh/sdk/go' },
          { text: 'Python SDK', link: '/zh/sdk/python' }
        ]
      },
      {
        text: '应用',
        items: [
          { text: 'React PC 端', link: '/zh/app/react-pc' },
          { text: 'React Native', link: '/zh/app/react-native' },
          { text: '小程序', link: '/zh/app/miniprogram' }
        ]
      },
      { text: 'GitHub', link: 'https://github.com/Sdkwork-Cloud/openchat' }
    ],
    sidebar: {
      '/zh/guide/': [
        {
          text: '介绍',
          items: [
            { text: '项目概览', link: '/zh/guide/overview' },
            { text: '快速开始', link: '/zh/guide/quickstart' },
            { text: '架构设计', link: '/zh/guide/architecture' },
            { text: '功能特性', link: '/zh/guide/features' }
          ]
        },
        {
          text: '核心概念',
          items: [
            { text: '用户系统', link: '/zh/guide/concepts/users' },
            { text: '消息系统', link: '/zh/guide/concepts/messages' },
            { text: '群组系统', link: '/zh/guide/concepts/groups' },
            { text: '频道类型', link: '/zh/guide/concepts/channels' }
          ]
        }
      ],
      '/zh/api/': [
        {
          text: 'API 文档',
          items: [
            { text: 'API 概览', link: '/zh/api/' },
            { text: '认证授权', link: '/zh/api/auth' },
            { text: '用户管理', link: '/zh/api/users' },
            { text: '消息管理', link: '/zh/api/messages' },
            { text: '群组管理', link: '/zh/api/groups' },
            { text: '好友管理', link: '/zh/api/friends' },
            { text: '悟空IM', link: '/zh/api/wukongim' }
          ]
        }
      ],
      '/zh/sdk/': [
        {
          text: 'SDK 文档',
          items: [
            { text: 'SDK 概览', link: '/zh/sdk/' },
            { text: 'TypeScript SDK', link: '/zh/sdk/typescript' },
            { text: 'Java SDK', link: '/zh/sdk/java' },
            { text: 'Go SDK', link: '/zh/sdk/go' },
            { text: 'Python SDK', link: '/zh/sdk/python' }
          ]
        }
      ],
      '/zh/app/': [
        {
          text: '应用文档',
          items: [
            { text: '应用概览', link: '/zh/app/' },
            { text: 'React PC 端', link: '/zh/app/react-pc' },
            { text: 'React Native', link: '/zh/app/react-native' },
            { text: '小程序', link: '/zh/app/miniprogram' }
          ]
        }
      ],
      '/zh/deploy/': [
        {
          text: '部署指南',
          items: [
            { text: '部署概览', link: '/zh/deploy/' },
            { text: '安装指南', link: '/zh/deploy/installation' },
            { text: 'Docker 部署', link: '/zh/deploy/docker' },
            { text: 'Kubernetes 部署', link: '/zh/deploy/kubernetes' },
            { text: '传统部署', link: '/zh/deploy/traditional' },
            { text: '快速部署', link: '/zh/deploy/quickstart' }
          ]
        }
      ],
      '/zh/config/': [
        {
          text: '配置说明',
          items: [
            { text: '配置概览', link: '/zh/config/' },
            { text: '服务端配置', link: '/zh/config/server' },
            { text: '数据库配置', link: '/zh/config/database' },
            { text: '悟空IM 配置', link: '/zh/config/wukongim' },
            { text: 'RTC 配置', link: '/zh/config/rtc' },
            { text: 'AI 配置', link: '/zh/config/ai' }
          ]
        }
      ],
      '/zh/extension/': [
        {
          text: '扩展插件',
          items: [
            { text: '插件概览', link: '/zh/extension/' },
            { text: '插件架构设计', link: '/zh/extension/architecture' },
            { text: '用户中心插件', link: '/zh/extension/user-center' },
            { text: '开发指南', link: '/zh/extension/development' }
          ]
        }
      ]
    },
    editLink: {
      pattern: 'https://github.com/Sdkwork-Cloud/openchat/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Sdkwork-Cloud/openchat' }
    ],
    footer: {
      message: '基于 AGPL-3.0 许可发布',
      copyright: 'Copyright © 2024 Sdkwork Cloud'
    },
    search: {
      provider: 'local'
    },
    outline: {
      label: '页面导航'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    langMenuLabel: '多语言'
  }
}

const enConfig = {
  label: 'English',
  lang: 'en-US',
  description: 'Open Source Instant Messaging Solution - Server, SDK, and Applications',
  themeConfig: {
    nav: [
      { text: 'Overview', link: '/en/guide/overview' },
      { text: 'Quick Start', link: '/en/guide/quickstart' },
      {
        text: 'Server',
        items: [
          { text: 'API Docs', link: '/en/api/' },
          { text: 'Deployment', link: '/en/deploy/' },
          { text: 'Configuration', link: '/en/config/' },
          { text: 'Extensions', link: '/en/extension/' }
        ]
      },
      {
        text: 'SDK',
        items: [
          { text: 'TypeScript SDK', link: '/en/sdk/typescript' },
          { text: 'Java SDK', link: '/en/sdk/java' },
          { text: 'Go SDK', link: '/en/sdk/go' },
          { text: 'Python SDK', link: '/en/sdk/python' }
        ]
      },
      {
        text: 'Apps',
        items: [
          { text: 'React PC', link: '/en/app/react-pc' },
          { text: 'React Native', link: '/en/app/react-native' },
          { text: 'Mini Program', link: '/en/app/miniprogram' }
        ]
      },
      { text: 'GitHub', link: 'https://github.com/Sdkwork-Cloud/openchat' }
    ],
    sidebar: {
      '/en/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Overview', link: '/en/guide/overview' },
            { text: 'Quick Start', link: '/en/guide/quickstart' },
            { text: 'Architecture', link: '/en/guide/architecture' },
            { text: 'Features', link: '/en/guide/features' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'User System', link: '/en/guide/concepts/users' },
            { text: 'Message System', link: '/en/guide/concepts/messages' },
            { text: 'Group System', link: '/en/guide/concepts/groups' },
            { text: 'Channel Types', link: '/en/guide/concepts/channels' }
          ]
        }
      ],
      '/en/api/': [
        {
          text: 'API Documentation',
          items: [
            { text: 'API Overview', link: '/en/api/' },
            { text: 'Authentication', link: '/en/api/auth' },
            { text: 'User Management', link: '/en/api/users' },
            { text: 'Message Management', link: '/en/api/messages' },
            { text: 'Group Management', link: '/en/api/groups' },
            { text: 'Friend Management', link: '/en/api/friends' },
            { text: 'WuKongIM', link: '/en/api/wukongim' }
          ]
        }
      ],
      '/en/sdk/': [
        {
          text: 'SDK Documentation',
          items: [
            { text: 'SDK Overview', link: '/en/sdk/' },
            { text: 'TypeScript SDK', link: '/en/sdk/typescript' },
            { text: 'Java SDK', link: '/en/sdk/java' },
            { text: 'Go SDK', link: '/en/sdk/go' },
            { text: 'Python SDK', link: '/en/sdk/python' }
          ]
        }
      ],
      '/en/app/': [
        {
          text: 'App Documentation',
          items: [
            { text: 'Apps Overview', link: '/en/app/' },
            { text: 'React PC', link: '/en/app/react-pc' },
            { text: 'React Native', link: '/en/app/react-native' },
            { text: 'Mini Program', link: '/en/app/miniprogram' }
          ]
        }
      ],
      '/en/deploy/': [
        {
          text: 'Deployment Guide',
          items: [
            { text: 'Deployment Overview', link: '/en/deploy/' },
            { text: 'Installation Guide', link: '/en/deploy/installation' },
            { text: 'Docker Deployment', link: '/en/deploy/docker' },
            { text: 'Kubernetes Deployment', link: '/en/deploy/kubernetes' },
            { text: 'Traditional Deployment', link: '/en/deploy/traditional' },
            { text: 'Quick Start', link: '/en/deploy/quickstart' }
          ]
        }
      ],
      '/en/config/': [
        {
          text: 'Configuration',
          items: [
            { text: 'Config Overview', link: '/en/config/' },
            { text: 'Server Config', link: '/en/config/server' },
            { text: 'Database Config', link: '/en/config/database' },
            { text: 'WuKongIM Config', link: '/en/config/wukongim' },
            { text: 'RTC Config', link: '/en/config/rtc' },
            { text: 'AI Config', link: '/en/config/ai' }
          ]
        }
      ],
      '/en/extension/': [
        {
          text: 'Extensions',
          items: [
            { text: 'Overview', link: '/en/extension/' },
            { text: 'Architecture', link: '/en/extension/architecture' },
            { text: 'User Center', link: '/en/extension/user-center' },
            { text: 'Development', link: '/en/extension/development' }
          ]
        }
      ]
    },
    editLink: {
      pattern: 'https://github.com/Sdkwork-Cloud/openchat/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Sdkwork-Cloud/openchat' }
    ],
    footer: {
      message: 'Released under the AGPL-3.0 License',
      copyright: 'Copyright © 2024 Sdkwork Cloud'
    },
    search: {
      provider: 'local'
    },
    outline: {
      label: 'On this page'
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },
    returnToTopLabel: 'Return to top',
    sidebarMenuLabel: 'Menu',
    langMenuLabel: 'Languages'
  }
}

export default defineConfig({
  ...sharedConfig,
  locales: {
    root: {
      label: '简体中文',
      ...zhConfig
    },
    en: {
      label: 'English',
      ...enConfig
    }
  }
})
