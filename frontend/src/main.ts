import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { initializeApp } from './app';
import './styles/app.css';

const currentWindow = getCurrentWindow();

initializeApp({
  document,
  window,
  currentWindow,
  invoke,
  openFileDialog: async () => {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Markdown',
        extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'],
      }],
    });

    return typeof selected === 'string' ? selected : null;
  },
  saveFileDialog: async ({ defaultPath }) => {
    const selected = await save({
      defaultPath,
      filters: [{
        name: 'Markdown',
        extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'],
      }],
    });

    return typeof selected === 'string' ? selected : null;
  },
  openExternalUrl: openUrl,
}).catch(console.error);
