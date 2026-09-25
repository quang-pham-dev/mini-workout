import { enableVisualEditing } from '@sanity/visual-editing/enable-visual-editing';

const previewCookie = 'sanity-preview-perspective=';
if (
  document.cookie
    .split(';')
    .some((part) => part.trim().startsWith(previewCookie))
) {
  enableVisualEditing();
}
