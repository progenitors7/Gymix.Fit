import test from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness, nodes, textContent } from './ui-harness.mjs';

const mocks = { useScroll: () => ({ scrollYProgress: 0 }), useTransform: () => 0, useReducedMotion: () => true };
test('pricing compares rounded monthly equivalents while retaining full upfront charges and correct savings', async () => {
  const ui = await uiHarness('src/pages/LandingPricing.jsx', mocks, 'LandingPricing');
  let tree = ui.render({ members: 150 });
  const plans = nodes(tree, n => n.type === 'article');
  assert.match(textContent(plans[0]), /₹599/);
  assert.match(textContent(plans[1]), /₹500/);
  assert.match(textContent(plans[2]), /₹385/);
  assert.match(textContent(plans[2]), /₹4,999 paid upfront for 13 months/);
  assert.match(textContent(plans[1]), /Save ₹298/);
  assert.match(textContent(plans[2]), /Save ₹2,788/);
  nodes(tree, n => n.type === 'button' && textContent(n) === 'Total payable')[0].props.onClick();
  tree = ui.render({ members: 150 });
  assert.match(textContent(nodes(tree, n => n.props?.className === 'gx-plan-amount')[2]), /₹4,999/);
  assert.equal(nodes(tree, n => n.props?.to === '/signup?role=owner&plan=12').length, 1);
});

test('per-member comparison uses selected duration and shared member count', async () => {
  const changed = [];
  const ui = await uiHarness('src/pages/LandingPricing.jsx', mocks, 'LandingPricing');
  let tree = ui.render({ members: 150, onMembersChange: value => changed.push(value) });
  assert.match(textContent(nodes(tree, n => n.props?.className === 'gx-per-member')[0]), /₹2.56/);
  nodes(tree, n => n.props?.id === 'pricing-members')[0].props.onChange({ target: { value: '300' } });
  assert.deepEqual(changed, [300]);
  tree = ui.render({ members: 300 });
  assert.match(textContent(nodes(tree, n => n.props?.className === 'gx-per-member')[0]), /₹1.28/);
  nodes(tree, n => n.props?.id === 'cost-plan')[0].props.onChange({ target: { value: '1' } });
  tree = ui.render({ members: 300 });
  assert.match(textContent(nodes(tree, n => n.props?.className === 'gx-per-member')[0]), /₹2.00/);
});
