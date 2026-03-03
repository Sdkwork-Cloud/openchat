/**
 * 濠电姭鎷冮崨顓濈捕閻庤鎮傛禍璺虹暦閸︻厸鍋撻敐鍌涙珖闁汇劍鍨甸湁闁绘ê鎼悡鎰版煃瑜滈崜婵嗙暦閻㈢鍚归幖娣妼鐎氬鈧箍鍎遍幊搴綖?
 * 
 * 闂備礁婀辩划顖炲礉閹烘梹顐介柣銏㈩焾閻鏌熺€涙绠樻い蹇旀尦閹鎷呴棃娑氫紙濠碘剝褰冪€氼剝鐏掗梺鐐藉劚绾绢厾娑甸埀顒勬⒑濮瑰洤濡奸悗姘间簽閼洪亶濡搁敂缁㈡祫闂佺厧鎽滈。浠嬪磻閹剧粯鍤掗柕鍫濇噺閻ゅ洭姊洪幐搴ｂ槈闁哄牜鍓熷顐︻敋閳ь剟鐛幇顓熷濡炲娴峰▓銈嗙箾鐎电鞋闁糕晜鐗犲畷娆撴寠婢跺棙鏁犻梺瑙勫閺備線宕戦幘瀛樺濡炲娴峰▓銈嗙箾鐎电鞋婵炲绋戠叅闁哄稁鍘肩紒鈺伹庨崶銊ヮ暢闁稿鎸婚幏鍛槹鎼达絾顓诲┑鐐差嚟婵敻宕曢懖鈺傚床闁告劦鐓堥悡銉╂煏閸繃宸濋柟鑲╁帶铻栭柛灞句緱閻掕棄螖閻樺弶鍠樼€规洘绻堥幃銏㈡嫚閹绘帒绠?
 * 闂備浇銆€閸嬫挻銇勯弽銊р槈闁伙富鍣ｉ弻锟犲醇椤愩垹顫╁┑鐘亾閻庢稒顭囬々鏌ユ倵閿濆倹娅嗘い鎰矙閺屾稑顭ㄩ崘顓烆伃闂佹悶鍔屽ù鐑藉极椤曗偓瀹曟﹢濡歌椤㈠懏绻涚€涙鐭婃い鎴濆閳诲酣濮€閵堝棙娅栭梺鍓插亖閸庮噣宕戦幘鎰佹僵鐎规洖娲ㄩ悾?Redis闂?
 * 
 * @framework
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠粻鎶芥煏婢跺牆鍔氱紓?
 */
