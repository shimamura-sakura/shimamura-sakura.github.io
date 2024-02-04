'use strict';
const e_textplain = document.getElementById('text_plain');
document.getElementById('btn_tryparse').addEventListener('click', function () {
    const plain = e_textplain.value;
    /*
     * 喵微奈雅_AliceElysion
     * 取关请双别无痕感谢，转发机器，偶尔发点儿童画！Ace。
     * http://weibo.com/u/5994525714 (From com.caij.see.SeeApplication) 
     *
     * link: "http://weibo.com/u/5994525714" tag: "喵微奈雅_AliceElysion"
    */
    if (plain.indexOf('com.caij.see.SeeApplication') != -1) {
        const tag = plain.split('\n');
        const link = plain.match(/weibo.com\/u\/\d+/);
        if (tag.length >= 2 && link)
            return fillForm(link[0], tag[0]);
    }
    /*
     * 轻松不上头的个人空间-分享自哔哩哔哩 https://b23.tv/sU7d4rE
     *
     * link: "https://space.bilibili.com/1940481353" tag: "轻松不上头"
     */
    if (plain.indexOf('个人空间') != -1 && plain.indexOf('分享自哔哩哔哩') != -1) {
        const tag = plain.split('的个人空间');
        const link = plain.match(/b23\.tv\/.+/);
        const tryReal = plain.match(/space\.bilibili\.com\/\d+/);
        if (tag.length >= 2 && tryReal)
            return fillForm(tryReal[0], tag[0]);
        if (tag.length >= 2 && link) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `https://${link[0]}`, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == xhr.DONE) {
                    const url = new URL(xhr.responseURL);
                    if (url.hostname == 'm.bilibili.com' && url.pathname.startsWith('/space/'))
                        return fillForm(`space.bilibili.com/${url.pathname.replace('/space/', '')}`, tag[0]);
                    if (url.hostname == 'space.bilibili.com')
                        return fillForm(`${url.hostname}${url.pathname}`, tag[0]);
                    alert('should be unreachable');
                }
            };
            xhr.onerror = () => alert('b23.tv request failed');
            xhr.send();
            return;
        }
    }
    alert('no parser handled');
});
let g_linkData = {};
const e_inputlink = document.getElementById('input_link');
const e_inputtags = document.getElementById('input_tags');
document.getElementById('btn_formclear').addEventListener('click', function () {
    e_inputlink.value = '';
    e_inputtags.value = '';
});
const e_tablesave = document.getElementById('table_saved');
function fillForm(link, tag) {
    e_inputlink.value = link;
    e_inputtags.value = tag;
}
function recreateTableItems() {
    for (const e of Array.from(e_tablesave.children))
        e_tablesave.removeChild(e);
    for (const link of Object.getOwnPropertyNames(g_linkData).sort()) {
        const tr = e_tablesave.appendChild(document.createElement('tr'));
        const tdLink = tr.appendChild(document.createElement('td'));
        const tdTags = tr.appendChild(document.createElement('td'));
        const tdDels = tr.appendChild(document.createElement('td'));
        const btnDel = tdDels.appendChild(document.createElement('button'));
        tdLink.innerHTML = `<a href="${link}" target="_blank">${link}</a>`;
        tdTags.innerText = g_linkData[link].join(', ');
        btnDel.innerText = 'DELETE';
        btnDel.onclick = () => {
            fillForm(link, g_linkData[link].join(', '));
            delete g_linkData[link];
            saveToStorage();
            recreateTableItems();
        };
    }
}
function loadFromStorage() {
    g_linkData = JSON.parse(localStorage.getItem('linkSaver') || '{}');
}
function saveToStorage() {
    localStorage.setItem('linkSaver', JSON.stringify(g_linkData));
}
document.getElementById('btn_save').addEventListener('click', function () {
    let link = e_inputlink.value;
    const tags = e_inputtags.value.replace(/[ \r\n\t\f\v]/g, '').split(',');
    if (link.length == 0 || tags.length == 0) return;
    if (!(link.startsWith('http://') || link.startsWith('https://')))
        link = 'https://' + link;
    if (link in g_linkData)
        for (const oldtag of g_linkData[link])
            if (tags.indexOf(oldtag) == -1)
                tags.push(oldtag);
    g_linkData[link] = tags.sort();
    saveToStorage();
    recreateTableItems();
});
loadFromStorage();
recreateTableItems();