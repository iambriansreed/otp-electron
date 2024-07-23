import './index.scss';

async function getData() {
    return (await window.app.readUserData()) || '';
}

const cardsContainer = document.querySelector<HTMLElement>('#cards')!;
const filter = document.querySelector<HTMLElement>('#filter')!;
const toastCopy = document.querySelector<HTMLElement>('#copied')!;
const searchInput = document.querySelector<HTMLInputElement>('#search')!;
const editBtn = document.querySelector<HTMLButtonElement>('#edit')!;

const editor = document.querySelector('#editor')!;
const textarea = editor.querySelector<HTMLTextAreaElement>('textarea')!;
const form = editor.querySelector('form')!;
const exportBtn = editor.querySelector<HTMLButtonElement>('.export')!;

type Item = {
    issuer: string;
    key: string;
    account: string;
    id: string;
    dupKeys?: string[];
};

let items: Item[] = [];
let cards: Record<string, HTMLElement> = {};
let editing = false;
let rawData = '';

async function init(list: string) {
    rawData = list;

    cards = {};

    const itemsLookup: Record<string, Item> = {};

    list.split('\n').forEach((line) => {
        const urlStr = line.trim();

        if (!URL.canParse(urlStr)) return null;

        const { pathname, searchParams } = new URL(urlStr);

        const issuer = decodeURIComponent(searchParams.get('issuer'));
        const key = searchParams.get('secret');

        const account =
            decodeURIComponent(decodeURIComponent(pathname))
                .split(issuer + ':')[1]
                ?.replace('undefined', '') || '';

        if (itemsLookup[pathname])
            itemsLookup[pathname].dupKeys = [...(itemsLookup[pathname].dupKeys || []), key];
        else itemsLookup[pathname] = { issuer, key, account, id: pathname };
    });

    items = Object.values(itemsLookup);

    createCards();
}

function createCards() {
    if (!items.length) {
        cardsContainer.innerHTML = '<li class="empty">No items found</li>';
    }

    cardsContainer.innerHTML = '';
    items.forEach(({ issuer, key, account, id }) => {
        const li = document.createElement('li');
        li.id = id;

        li.innerHTML = `<div class="card">
    <div class="issuer">${issuer}</div>
    <div class="code">${window.app.generateOTP(key)}</div>
    <div class="account">${account || '&mdash;'}</div></div>`;

        cardsContainer.appendChild(li);

        cards[id] = li;

        li.addEventListener('click', () => onClickCopy(key, li));
    });
}

(async () => {
    init(await getData());
})();

function showToastCopy(element: HTMLElement) {
    element.appendChild(toastCopy);
    const animationEventListener = () => toastCopy.classList.remove('show');
    toastCopy.removeEventListener('animationend', animationEventListener);
    toastCopy.classList.remove('show');
    toastCopy.offsetWidth;
    toastCopy.classList.add('show');
    toastCopy.addEventListener('animationend', animationEventListener);
}

function onClickCopy(key: string, element: HTMLElement) {
    navigator.clipboard.writeText(window.app.generateOTP(key));
    showToastCopy(element.firstChild as HTMLElement);
}

searchInput.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value.toLowerCase();

    if (!value) {
        items.forEach(({ id }) => {
            document.getElementById(id).classList.remove('hide');
        });
        filter.innerText = '';
        return;
    }

    let hiding = 0;
    items.forEach(({ issuer, account, id }) => {
        const hide = !issuer.toLowerCase().includes(value) && !account.toLowerCase().includes(value);

        hiding += hide ? 1 : 0;

        document.getElementById(id).classList.toggle('hide', hide);
    });

    filter.innerText = `Showing ${items.length - hiding} of ${items.length} entries.`;
});

function refreshCodes() {
    items.forEach(({ key, id }) => {
        cards[id].querySelector('.code')!.textContent = window.app.generateOTP(key);
    });
}

const circle = document.querySelector('circle');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = `${circumference}`;

function setProgress(percent: number) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset.toString();
}

// reloader
{
    let progress = 10;
    setInterval(() => {
        setProgress(progress);
        progress += 1.5;
        if (progress >= 100) {
            progress = 0;
            refreshCodes();
        }
    }, 500);
}

editBtn.addEventListener('click', toggleEditing);

async function toggleEditing() {
    editing = !editing;
    document.body.classList.toggle('editing', editing);
    window.app.windowResize(editing);
    if (editing) textarea.value = await getData();
}

form.addEventListener('submit', () => {
    window.app.writeUserData(textarea.value);
    init(textarea.value);
    toggleEditing();
});

editor.querySelector('[type="reset"]')!.addEventListener('click', async () => {
    toggleEditing();
});

exportBtn.addEventListener('click', async () => {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';

    const blob = new Blob([rawData], { type: 'octet/stream' }),
        url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = 'otp-data.txt';
    a.click();
    window.URL.revokeObjectURL(url);
});

editor.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (document.body.classList.contains('editing') && !target.closest('.dialog')) {
        toggleEditing();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('editing')) {
        toggleEditing();
    }
});