export interface IEvent<T = any> {
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠憴锔锯偓骞垮劚濞?*/
  eventName: string;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曢弸渚€鏌ｅΔ鈧悧鍡欑矈?*/
  data: T;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠猾宥夋煕椤愶絾绀冮柨娑氬枛閺?*/
  timestamp: number;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋?ID */
  eventId: string;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠痪褔鏌曟径娑橆洭闁?*/
  source?: string;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€栭崑瀣煕椤愩倕鏋戦柟?*/
  version?: number;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠粈鍌炴煕閹般劍娅嗘繛鍫濈埣閺?*/
  metadata?: Record<string, any>;
  /** 闂備浇澹堟ご鎼佹嚌妤ｅ啫绠栭幖娣妼閸愨偓?ID闂備焦瀵х粙鎴︽偋韫囨稑鏋侀柕鍫濇椤╂煡骞栫€涙绠橀柣銊﹀灥闇夐柣妯烘惈閻撴劙鏌涢幋锝嗩棄闁崇懓鍟撮獮鍥礈娴ｄ警妲?*/
  aggregateId?: string;
  /** 闂備浇澹堟ご鎼佹嚌妤ｅ啫绠栭幖娣妼閸愨偓闂侀潻瀵岄崣鈧い顐畵閺屾盯濡搁妷顔煎妧缂備浇椴搁悷鈺呭箖娴犲惟闁靛牆娲╂竟妯荤箾鐎涙鐭婃い鎴濆閳诲酣濮€閻橆偅鏁犲銈嗙墬缁嬫捇鎮ラ柆宥嗙叆?*/
  aggregateType?: string;
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇娾偓宕囩獮闂佸憡娲﹂崢浠嬪磹閻愮儤鐓曢柨婵嗗暙婵′粙鎮介娑欏唉鐎?
 */
export interface IEventHandler<T extends IEvent = IEvent> {
  /** 濠电姰鍨煎▔娑氣偓姘煎櫍楠炲啯绻濋崘顏嶆锤闁诲函绲洪弲婊堫敃?*/
  handle(event: T): Promise<void> | void;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠憴锔锯偓骞垮劚濞?*/
  eventName: string;
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪灪婵ジ鏌曡箛瀣偓鏍綖婢舵劖鈷戞い鎰╁焺濡偓闂?
 */
export interface EventSubscribeOptions {
  /** 闂備礁鎼€氱兘宕规导鏉戠畾濞达絽澹婇崵鏇㈡煕鐏炲彞绶遍柛鏂垮椤法鎹勯崫鍕典紑闂?*/
  async?: boolean;
  /** 闂備礁鎼€氱兘宕规导鏉戠畾濞撴埃鍋撴鐐村姈閹峰懏顦版惔锝嗘瘜闂?*/
  persistent?: boolean;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇婂墲娴溿倝鏌涢妷锝呭闁糕晛鍊块弻锟犲礃閵娧冪厽濠碘槅鍋勫锟犲极瀹ュ閱囬柕蹇婃櫆閸嬨儵姊?*/
  expire?: number;
  /** 闂備礁鎼悧鍐磻閹炬剚鐔嗛柛顐㈡濞层倕鈻嶉姀銈嗗仯闁搞儯鍔嶇粈鍐┿亜閹邦兙鍋㈢€?*/
  maxRetries?: number;
  /** 闂傚倷鐒﹁ぐ鍐矓閻戣姤鍎婃い鏍仦閳锋帡鏌熺紒銏犳灍妞ゆ捇绠栭弻銊モ槈濡厧顤€濡炪倖娲滄慨椋庡垝閺冨牆绠抽柣鎰暩椤?*/
  retryInterval?: number;
  /** 濠电偞娼欓崥瀣晪闂佸憡蓱缁嬫捇鎯€?*/
  priority?: number;
  /** 闂備礁鎼€氱兘宕规导鏉戠畾濞撴埃鍋撶€规洩缍侀、鏃堝川椤撶儐妲婚梻浣姐€€閸嬫捇鏌ょ粙璺ㄤ粵闁圭兘浜堕弻娑㈡晝閸屻倖娈ョ紓浣靛妸閸斿秶绮?*/
  localOnly?: boolean;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇婂墲娴溿倝鏌涢妷锝呭濠殿喓鍨介弻?*/
  filter?: (event: IEvent) => boolean;
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曢惌妤呮煙鐎涙绠樻い蹇旀尦濮婃椽顢曢姀鈺傗枅闂?
 */
export interface EventPublishOptions {
  /** 闂備礁鎼€氱兘宕规导鏉戠畾濞达絽澹婇崵鏇㈡煕鐏炲彞绶遍柛鏂垮閺屾稑鈻庨幇顒備淮缂?*/
  async?: boolean;
  /** 闂備礁鎼€氱兘宕规导鏉戠畾濞撴埃鍋撴鐐村姈閹峰懏顦版惔锝嗘瘜闂?*/
  persistent?: boolean;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋?TTL闂備焦瀵х粙鎴︽偋韫囨冻缍栨俊銈呮噺閺?*/
  ttl?: number;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠痪褔鏌曟径娑橆洭闁?*/
  source?: string;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€栭崑瀣煕椤愩倕鏋戦柟?*/
  version?: number;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠粈鍌炴煕閹般劍娅嗘繛鍫濈埣閺?*/
  metadata?: Record<string, any>;
  /** 闂備礁鎼€氱兘宕规导鏉戠畾濞撴埃鍋撻柣娑卞櫍楠炴劖鎯旈姀鐘叉櫓闂備礁鎲＄敮妤€顭垮鈧畷锝夋倷椤掑偆娴勯梺鍝勭▉閸撴瑨鐏愰梻?*/
  broadcast?: boolean;
  /** 闁诲海鍋ｉ崐鏍磿閼测晜宕叉繝濠傜墕閻鏌熺€涙绠樻い蹇旀尦閺屻劌鈽夊Ο鐓庮杸濡炪倖娲滄慨椋庡垝閺冨牆绠抽柣鎰暩椤?*/
  delay?: number;
  /** 濠电偞娼欓崥瀣晪闂佸憡蓱缁嬫捇鎯€?*/
  priority?: EventPriority | number;
  /** 闂備礁鎼€氱兘宕规导鏉戠畾濞撴埃鍋撶€规洩缍侀、鏃堝川椤撶儐妲婚梻浣姐€€閸嬫捇鏌ょ粙璺ㄤ粵闁圭兘浜堕弻娑㈡晝閸屻倖娈ョ紓浣靛妸閸斿秶绮?*/
  localOnly?: boolean;
  /** 闂備胶顭堢换鎰版偪閸ャ劎顩?ID闂備焦瀵х粙鎴︽偋韫囨稑鏋侀柕鍫濇椤╂煡骞栫€涙绠橀柣銊﹀灥闇夐柣妯哄暱閸斿爼鏌熸搴″幋闁绘搩浜、鏃€鎯旈敐鍥舵Т */
  correlationId?: string;
  responseEventName?: string;
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇婃噰閸嬫挸鈽夊▍顓т邯瀹曟垵顓兼径濠勵唺闂侀潧顦崕杈╃礊?
 */
export interface EventStore {
  /** 濠电儑绲藉ú锔炬崲閸岀偞鍋ら柕濠忓椤╂煡鎮楅敐鍌涙珕妞?*/
  save(event: IEvent): Promise<void>;
  /** 闂備礁鎼悮顐﹀磿閹绢噮鏁嬫俊銈勮兌椤╂煡鎮楅敐鍌涙珕妞?*/
  query(options: EventQueryOptions): Promise<IEvent[]>;
  /** 闂備礁鎲＄敮鐐寸箾閳ь剚绻涢崨顓烆劉缂佸倸绉堕埀顒婄岛閺呮粓顢?*/
  delete(eventId: string): Promise<void>;
  /** 婵犵數鍋為幐鎼佸箠閹版澘鐓橀柡宥冨妿椤╂煡鎮楅敐鍌涙珕妞?*/
  clear(aggregateId?: string): Promise<void>;
  size(): number;
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曢拑鐔兼煏婢舵鍘涢柛銈呭濮婃椽顢曢姀鈺傗枅闂?
 */
export interface EventQueryOptions {
  /** 闂備浇澹堟ご鎼佹嚌妤ｅ啫绠栭幖娣妼閸愨偓?ID */
  aggregateId?: string;
  /** 闂備浇澹堟ご鎼佹嚌妤ｅ啫绠栭幖娣妼閸愨偓闂侀潻瀵岄崣鈧い顐畵閺?*/
  aggregateType?: string;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪€曠憴锔锯偓骞垮劚濞?*/
  eventName?: string;
  /** 闁诲孩顔栭崰鎺楀磻閹炬枼鏀芥い鏃傗拡閸庢劖淇婇悙鎻掆偓鍨潖?*/
  startTime?: number;
  /** 缂傚倸鍊烽悞锕傚箰鐠囧樊鐒芥い鎰剁畱缁秹鏌涢锝嗙闁?*/
  endTime?: number;
  /** 闂傚倸鍊哥€氼參宕濋弴銏犳槬婵°倕鎳庨弸浣该归崗鍏肩稇婵?*/
  limit?: number;
  /** 闂備胶顭堥鍛崲閹哄秶鏄傞梻?*/
  offset?: number;
  /** 闂備礁婀遍崕銈囨暜閹烘棁濮虫い鎾卞灩濡﹢鏌ｉ悢鍝勵暭闁?*/
  sortOrder?: 'asc' | 'desc';
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪灮绾惧ジ鏌ｉ弮鈧鍧楀触閳ь剚绻涢敐鍛闁告挻绻冪€?
 */
export interface EventBusStats {
  /** 闂備礁鎲￠悷锕傚垂閻㈢數鍗氶梺鍨儑椤╂煡鎮楅敐鍌涙珕妞ゆ劒绮欓弻鐔碱敆閸屾粌绗￠梺?*/
  totalPublished: number;
  /** 濠电姰鍨煎▔娑氣偓姘煎櫍楠炲啯绻濋崘顏嶆锤闁诲函绲洪弲婊堫敃娴犲鐓欐い鎺戝€荤敮娑㈡煛?*/
  totalProcessed: number;
  /** 濠电姰鍨洪崕鑲╁垝閸撗勫枂闁挎梻鏅々鏌ユ倵閿濆倹娅嗘い鎰矙閺岀喖顢楅崒婊冪闂?*/
  totalFailed: number;
  /** 闁荤喐绮庢晶妤呭箰閸涘﹥娅犻柣妯虹仛婵ジ鏌曡箛瀣偓鏍綖婢舵劖鐓?*/
  subscriptionCount: number;
  /** 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇婃噰閸嬫挸鈽夊▍顓т邯瀹曟垵顓兼径濠冪€繛鏉戝悑濞兼瑥鈻?*/
  storedEventCount: number;
  /** 婵°倗濮烽崑娑㈠疮閸噮鐒介幖娣灩缁剁偤鏌涢弴銊ュ箺闁稿﹦鍋ら弻锟犲礃閵娧冪厽濠碘槅鍋勫锟犲极瀹ュ閱囬柣鏇氱濞堛倗绱撴担鍓叉Ч閻㈩垼浜炲Σ?*/
  averageProcessingTime: number;
}

/**
 * 闂備礁鎲￠崝鏇㈠箠鎼淬劍鍋ら柕濠忓椤╂煡鎮楅敐鍌涙珕妞ゆ劒绮欓幃妤€鈽夊▍顓т邯瀹曟垵顓奸崶锝呬壕闁革富鍘兼禒褎顨?
 */
@Injectable()
export class InMemoryEventStore implements EventStore {
  private readonly events: Map<string, IEvent> = new Map();
  private readonly aggregateEvents: Map<string, string[]> = new Map();
  private readonly maxEvents: number;
  private readonly eventQueue: string[] = []; // 闂備焦妞垮鍧楀礉鐎ｎ剝濮抽柣鐐叉ЖU婵犵數鍋為幐鎼佸箠閹版澘绠?

