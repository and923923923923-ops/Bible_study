// 聖經書卷列表 (繁體)
const bibleBooks = ["創世記","出埃及記","利未記","民數記","申命記","約書亞記","士師記","路得記","撒母耳記上","撒母耳記下","列王紀上","列王紀下","歷代志上","歷代志下","以斯拉記","尼希米記","以斯帖記","約伯記","詩篇","箴言","傳道書","雅歌","以賽亞書","耶利米書","耶利米哀歌","以西結書","但以理書","何西阿書","約珥書","阿摩司書","俄巴底亞書","約拿書","彌迦書","那鴻書","哈巴谷書","西番雅書","哈該書","撒迦利亞書","瑪拉基書","馬太福音","馬可福音","路加福音","約翰福音","使徒行傳","羅馬書","哥林多前書","哥林多後書","加拉太書","以弗所書","腓立比書","歌羅西書","帖撒羅尼迦前書","帖撒羅尼迦後書","提摩太前書","提摩太後書","提多書","腓利門書","希伯來書","雅各書","彼得前書","彼得後書","約翰一書","約翰二書","約翰三書","猶大書","啟示錄"];
const defaultMaxChapters = { "創世記":50,"出埃及記":40,"利未記":27,"民數記":36,"申命記":34,"詩篇":150,"以賽亞書":66,"馬太福音":28,"啟示錄":22 };
function getMaxChapter(book) { return defaultMaxChapters[book] || 30; }

let currentBook = "創世記", currentChapter = 1;
let cacheCUV = {}, cacheKJV = {};
let strongDict = { H: {}, G: {} };
let notes = JSON.parse(localStorage.getItem("bible_notes")) || {};
let bookmarks = JSON.parse(localStorage.getItem("bible_bookmarks")) || [];
let currentSelectedRef = { book: "創世記", chapter: 1, verse: 1 };
let searchIndex = null;

// 英文書卷對映 (用於 API)
const bookMap = { "創世記":"Gen","出埃及記":"Exo","利未記":"Lev","民數記":"Num","申命記":"Deu","約書亞記":"Jos","士師記":"Jdg","路得記":"Rut","撒母耳記上":"1Sa","撒母耳記下":"2Sa","列王紀上":"1Ki","列王紀下":"2Ki","歷代志上":"1Ch","歷代志下":"2Ch","以斯拉記":"Ezr","尼希米記":"Neh","以斯帖記":"Est","約伯記":"Job","詩篇":"Psa","箴言":"Pro","傳道書":"Ecc","雅歌":"Sng","以賽亞書":"Isa","耶利米書":"Jer","耶利米哀歌":"Lam","以西結書":"Ezk","但以理書":"Dan","何西阿書":"Hos","約珥書":"Joe","阿摩司書":"Amo","俄巴底亞書":"Oba","約拿書":"Jon","彌迦書":"Mic","那鴻書":"Nah","哈巴谷書":"Hab","西番雅書":"Zep","哈該書":"Hag","撒迦利亞書":"Zec","瑪拉基書":"Mal","馬太福音":"Mat","馬可福音":"Mar","路加福音":"Luk","約翰福音":"Jhn","使徒行傳":"Act","羅馬書":"Rom","哥林多前書":"1Co","哥林多後書":"2Co","加拉太書":"Gal","以弗所書":"Eph","腓立比書":"Phi","歌羅西書":"Col","帖撒羅尼迦前書":"1Th","帖撒羅尼迦後書":"2Th","提摩太前書":"1Ti","提摩太後書":"2Ti","提多書":"Tit","腓利門書":"Phm","希伯來書":"Heb","雅各書":"Jas","彼得前書":"1Pe","彼得後書":"2Pe","約翰一書":"1Jn","約翰二書":"2Jn","約翰三書":"3Jn","猶大書":"Jud","啟示錄":"Rev" };

