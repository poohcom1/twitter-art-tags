import template from './sync-modal.pug';
import styles from './sync-modal.module.scss';
import { parseHTML } from '../../utils';
import {
    UserInfoData,
    deleteData,
    getUserInfo,
    signIn,
    signOut,
    syncData,
} from '../../services/supabase';

const IDS = {
    login: 'login',
    loading: 'loading',
    loadingText: 'loadingText',
    loginBtn: 'loginBtn',
    sync: 'sync',
    close: 'close',
    // Sync Buttons
    syncBtn: 'syncBtn',
    clearBtn: 'clearBtn',
    logoutBtn: 'logOutBtn',
    // Sync info
    syncInfoUser: 'syncInfoUser',
    syncInfoData: 'syncInfoData',
} as const;

interface ShowOptions {
    onTagsUpdate?: () => void;
    onClose?: () => void;
}

export default class LoginModal {
    private modalContainer: HTMLElement;

    private loginComponent: HTMLElement;
    private loadingComponent: HTMLElement;
    private syncComponent: HTMLElement;
    private allComponents: HTMLElement[] = [];

    private clearDataBtn: HTMLButtonElement;
    private syncInfoData: HTMLElement;
    private syncInfoUser: HTMLElement;

    private userInfoData: UserInfoData | null = null;
    private showOptions: ShowOptions = {};

    constructor(showOptions: ShowOptions) {
        this.showOptions = showOptions;
        this.modalContainer = parseHTML(template({ styles, ids: IDS }));
        document.body.appendChild(this.modalContainer);
        this.modalContainer.onclick = (e) => e.stopPropagation();

        this.loginComponent = this.modalContainer.querySelector<HTMLElement>(`#${IDS.login}`)!;
        this.loadingComponent = this.modalContainer.querySelector<HTMLElement>(`#${IDS.loading}`)!;
        this.syncComponent = this.modalContainer.querySelector<HTMLElement>(`#${IDS.sync}`)!;

        this.modalContainer.querySelector<HTMLElement>(`#${IDS.close}`)!.onclick = () =>
            this.hide();

        // Login
        const loginBtn = this.modalContainer.querySelector<HTMLButtonElement>(`#${IDS.loginBtn}`)!;
        loginBtn.onclick = async () => {
            this.showLoading('Redirecting to twitter login...');
            await signIn();
        };

        // Overlay
        const overlay = this.modalContainer.querySelector<HTMLElement>(`.${styles.overlay}`)!;
        overlay.onscroll = (e) => e.stopPropagation();
        overlay.onclick = () => this.hide();

        // Sync
        const syncBtn = this.modalContainer.querySelector<HTMLButtonElement>(`#${IDS.syncBtn}`)!;
        this.clearDataBtn = this.modalContainer.querySelector<HTMLButtonElement>(
            `#${IDS.clearBtn}`
        )!;
        const logOutBtn = this.modalContainer.querySelector<HTMLButtonElement>(
            `#${IDS.logoutBtn}`
        )!;
        this.syncInfoData = this.modalContainer.querySelector<HTMLElement>(`#${IDS.syncInfoData}`)!;
        this.syncInfoUser = this.modalContainer.querySelector<HTMLElement>(`#${IDS.syncInfoUser}`)!;

        syncBtn.onclick = async () => {
            if (!this.userInfoData) {
                alert("You're not logged in!");
                this.showLogin();
                return;
            }

            this.showLoading('Syncing...');

            const success = await syncData(this.userInfoData.userInfo);

            if (success) {
                this.showLoading('Syncing successful!');
                await new Promise((resolve) => setTimeout(resolve, 200));
                this.clearDataBtn.disabled = false;

                this.showOptions.onTagsUpdate?.();

                this.initialLoad();
            } else {
                alert('Sync failed');
            }
        };

        this.clearDataBtn.onclick = async () => {
            if (!this.userInfoData) {
                alert("You're not logged in!");
                this.showLogin();
                return;
            }

            this.showLoading('Syncing...');

            const success = await deleteData(this.userInfoData.userInfo);

            if (success) {
                this.showLoading('Clear successful!');
                this.clearDataBtn.disabled = false;

                await new Promise((resolve) => setTimeout(resolve, 200));

                this.showOptions.onTagsUpdate?.();
                this.initialLoad();
            } else {
                alert('Sync failed');
            }
        };

        logOutBtn.onclick = () => {
            signOut();
            this.showLogin();
        };

        this.allComponents = [this.loginComponent, this.loadingComponent, this.syncComponent];
    }

    // Modal
    private async initialLoad() {
        return getUserInfo().then((userInfoData) => {
            if (userInfoData) {
                this.userInfoData = userInfoData; // MUST BE SET BEFORE SHOWING
                this.showSync();
            } else {
                this.showLogin();
            }
        });
    }

    public async show() {
        this.modalContainer.classList.add(styles.modalContainerShow);
        document.body.classList.add(styles.modalOpen);

        this.showLoading('Loading...');
        this.initialLoad();
    }

    public signOut() {
        signOut();
        this.userInfoData = null;
    }

    public hide() {
        this.modalContainer.classList.remove(styles.modalContainerShow);
        document.body.classList.remove(styles.modalOpen);
    }

    private showLoading(text: string) {
        this.allComponents.forEach((c) => (c.style.display = 'none'));
        this.loadingComponent.style.display = 'flex';
        this.loadingComponent.querySelector<HTMLElement>(`#${IDS.loadingText}`)!.textContent = text;
    }

    private showLogin() {
        this.allComponents.forEach((c) => (c.style.display = 'none'));
        this.loginComponent.style.display = 'flex';
    }

    private showSync() {
        this.allComponents.forEach((c) => (c.style.display = 'none'));
        this.syncComponent.style.display = 'flex';

        this.clearDataBtn.disabled = !this.userInfoData?.userData;

        this.syncInfoUser.textContent = `Logged in as: @${this.userInfoData?.userInfo.username}`;
        if (this.userInfoData?.userData && this.userInfoData.syncedAt) {
            const date = new Date(this.userInfoData.syncedAt);

            // Extract the individual components
            const year = date.getFullYear().toString().slice(-2); // Get last two digits of year
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            this.syncInfoData.textContent = `Last synced: ${year}/${month}/${day} ${hours}:${minutes}`;
        } else {
            this.syncInfoData.textContent = 'No data synced yet.';
        }
    }
}