  constructor(maxEvents: number = 10000) {
    this.maxEvents = maxEvents;
  }

  async save(event: IEvent): Promise<void> {
    // 婵犵妲呴崑鈧柛瀣崌閺岋紕浠︾拠鎻掑濠碘€冲级閹倸鐣烽妷鈺傛櫇闁稿本绋愮划顖炴煟閻斿憡纾婚柣鎺炲缁晜绻濆顓炰哗闂佺硶鍓濊摫闁挎稑顑呴湁婵犲﹤鍠氶崕搴㈢箾?
    if (this.events.size >= this.maxEvents) {
      this.cleanupOldEvents();
    }

    this.events.set(event.eventId, event);
    this.eventQueue.push(event.eventId);

    if (event.aggregateId) {
      const key = `${event.aggregateType || 'default'}:${event.aggregateId}`;
      const existing = this.aggregateEvents.get(key) || [];
      existing.push(event.eventId);
      this.aggregateEvents.set(key, existing);
    }
  }

  private cleanupOldEvents(): void {
    // 缂傚倷绀侀ˇ顖炩€﹀畡鎵虫瀺閹兼番鍔岀€氬鏌嶈閸撶喎顕ｉ娆炬Ь濠电偛鐗婇崹鍓佺矉瀹ュ洠鍋撻敐鍌涙珕妞ゆ劒绮欓弻銊モ槈濡槒鈧笉U缂傚倷鐒︾粙鎺楁偋濠婂牆姹查柟鎵閺?
    const eventsToRemove = Math.max(1, Math.floor(this.maxEvents * 0.2)); // 缂傚倷绀侀ˇ顖炩€﹀畡鎵虫瀺?0%闂備焦鐪归崝宀€鈧凹鍘艰灋妞ゆ劧绲块々鏌ユ倵閿濆倹娅嗘い?
    for (let i = 0; i < eventsToRemove && this.eventQueue.length > 0; i++) {
      const eventId = this.eventQueue.shift();
      if (eventId) {
        this.delete(eventId);
      }
    }
  }

