import { BadRequestException, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const run = (exception: unknown) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host: any = { switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ url: '/api/v1/x' }) }) };
    new HttpExceptionFilter().catch(exception, host);
    return { code: (status.mock.calls[0] as unknown[])[0], body: json.mock.calls[0][0] };
  };

  it('keeps the status and message of an HTTP exception', () => {
    const { code, body } = run(new BadRequestException('Loại phòng đã hết'));
    expect(code).toBe(400);
    expect(body.error.message).toBe('Loại phòng đã hết');
  });

  it('answers a malformed id with 400 instead of 500', () => {
    const cast = Object.assign(new Error('Cast to ObjectId failed for value "abc"'), { name: 'CastError' });
    const { code, body } = run(cast);
    expect(code).toBe(400);
    expect(JSON.stringify(body)).not.toContain('ObjectId');
  });

  it('hides internal details of unexpected errors from the client', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { code, body } = run(new Error('connect ECONNREFUSED mongodb://secret-host:27017'));
    expect(code).toBe(500);
    expect(body.error.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/secret-host|stack/);
  });
});
