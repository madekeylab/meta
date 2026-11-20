/* 한글 두벌식 조합. OS 입력기와 상관없이 누른 키 위치(KeyboardEvent.code)로 글자를 만든다 */

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const KEY = { q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ', a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ', z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ' };
const SHIFT = { q: 'ㅃ', w: 'ㅉ', e: 'ㄸ', r: 'ㄲ', t: 'ㅆ', o: 'ㅒ', p: 'ㅖ' };
const VV = { ㅗㅏ: 'ㅘ', ㅗㅐ: 'ㅙ', ㅗㅣ: 'ㅚ', ㅜㅓ: 'ㅝ', ㅜㅔ: 'ㅞ', ㅜㅣ: 'ㅟ', ㅡㅣ: 'ㅢ' };
const CC = { ㄱㅅ: 'ㄳ', ㄴㅈ: 'ㄵ', ㄴㅎ: 'ㄶ', ㄹㄱ: 'ㄺ', ㄹㅁ: 'ㄻ', ㄹㅂ: 'ㄼ', ㄹㅅ: 'ㄽ', ㄹㅌ: 'ㄾ', ㄹㅍ: 'ㄿ', ㄹㅎ: 'ㅀ', ㅂㅅ: 'ㅄ' };
const split = (map, v) => Object.keys(map).find((k) => map[k] === v) || null;

const PUNCT = { Space: ' ', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`' };
const PUNCT_S = { Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}', Backslash: '|', Semicolon: ':', Quote: '"', Comma: '<', Period: '>', Slash: '?', Backquote: '~' };
const DIGIT_S = ')!@#$%^&*(';

export function createHangul() {
  let done = ''; // 완성된 글
  let cho = '';
  let jung = '';
  let jong = '';
  let korean = true;

  const cur = () => {
    if (cho && jung) return String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong));
    return cho || jung;
  };
  const commit = () => {
    done += cur();
    cho = jung = jong = '';
  };

  function jamo(j) {
    if (JUNG.includes(j)) {
      if (cho && jung && jong) {
        // 받침이 다음 글자의 첫소리로 넘어간다
        const pair = split(CC, jong);
        const next = pair ? pair[1] : jong;
        jong = pair ? pair[0] : '';
        commit();
        cho = next;
        jung = j;
      } else if (jung) {
        if (VV[jung + j]) jung = VV[jung + j];
        else {
          commit();
          jung = j;
        }
      } else jung = j;
    } else if (cho && jung) {
      if (!jong && JONG.includes(j)) jong = j;
      else if (jong && CC[jong + j]) jong = CC[jong + j];
      else {
        commit();
        cho = j;
      }
    } else {
      if (cho || jung) commit();
      cho = j;
    }
  }

  return {
    get text() {
      return done + cur();
    },
    get korean() {
      return korean;
    },
    toggle() {
      commit();
      korean = !korean;
      return korean;
    },
    clear() {
      done = cho = jung = jong = '';
    },
    /* 키 하나를 누른 것으로 처리한다. 글자가 바뀌었으면 true */
    press(code, shift) {
      if (code === 'Backspace') {
        if (jong) jong = (split(CC, jong) || '')[0] || '';
        else if (jung) {
          const p = split(VV, jung);
          jung = p ? p[0] : '';
        } else if (cho) cho = '';
        else done = done.slice(0, -1);
        return true;
      }
      if (code === 'Enter') {
        commit();
        done += '\n';
        return true;
      }
      if (code.startsWith('Key')) {
        const k = code[3].toLowerCase();
        if (korean) jamo((shift && SHIFT[k]) || KEY[k]);
        else {
          commit();
          done += shift ? k.toUpperCase() : k;
        }
        return true;
      }
      let ch = null;
      if (code.startsWith('Digit')) ch = shift ? DIGIT_S[+code[5]] : code[5];
      else if (code in PUNCT) ch = shift && PUNCT_S[code] ? PUNCT_S[code] : PUNCT[code];
      if (ch == null) return false;
      commit();
      done += ch;
      return true;
    },
  };
}