  async query(options: EventQueryOptions): Promise<IEvent[]> {
    let result = Array.from(this.events.values());

    if (options.aggregateId) {
      const key = `${options.aggregateType || 'default'}:${options.aggregateId}`;
      const eventIds = this.aggregateEvents.get(key) || [];
      result = result.filter(e => eventIds.includes(e.eventId));
    }

    if (options.eventName) {
      result = result.filter(e => e.eventName === options.eventName);
    }

    if (options.startTime !== undefined) {
      result = result.filter(e => e.timestamp >= options.startTime!);
    }

    if (options.endTime !== undefined) {
      result = result.filter(e => e.timestamp <= options.endTime!);
    }

    const sortOrder = options.sortOrder || 'asc';
    result.sort((a, b) => 
      sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
    );

    const offset = options.offset ?? 0;
    const limit = options.limit ?? result.length;

    return result.slice(offset, offset + limit);
  }

  async delete(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      this.events.delete(eventId);
      
      if (event.aggregateId) {
        const key = `${event.aggregateType || 'default'}:${event.aggregateId}`;
        const eventIds = this.aggregateEvents.get(key) || [];
        const index = eventIds.indexOf(eventId);
        if (index > -1) {
          eventIds.splice(index, 1);
          this.aggregateEvents.set(key, eventIds);
        }
      }
    }
  }

  async clear(aggregateId?: string): Promise<void> {
    if (!aggregateId) {
      this.events.clear();
      this.aggregateEvents.clear();
    } else {
      const eventIds: string[] = [];
      for (const [key, ids] of this.aggregateEvents.entries()) {
        if (key.endsWith(`:${aggregateId}`)) {
          eventIds.push(...ids);
          this.aggregateEvents.delete(key);
        }
      }
      for (const eventId of eventIds) {
        this.events.delete(eventId);
      }
    }
  }


  size(): number {
    return this.events.size;
  }
}

/**
 * 濠电姭鎷冮崨顓濈捕閻庤鎮傛禍璺虹暦閸︻厸鍋撻敐鍌涙珖闁汇劍鍨甸湁闁绘ê鎼悡鎰版煃瑜滈崜婵嗙暦閻㈢鍚归幖娣妼鐎氬鈧箍鍎遍幊搴綖?
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(EventBusService.name);
  
  private readonly eventEmitter: EventEmitter2;
  private readonly eventStore: EventStore;
  private readonly eventSubjects: Map<string, Subject<IEvent>> = new Map();
  private readonly subscriptions: Map<symbol, string> = new Map();
  private readonly stats: EventBusStats = {
    totalPublished: 0,
    totalProcessed: 0,
    totalFailed: 0,
    subscriptionCount: 0,
    storedEventCount: 0,
    averageProcessingTime: 0,
  };
  private readonly processingTimes: number[] = [];
  private readonly prefix: string;
  private readonly enablePersistence: boolean;
  private readonly enableBroadcast: boolean;
  private readonly maxStoredEvents: number;
  private readonly sourceId: string;

  constructor(
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.eventEmitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 100,
    });

    this.prefix = this.configService?.get<string>('EVENTBUS_PREFIX', 'event') ?? 'event';
    this.enablePersistence = this.configService?.get<boolean>('EVENTBUS_ENABLE_PERSISTENCE', false) ?? false;
    this.enableBroadcast = this.configService?.get<boolean>('EVENTBUS_ENABLE_BROADCAST', false) ?? false;
    this.maxStoredEvents = this.configService?.get<number>('EVENTBUS_MAX_STORED_EVENTS', 10000) ?? 10000;
    this.sourceId = this.generateSourceId();
    this.eventStore = new InMemoryEventStore(this.maxStoredEvents);
  }

  onModuleInit() {
    this.logger.log('EventBusService initialized');
    
    if (this.enableBroadcast && this.redisService) {
      this.setupDistributedEvents();
    }
  }

  onModuleDestroy() {
    this.eventEmitter.removeAllListeners();
    for (const subject of this.eventSubjects.values()) {
      subject.complete();
    }
    this.eventSubjects.clear();
    this.subscriptions.clear();
  }

  /**
   * 闂備礁鎲￠悷锕傚垂閻㈢數鍗氶梺鍨儑椤╂煡鎮楅敐鍌涙珕妞?
   */
  async publish<T>(eventName: string, data: T, options?: EventPublishOptions): Promise<void> {
    const event = this.createEvent(eventName, data, options);
    try {
      // 闂備礁缍婇弲鎻掝渻閹烘梻涓嶆繛鍡樻尭缁€宀勬煛瀹ュ繐顩柣銊﹀灥闇?
      if (this.enablePersistence || options?.persistent) {
        await this.persistEvent(event);
      }

      // 闂備礁鎼悧婊堝礈濞嗗骏鑰块柟缁㈠枛閻鏌熺€涙绠樻い?
      await this.publishLocal(event, options);

      // 婵°倗濮烽崑鐐碘偓绗涘洤绠伴梺顒€绉寸粈鍡涙煛婢跺﹦浠㈢€电増鎸搁湁闁绘ê纾晶鍐测攽閳藉棗寮柟?
      if (options?.broadcast || (this.enableBroadcast && !options?.localOnly)) {
        await this.broadcastEvent(event, options);
      }

      // 缂傚倸鍊烽懗鍫曞窗閺囥埄鏁?
      this.stats.totalPublished++;
      this.updateStats();
    } catch (error) {
      this.stats.totalFailed++;
      this.logger.error(`Failed to publish event ${eventName}:`, error);
      throw error;
    }
  }

