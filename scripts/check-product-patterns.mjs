import { auditProductPatterns } from './product-pattern-policy.mjs';

const [policyPath = 'src/product/pattern-policy.json', root = '.'] = process.argv.slice(2);
const result = await auditProductPatterns({ root, policyPath });
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
