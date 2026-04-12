import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;
  let exportDir: string;

  beforeEach(() => {
    exportDir = mkdtempSync(path.join(tmpdir(), 'openchat-export-service-'));
    service = new ExportService(
      {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'EXPORT_DIR') {
            return exportDir;
          }
          return defaultValue;
        }),
      } as unknown as ConfigService,
    );
    service.onModuleInit();
  });

  afterEach(() => {
    rmSync(exportDir, { recursive: true, force: true });
    service.onModuleDestroy();
  });

  it('exports every row from a one-shot async iterable stream', async () => {
    async function* createRows(): AsyncGenerator<Record<string, string | number>> {
      yield { id: 1, name: 'Alice' };
      yield { id: 2, name: 'Bob' };
    }

    const result = await service.exportStream(
      createRows(),
      {
        format: 'csv',
        filename: 'stream-export.csv',
        fields: ['id', 'name'],
        batchSize: 1,
      },
      'export-job-1',
    );

    const content = readFileSync(result.filepath, 'utf8');

    expect(result.recordsCount).toBe(2);
    expect(content).toContain('id,name');
    expect(content).toContain('1,Alice');
    expect(content).toContain('2,Bob');
    expect(service.getProgress('export-job-1')).toEqual({
      total: 2,
      processed: 2,
      percentage: 100,
      status: 'completed',
    });
  });
});
