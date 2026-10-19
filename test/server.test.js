const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../server');

describe('Quick Vote App API Tests', () => {
  let createdSlug = '';

  it('should return health status 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('UP');
  });

  it('should return ready status 200', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('READY');
  });

  it('should create a new poll successfully', async () => {
    const res = await request(app)
      .post('/api/polls')
      .send({
        title: 'Test Poll',
        description: 'Testing unit tests',
        pin: '1234',
        options: ['Option A', 'Option B']
      });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('slug');
    createdSlug = res.body.slug;
  });

  it('should verify correct PIN', async () => {
    const res = await request(app)
      .post(`/api/polls/${createdSlug}/verify-pin`)
      .send({ pin: '1234' });
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
  });

  it('should fail on incorrect PIN', async () => {
    const res = await request(app)
      .post(`/api/polls/${createdSlug}/verify-pin`)
      .send({ pin: '9999' });
    expect(res.status).to.equal(401);
  });
});
