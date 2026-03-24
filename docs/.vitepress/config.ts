import { defineConfig } from 'vitepress';

const sharedConfig = {
  title: 'OpenChat',
  lastUpdated: true,
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3c3c3c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
  ],
};

const zhSidebar = {
  '/zh/guide/': [
    {
      text: '介绍',
      items: [
        { text: '项目概览', link: '/zh/guide/overview' },
        { text: '快速开始', link: '/zh/guide/quickstart' },
        { text: '架构设计', link: '/zh/guide/architecture' },
        { text: '功能特性', link: '/zh/guide/features' },
      ],
    },
    {
      text: '核心概念',
      items: [
        { text: '用户系统', link: '/zh/guide/concepts/users' },
        { text: '消息系统', link: '/zh/guide/concepts/messages' },
        { text: '群组系统', link: '/zh/guide/concepts/groups' },
        { text: '频道类型', link: '/zh/guide/concepts/channels' },
      ],
    },
  ],
  '/zh/api/': [
    {
      text: '前端 API Reference',
      items: [
        { text: '总览', link: '/zh/api/' },
        { text: '认证授权', link: '/zh/api/auth' },
        { text: '用户', link: '/zh/api/users' },
        { text: '联系人', link: '/zh/api/contacts' },
        { text: '消息', link: '/zh/api/messages' },
        { text: '消息搜索', link: '/zh/api/message-search' },
        { text: '会话', link: '/zh/api/conversations' },
        { text: '群组', link: '/zh/api/groups' },
        { text: '好友', link: '/zh/api/friends' },
        { text: '时间线', link: '/zh/api/timeline' },
        { text: 'RTC', link: '/zh/api/rtc' },
        { text: 'WuKongIM 接入', link: '/zh/api/wukongim' },
        { text: 'AI Bots', link: '/zh/api/ai-bots' },
        { text: 'AI Agents', link: '/zh/api/agents' },
        { text: 'Bot 平台', link: '/zh/api/bots' },
        { text: '记忆管理', link: '/zh/api/memory' },
        { text: 'IoT', link: '/zh/api/iot' },
        { text: '健康检查', link: '/zh/api/health' },
        { text: '监控指标', link: '/zh/api/metrics' },
        { text: '第三方集成', link: '/zh/api/third-party' },
        { text: '开放接入', link: '/zh/api/open-access' },
      ],
    },
    {
      text: '相关入口',
      items: [{ text: 'Admin API Reference', link: '/zh/admin-api/' }],
    },
  ],
  '/zh/admin-api/': [
    {
      text: 'Admin API Reference',
      items: [
        { text: '总览', link: '/zh/admin-api/' },
        { text: 'RTC 控制面', link: '/zh/admin-api/rtc' },
        { text: 'WuKongIM 控制面', link: '/zh/admin-api/wukongim' },
      ],
    },
  ],
  '/zh/sdk/': [
    {
      text: 'SDK 文档',
      items: [
        { text: '总览', link: '/zh/sdk/' },
        { text: 'TypeScript', link: '/zh/sdk/typescript' },
        { text: 'Flutter', link: '/zh/sdk/flutter' },
        { text: 'Java', link: '/zh/sdk/java' },
        { text: 'Kotlin', link: '/zh/sdk/kotlin' },
        { text: 'Go', link: '/zh/sdk/go' },
        { text: 'Python', link: '/zh/sdk/python' },
        { text: 'Swift', link: '/zh/sdk/swift' },
        { text: 'C#', link: '/zh/sdk/csharp' },
        { text: 'Android Wrapper', link: '/zh/sdk/android' },
        { text: 'iOS Wrapper', link: '/zh/sdk/ios' },
      ],
    },
  ],
  '/zh/app/': [
    {
      text: '应用文档',
      items: [
        { text: '总览', link: '/zh/app/' },
        { text: 'React PC', link: '/zh/app/react-pc' },
        { text: 'React Native', link: '/zh/app/react-native' },
        { text: '小程序', link: '/zh/app/miniprogram' },
      ],
    },
  ],
  '/zh/deploy/': [
    {
      text: '部署指南',
      items: [
        { text: '总览', link: '/zh/deploy/' },
        { text: '安装', link: '/zh/deploy/installation' },
        { text: 'Docker', link: '/zh/deploy/docker' },
        { text: 'Kubernetes', link: '/zh/deploy/kubernetes' },
        { text: '传统部署', link: '/zh/deploy/traditional' },
        { text: '快速部署', link: '/zh/deploy/quickstart' },
      ],
    },
  ],
  '/zh/config/': [
    {
      text: '配置说明',
      items: [
        { text: '总览', link: '/zh/config/' },
        { text: '服务端', link: '/zh/config/server' },
        { text: '数据库', link: '/zh/config/database' },
        { text: 'WuKongIM', link: '/zh/config/wukongim' },
        { text: 'RTC', link: '/zh/config/rtc' },
        { text: 'AI', link: '/zh/config/ai' },
      ],
    },
  ],
  '/zh/extension/': [
    {
      text: '扩展插件',
      items: [
        { text: '总览', link: '/zh/extension/' },
        { text: '架构设计', link: '/zh/extension/architecture' },
        { text: '用户中心', link: '/zh/extension/user-center' },
        { text: '开发指南', link: '/zh/extension/development' },
      ],
    },
  ],
};

