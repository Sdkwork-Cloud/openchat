import { ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from './global-exception.filter';
import { HttpErrorFilter } from './http-error.filter';

type MockHttpContext = {
  getRequest: jest.Mock<Request>;
  getResponse: jest.Mock<Response>;
};

function createHttpHost(request: Partial<Request>) {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const httpContext: MockHttpContext = {
    getRequest: jest.fn().mockReturnValue(request as Request),
    getResponse: jest.fn().mockReturnValue(response),
  };

  const host = {
    switchToHttp: jest.fn().mockReturnValue(httpContext),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('request path consistency in exception filters', () => {
  it('GlobalExceptionFilter should prefer originalUrl over rewritten request.url', () => {
    const filter = new GlobalExceptionFilter();
    const { host, response } = createHttpHost({
      headers: {},
      method: 'GET',
      url: '/auth/me',
      originalUrl: '/im/v3/auth/me',
    });

    filter.catch(new UnauthorizedException('Authentication failed'), host);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/im/v3/auth/me',
      }),
    );
  });

  it('HttpErrorFilter should prefer originalUrl over rewritten request.url', () => {
    const filter = new HttpErrorFilter();
    const { host, response } = createHttpHost({
      headers: {},
      method: 'GET',
      url: '/auth/me',
      originalUrl: '/im/v3/auth/me',
    });

    filter.catch(new UnauthorizedException('Authentication failed'), host);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/im/v3/auth/me',
      }),
    );
  });
});
