import request from 'supertest';

jest.mock('../utils/jwt', () => ({
  verifyAccessToken: jest.fn(() => ({
    userId: 'u1',
    email: 'user@test.com',
    role: 'User',
    type: 'access',
  })),
  verifyRefreshToken: jest.fn(),
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
}));

jest.mock('../models/Cake', () => ({
  CakeModel: {
    findById: jest.fn(),
  },
}));

jest.mock('../models/Booking', () => ({
  BookingModel: {
    create: jest.fn(),
  },
}));

const mockedCakeFindById = jest.requireMock('../models/Cake').CakeModel.findById as jest.Mock;

describe('Bookings routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-COD payment type', async () => {
    process.env.NODE_ENV = 'test';
    const { app } = await import('../server');

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', 'Bearer mock-access-token')
      .send({ cakeId: '507f1f77bcf86cd799439011', paymentType: 'CARD' });

    expect(res.status).toBe(400);
  });

  it('returns out of stock when stock is zero', async () => {
    process.env.NODE_ENV = 'test';
    const { app } = await import('../server');

    mockedCakeFindById.mockResolvedValue({ stock: 0 });

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', 'Bearer mock-access-token')
      .send({ cakeId: '507f1f77bcf86cd799439011', paymentType: 'COD' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/out of stock/i);
  });
});