const enSidebar = {
  '/en/guide/': [
    {
      text: 'Introduction',
      items: [
        { text: 'Overview', link: '/en/guide/overview' },
        { text: 'Quick Start', link: '/en/guide/quickstart' },
        { text: 'Architecture', link: '/en/guide/architecture' },
        { text: 'Features', link: '/en/guide/features' },
      ],
    },
    {
      text: 'Core Concepts',
      items: [
        { text: 'User System', link: '/en/guide/concepts/users' },
        { text: 'Message System', link: '/en/guide/concepts/messages' },
        { text: 'Group System', link: '/en/guide/concepts/groups' },
        { text: 'Channel Types', link: '/en/guide/concepts/channels' },
      ],
    },
  ],
  '/en/api/': [
    {
      text: 'App API Reference',
      items: [
        { text: 'Overview', link: '/en/api/' },
        { text: 'Authentication', link: '/en/api/auth' },
        { text: 'Users', link: '/en/api/users' },
        { text: 'Contacts', link: '/en/api/contacts' },
        { text: 'Messages', link: '/en/api/messages' },
        { text: 'Message Search', link: '/en/api/message-search' },
        { text: 'Conversations', link: '/en/api/conversations' },
        { text: 'Groups', link: '/en/api/groups' },
        { text: 'Friends', link: '/en/api/friends' },
        { text: 'Timeline', link: '/en/api/timeline' },
        { text: 'RTC', link: '/en/api/rtc' },
        { text: 'WuKongIM Integration', link: '/en/api/wukongim' },
        { text: 'AI Bots', link: '/en/api/ai-bots' },
        { text: 'AI Agents', link: '/en/api/agents' },
        { text: 'Bot Platform', link: '/en/api/bots' },
        { text: 'Memory', link: '/en/api/memory' },
        { text: 'IoT', link: '/en/api/iot' },
        { text: 'Health', link: '/en/api/health' },
        { text: 'Metrics', link: '/en/api/metrics' },
        { text: 'Third-party', link: '/en/api/third-party' },
        { text: 'Open Access', link: '/en/api/open-access' },
      ],
    },
    {
      text: 'Related',
      items: [{ text: 'Admin API Reference', link: '/en/admin-api/' }],
    },
  ],
  '/en/admin-api/': [
    {
      text: 'Admin API Reference',
      items: [
        { text: 'Overview', link: '/en/admin-api/' },
        { text: 'RTC Control Plane', link: '/en/admin-api/rtc' },
        { text: 'WuKongIM Control Plane', link: '/en/admin-api/wukongim' },
      ],
    },
  ],
  '/en/sdk/': [
    {
      text: 'SDK Documentation',
      items: [
        { text: 'Overview', link: '/en/sdk/' },
        { text: 'TypeScript', link: '/en/sdk/typescript' },
        { text: 'Flutter', link: '/en/sdk/flutter' },
        { text: 'Java', link: '/en/sdk/java' },
        { text: 'Kotlin', link: '/en/sdk/kotlin' },
        { text: 'Go', link: '/en/sdk/go' },
        { text: 'Python', link: '/en/sdk/python' },
        { text: 'Swift', link: '/en/sdk/swift' },
        { text: 'C#', link: '/en/sdk/csharp' },
        { text: 'Android Wrapper', link: '/en/sdk/android' },
        { text: 'iOS Wrapper', link: '/en/sdk/ios' },
      ],
    },
  ],
  '/en/app/': [
    {
      text: 'App Documentation',
      items: [
        { text: 'Overview', link: '/en/app/' },
        { text: 'React PC', link: '/en/app/react-pc' },
        { text: 'React Native', link: '/en/app/react-native' },
        { text: 'Mini Program', link: '/en/app/miniprogram' },
      ],
    },
  ],
  '/en/deploy/': [
    {
      text: 'Deployment',
      items: [
        { text: 'Overview', link: '/en/deploy/' },
        { text: 'Installation', link: '/en/deploy/installation' },
        { text: 'Docker', link: '/en/deploy/docker' },
        { text: 'Kubernetes', link: '/en/deploy/kubernetes' },
        { text: 'Traditional', link: '/en/deploy/traditional' },
        { text: 'Quick Start', link: '/en/deploy/quickstart' },
      ],
    },
  ],
  '/en/config/': [
    {
      text: 'Configuration',
      items: [
        { text: 'Overview', link: '/en/config/' },
        { text: 'Server', link: '/en/config/server' },
        { text: 'Database', link: '/en/config/database' },
        { text: 'WuKongIM', link: '/en/config/wukongim' },
        { text: 'RTC', link: '/en/config/rtc' },
        { text: 'AI', link: '/en/config/ai' },
      ],
    },
  ],
  '/en/extension/': [
    {
      text: 'Extensions',
      items: [
        { text: 'Overview', link: '/en/extension/' },
        { text: 'Architecture', link: '/en/extension/architecture' },
        { text: 'User Center', link: '/en/extension/user-center' },
        { text: 'Development', link: '/en/extension/development' },
      ],
    },
  ],
};

