import { StreamLanguage, type StreamParser, type StringStream } from '@codemirror/language';

interface SourceState {
  quote: string | null;
  blockComment: boolean;
}

function quotedToken(stream: StringStream, state: SourceState, sql: boolean): string {
  const quote = state.quote!;
  while (!stream.eol()) {
    if (stream.match(quote)) {
      if (sql && stream.match(quote)) continue;
      state.quote = null;
      break;
    }
    if (stream.next() === '\\' && !sql) stream.next();
  }
  if (quote.length === 1 && !sql) state.quote = null;
  return 'string';
}

function sourceParser(sql: boolean): StreamParser<SourceState> {
  const keywords = sql
    ? /^(?:select|from|where|and|or|not|as|join|left|right|inner|outer|on|group|by|having|order|asc|desc|limit|offset|union|all|distinct|case|when|then|else|end|is|in|like|between|exists|with|over|partition|interval|minutes|hours|days|insert|into|values|update|set|delete|create|table|cast)\b/i
    : /^(?:def|class|return|if|elif|else|for|while|in|is|not|and|or|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|async|await|global|nonlocal|assert|del)\b/;
  return {
    name: sql ? 'sql' : 'python',
    startState: () => ({ quote: null, blockComment: false }),
    token(stream, state) {
      if (state.blockComment) {
        while (!stream.eol()) {
          if (stream.match('*/')) {
            state.blockComment = false;
            break;
          }
          stream.next();
        }
        return 'comment';
      }
      if (state.quote) return quotedToken(stream, state, sql);
      if (stream.eatSpace()) return null;
      if (stream.match(sql ? '--' : '#')) {
        stream.skipToEnd();
        return 'comment';
      }
      if (sql && stream.match('/*')) {
        state.blockComment = true;
        return 'comment';
      }
      if (!sql && (stream.match('"""') || stream.match("'''"))) {
        state.quote = stream.current();
        return quotedToken(stream, state, sql);
      }
      if (stream.match(sql ? /^['"`]/ : /^(?:[rubf]{0,2})['"]/i)) {
        state.quote = stream.current().slice(-1);
        return quotedToken(stream, state, sql);
      }
      if (stream.match(keywords)) return 'keyword';
      if (stream.match(sql ? /^(?:null|true|false)\b/i : /^(?:None|True|False)\b/)) return 'bool';
      if (stream.match(/^(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/i)) return 'number';
      if (stream.match(/^[\w$]+/)) {
        return stream.match(/^\s*\(/, false) ? 'typeName' : 'propertyName';
      }
      if (stream.match(/^[+*/%=<>!|&^~:-]+/)) return 'operator';
      stream.next();
      return 'punctuation';
    },
    languageData: {
      commentTokens: sql ? { line: '--', block: { open: '/*', close: '*/' } } : { line: '#' },
    },
  };
}

export const sqlLanguage = StreamLanguage.define(sourceParser(true));
export const pythonLanguage = StreamLanguage.define(sourceParser(false));
