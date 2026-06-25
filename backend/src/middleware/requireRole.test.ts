import { Response } from 'express';
import { requireRole } from './requireRole';
import { AuthRequest } from './auth';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('requireRole', () => {
  it('rejects requests with no authenticated user', () => {
    const req = {} as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a user whose role does not match', () => {
    const req = { user: { id: '1', email: 'a@b.com', role: 'mentor' } } as unknown as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a user whose role matches, used to gate mentor verification endpoints', () => {
    const req = { user: { id: '1', email: 'a@b.com', role: 'admin' } } as unknown as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