  /**
   * 闂備礁鎲￠悷锕傚垂閻㈢數鍗氶梺鍨儑椤╂煡鎮楅敐鍌涙珕妞ゆ劘濮ら〃銉╂倷閹绘帩鏆㈤梺鐑╁墲閸ㄧ敻顢氶妷鈺佸窛妞ゆ牗绮嶇亸婵嬫⒑?
   */
  async publishAndWait<T, R = any>(
    eventName: string,
    data: T,
    timeout?: number,
    options?: EventPublishOptions,
  ): Promise<R | null> {
    const correlationId = options?.correlationId || this.generateEventId();
    const responseEventName = options?.responseEventName || `${eventName}.response`;
    const waitTimeout = timeout ?? this.configService?.get<number>('EVENTBUS_WAIT_TIMEOUT', 30000) ?? 30000;

    return new Promise<R | null>((resolve, reject) => {
      let settled = false;

      const unsubscribe = this.subscribe<IEvent<R>>(responseEventName, async (responseEvent) => {
        const responseCorrelationId = this.getCorrelationId(responseEvent);
        if (!responseCorrelationId || responseCorrelationId !== correlationId) {
          return;
        }
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        unsubscribe();
        resolve(responseEvent.data ?? null);
      });

      const timeoutId =
        waitTimeout > 0
          ? setTimeout(() => {
              if (settled) return;
              settled = true;
              unsubscribe();
              reject(new Error(`Event ${eventName} timeout after ${waitTimeout}ms`));
            }, waitTimeout)
          : null;

      const publishOptions: EventPublishOptions = {
        ...options,
        correlationId,
        metadata: {
          ...options?.metadata,
          correlationId,
          responseEventName,
        },
      };

      this.publish(eventName, data, publishOptions).catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        unsubscribe();
        reject(error);
      });
    });
  }
  /**
   * 闂佽崵濮抽梽宥夊垂閽樺）锝夊礋椤掑偆娲搁柣搴岛閺呮粓顢?
   */
  subscribe<T extends IEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
    options?: EventSubscribeOptions,
  ): () => void {
    const subscriptionId = Symbol(`subscription_${eventName}`);

    const wrappedHandler = async (event: T) => {
      // 閹煎瓨姊婚弫銈嗘交閸ャ劍濮㈤柛?
      if (options?.filter && !options.filter(event)) {
        return;
      }

      const execute = async (): Promise<void> => {
        const startTime = Date.now();
        try {
          await handler(event);

          this.stats.totalProcessed++;

          // 閻犱焦婢樼紞宥嗗緞閸曨厽鍊為柡鍐ㄧ埣濡?
          const processingTime = Date.now() - startTime;
          this.processingTimes.push(processingTime);
          if (this.processingTimes.length > 100) {
            this.processingTimes.shift();
          }
        } catch (error) {
          this.stats.totalFailed++;
          this.logger.error(`Event handler error for ${eventName}:`, error);

          // 闂佹彃绉烽惁顖炴焻閺勫繒甯?
          if (options?.maxRetries && options.maxRetries > 0) {
            await this.retryHandler(eventName, handler, event, options);
          }
        }
      };

      if (options?.async) {
        setImmediate(() => {
          void execute();
        });
        return;
      }

      await execute();
    };
    this.eventEmitter.on(eventName, wrappedHandler);
    this.subscriptions.set(subscriptionId, eventName);
    this.stats.subscriptionCount = this.subscriptions.size;

    // 闂佸搫顦弲婊堝蓟閵娿儍娲冀椤撶偟鐓戦梺鍝勭Р閸斿骸鏆╅梺鑽ゅС闂勫秹宕归挊澹╋綁宕熼娑樺壄闂佸憡娲﹂崑鍕掗幇鐗堢厸?
    return () => {
      this.eventEmitter.off(eventName, wrappedHandler);
      this.subscriptions.delete(subscriptionId);
      this.stats.subscriptionCount = this.subscriptions.size;
    };
  }

