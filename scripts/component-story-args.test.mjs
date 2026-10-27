import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { supportsStoryArgs } from './component-story-args.mjs';

function inspect(code) {
  const file = '/virtual/story.tsx';
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const host = ts.createCompilerHost({});
  host.getSourceFile = (name) => (name === file ? source : undefined);
  const program = ts.createProgram([file], { noLib: true, jsx: ts.JsxEmit.ReactJSX }, host);
  const variables = Object.fromEntries(
    source.statements
      .filter(ts.isVariableStatement)
      .flatMap((node) =>
        node.declarationList.declarations.map((item) => [item.name.getText(), item.initializer]),
      ),
  );
  return supportsStoryArgs(variables.story, variables.meta, program.getTypeChecker());
}
test('default component rendering consumes args', () =>
  assert.equal(
    inspect('const meta={component: Button}; const story={args:{disabled:true}};'),
    true,
  ));
test('a fixed matrix cannot advertise controls', () =>
  assert.equal(
    inspect('const meta={component: Button}; const story={render:()=> <Button/>};'),
    false,
  ));
test('referenced args and destructured args are supported', () => {
  assert.equal(
    inspect('const meta={component: Button}; const story={render:(args)=> <Button {...args}/>};'),
    true,
  );
  assert.equal(
    inspect(
      'const meta={component: Button}; const story={render:({size,...args})=> <Button size={size} {...args}/>};',
    ),
    true,
  );
});
test('unused or shadowed args do not falsely enable controls', () => {
  assert.equal(
    inspect('const meta={component: Button}; const story={render:(args)=> <Button/>};'),
    false,
  );
  assert.equal(
    inspect(
      'const meta={component: Button}; const story={render:(args)=> {const child=(args)=>args;return child(1)}};',
    ),
    false,
  );
});
test('callback-only fixtures do not advertise unrelated component controls', () => {
  for (const render of [
    '(args)=> <Navigation onSearch={args.onSearch}/>',
    '(args)=> <Navigation onSearch={args["onSearch"]}/>',
    '({onSearch})=> <Navigation onSearch={onSearch}/>',
    '({onSearch: search})=> <Navigation onSearch={search}/>',
  ])
    assert.equal(
      inspect(`const meta={component: Navigation}; const story={render:${render}};`),
      false,
    );
});
test('mixed callback and visual values or forwarded rest args remain editable', () => {
  for (const render of [
    '(args)=> <Navigation collapsed={args.collapsed} onSearch={args.onSearch}/>',
    '({onSearch,collapsed})=> <Navigation collapsed={collapsed} onSearch={onSearch}/>',
    '({onSearch,...args})=> <Navigation {...args} onSearch={onSearch}/>',
  ])
    assert.equal(
      inspect(`const meta={component: Navigation}; const story={render:${render}};`),
      true,
    );
});
test('resolves inherited and named render functions', () => {
  assert.equal(
    inspect(
      'function Render(args){return <Button {...args}/>};const meta={component: Button,render:Render}; const story={};',
    ),
    true,
  );
  assert.equal(
    inspect(
      'const meta={component: Button}; const fixed={render:()=> <Button/>};const story={...fixed};',
    ),
    false,
  );
  assert.equal(
    inspect(
      'const meta={component: Button}; const fixed={render:()=> <Button/>};const story={...fixed,render:(args)=><Button {...args}/>};',
    ),
    true,
  );
});