const zhConfig = {
  label: '简体中文',
  lang: 'zh-CN',
  description: '开源即时通信解决方案，支持 OpenAPI 3.x、SDK 生成与 WuKongIM 实时集成',
  themeConfig: {
    nav: [
      { text: '概览', link: '/zh/guide/overview' },
      { text: '快速开始', link: '/zh/guide/quickstart' },
      {
        text: '服务端',
        items: [
          { text: '前端 API Reference', link: '/zh/api/' },
          { text: 'Admin API Reference', link: '/zh/admin-api/' },
          { text: '部署指南', link: '/zh/deploy/' },
          { text: '配置说明', link: '/zh/config/' },
          { text: '扩展插件', link: '/zh/extension/' },
        ],
      },
      {
        text: 'SDK',
        items: [
          { text: 'SDK 总览', link: '/zh/sdk/' },
          { text: 'TypeScript', link: '/zh/sdk/typescript' },
          { text: 'Flutter', link: '/zh/sdk/flutter' },
          { text: 'Java', link: '/zh/sdk/java' },
          { text: 'Kotlin', link: '/zh/sdk/kotlin' },
          { text: 'Go', link: '/zh/sdk/go' },
          { text: 'Python', link: '/zh/sdk/python' },
          { text: 'Swift', link: '/zh/sdk/swift' },
          { text: 'C#', link: '/zh/sdk/csharp' },
          { text: 'Android Wrapper', link: '/zh/sdk/android' },
          { text: 'iOS Wrapper', link: '/zh/sdk/ios' },
        ],
      },
      {
        text: '应用',
        items: [
          { text: 'React PC', link: '/zh/app/react-pc' },
          { text: 'React Native', link: '/zh/app/react-native' },
          { text: '小程序', link: '/zh/app/miniprogram' },
        ],
      },
      { text: 'GitHub', link: 'https://github.com/Sdkwork-Cloud/openchat' },
    ],
    sidebar: zhSidebar,
    editLink: {
      pattern: 'https://github.com/Sdkwork-Cloud/openchat/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/Sdkwork-Cloud/openchat' }],
    footer: {
      message: '基于 AGPL-3.0 协议发布',
      copyright: 'Copyright © 2024 Sdkwork Cloud',
    },
    search: {
      provider: 'local',
    },
    outline: {
      label: '页面导航',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    langMenuLabel: '语言',
  },
};

const enConfig = {
  label: 'English',
  lang: 'en-US',
  description: 'Open source IM solution with OpenAPI 3.x exports, SDK generation, and WuKongIM realtime integration',
  themeConfig: {
    nav: [
      { text: 'Overview', link: '/en/guide/overview' },
      { text: 'Quick Start', link: '/en/guide/quickstart' },
      {
        text: 'Server',
        items: [
          { text: 'App API Reference', link: '/en/api/' },
          { text: 'Admin API Reference', link: '/en/admin-api/' },
          { text: 'Deployment', link: '/en/deploy/' },
          { text: 'Configuration', link: '/en/config/' },
          { text: 'Extensions', link: '/en/extension/' },
        ],
      },
      {
        text: 'SDK',
        items: [
          { text: 'SDK Overview', link: '/en/sdk/' },
          { text: 'TypeScript', link: '/en/sdk/typescript' },
          { text: 'Flutter', link: '/en/sdk/flutter' },
          { text: 'Java', link: '/en/sdk/java' },
          { text: 'Kotlin', link: '/en/sdk/kotlin' },
          { text: 'Go', link: '/en/sdk/go' },
          { text: 'Python', link: '/en/sdk/python' },
          { text: 'Swift', link: '/en/sdk/swift' },
          { text: 'C#', link: '/en/sdk/csharp' },
          { text: 'Android Wrapper', link: '/en/sdk/android' },
          { text: 'iOS Wrapper', link: '/en/sdk/ios' },
        ],
      },
      {
        text: 'Apps',
        items: [
          { text: 'React PC', link: '/en/app/react-pc' },
          { text: 'React Native', link: '/en/app/react-native' },
          { text: 'Mini Program', link: '/en/app/miniprogram' },
        ],
      },
      { text: 'GitHub', link: 'https://github.com/Sdkwork-Cloud/openchat' },
    ],
    sidebar: enSidebar,
    editLink: {
      pattern: 'https://github.com/Sdkwork-Cloud/openchat/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/Sdkwork-Cloud/openchat' }],
    footer: {
      message: 'Released under the AGPL-3.0 License',
      copyright: 'Copyright © 2024 Sdkwork Cloud',
    },
    search: {
      provider: 'local',
    },
    outline: {
      label: 'On this page',
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
    returnToTopLabel: 'Return to top',
    sidebarMenuLabel: 'Menu',
    langMenuLabel: 'Languages',
  },
};

export default defineConfig({
  ...sharedConfig,
  locales: {
    root: {
      label: '简体中文',
      ...zhConfig,
    },
    en: {
      label: 'English',
      ...enConfig,
    },
  },
});