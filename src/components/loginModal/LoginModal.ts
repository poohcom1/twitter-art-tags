import template from './login-modal.pug';
import styles from './login-modal.module.scss';
import { parseHTML } from '../../utils';
import { UserInfo, signIn } from '../../services/supabase';

const COMPONENTS = {
    login: 'login',
    loading: 'loading',
} as const;

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
    private userInfo: UserInfo | null = null;
    private emailInput: HTMLInputElement;

    private onLogin: LoginCallback | null = null;

    constructor() {
        this.modalContainer = parseHTML(template({ styles, ids: IDS }));
        document.body.appendChild(this.modalContainer);

        this.components[COMPONENTS.login] = this.modalContainer.querySelector<HTMLElement>(
            `#${IDS.login}`
        )!;
        this.components[COMPONENTS.loading] = this.modalContainer.querySelector<HTMLElement>(
            `#${IDS.loading}`
        )!;

        // Login
        this.emailInput = this.modalContainer.querySelector<HTMLInputElement>(`#${IDS.email}`)!;
        const pwInput = this.modalContainer.querySelector<HTMLInputElement>(`#${IDS.pw}`)!;
        const loginBtn = this.modalContainer.querySelector<HTMLButtonElement>(`#${IDS.loginBtn}`)!;
        const cancelBtn = this.modalContainer.querySelector<HTMLButtonElement>(
            `#${IDS.cancelBtn}`
        )!;

        cancelBtn.onclick = () => this.hide();
        loginBtn.onclick = async () => {
            if (this.onLogin === null) {
                alert('Login callback is not set - something went wrong!');
                return;
            }

            const email = this.emailInput.value;
            const pw = pwInput.value;

            if (!email || !pw) {
                return;
            }

            this.changeComponent(COMPONENTS.login);

            const userInfo = await signIn(email, pw);
            if (userInfo) {
                this.userInfo = userInfo;
                this.changeComponent(COMPONENTS.loading);
                await this.onLogin(userInfo);
                this.hide();
            } else {
                this.changeComponent(COMPONENTS.login);
            }
        };

        // Overlay
        const overlay = this.modalContainer.querySelector<HTMLElement>(`.${styles.overlay}`)!;
        overlay.onscroll = (e) => e.stopPropagation();
        overlay.onclick = () => this.hide();

        this.changeComponent(COMPONENTS.login);
    }

    // Modal
    public async show(onLogin: LoginCallback) {
        if (this.userInfo) {
            this.changeComponent(COMPONENTS.loading);
            onLogin(this.userInfo);
            return;
        }

        this.onLogin = onLogin;
        this.modalContainer.classList.add(styles.modalContainerShow);
        document.body.classList.add(styles.modalOpen);
    }

    private hide() {
        this.modalContainer.classList.remove(styles.modalContainerShow);
        document.body.classList.remove(styles.modalOpen);
    }

    private changeComponent(component: keyof typeof COMPONENTS) {
        for (const key in this.components) {
            this.components[key].style.display = key === component ? 'block' : 'none';
        }
    }
}
