import { type App } from './preload';
import { tempData } from './tempData';

declare global {
    interface Window {
        app: App;
        items: Item[];
        cards: HTMLElement[];
        modal: HTMLElement;
    }
}

export type Item = {
    issuer: string;
    account: string;
    secret: string;
    id: string;
    blob: string;
};

export async function getData(): Promise<void> {
    window.items = (await tempData).map((i, index) => ({
        ...i,
        id: 'item-' + index,
        blob: [i.issuer, i.account].join(' ').toLowerCase(),
    })); // JSON.parse((await window.app.readUserData()) || '[]');
}

export const createCard = (item: Item): HTMLElement => {
    const { issuer, secret, account, id } = item;

    const code = window.app.generateOTP(secret);

    const groups = code.match(/(\d{3})(\d{3})/);

    const card = document.createElement('div');

    console.log({ issuer, secret, account, id, code, groups });

    card.classList.add('card');
    card.id = id;

    card.innerHTML = `
                <button class="copy" aria-label="Copy OTP">
                    <div class="issuer-account">
                        <span class="issuer">${issuer}</span>
                        <span class="account">${account}</span>
                    </div>
                    <div class="code"><span>${groups[1]}</span><span>${groups[2]}</span></div>
                </button>
               `;

    card.addEventListener('click', () => {
        if (document.body.classList.contains('delete')) {
            confirmModal(
                `Are you sure you want to delete the OTP for ${[issuer, account].join(': ')}?`,
                'Delete',
                'delete'
            ).then((result) => {
                if (result) {
                    window.items = window.items.filter((item) => item.id !== id);
                    window.cards = window.cards.filter((card) => card.id !== id);
                    card.remove();
                    //window.app.writeUserData(JSON.stringify(window.items));
                }
            });
            return;
        }

        navigator.clipboard.writeText(code);
        card.classList.add('copied');
        setTimeout(() => card.classList.remove('copied'), 1000);
    });

    return card;
};

export function createCards(): void {
    window.cards = window.items.map(createCard);

    document.querySelector<HTMLElement>('#cards')!.append(...window.cards);

    if (window.cards.length > 0) document.body.classList.remove('no-cards');
}

export function intervalStart(): void {
    const DELAY = 250;

    let loadingPercentage = 0;

    const intervalElement = document.querySelector<HTMLElement>('#interval')!;

    const intervalPercentage = Math.ceil((30 * 1000) / DELAY / 1000);

    setInterval(() => {
        loadingPercentage += intervalPercentage;

        if (loadingPercentage >= 100) {
            loadingPercentage = 0;
            window.items.map(({ secret }, index) => {
                const code = window.app.generateOTP(secret);

                window.cards[index].querySelector<HTMLElement>('.code')!.innerHTML = `
                    <span>${code.slice(0, 3)}</span>
                    <span>${code.slice(3, 6)}</span>
                `;
            });
        }

        intervalElement.style.width = `${loadingPercentage}%`;
        intervalElement.style.transition = `width ${DELAY}ms linear`;
    }, DELAY);
}

const modalMessage = window.modal.querySelector<HTMLElement>('p')!;
const confirmBtn = window.modal.querySelector<HTMLElement>('[data-btn="confirm"]')!;

const resetModal = () => {
    modalMessage.innerText = '';
    confirmBtn.innerText = 'Confirm';
    window.modal.classList.add('hidden');
    confirmBtn.className = '';
};

const messageElement = document.querySelector<HTMLElement>('#message')!;
let messageTimeout: ReturnType<typeof setTimeout>;
export function showMessage(text: string, variant: 'error' | 'success' | 'info' = 'info', delay = 0): void {
    messageElement.innerText = text;
    messageElement.className = variant;

    clearTimeout(messageTimeout);

    if (delay > 0)
        messageTimeout = setTimeout(() => {
            messageElement.className = '';
            messageElement.innerText = '';
        }, delay * 1000);
}

export function confirmModal(
    message: string,
    confirmLabel = 'Confirm',
    confirmClass?: string
): Promise<boolean> {
    window.modal.classList.remove('hidden');
    modalMessage.innerText = message;
    confirmBtn.innerText = confirmLabel;
    confirmBtn.className = confirmClass;

    return new Promise((resolve) => {
        window.addEventListener('confirm', () => {
            resetModal();
            resolve(true);
        });

        window.addEventListener('cancel', () => {
            resetModal();
            resolve(false);
        });
    });
}

export function downloadItemsAsJson(): void {
    const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(window.items, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'otp-export.json');
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
