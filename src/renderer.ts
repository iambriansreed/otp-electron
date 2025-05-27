import './index.scss';
import {
    getData,
    intervalStart,
    createCards,
    confirmModal,
    downloadItemsAsJson,
    showMessage,
    createCard,
} from './utils';

document.querySelector<HTMLButtonElement>('#search').addEventListener('input', () => {
    const search = (document.querySelector<HTMLInputElement>('#search')!.value || '').toLowerCase();

    window.cards.forEach((card) => card.classList.remove('hidden'));

    if (!search) return showMessage('');

    let itemsShowing = 0;
    window.items.forEach(({ blob, id }) => {
        if (blob.includes(search)) return itemsShowing++;
        window.cards.find((card) => card.id === id)?.classList.add('hidden');
    });

    showMessage(
        itemsShowing === 0 ? 'No items found' : `Showing ${itemsShowing} of ${window.cards.length} items`
    );
});

document.querySelector<HTMLButtonElement>('[data-btn="delete"]').addEventListener('click', () => {
    document.body.classList.toggle('delete');

    showMessage(
        document.body.classList.contains('delete')
            ? 'Click on the OTP you want to delete. Click Delete to confirm.'
            : ''
    );
});

document.querySelector<HTMLButtonElement>('[data-btn="export"]').addEventListener('click', () => {
    confirmModal('Are you sure you want to export all secrets as unencrypted plain text?').then(
        (response) => {
            if (response) downloadItemsAsJson();
        }
    );
});

document.querySelectorAll<HTMLButtonElement>('[data-btn="add"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
        //

        const item = await window.app.getScreenOTP();

        if ('error' in item) {
            showMessage(item.error, 'error', 10);
            return;
        }

        const card = createCard(item);

        window.cards.push(card);
        window.items.push(item);

        window.scrollTo(0, 0);
        document.querySelector<HTMLElement>('#cards')!.prepend(card);
        card.classList.add('new');

        showMessage('New OTP added', 'success', 5);
        setTimeout(() => card.classList.remove('new'), 10000);
    })
);

window.modal = document.querySelector<HTMLElement>('#modal')!;

window.modal.querySelector<HTMLElement>('[data-btn="confirm"]').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('confirm'));
});

window.modal.querySelector<HTMLElement>('[data-btn="cancel"]')!.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cancel'));
});

(async () => {
    // Show loading animation
    setTimeout(() => {
        document.body.classList.remove('loading');
    }, 1000);

    await getData();

    createCards();

    intervalStart();

    console.log();
})();