// 載入和合本 (使用信望愛 API)
async function loadCUV(book, chapter) {
    const eng = bookMap[book];
    if (!eng) return [];
    const url = `https://bible.fhl.net/json/onechap.php?eng=${eng}&chap=${chapter}&ver=cuv&strongflag=1`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.record && data.record.verses) {
            const verses = data.record.verses.map(v => ({ verse: v.verse, text: v.text }));
            cacheCUV[`${book}_${chapter}`] = verses;
            return verses;
        }
    } catch(e) { console.warn("CUV API error", e); }
    // fallback 內建創世記1~3章示範資料
    if (book === "創世記" && chapter <= 3) {
        const fallback = {
            1: [{verse:1, text:"起初，神<strong class='strong' data-strong='H430'>אֱלֹהִים</strong>創造天地。"},{verse:2,text:"地是空虛混沌，淵面黑暗；神的靈<strong class='strong' data-strong='H7307'>רוּחַ</strong>運行在水面上。"}],
            2: [{verse:1,text:"天地萬物都造齊了。"}],
            3: [{verse:1,text:"耶和華神所造的，惟有蛇比田野一切的活物更狡猾。"}]
        };
        const verses = fallback[chapter] || [{verse:1, text:"示範經文，請檢查網路後重新整理。"}];
        cacheCUV[`${book}_${chapter}`] = verses;
        return verses;
    }
    return [{verse:1, text:"無法載入經文，請檢查網路。"}];
}

// 載入 KJV (使用 bolls.life)
async function loadKJV(book, chapter) {
    const eng = bookMap[book];
    if (!eng) return [];
    const url = `https://bolls.life/api/en/KJV/${eng}/${chapter}`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (Array.isArray(data)) {
            const verses = data.map((text, idx) => ({ verse: idx+1, text: text }));
            cacheKJV[`${book}_${chapter}`] = verses;
            return verses;
        }
    } catch(e) { console.warn("KJV API error", e); }
    return [{verse:1, text:"KJV 暫時無法載入。"}];
}

// 渲染
function renderVerses(verses, containerId, isCuv=true) {
    const container = document.getElementById(containerId);
    if (!verses) return;
    let html = "";
    verses.forEach(v => {
        let text = v.text;
        if (isCuv) {
            text = text.replace(/<a href="strong\?([GH]\d+)">(.*?)<\/a>/gi, (m, strongNum, inner) => `<span class="strong" data-strong="${strongNum}">${inner}<sup>${strongNum}</sup></span>`);
        }
        const isSelected = (currentSelectedRef.book===currentBook && currentSelectedRef.chapter===currentChapter && currentSelectedRef.verse===v.verse);
        html += `<div class="verse-item ${isSelected ? 'selected-verse-highlight' : ''}" data-verse="${v.verse}">
                    <span class="verse-number" data-verse-num="${v.verse}">${v.verse}</span>
                    <div class="verse-text">${text}</div>
                 </div>`;
    });
    container.innerHTML = html;
    attachStrongEvents();
    attachVerseClickEvents(containerId);
}

function attachStrongEvents() {
    document.querySelectorAll(".strong").forEach(el => {
        el.onclick = (e) => { e.stopPropagation(); showLexicon(el.getAttribute("data-strong")); };
    });
}
function attachVerseClickEvents(containerId) {
    document.querySelectorAll(`#${containerId} .verse-number`).forEach(el => {
        el.onclick = () => selectVerse(parseInt(el.getAttribute("data-verse-num")));
    });
}
function selectVerse(verseNum) {
    currentSelectedRef = { book: currentBook, chapter: currentChapter, verse: verseNum };
    document.getElementById("currentVerseRef").innerHTML = `${currentBook} ${currentChapter}:${verseNum}`;
    loadNoteForVerse();
    refreshAllVerses();
}
function refreshAllVerses() {
    const cuv = cacheCUV[`${currentBook}_${currentChapter}`];
    const kjv = cacheKJV[`${currentBook}_${currentChapter}`];
    if (cuv) renderVerses(cuv, "cuvVerses", true);
    if (kjv) renderVerses(kjv, "kjvVerses", false);
}

async function loadChapter(book, chapter) {
    currentBook = book; currentChapter = chapter;
    const cuvVerses = await loadCUV(book, chapter);
    const kjvVerses = await loadKJV(book, chapter);
    renderVerses(cuvVerses, "cuvVerses", true);
    renderVerses(kjvVerses, "kjvVerses", false);
    updateLastRead(book, chapter);
    addToSearchIndex(book, chapter, cuvVerses, kjvVerses);
}

