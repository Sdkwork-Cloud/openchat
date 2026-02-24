
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page, FilterCriterion, Sort } from '../../../core/types';
import { Platform } from '../../../platform';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type ServiceType = 'medical' | 'dining' | 'beauty' | 'hotel' | 'transport' | 'sports' | 'course' | 'general';

export interface Appointment extends BaseEntity {
    providerName: string;
    serviceName: string;
    providerAvatar: string;
    
    startTime: number; 
    endTime?: number;
    
    location: string;
    status: AppointmentStatus;
    type: ServiceType;
    
    bookingId: string;
    ticketCode: string;
    price?: number;
    
    meta?: Record<string, string | number>; 
    notes?: string;
}

const SEED_APPOINTMENTS: Partial<Appointment>[] = [
    {
        id: 'apt_hotel_01',
        providerName: '亚特兰蒂斯酒店',
        serviceName: '海景套房 (含双早)',
        providerAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AT&backgroundColor=00695c',
        startTime: Date.now() + 86400000 * 10,
        endTime: Date.now() + 86400000 * 12,
        location: '三亚海棠北路36号',
        status: 'confirmed',
        type: 'hotel',
        bookingId: 'HT-29910022',
        ticketCode: '88291029',
        price: 4888,
        meta: { '入住人数': '2人', '房型': '大床', '入离时间': '15:00 / 12:00' }
    },
    {
        id: 'apt_flight_02',
        providerName: '中国国际航空',
        serviceName: '上海 PVG ✈️ 北京 PEK',
        providerAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=CA&backgroundColor=d32f2f',
        startTime: Date.now() + 86400000 * 3, 
        endTime: Date.now() + 86400000 * 3 + 7200000,
        location: '浦东国际机场 T2',
        status: 'confirmed',
        type: 'transport',
        bookingId: 'CA1882',
        ticketCode: 'ET-992811123',
        price: 1250,
        meta: { '航班号': 'CA1882', '舱位': '经济舱 Y', '座位': '32A' }
    },
    {
        id: 'apt_medical_01',
        providerName: '华山医院 (皮肤科)',
        serviceName: '专家门诊 - 李教授',
        providerAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=HS&backgroundColor=00a0e9',
        startTime: Date.now() + 86400000 * 1,
        location: '上海市乌鲁木齐中路12号 门诊楼 4F',
        status: 'confirmed',
        type: 'medical',
        bookingId: 'Y20240522001',
        ticketCode: '8829 1029 3341',
        price: 50,
        meta: { '就诊人': '张三', '科室': '皮肤科' }
    },
    {
        id: 'apt_sports_03',
        providerName: '源深体育中心',
        serviceName: '羽毛球畅打 - 3号场',
        providerAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=YS&backgroundColor=ff6d00',
        startTime: Date.now() + 3600000 * 2,
        endTime: Date.now() + 3600000 * 4,
        location: '浦东新区源深路655号',
        status: 'pending',
        type: 'sports',
        bookingId: 'SPT-8812',
        ticketCode: 'CHECK-IN-123',
        price: 120,
        meta: { '场地': '3号场', '人数': '4人' }
    },
    {
        id: 'apt_dining_02',
        providerName: 'L\'Atelier de Joël Robuchon',
        serviceName: '主要用餐区 - 晚餐预约',
        providerAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=JR&backgroundColor=1a1a1a',
        startTime: Date.now() + 3600000 * 5, 
        location: '中山东一路18号外滩18号3楼',
        status: 'pending',
        type: 'dining',
        bookingId: 'DIN-2024-992',
        ticketCode: '1122 3344',
        notes: '靠窗位置，庆祝纪念日',
        meta: { '用餐人数': '2人', '着装要求': 'Smart Casual' }
    },
    {
        id: 'apt_beauty_03',
        providerName: 'Hair Code 造型',
        serviceName: '资深总监剪裁 + 护理',
        providerAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=HC&backgroundColor=ff4081',
        startTime: Date.now() - 86400000 * 5,
        location: '南京西路1515号静安嘉里中心',
        status: 'completed',
        type: 'beauty',
        bookingId: 'B-882199',
        ticketCode: 'Completed',
        price: 380
    },
    {
        id: 'apt_cancel_01',
        providerName: '滴滴出行',
        serviceName: '专车 - 预约单',
        providerAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=DD&backgroundColor=ff9a44',
        startTime: Date.now() - 86400000 * 1,
        location: '上海中心大厦 -> 虹桥火车站',
        status: 'cancelled',
        type: 'transport',
        bookingId: 'DD-2991',
        ticketCode: '-',
        notes: '行程已取消',
        meta: { '车型': '行政级', '原因': '行程变更' }
    }
];

class AppointmentServiceImpl extends AbstractStorageService<Appointment> {
    // V5 Key forces a clean slate for the new schema logic
    protected STORAGE_KEY = 'sys_appointments_v5';

    constructor() {
        super();
        this.initData();
    }

    private async initData() {
        try {
            const list = await this.loadData();
            if (list.length === 0) {
                await this.seedData();
            }
        } catch (e) {
            console.error('[AppointmentService] Init failed, performing hard reset', e);
            await this.resetStorage();
        }
    }

    private async seedData() {
        const now = Date.now();
        const promises = SEED_APPOINTMENTS.map(item => 
            this.save({ ...item, createTime: now, updateTime: now } as Appointment)
        );
        await Promise.all(promises);
    }

    private async resetStorage() {
        try {
            console.warn('[AppointmentService] Resetting storage...');
            this.cache = [];
            await Platform.storage.remove(this.STORAGE_KEY);
            await this.seedData();
        } catch (err) {
            console.error('[AppointmentService] Reset failed', err);
        }
    }

    async getAppointments(status: AppointmentStatus | 'all' = 'all'): Promise<Result<Appointment[]>> {
        const filters: FilterCriterion[] = [];
        let sort: Sort = { field: 'startTime', order: 'asc' }; // Default: Upcoming first

        if (status !== 'all') {
            filters.push({ field: 'status', operator: 'eq', value: status });
            // History items should be desc (latest first)
            if (status === 'completed' || status === 'cancelled') {
                sort = { field: 'startTime', order: 'desc' };
            }
        } else {
            // Mixed list? Just sort by start time desc for general view
            sort = { field: 'startTime', order: 'desc' };
        }

        const { data } = await this.findAll({
            filters,
            sort,
            pageRequest: { page: 1, size: 100 }
        });

        // Safe return
        return { success: true, data: data?.content || [] };
    }

    async cancelAppointment(id: string): Promise<Result<void>> {
        try {
            const { data } = await this.findById(id);
            if (data && (data.status === 'pending' || data.status === 'confirmed')) {
                data.status = 'cancelled';
                await this.save(data);
                return { success: true };
            }
            return { success: false, message: '无法取消' };
        } catch (e) {
            console.error('[AppointmentService] Error cancelling', e);
            return { success: false, message: '操作失败' };
        }
    }
}

export const AppointmentService = new AppointmentServiceImpl();
