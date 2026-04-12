import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DataExportService } from './data-export.service';

describe('DataExportService', () => {
  let service: DataExportService;
  let exportDir: string;

  beforeEach(() => {
    exportDir = mkdtempSync(path.join(tmpdir(), 'openchat-data-export-service-'));
    service = new DataExportService(
      {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'EXPORT_DIR') {
            return exportDir;
          }
          return defaultValue;
        }),
      } as unknown as ConfigService,
    );
  });

  afterEach(() => {
    rmSync(exportDir, { recursive: true, force: true });
  });

  it('writes a valid JSON array when streaming across multiple batches', async () => {
    async function* createRows(): AsyncGenerator<Record<string, number>> {
      for (let id = 1; id <= 1001; id++) {
        yield { id };
      }
    }

    const result = await service.exportStream(
      createRows(),
      {
        format: 'json',
        filename: 'stream-json',
      },
      'data-export-job-1',
    );

    const content = readFileSync(result.path, 'utf8');
    const parsed = JSON.parse(content) as Array<{ id: number }>;

    expect(parsed).toHaveLength(1001);
    expect(parsed[0]).toEqual({ id: 1 });
    expect(parsed[1000]).toEqual({ id: 1001 });
  });
});
