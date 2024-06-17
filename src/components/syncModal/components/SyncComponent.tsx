import { Switch, Match, createSignal } from 'solid-js';
import { Svg } from '../../common/Svg';
import styles from '../sync-modal.module.scss';
import { SyncType } from '../SyncModal';
import upload from '/src/assets/cloud-upload.svg';
import clear from '/src/assets/cloud-off.svg';
import logout from '/src/assets/logout.svg';
import loading from '/src/assets/loading.svg';

interface SyncComponentProps {
    username: string;
    syncedAt: string;
    dataSynced: boolean;
    dataExists: boolean;
    syncType: SyncType;
    onSync: () => void;
    onClear: () => void;
    onLogout: () => void;
}

export const SyncComponent = (props: SyncComponentProps) => {
    return (
        <div class={styles.sync}>
            <div class={styles.syncInfo}>
                Logged in as: {props.username ? `@${props.username}` : 'Unknown'}
            </div>
            <div class={styles.syncInfo}>
                Last synced:{' '}
                <strong>
                    <Switch
                        fallback={
                            <span style={{ color: 'red' }}>{getLastSyncText(props.syncedAt)}</span>
                        }
                    >
                        <Match when={props.dataSynced}>
                            <span>Synced</span>
                        </Match>
                        <Match when={!props.dataExists}>
                            <span style={{ color: 'red' }}>Never</span>
                        </Match>
                    </Switch>
                </strong>
            </div>
            <div class={styles.syncContainer}>
                <button
                    onClick={props.onSync}
                    disabled={props.dataSynced || props.syncType !== SyncType.None}
                >
                    {props.syncType === SyncType.Sync ? <LoadingSpinner /> : <Svg svg={upload} />}
                    Sync
                </button>
                <button
                    onClick={props.onClear}
                    disabled={!props.dataExists || props.syncType !== SyncType.None}
                >
                    {props.syncType === SyncType.Clear ? <LoadingSpinner /> : <Svg svg={clear} />}
                    Clear data
                </button>
                <button onClick={props.onLogout}>
                    <Svg svg={logout} />
                    Log out
                </button>
            </div>
        </div>
    );
};

const LoadingSpinner = () => {
    return (
        <div class={styles.loading}>
            <Svg svg={loading} />
        </div>
    );
};

const SyncText = () => {
    const ellipses = ['...', '.', '..'];

    const [index, setIndex] = createSignal(0);

    setInterval(() => {
        setIndex((index) => (index + 1) % 3);
    }, 500);

    return <span>Syncing{ellipses[index()]}</span>;
};

function getLastSyncText(syncedAt: string) {
    const delta = Date.now() - new Date(syncedAt).getTime();
    const days = Math.floor(delta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((delta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0) {
        if (hours === 0) {
            return 'Less than an hour ago';
        } else if (hours === 1) {
            return 'An hour ago';
        }
        return `${hours} hours ago`;
    } else if (days === 1) {
        return 'Yesterday';
    } else {
        return `${days} days ago`;
    }
}