// Strong 詞典載入
async function loadStrongDict() {
    try {
        const [h, g] = await Promise.all([
            fetch("https://cdn.jsdelivr.net/gh/openscriptures/strongs/hebrew.json").then(r=>r.json()),
            fetch("https://cdn.jsdelivr.net/gh/openscriptures/strongs/greek.json").then(r=>r.json())
        ]);
        strongDict.H = h; strongDict.G = g;
    } catch(e) { console.warn("Strong dict failed"); }
}
function showLexicon(strongId) {
    const letter = strongId[0];
    const num = strongId.substring(1);
    const entry = strongDict[letter]?.[num];
    const content = entry ? `<div><strong>${strongId}</strong><br>原文：${entry.original||'-'}<br>字義：${entry.meaning||entry.def||'-'}<br>出現次數：${entry.occurrences||'-'}</div>` : `<div>未找到 ${strongId}</div>`;
    document.getElementById("lexiconContent").innerHTML = content;
    document.getElementById("lexiconDrawer").classList.add("open");
}

// 搜尋索引
function addToSearchIndex(book, chapter, cuvVerses, kjvVerses) {
    if (!searchIndex) searchIndex = new FlexSearch.Document({ document: { id: "id", index: ["text"], store: true } });
    if (cuvVerses) cuvVerses.forEach(v => {
        const id = `CUV_${book}_${chapter}_${v.verse}`;
        searchIndex.add({ id, text: v.text.replace(/<[^>]*>/g,''), version:"和合本", book, chapter, verse:v.verse });
    });
    if (kjvVerses) kjvVerses.forEach(v => {
        const id = `KJV_${book}_${chapter}_${v.verse}`;
        searchIndex.add({ id, text: v.text, version:"KJV", book, chapter, verse:v.verse });
    });
}
function searchAll(keyword) {
    if (!searchIndex || !keyword.trim()) return;
    const res = searchIndex.search(keyword, { limit: 30 });
    const resultDiv = document.getElementById("searchResult");
    if (!res.length) { resultDiv.innerHTML = "無結果"; return; }
    let html = "";
    res.forEach(r => r.result.forEach(doc => {
        html += `<div style="margin:6px 0; background:#f3e9dd; border-radius:20px; padding:8px;" onclick="jumpToRef('${doc.book} ${doc.chapter}:${doc.verse}')"><b>${doc.version} ${doc.book} ${doc.chapter}:${doc.verse}</b><br>${doc.text.substring(0,80)}...</div>`;
    }));
    resultDiv.innerHTML = html;
}
window.jumpToRef = function(ref) {
    const m = ref.match(/(.+?) (\d+):(\d+)/);
    if (m) {
        currentBook = m[1]; currentChapter = parseInt(m[2]); const verse = parseInt(m[3]);
        document.getElementById("bookSelect").value = currentBook;
        document.getElementById("chapterSelect").value = currentChapter;
        loadChapter(currentBook, currentChapter).then(() => selectVerse(verse));
    }
};

// 筆記書籤
function loadNoteForVerse() {
    const key = `${currentSelectedRef.book} ${currentSelectedRef.chapter}:${currentSelectedRef.verse}`;
    document.getElementById("noteContent").value = notes[key] || "";
}
function saveCurrentNote() {
    const key = `${currentSelectedRef.book} ${currentSelectedRef.chapter}:${currentSelectedRef.verse}`;
    const content = document.getElementById("noteContent").value;
    if (content) notes[key] = content; else delete notes[key];
    localStorage.setItem("bible_notes", JSON.stringify(notes));
    alert("筆記已儲存");
}
function addBookmark() {
    const ref = `${currentSelectedRef.book} ${currentSelectedRef.chapter}:${currentSelectedRef.verse}`;
    if (!bookmarks.includes(ref)) bookmarks.push(ref);
    localStorage.setItem("bible_bookmarks", JSON.stringify(bookmarks));
    refreshBookmarkList();
}
function refreshBookmarkList() {
    const div = document.getElementById("bookmarkList");
    if (!div) return;
    div.innerHTML = bookmarks.map(ref => `<div onclick="jumpToRef('${ref}')">📖 ${ref}</div>`).join("");
}
function updateLastRead(book, chapter) {
    const last = `${book} ${chapter}:1`;
    localStorage.setItem("lastRead", last);
    document.getElementById("progressLabel").innerHTML = `<i class="fas fa-history"></i> 上次：${last}`;
    document.getElementById("progressDetail").innerHTML = `<div>最近閱讀：${last}</div><div>筆記數：${Object.keys(notes).length}</div><div>書籤數：${bookmarks.length}</div>`;
}