  /**
   * 闂佽崵濮抽梽宥夊垂閽樺）锝夊礋椤掑偆娲搁柣搴岛閺呮粓顢曟禒瀣叆婵炴垶顭囨晶鏇㈡煕閳轰焦顥㈢€规洏鍎遍濂稿幢濡厧骞嶆繝鐢靛仜椤︽澘煤閳哄啯顫曟繝闈涱儐閸嬨劑鏌曟繛鍨偓妤呮嚌妤ｅ啯鐓曢煫鍥ㄦ礀鐢埖銇勯弮鈧崝娆撳极?
   */
  on<T extends IEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
    options?: EventSubscribeOptions,
  ): () => void {
    return this.subscribe(eventName, handler, options);
  }

  /**
   * 闂佽崵濮抽梽宥夊垂閽樺）锝夊礋椤掑偆娲搁柣搴岛閺呮粓顢曟禒瀣叆婵炴垶蓱閸旂剭servable 闂備礁鎼崐濠氬箠閹捐埖顫曢柨鐔哄У閺?
   */
  subscribeAsObservable<T extends IEvent>(
    eventName: string,
    options?: { filter?: (event: IEvent) => boolean },
  ): Observable<T> {
    if (!this.eventSubjects.has(eventName)) {
      const subject = new Subject<IEvent>();
      this.eventSubjects.set(eventName, subject);

      // 闂佸搫顦弲婵嬪磻閻愬灚鏆滈悗娑欘焽椤╂煡鎮楅敐鍌涙珕妞ゆ劒绮欓弻娑樷枎閹邦剛浠撮梺姹囧妿婵炩偓鐎规洘濞婃俊鎼佸Ψ閵壯冨笓 subject
      this.eventEmitter.on(eventName, (event: IEvent) => {
        if (!options?.filter || options.filter(event)) {
          subject.next(event);
        }
      });
    }

    return this.eventSubjects.get(eventName)!.asObservable().pipe(
      filter(event => !options?.filter || options.filter(event)),
      map(event => event as T),
    );
  }

  /**
   * 闂備礁鎲￠悷锕傚垂閻㈢數鍗氶梺鍨儑椤╂煡鎮楅敐鍌涙珕妞ゆ劒绮欓弻?Observable
   */
  next<T>(eventName: string, data: T, options?: EventPublishOptions): void {
    const event = this.createEvent(eventName, data, options);
    const subject = this.eventSubjects.get(eventName);
    if (subject) {
      subject.next(event);
    }
  }

  /**
   * 闂備礁鎼悮顐﹀磿閹绢噮鏁嬫俊銈呮噹閸屻劑鏌涢埄鍐炬當闁芥垵顦湁婵犲﹤鍠氶崕搴㈢箾?
   */
  async queryEvents(options: EventQueryOptions): Promise<IEvent[]> {
    return this.eventStore.query(options);
  }

  /**
   * 闂備焦鎮堕崕鎶藉磻閻愬搫妫樺ù锝呮贡椤╂煡鎮楅敐鍌涙珕妞ゆ劒绮欓弻銊モ槈濡厧鈪遍梺杞伴檷閸婃牜绮嬪鍡樺劅婵犻潧鐗忓▓銈嗙箾鐎电鞋闁糕晜鐗犲畷娆撴寠婢跺棙鏁犻梺瑙勬緲婢у海绮?
   */
  async replayEvents(
    aggregateId: string,
    handler: (event: IEvent) => void | Promise<void>,
    options?: {
      aggregateType?: string;
      startTime?: number;
      endTime?: number;
    },
  ): Promise<number> {
    const events = await this.eventStore.query({
      aggregateId,
      aggregateType: options?.aggregateType,
      startTime: options?.startTime,
      endTime: options?.endTime,
      sortOrder: 'asc',
    });

    for (const event of events) {
      await handler(event);
    }

    return events.length;
  }

