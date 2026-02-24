
export interface RegionNode {
    code: string;
    name: string;
    children?: RegionNode[];
}

// Mock Data: Supports international structures
export const REGION_DATA: RegionNode[] = [
    {
        code: 'CN',
        name: '中国 (China)',
        children: [
            {
                code: '310000',
                name: '上海市',
                children: [
                    {
                        code: '310100',
                        name: '市辖区',
                        children: [
                            { code: '310101', name: '黄浦区' },
                            { code: '310104', name: '徐汇区' },
                            { code: '310105', name: '长宁区' },
                            { code: '310115', name: '浦东新区' },
                            { code: '310110', name: '杨浦区' }
                        ]
                    }
                ]
            },
            {
                code: '110000',
                name: '北京市',
                children: [
                    {
                        code: '110100',
                        name: '市辖区',
                        children: [
                            { code: '110101', name: '东城区' },
                            { code: '110105', name: '朝阳区' },
                            { code: '110108', name: '海淀区' }
                        ]
                    }
                ]
            },
            {
                code: '330000',
                name: '浙江省',
                children: [
                    {
                        code: '330100',
                        name: '杭州市',
                        children: [
                            { code: '330106', name: '西湖区' },
                            { code: '330108', name: '滨江区' },
                            { code: '330110', name: '余杭区' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        code: 'US',
        name: 'United States',
        children: [
            {
                code: 'CA',
                name: 'California',
                children: [
                    { code: 'LA', name: 'Los Angeles' },
                    { code: 'SF', name: 'San Francisco' },
                    { code: 'SD', name: 'San Diego' }
                ]
            },
            {
                code: 'NY',
                name: 'New York',
                children: [
                    { code: 'NYC', name: 'New York City' },
                    { code: 'BUF', name: 'Buffalo' }
                ]
            }
        ]
    },
    {
        code: 'JP',
        name: '日本 (Japan)',
        children: [
            {
                code: '13',
                name: '東京都 (Tokyo)',
                children: [
                    { code: '13101', name: '千代田区' },
                    { code: '13103', name: '港区' },
                    { code: '13104', name: '新宿区' }
                ]
            }
        ]
    }
];
