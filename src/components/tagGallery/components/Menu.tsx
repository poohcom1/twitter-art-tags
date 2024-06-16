import { template } from 'solid-js/web';
import styles from '../tag-gallery.module.scss';
import dotMenuIcon from '/src/assets/dot-menu.svg';
import { createMemo, createSignal, on, onCleanup, onMount } from 'solid-js';
import SyncModal from '../../syncModal/SyncModal';
import { loginRedirected } from '../../../services/supabase';
import {
    clearAllTags,
    exportDataToFile,
    getArchiveConsent,
    importDataFromFile,
    setArchiveConsent,
} from '../../../services/storage';
import { createImageArchive } from '../../../services/zipService';

const DotMenuSvg = template(dotMenuIcon);

export const Menu = () => {
    const [dropdownVisible, setDropdownVisible] = createSignal(false);
    const [downloadingImages, setDownloadingImages] = createSignal(false);

    const getSyncModal = createMemo(
        () =>
            new SyncModal({
                onClose: () => setDropdownVisible(false),
                // onTagsUpdate: () => this.rerender(),
            })
    );

    const onDocumentClick = () => setDropdownVisible(false);
    onMount(() => {
        document.body.addEventListener('click', onDocumentClick);
        if (loginRedirected) {
            getSyncModal().show();
        }
    });
    onCleanup(() => {
        document.body.removeEventListener('click', onDocumentClick);
    });

    const onExportClick = () => exportDataToFile();
    const onImportClick = async () => {
        await importDataFromFile(false);
        // Rerender
        setDropdownVisible(false);
    };
    const onImportMergeClick = async () => {
        await importDataFromFile(true);
        // Rerender
        setDropdownVisible(false);
    };
    const onSyncClick = () => getSyncModal().show();
    const onDownloadClick = async () => {
        setDropdownVisible(true); // Prevent dropdown from closing
        const consent = await getArchiveConsent();
        if (!consent) {
            if (
                !confirm(
                    'Due to limitations on a userscript, the download feature uses an API to create a zip file of all images. This does not store any data.\n\nDo you want to proceed?'
                )
            ) {
                return;
            }
            setArchiveConsent(true);
        }

        setDownloadingImages(true);
        const success = await createImageArchive();

        if (!success) {
            alert('Failed to create archive! Please try again later.');
        }
        setDownloadingImages(false);
    };
    const onDeleteClick = async () => {
        if (confirm('Are you sure you want to clear all data?')) {
            await clearAllTags();
        }
    };

    return (
        <div
            class={styles.dotMenu}
            style="margin-left: auto"
            onClick={(e) => {
                e.stopPropagation();
                setDropdownVisible(true);
            }}
        >
            <DotMenuSvg />
            <div
                class={`${styles.dotMenuDropdown} ${
                    dropdownVisible() && styles.dotMenuDropdownVisible
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div class={styles.dropdownItem} onClick={onExportClick}>
                    Export
                </div>
                <div class={styles.dropdownItem} onClick={onImportClick}>
                    Import
                </div>
                <div class={styles.dropdownItem} onClick={onImportMergeClick}>
                    Import & Merge
                </div>
                <hr />
                <div class={styles.dropdownItem} onClick={onSyncClick}>
                    Sync...
                </div>
                <div
                    class={`${styles.dropdownItem} ${
                        downloadingImages() && styles.dropdownItemDisabled
                    }`}
                    onClick={onDownloadClick}
                >
                    {downloadingImages() ? 'Creating archive...' : 'Download images'}
                </div>
                <hr />
                <div class={styles.dropdownItem} onClick={onDeleteClick}>
                    Delete all tags
                </div>
            </div>
        </div>
    );
};
