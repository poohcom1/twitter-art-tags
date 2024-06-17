import { template } from 'solid-js/web';
import styles from '../tag-gallery.module.scss';
import dotMenuIcon from '/src/assets/dot-menu.svg';
import { createMemo, createSignal, on, onCleanup, onMount } from 'solid-js';
import SyncModalOld from '../../syncModal/SyncModalOld';
import { loginRedirected } from '../../../services/supabase';
import { clearAllTags, exportDataToFile, importDataFromFile } from '../../../services/storage';
import { createImageArchive } from '../../../services/zipService';
import { SyncModal } from '../../syncModal/SyncModal';

const DotMenuSvg = template(dotMenuIcon);

export const Menu = () => {
  const [dropdownVisible, setDropdownVisible] = createSignal(false);
  const [downloadingImages, setDownloadingImages] = createSignal(false);

  const [getSyncModalVisible, setSyncModalVisible] = createSignal(false);

  const onDocumentClick = () => setDropdownVisible(false);
  onMount(() => {
    document.body.addEventListener('click', onDocumentClick);
    if (loginRedirected) {
      setSyncModalVisible(true);
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
  const onSyncClick = () => setSyncModalVisible(true);
  const onDownloadClick = async () => {
    setDropdownVisible(true); // Prevent dropdown from closing
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
    <>
      <SyncModal visible={getSyncModalVisible()} onClose={() => setSyncModalVisible(false)} />
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
          class={`${styles.dotMenuDropdown} ${dropdownVisible() && styles.dotMenuDropdownVisible}`}
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
            class={`${styles.dropdownItem} ${downloadingImages() && styles.dropdownItemDisabled}`}
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
    </>
  );
};
