const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('n8n settlement workflow definition', () => {
  it('is importable as an active webhook workflow', () => {
    const workflowPath = path.join(__dirname, '..', '..', 'n8n', 'settlement-reconciliation-workflow.json');
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    expect(workflow.active).to.equal(true);
    const webhookNode = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.webhook');
    const respondNode = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.respondToWebhook');

    expect(webhookNode).to.exist;
    expect(webhookNode.parameters.path).to.equal('settlement-reconciliation');
    expect(webhookNode.parameters.responseMode).to.equal('responseNode');
    expect(respondNode).to.exist;
  });
});
