
/**
 * Global Search Engine v2.1 (Okapi BM25 Implementation)
 * Provides best-in-class retrieval precision by normalizing term frequency vs document length.
 */

const k1 = 1.2; // Term Frequency Saturation
const b = 0.75; // Length Normalization

type DocID = string;

interface Document {
    id: DocID;
    tokens: string[];
    length: number;
    ref: any; 
    type: string; 
}

export class BM25Engine {
    private documents: Map<DocID, Document> = new Map();
    private invertedIndex: Map<string, DocID[]> = new Map();
    private avgdl: number = 0; 
    private idfCache: Map<string, number> = new Map();
    private dirty = false;

    public clear() {
        this.documents.clear();
        this.invertedIndex.clear();
        this.idfCache.clear();
        this.avgdl = 0;
        this.dirty = false;
    }

    public add(id: DocID, text: string, metadata: any) {
        if (!text) return;
        
        const tokens = this.tokenize(text);
        const doc: Document = {
            id,
            tokens,
            length: tokens.length,
            ref: metadata,
            type: metadata.type
        };

        this.documents.set(id, doc);
        tokens.forEach(t => {
            if (!this.invertedIndex.has(t)) this.invertedIndex.set(t, []);
            this.invertedIndex.get(t)!.push(id);
        });

        this.dirty = true;
    }

    public search<T>(query: string): T[] {
        if (!query.trim()) return [];
        if (this.dirty) this.recalculateStats();

        const queryTokens = this.tokenize(query);
        const scores = new Map<DocID, number>();

        queryTokens.forEach(qTerm => {
            const idf = this.getIDF(qTerm);
            const docList = this.invertedIndex.get(qTerm) || [];

            docList.forEach(docId => {
                const doc = this.documents.get(docId);
                if (!doc) return;

                const tf = this.getTF(qTerm, doc);
                const score = idf * ( (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc.length / this.avgdl))) );
                scores.set(docId, (scores.get(docId) || 0) + score);
            });
        });

        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([docId]) => this.documents.get(docId)!.ref);
    }

    private tokenize(text: string): string[] {
        const str = text.toLowerCase();
        const cjkRegex = /[\u4e00-\u9fa5]/g;
        const tokens: string[] = [];
        
        const latinWords = str.split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/).filter(w => w.length > 0);
        tokens.push(...latinWords);

        if (cjkRegex.test(str)) {
            for (let i = 0; i < str.length; i++) {
                if (cjkRegex.test(str[i])) {
                    tokens.push(str[i]); 
                    if (i < str.length - 1 && cjkRegex.test(str[i+1])) {
                        tokens.push(str.slice(i, i+2)); 
                    }
                }
            }
        }
        return tokens;
    }

    private recalculateStats() {
        let totalLen = 0;
        this.documents.forEach(doc => totalLen += doc.length);
        this.avgdl = totalLen / Math.max(1, this.documents.size);
        this.idfCache.clear();
        this.dirty = false;
    }

    private getIDF(term: string): number {
        if (this.idfCache.has(term)) return this.idfCache.get(term)!;
        const N = this.documents.size;
        const n_q = new Set(this.invertedIndex.get(term) || []).size; 
        const idf = Math.log( (N - n_q + 0.5) / (n_q + 0.5) + 1 );
        this.idfCache.set(term, idf);
        return idf;
    }

    private getTF(term: string, doc: Document): number {
        return doc.tokens.filter(t => t === term).length;
    }
}

export const GlobalSearchEngine = new BM25Engine();
