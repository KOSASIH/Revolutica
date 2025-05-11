const request = require('supertest');
const { expect } = require('chai');

describe('API Server', () => {
  const server = 'http://localhost:3000';
  const apiKey = process.env.API_KEY || 'your-secret-api-key';

  it('should process BTC payment', async () => {
    const res = await request(server)
      .post('/process-payment')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        orderId: '123',
        amount: 100,
        crypto: 'BTC',
        chain: 'ethereum',
      });
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('SUCCESS');
    expect(res.body.transactionId).to.exist;
  });

  it('should process PI payment', async () => {
    const res = await request(server)
      .post('/process-payment')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        orderId: '123',
        amount: 1,
        crypto: 'PI',
        userUid: 'user_uid_123',
      });
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('SUCCESS');
    expect(res.body.paymentInfo.paymentId).to.exist;
  });
});
