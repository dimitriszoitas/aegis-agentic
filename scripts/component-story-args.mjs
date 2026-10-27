import ts from 'typescript';

/** Source evidence of editable args consumption, not a claim that every prop is forwarded. */
export function supportsStoryArgs(story, meta, checker) {
  const resolve = (input, seen = new Set()) => {
    let node = input;
    while (
      node &&
      (ts.isAsExpression(node) ||
        ts.isSatisfiesExpression(node) ||
        ts.isParenthesizedExpression(node))
    )
      node = node.expression;
    if (node && ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (symbol && !seen.has(symbol)) {
        seen.add(symbol);
        const declaration = symbol.valueDeclaration;
        if (declaration && ts.isVariableDeclaration(declaration))
          return resolve(declaration.initializer, seen);
        if (declaration && ts.isFunctionDeclaration(declaration)) return declaration;
      }
    }
    return node;
  };
  const property = (input, name, seen = new Set()) => {
    const object = resolve(input);
    if (!object || !ts.isObjectLiteralExpression(object) || seen.has(object)) return undefined;
    seen.add(object);
    for (const prop of [...object.properties].reverse()) {
      if (ts.isSpreadAssignment(prop)) {
        const inherited = property(prop.expression, name, seen);
        if (inherited) return inherited;
      } else if (prop.name?.getText().replace(/^['"]|['"]$/g, '') === name) {
        if (ts.isPropertyAssignment(prop)) return prop.initializer;
        if (ts.isShorthandPropertyAssignment(prop)) return prop.name;
        if (ts.isMethodDeclaration(prop)) return prop;
      }
    }
    return undefined;
  };
  const render = resolve(property(story, 'render') ?? property(meta, 'render'));
  if (!render) return Boolean(property(meta, 'component'));
  if (!(
    ts.isArrowFunction(render) ||
    ts.isFunctionExpression(render) ||
    ts.isFunctionDeclaration(render) ||
    ts.isMethodDeclaration(render)
  ))
    return false;
  const parameter = render.parameters[0];
  if (!parameter || !render.body) return false;
  const symbols = new Set();
  const callback = (name) => /^on[A-Z]/.test(name);
  const bindings = (name, propertyName) => {
    if (propertyName && callback(propertyName)) return;
    if (ts.isIdentifier(name)) {
      const symbol = checker.getSymbolAtLocation(name);
      if (symbol) symbols.add(symbol);
    } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements)
        if (ts.isBindingElement(element))
          bindings(
            element.name,
            propertyName ??
              (element.dotDotDotToken
                ? undefined
                : (element.propertyName ?? element.name).getText().replace(/^['"]|['"]$/g, '')),
          );
    }
  };
  bindings(parameter.name);
  let used = false;
  const visit = (node) => {
    if (ts.isIdentifier(node) && symbols.has(checker.getSymbolAtLocation(node))) {
      const parent = node.parent;
      const accessed =
        ts.isPropertyAccessExpression(parent) && parent.expression === node
          ? parent.name.text
          : ts.isElementAccessExpression(parent) &&
              parent.expression === node &&
              ts.isStringLiteralLike(parent.argumentExpression)
            ? parent.argumentExpression.text
            : undefined;
      // Wiring only an action spy does not make the component's visual props editable.
      if (!accessed || !callback(accessed)) used = true;
    }
    if (!used) ts.forEachChild(node, visit);
  };
  visit(render.body);
  return used;
}
