import styles from '../sync-modal.module.scss';

interface LoginComponentProps {
    onLogin: () => void;
}

export const LoginComponent = (props: LoginComponentProps) => {
    return (
        <div class={styles.login}>
            <div class={styles.btnContainer}>
                <button onClick={props.onLogin}>Log in with X/Twitter</button>
            </div>
        </div>
    );
};
