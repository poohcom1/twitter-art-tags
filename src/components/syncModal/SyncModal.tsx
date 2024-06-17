import { Match, Switch, createComputed, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import styles from './sync-modal.module.scss';
import { Svg } from '../templates/Svg';
import close from '/src/assets/x-close.svg';

import {
    UserInfoData,
    deleteData,
    getUserInfo,
    signIn,
    signOut,
    syncData,
} from '../../services/supabase';
import { LoginComponent } from './components/LoginComponent';
import { SyncComponent } from './components/SyncComponent';

interface SyncModalProps {
    visible: boolean;
    onClose: () => void;
}

enum State {
    Loading,
    RedirectingToLogin,
    LoginSync,
}

export enum SyncType {
    None,
    Sync,
    Clear,
}

export const SyncModal = (props: SyncModalProps) => {
    const [getState, setState] = createSignal(State.Loading);

    const [getUserInfoData, setUserInfoData] = createSignal<UserInfoData | null>(null);
    const [getSyncing, setSyncing] = createSignal(SyncType.None);

    createComputed(() => {
        if (props.visible) {
            setState(State.Loading);
            getUserInfo().then((i) => {
                setUserInfoData(i);
                setState(State.LoginSync);
            });
        }
    });

    // Sync
    const handleSync = async () => {
        const userInfoData = getUserInfoData();
        if (!userInfoData) {
            alert("You're not logged in!");
            return;
        }

        setSyncing(SyncType.Sync);
        const success = await syncData(userInfoData.userInfo);

        if (success) {
            setUserInfoData(await getUserInfo());
            setSyncing(SyncType.None);
        } else {
            alert('Sync failed');
        }
    };

    const handleClear = async () => {
        const userInfoData = getUserInfoData();
        if (!userInfoData) {
            alert("You're not logged in!");
            return;
        }

        if (
            !confirm('Are you sure you want to clear synced tags? This will not affect local tags.')
        ) {
            return;
        }

        setSyncing(SyncType.Clear);
        const success = await deleteData(userInfoData.userInfo);

        if (success) {
            setUserInfoData(await getUserInfo());
            setSyncing(SyncType.None);
        } else {
            alert('Sync failed');
        }
    };

    const handleLogout = async () => {
        const userInfoData = getUserInfoData();
        if (!userInfoData) {
            alert("You're not logged in!");
            return;
        }
        signOut(userInfoData.userInfo);
        setUserInfoData(null);
    };

    // Login
    const handleLogin = async () => {
        setState(State.RedirectingToLogin);
        await signIn();
    };

    return (
        <Portal>
            <div class={`${styles.modalContainer} ${props.visible && styles.modalContainerShow}`}>
                <div class={styles.overlay} onClick={props.onClose} />
                <div class={styles.modal}>
                    <div class={styles.titleContainer}>
                        <h3>Sync your Tags</h3>
                        <div class={styles.svg} onClick={props.onClose}>
                            <Svg svg={close} />
                        </div>
                    </div>
                    <Switch>
                        <Match when={getState() === State.LoginSync}>
                            {!getUserInfoData() ? (
                                <LoginComponent onLogin={handleLogin} />
                            ) : (
                                <SyncComponent
                                    syncType={getSyncing()}
                                    username={getUserInfoData()?.userInfo.username || ''}
                                    syncedAt={getUserInfoData()?.syncedAt ?? '0'}
                                    dataExists={getUserInfoData()?.userDataExists ?? false}
                                    dataSynced={getUserInfoData()?.userDataSynced ?? false}
                                    onSync={handleSync}
                                    onClear={handleClear}
                                    onLogout={handleLogout}
                                />
                            )}
                        </Match>
                        <Match when={getState() === State.RedirectingToLogin}>
                            <div class={styles.loading}>Redirecting to X/Twitter login...</div>
                        </Match>
                        <Match when={getState() === State.Loading}>
                            <div class={styles.loading}>Loading...</div>
                        </Match>
                    </Switch>
                    <div class={styles.privacy}>
                        <a
                            href="https://github.com/poohcom1/twitter-art-tags/blob/master/PRIVACY.md"
                            target="_blank"
                        >
                            Privacy Policy
                        </a>{' '}
                        <a
                            href="https://github.com/poohcom1/twitter-art-tags/blob/master/TERMS_OF_SERVICE.md"
                            target="_blank"
                        >
                            Terms of Service
                        </a>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
