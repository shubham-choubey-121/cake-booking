import request from 'supertest';

jest.mock('../models/User', () => ({
  UserModel: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const mockedFindOne = jest.requireMock('../models/User').UserModel.findOne as jest.Mock;
const mockedCreate = jest.requireMock('../models/User').UserModel.create as jest.Mock;

describe('Auth routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid signup body', async () => {
    process.env.NODE_ENV = 'test';
    const { app } = await import('../server');

    const res = await request(app).post('/auth/signup').send({ email: 'bad-email', password: '123' });

    expect(res.status).toBe(400);
  });

  it('creates user for valid signup', async () => {
    process.env.NODE_ENV = 'test';
    const { app } = await import('../server');

    mockedFindOne.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ _id: 'u1', email: 'x@test.com', role: 'User' });

    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'x@test.com', password: '123456', role: 'User' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('x@test.com');
  });
});