  /**
   * 闂備礁鍚嬮崕鎶藉床閼艰翰浜归柛銉ｅ妿椤╂煡鎮楅敐鍌涙珕妞ゆ劘濮ょ换娑氱礄閻樼數鐡樼紓浣介哺閻熲晠骞冩禒瀣╅柕鍫濇穿婢规ɑ绻涚€涙鐭婃い鎴濆閳诲酣濮€閻橆偅鏁犲銈嗙墬缁嬫捇鎮ラ柆宥嗙叆?
   */
  async getEventStream(
    aggregateId: string,
    aggregateType?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<IEvent[]> {
    return this.eventStore.query({
      aggregateId,
      aggregateType,
      limit: options?.limit,
      offset: options?.offset,
      sortOrder: 'asc',
    });
  }

  /**
   * 闂備礁鍚嬮崕鎶藉床閼艰翰浜归柛銉㈡櫇绾惧ジ鏌ｉ弮鈧鍧楀触閳ь剚绻涢敐鍛闁告挻绻冪€?
   */
  getStats(): EventBusStats {
    this.stats.storedEventCount = this.eventStore.size();
    return { ...this.stats };
  }

  /**
   * 闂傚倷鐒﹁ぐ鍐矓閸洘鍋柛鈩冪懅绾惧ジ鏌ｉ弮鈧鍧楀触閳?
   */
  resetStats(): void {
    Object.assign(this.stats, {
      totalPublished: 0,
      totalProcessed: 0,
      totalFailed: 0,
      subscriptionCount: 0,
      storedEventCount: 0,
      averageProcessingTime: 0,
    });
    this.processingTimes.length = 0;
  }

  /**
   * 婵犵數鍋為幐鎼佸箠濡　鏋嶉幖娣灮椤╂煡鎮楅敐鍌涙珕妞?
   */
  async clearEvents(aggregateId?: string): Promise<void> {
    await this.eventStore.clear(aggregateId);
  }

  /**
   * 闂備礁鎲＄敮妤冪矙閹寸姷纾介柟鎯ь嚟椤╂煡鎮楅敐鍌涙珕妞?
   */
  protected createEvent<T>(
    eventName: string,
    data: T,
    options?: EventPublishOptions,
  ): IEvent<T> {
    const metadata: Record<string, any> | undefined = options?.correlationId
      ? {
          ...options?.metadata,
          correlationId: options.correlationId,
        }
      : options?.metadata;

    return {
      eventName,
      data,
      timestamp: Date.now(),
      eventId: this.generateEventId(),
      source: options?.source ?? this.sourceId,
      version: options?.version,
      metadata,
    };
  }

  protected getCorrelationId(event: IEvent): string | null {
    const metadataCorrelationId = event.metadata?.correlationId;
    if (typeof metadataCorrelationId === 'string' && metadataCorrelationId.length > 0) {
      return metadataCorrelationId;
    }

    if (
      event.data &&
      typeof event.data === 'object' &&
      !Array.isArray(event.data) &&
      'correlationId' in (event.data as Record<string, unknown>)
    ) {
      const dataCorrelationId = (event.data as Record<string, unknown>).correlationId;
      if (typeof dataCorrelationId === 'string' && dataCorrelationId.length > 0) {
        return dataCorrelationId;
      }
    }

    return null;
  }
  /**
   * 闂備礁鎲￠悷锕傚垂閻㈢數鍗氶柣鎴ｆ鐎氬銇勯幒鍡椾壕濠电姭鍋撻悗娑欘焽椤╂煡鎮楅敐鍌涙珕妞?
   */
  protected async publishLocal(event: IEvent, options?: EventPublishOptions): Promise<void> {
    if (options?.delay) {
      setTimeout(() => {
        this.eventEmitter.emit(event.eventName, event);
      }, options.delay);
    } else {
      this.eventEmitter.emit(event.eventName, event);
    }
  }

  /**
   * 婵°倗濮烽崑鐐碘偓绗涘洤绠伴弶鍫涘妿椤╂煡鎮楅敐鍌涙珕妞ゆ劒绮欓弻娑㈠箳閹惧鍑￠梺鍛婄懅閸嬫挾绮嬮幒妤€鍐€妞ゆ巻鍋撻摶锟犳⒑?
   */
  protected async broadcastEvent(event: IEvent, options?: EventPublishOptions): Promise<void> {
    if (!this.redisService) return;

    const channel = `${this.prefix}:broadcast:${event.eventName}`;
    if (options?.ttl) {
      const client = this.redisService.getClient();
      await client.publish(channel, JSON.stringify(event));
    } else {
      await this.redisService.publish(channel, event);
    }
  }

  /**
   * 闂備礁缍婇弲鎻掝渻閹烘梻涓嶆繛鍡樻尭缁€宀勬煛瀹ュ繐顩柣銊﹀灥闇?
   */
  protected async persistEvent(event: IEvent): Promise<void> {
    await this.eventStore.save(event);

    // 闂傚倸鍊哥€氼參宕濋弴銏犳槬婵°倕鍟犻崑鎾斥槈濞咁収浜畷鎴濐吋婢跺﹥鐎繛鏉戝悑濞兼瑥鈻?
    const storedEventCount = this.eventStore.size();
    if (storedEventCount > this.maxStoredEvents) {
      // 闂備礁鎲＄敮鐐寸箾閳ь剚绻涢崨顓㈠弰鐎殿喚鏁婚崺鈧い鎺戝缁秹鏌嶉崫鍕殲闁伙絽宕湁婵犲﹤鍠氶崕搴㈢箾?
      const oldEvents = await this.eventStore.query({
        limit: storedEventCount - this.maxStoredEvents,
        sortOrder: 'asc',
      });
      for (const oldEvent of oldEvents) {
        await this.eventStore.delete(oldEvent.eventId);
      }
    }
  }

  /**
   * 闂佽崵濮崇粈浣规櫠娴犲鍋柛鈩冪☉缁€鍡涙煕閳╁喚娈樻い蹇擃嚟閳ь剚顔栭崰鏍崲鐎ｎ剝濮抽柕濠忓椤╃兘鏌熼鐐蹭喊闁告艾鍊垮?
   */
  protected setupDistributedEvents(): void {
    if (!this.redisService) return;

    const channel = `${this.prefix}:broadcast:*`;
    
    this.redisService.subscribe(channel, async (message) => {
      try {
        const event = JSON.parse(message) as IEvent;
        // 闂傚倷绶￠崜娆撴倶濠靛鍌ㄩ柕鍫濐槹閻撳倻鈧箍鍎遍幏瀣ｇ拠宸唵閻犲搫鎼顐︽煙椤旂》韬€殿喚鏁婚、妤呭焵椤掆偓閿曘垻鈧稒顭囬々鏌ユ倵閿濆倹娅嗘い?
        if (event.source === this.sourceId) {
          return;
        }
        this.eventEmitter.emit(event.eventName, event);
      } catch (error) {
        this.logger.error(`Failed to process distributed event:`, error);
      }
    });
  }

  /**
   * 闂傚倷鐒﹁ぐ鍐矓閻戣姤鍎婃い鏍ㄧ☉缁剁偤鏌涢弴銊ュ箺闁稿﹦鍋ら弻?
   */
  protected async retryHandler<T extends IEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
    event: T,
    options: EventSubscribeOptions,
  ): Promise<void> {
    const maxRetries = options.maxRetries || 3;
    const retryInterval = options.retryInterval || 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.sleep(retryInterval * Math.pow(2, i));
        await handler(event);
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          this.logger.error(`Event handler failed after ${maxRetries} retries:`, error);
        }
      }
    }
  }

  /**
   * 闂備焦鐪归崹濠氬窗閹版澘鍨傛慨姗嗗幘椤╂煡鎮楅敐鍌涙珕妞?ID
   */
  protected generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 闂備焦鐪归崹濠氬窗閹版澘鍨傛慨妯挎硾缁狙囨煏婢舵稑顩柣?ID
   */
  protected generateSourceId(): string {
    return `src_${process.pid || 'unknown'}_${Date.now()}`;
  }

  /**
   * 闂備礁鎼ú銈夋偤閵娾晛钃熷┑鐘插绾惧ジ鏌ｉ弮鈧鍧楀触閳?
   */
  protected updateStats(): void {
    if (this.processingTimes.length > 0) {
      const total = this.processingTimes.reduce((a, b) => a + b, 0);
      this.stats.averageProcessingTime = total / this.processingTimes.length;
    }
  }

  /**
   * 濠电偞娼欓崥瀣垂閻熷府鑰?
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪灪閸熸垿鏌涘☉娆戞殬闁稿锕㈤弻?
 */
