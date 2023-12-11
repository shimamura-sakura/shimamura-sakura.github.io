'use strict';

const D = document;
const B = D.body;
const I = D.getElementById('i');
const K = D.getElementById('k');
const A = D.getElementById('a');

const chks = [];
const Hkan = 'あいうえお,かきくけこ,さしすせそ,たちつてと,なにぬねの,はひふへほ,まみむめも,や-ゆ-よ,らりるれろ,わ---を,ん,がぎぐげご,ざじずぜぞ,だぢづでど,ばびぶべぼ,ぱぴぷぺぽ';
const Kkan = 'アイウエオ,カキクケコ,サシスセソ,タチツテト,ナニヌネノ,ハヒフヘホ,マミムメモ,ヤ-ユ-ヨ,ラリルレロ,ワ---ヲ,ン,ガギグゲゴ,ザジズゼゾ,ダヂヅデド,バビブベボ,パピプペポ';
const roma = 'a,i,u,e,o,ka,ki,ku,ke,ko,sa,si/shi,su,se,so,ta,ti/chi,tu/tsu,te,to,na,ni,nu,ne,no,ha,hi,fu/hu,he,ho,ma,mi,mu,me,mo,ya,yu,yo,ra,ri,ru,re,ro,wa,wo/o,n,'
    + 'ga,gi,gu,ge,go,za,zi/ji,zu,ze,zo,da,di/zi/ji,du/zu,de,do,ba,bi,bu,be,bo,pa,pi,pu,pe,po';
// const Yhkn = 'きゃ,きゅ,きょ;しゃ,しゅ,しょ;ちゃ,ちゅ,ちょ;にゃ,にゅ,にょ;ひゃ,ひゅ,ひょ;みゃ,みゅ,みょ;りゃ,りゅ,りょ';
// const Ykkn = 'キャ,キュ,キョ;シャ,シュ,ショ;チャ,チュ,チョ;ニャ,ニュ,ニョ;ヒャ,ヒュ,ヒョ;ミャ,ミュ,ミョ;リャ,リュ,リョ';
// const Yrom = 'kya,kyu,kyo,sha,shu,sho,cha,chu,cho,nya,nyu,nyo,hya,hyu,hyo,mya,myu,myi,rya,ryu,ryo';

function createList(all, kana, roma) {
    roma = Array.from(roma).reverse();
    for (const k of kana) {
        const lst = [];
        const btn = B.appendChild(D.createElement('button'));
        for (const r of k) {
            if (r == '-') continue;
            const label = B.appendChild(D.createElement('label'));
            label.textContent = r;
            const check = label.appendChild(D.createElement('input'));
            check.type = 'checkbox', check.checked = true;
            check.pair = [r, roma.pop().split('/').join(', ')];
            lst.push(check), all.push(check);
        }
        B.appendChild(D.createElement('br'));
        btn.textContent = 'Toggle';
        btn.onclick = function () { const b = !lst[0].checked; lst.forEach(c => c.checked = b); };
    }
}

let answered = true;

function newPuzzle() {
    answered = false, I.value = '', A.style.color = 'white';
    const list = chks.filter(c => c.checked).map(c => c.pair);
    const rand = Math.floor(Math.random() * list.length);
    list.push(['あ', ['a']]);
    [K.textContent, A.textContent] = list[rand];
}

document.getElementById('f').onsubmit = function (ev) {
    if (!answered) {
        answered = true;
        const ans = A.textContent.split(', ');
        const inp = I.value.toLowerCase().trim();
        if (ans.every(a => inp != a) /* wrong */) {
            A.style.color = 'red';
            setTimeout(newPuzzle, 2000);
        } else {
            A.style.color = 'green';
            setTimeout(newPuzzle, 200);
        }
    }
    return false;
};

B.appendChild(D.createElement('div')).textContent = 'Hiragana';
createList(chks, Hkan.split(','), roma.split(','));
// createList(chks, Yhkn.split(';').map(l => l.split(',')), Yrom.split(','));
B.appendChild(D.createElement('div')).textContent = 'Katakana';
createList(chks, Kkan.split(','), roma.split(','));
// createList(chks, Ykkn.split(';').map(l => l.split(',')), Yrom.split(','));
newPuzzle();