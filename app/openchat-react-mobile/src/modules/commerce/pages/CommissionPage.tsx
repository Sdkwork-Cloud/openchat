
import React, { useEffect, useState, useRef } from 'react';
import { navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { DistributionService, CommissionRecord } from '../services/DistributionService';
import { Card } from '../../../components/Card/Card';
import { Empty } from '../../../components/Empty/Empty';
import { Toast } from '../../../components/Toast';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Platform } from '../../../platform';

// --- Premium Spline Chart Component ---
const SplineChart = ({ labels, data }: { labels: string[], data: number[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    
    const height = 160;
    const padding = 10;
    const width = 320; // Virtual Width
    
    // Normalize data
    const maxVal = Math.max(...data, 1) * 1.2;
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (val / maxVal) * height;
        return { x, y, val, label: labels[i] };
    });

    // Generate Path (Catmull-Rom or simple Bezier approximation)
    // For simplicity and smoothness: simple quadratic bezier between midpoints
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midX = (p0.x + p1.x) / 2;
        // Bezier control points for smooth curve
        d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    // Area Path
    const areaD = `${d} L ${width} ${height} L 0 ${height} Z`;

    const handleTouch = (e: React.TouchEvent | React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const relativeX = clientX - rect.left;
        
        // Find closest point
        let minDist = Infinity;
        let closestIdx = 0;
        
        // Map relativeX (screen pixels) to virtual width
        const scaleX = width / rect.width;
        const virtualX = relativeX * scaleX;

        points.forEach((p, i) => {
            const dist = Math.abs(p.x - virtualX);
            if (dist < minDist) {
                minDist = dist;
                closestIdx = i;
            }
        });

        if (closestIdx !== activeIndex) {
            setActiveIndex(closestIdx);
            Platform.device.vibrate(5);
        }
    };

    const activePoint = activeIndex !== null ? points[activeIndex] : null;

    return (
        <div 
            ref={containerRef}
            onTouchMove={handleTouch}
            onMouseMove={handleTouch}
            onMouseLeave={() => setActiveIndex(null)}
            onTouchEnd={() => setTimeout(() => setActiveIndex(null), 2000)}
            style={{ position: 'relative', height: `${height}px`, width: '100%', cursor: 'crosshair', userSelect: 'none' }}
        >
            <svg viewBox={`0 -10 ${width} ${height + 20}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                <line x1="0" y1={height} x2={width} y2={height} stroke="var(--border-color)" strokeWidth="1" />
                <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

                {/* Area Fill */}
                <path d={areaD} fill="url(#chartFill)" />
                
                {/* Line Stroke */}
                <path d={d} fill="none" stroke="var(--primary-color)" strokeWidth="3" strokeLinecap="round" />

                {/* Active Indicator */}
                {activePoint && (
                    <g>
                        <line x1={activePoint.x} y1={activePoint.y} x2={activePoint.x} y2={height} stroke="var(--primary-color)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                        <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="var(--bg-card)" stroke="var(--primary-color)" strokeWidth="2" />
                    </g>
                )}
            </svg>

            {/* Tooltip Overlay */}
            {activePoint && (
                <div style={{
                    position: 'absolute',
                    left: `${(activePoint.x / width) * 100}%`,
                    top: '0',
                    transform: 'translate(-50%, -100%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    marginTop: '-10px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontWeight: 600 }}>{activePoint.label}</div>
                    <div>¥{activePoint.val}</div>
                    <div style={{ position: 'absolute', bottom: '-4px', left: '50%', marginLeft: '-4px', width: '8px', height: '8px', background: 'rgba(0,0,0,0.8)', transform: 'rotate(45deg)', zIndex: -1 }} />
                </div>
            )}
        </div>
    );
};

export const CommissionPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'income' | 'withdraw'>('income');
    const [chartData, setChartData] = useState<{ labels: string[], data: number[] } | null>(null);
    const [history, setHistory] = useState<CommissionRecord[]>([]);

    useEffect(() => {
        const load = async () => {
            if (activeTab === 'income') {
                const chartRes = await DistributionService.getWeeklyEarnings();
                if (chartRes.success && chartRes.data) setChartData(chartRes.data);
            }
            
            const histRes = await DistributionService.getCommissionRecords(activeTab);
            if (histRes.success && histRes.data) setHistory(histRes.data);
        };
        load();
    }, [activeTab]);

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="资金明细" onBack={() => navigateBack('/commerce/distribution')} />
            
            <Tabs 
                items={[{id:'income', label:'收益明细'}, {id:'withdraw', label:'提现记录'}]} 
                activeId={activeTab} 
                onChange={(id) => setActiveTab(id as any)} 
            />

            <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                {activeTab === 'income' && (
                    <Card padding="20px" style={{ marginBottom: '20px', overflow: 'visible' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>近7日收益趋势</span>
                            <span style={{ fontSize: '12px', color: 'var(--primary-color)' }}>查看全部 &gt;</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            总收益: <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DIN Alternate' }}>¥{chartData?.data.reduce((a,b)=>a+b, 0)}</span>
                        </div>
                        {chartData ? <SplineChart labels={chartData.labels} data={chartData.data} /> : <div style={{height: 160}} />}
                    </Card>
                )}

                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', paddingLeft: '4px' }}>
                    {activeTab === 'income' ? '近期收益' : '提现申请'}
                </div>
                
                {history.length > 0 ? (
                    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
                        {history.map((item, idx) => (
                            <div key={item.id} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx !== history.length -1 ? '0.5px solid var(--border-color)' : 'none' }}>
                                <div>
                                    <div style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {item.productName} 
                                        {item.type === 'income' && item.level > 0 && (
                                            <span style={{ fontSize: '10px', background: item.level === 1 ? 'rgba(41,121,255,0.1)' : 'rgba(255,154,68,0.1)', color: item.level === 1 ? 'var(--primary-color)' : '#ff9a44', padding: '1px 4px', borderRadius: '4px', marginLeft: '6px' }}>
                                                {item.level === 1 ? '一级' : '二级'}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {new Date(item.createTime).toLocaleString()} · {item.sourceUser}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: item.amount > 0 ? '#07c160' : 'var(--text-primary)', fontFamily: 'DIN Alternate' }}>
                                        {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '2px' }}>
                                        {item.status === 'pending' ? '待结算' : 
                                         item.status === 'processing' ? '处理中' :
                                         item.status === 'success' ? '已到账' : '已结算'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty text="暂无相关记录" />
                )}
            </div>
        </div>
    );
};