export function OnEvent(eventName: string, options?: EventSubscribeOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalHandler = descriptor.value;

    // 闂佽瀛╃粙鎺楁晪闂佺顑呯粔鐟扮暦濡ゅ懎绀冮柍鍝勫€归宥夋⒑绾拋鍤冮柛鐘虫礃缁傚秹骞掗幘鍓佹嚌闂佸壊鐓堥崰妤呯叕椤掍椒绻嗘い鏍ㄣ仜閸嬫捇鎼归顫樊闂備礁鎲＄敮妤冩崲閸岀儑缍栭柟鐗堟緲缁€宀勬煛瀹ュ啫濡芥い蟻鍕濠㈣泛鐗嗘俊濂告煕?
    const metadata = Reflect.getMetadata('events', target.constructor) || [];
    metadata.push({ eventName, handler: originalHandler, options });
    Reflect.defineMetadata('events', metadata, target.constructor);
  };
}

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪灮鐏忕敻鎮归崶顏勭毢闁逞屽墰閸忔ê顕ｇ粙娆炬僵妞ゆ劑鍩勫ú顓㈡⒑閹稿海鈽夐柣妤€绻樺顐﹀Χ閸℃瑯娲搁柟鑲╄ˉ閳ь剝娅曢崐顖炴煟鎼粹剝璐℃繛鍛灮濡?
 */
export type EventType = string;

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇嬪灮鐏忕敻鎮归崶顏勭毢闁逞屽墴椤ユ捇寮鈧獮鏍ㄦ媴閸涘浠梻浣瑰缁嬫垿鎮ц箛娑樻瀬闁靛牆妫涢々鏌ュ箹缁厜鍋撻搹顐⑩偓顖炴煟鎼粹剝璐℃繛鍛灮濡?
 */
export const EventTypeConstants = {
  CUSTOM_EVENT: 'custom.event',
  ENTITY_CREATED: 'entity.created',
  ENTITY_UPDATED: 'entity.updated',
  ENTITY_DELETED: 'entity.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_RECEIVED: 'message.received',
  // IoT 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋?
  AUDIO_DATA_RECEIVED: 'audio.data.received',
  AUDIO_PLAYBACK_COMPLETE: 'audio.playback.complete',
  AUDIO_TRANSCRIPTION_COMPLETE: 'audio.transcription.complete',
  VOICE_COMMAND_DETECTED: 'voice.command.detected',
  DEVICE_CONNECTED: 'device.connected',
  DEVICE_DISCONNECTED: 'device.disconnected',
  DEVICE_STATUS_CHANGED: 'device.status.changed',
} as const;

/**
 * 濠电偛鐡ㄧ划宀勵敄閸曨偀鏋庨柕蹇娾偓鎰佸殼濠碘槅鍨伴幖顐ゆ暜閵壯呯＜闁绘瑦鐟ョ€氼喗绂嶉敐鍛?
 */
export enum EventPriority {
  LOW = 10,
  MEDIUM = 5,
  NORMAL = 5,
  HIGH = 1,
  CRITICAL = 0,
}
