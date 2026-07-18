// Person 2: Responsible for blockchain read/write helper service methods.
async function sendTransaction() {
  return { success: true, message: 'Service placeholder' };
}

async function getTransactionReceipt() {
  return { success: true, message: 'Service placeholder' };
}

module.exports = {
  sendTransaction,
  getTransactionReceipt
};