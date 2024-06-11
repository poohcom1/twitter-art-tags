import template from './login-modal.pug';
import styles from './login-modal.module.scss';
import { parseHTML } from '../../utils';
import { UserInfo, signIn } from '../../services/supabase';

const IDS = {
    login: 'login',
    loading: 'loading',
    // Login
    email: 'email',
    pw: 'pw',
    loginBtn: 'loginBtn',
    cancelBtn: 'cancelBtn',
} as const;

type LoginCallback = (info: UserInfo) => Promise<void>;

export default class LoginModal {
    private modalContainer: HTMLElement;

    private components: Record<string, HTMLElement> = {};
    private loginComponent: HTMLElement;
    private loadingComponent: HTMLElement;

    private userInfo: UserInfo | null = null;
    private emailInput: HTMLInputElement;

    private onLogin: LoginCallback | null = null;

    constructor() {
        this.modalContainer = parseHTML(template({ styles, ids: IDS }));
        document.body.appendChild(this.modalContainer);

        this.loginComponent = this.modalContainer.querySelector<HTMLElement>(`#${IDS.login}`)!;
        this.loadingComponent = this.modalContainer.querySelector<HTMLElement>(`#${IDS.loading}`)!;

        // Login
        this.emailInput = this.modalContainer.querySelector<HTMLInputElement>(`#${IDS.email}`)!;
        const pwInput = this.modalContainer.querySelector<HTMLInputElement>(`#${IDS.pw}`)!;
        const loginBtn = this.modalContainer.querySelector<HTMLButtonElement>(`#${IDS.loginBtn}`)!;
        const cancelBtn = this.modalContainer.querySelector<HTMLButtonElement>(
            `#${IDS.cancelBtn}`
        )!;

        const submit = async () => {
            if (this.onLogin === null) {
                alert('Login callback is not set - something went wrong!');
                return;
            }
            this.showLoading();

            const email = this.emailInput.value;
            const pw = pwInput.value;

            if (!email || !pw) {
                return;
            }

            const userInfo = await signIn(email, pw);
            if (userInfo) {
                this.userInfo = userInfo;
                await this.onLogin(userInfo);
                this.hide();
            } else {
                this.showLogin();
            }
        };

        cancelBtn.onclick = () => this.hide();
        loginBtn.onclick = submit;
        this.emailInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                submit();
            }
        };
        pwInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                submit();
            }
        };

        // Overlay
        const overlay = this.modalContainer.querySelector<HTMLElement>(`.${styles.overlay}`)!;
        overlay.onscroll = (e) => e.stopPropagation();
        overlay.onclick = () => this.hide();

        this.showLogin();
    }

    public isLoggedIn() {
        return !!this.userInfo;
    }

    // Modal
    public async show(onLogin: LoginCallback) {
        this.modalContainer.classList.add(styles.modalContainerShow);
        document.body.classList.add(styles.modalOpen);

        if (this.userInfo) {
            this.showLoading();
            await onLogin(this.userInfo);
            this.hide();
            return;
        }

        this.onLogin = onLogin;

        await new Promise((resolve) => setTimeout(resolve, 50));
        this.emailInput.focus();
        this.emailInput.select();
        this.showLogin();
    }

    public signOut() {
        this.userInfo = null;
    }

    public hide() {
        this.modalContainer.classList.remove(styles.modalContainerShow);
        document.body.classList.remove(styles.modalOpen);
    }

    private showLoading() {
        this.loginComponent.style.display = 'none';
        this.loadingComponent.style.display = 'block';
    }

    private showLogin() {
        this.loginComponent.style.display = 'block';
        this.loadingComponent.style.display = 'none';
    }
}
