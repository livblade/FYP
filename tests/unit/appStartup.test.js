const { expect } = require('chai');

describe('app startup resilience', () => {
  afterEach(() => {
    delete require.cache[require.resolve('../../app')];
    delete require.cache[require.resolve('../../config/database')];
    process.env.NODE_ENV = 'development';
  });

  it('starts the app in development mode even when database authentication fails', async () => {
    const db = require('../../config/database');
    const originalConnectDatabase = db.connectDatabase;
    db.connectDatabase = async () => {
      throw new Error('Access denied for user');
    };

    const appModule = require('../../app');
    const originalListen = appModule.app.listen;
    let listened = false;
    appModule.app.listen = () => {
      listened = true;
      return { close() {} };
    };

    try {
      const result = await appModule.startServer();
      expect(result).to.be.ok;
      expect(listened).to.equal(true);
    } finally {
      appModule.app.listen = originalListen;
      db.connectDatabase = originalConnectDatabase;
    }
  });
});