// AI DeepSeek
let apiKey = localStorage.getItem("deepseek_key") || "";
document.getElementById("deepseekApiKey").value = apiKey;
document.getElementById("saveApiKeyBtn").onclick = () => {
    const newKey = document.getElementById("deepseekApiKey").value;
    localStorage.setItem("deepseek_key", newKey);
    apiKey = newKey;
    alert("API Key 已儲存");
};
document.getElementById("askAiBtn").onclick = async () => {
    const question = document.getElementById("aiQuestion").value.trim();
    if (!question) return;
    // 注意：不再需要檢查 apiKey，因為 Worker 已內建 Key
    const chatLog = document.getElementById("aiChatLog");
    chatLog.innerHTML += `<div class="ai-question"><strong>🧑‍💻 你：</strong> ${question}</div>`;
    document.getElementById("aiQuestion").value = "";
    try {
        const res = await fetch("https://biblesearch-a19.pages.dev", {  // ← 改成您的 Worker 網址
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: `請用繁體中文回答聖經問題：${question}` }] })
        });
        const data = await res.json();
        const answer = data.choices?.[0]?.message?.content || "無回應";
        chatLog.innerHTML += `<div class="ai-answer"><strong>🤖 AI：</strong> ${answer}</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
    } catch(e) { chatLog.innerHTML += `<div class="ai-answer">⚠️ 錯誤，請檢查 Worker 網址或網路。</div>`; }
};

// UI 初始化
function initUI() {
    const bookSelect = document.getElementById("bookSelect");
    bookSelect.innerHTML = bibleBooks.map(b => `<option value="${b}">${b}</option>`).join("");
    bookSelect.value = currentBook;
    bookSelect.onchange = () => { currentBook = bookSelect.value; loadChapter(currentBook, 1); updateChapterSelect(); };
    const chapSelect = document.getElementById("chapterSelect");
    function updateChapterSelect() {
        const max = getMaxChapter(currentBook);
        chapSelect.innerHTML = Array.from({length: max}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
        chapSelect.value = currentChapter;
        chapSelect.onchange = () => { currentChapter = parseInt(chapSelect.value); loadChapter(currentBook, currentChapter); };
        const scrollDiv = document.getElementById("chapterScroll");
        scrollDiv.innerHTML = `<div class="chapter-list">${Array.from({length:max}, (_,i)=>`<div class="chap ${i+1===currentChapter?'active-chap':''}" data-chap="${i+1}">${i+1}</div>`).join('')}</div>`;
        document.querySelectorAll(".chap").forEach(el => el.onclick = () => { currentChapter = parseInt(el.dataset.chap); chapSelect.value = currentChapter; loadChapter(currentBook, currentChapter); });
    }
    updateChapterSelect();
    loadChapter(currentBook, currentChapter);
}

document.getElementById("openLexiconBtn").onclick = () => document.getElementById("lexiconDrawer").classList.add("open");
document.getElementById("openNoteBtn").onclick = () => { document.getElementById("noteDrawer").classList.add("open"); refreshBookmarkList(); updateLastRead(currentBook, currentChapter); };
document.getElementById("openSearchBtn").onclick = () => document.getElementById("searchPanel").classList.toggle("open");
document.getElementById("openAiBtn").onclick = () => document.getElementById("aiDrawer").classList.add("open");
document.querySelectorAll(".close-drawer").forEach(btn => btn.onclick = () => document.getElementById(`${btn.dataset.drawer}Drawer`).classList.remove("open"));
document.getElementById("saveNote").onclick = saveCurrentNote;
document.getElementById("addBookmark").onclick = addBookmark;
document.getElementById("keywordInput").addEventListener("input", (e) => searchAll(e.target.value));

loadStrongDict();
initUI();
refreshBookmarkList();