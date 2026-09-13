import { esc, publicUrl, uploadFile, toast } from './core';

export interface ImagePickerValue {
  /** Storage path or URL of the current (already saved / existing) image. */
  existing: string | null;
  /** A newly selected file that has not been uploaded yet. */
  file: File | null;
}

export interface ImagePicker {
  getValue(): ImagePickerValue;
  setValue(v: ImagePickerValue): void;
  /** Uploads the pending file to Storage under the given path prefix (no extension). */
  upload(pathPrefix: string): Promise<{ url: string } | { error: string }>;
}

const MAX_SIZE_MB = 10;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

function buildObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

function validate(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file.';
  if (file.size > MAX_BYTES) return `Image is larger than ${MAX_SIZE_MB} MB. Please choose a smaller file.`;
  return null;
}

/** Builds a drag-&-drop / click-to-choose image field that uploads from the local drive. */
export function createImagePicker(root: HTMLElement, opts: { hint?: string } = {}): ImagePicker {
  let existing: string | null = null;
  let file: File | null = null;
  let previewUrl = '';

  function clearPreview() {
    file = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
  }

  function render() {
    let src = '';
    if (file) {
      if (!previewUrl) previewUrl = buildObjectUrl(file);
      src = previewUrl;
    } else if (existing) {
      clearPreview();
      src = publicUrl(existing);
    }
    const hasImage = Boolean(src);

    root.innerHTML = `
      <div class="a-imgpicker">
        <div class="a-imgpicker-box" role="button" tabindex="0" aria-label="${hasImage ? 'Change image' : 'Choose an image from your computer'}">
          ${hasImage
            ? `
              <input type="file" class="a-imgpicker-input" accept="image/*" hidden />
              <img class="a-imgpicker-preview" src="${esc(src)}" alt="Image preview" />
              <div class="a-imgpicker-overlay">
                <button type="button" class="a-imgpicker-act a-imgpicker-change">Change image</button>
                <button type="button" class="a-imgpicker-act a-imgpicker-act-remove a-imgpicker-remove">Remove</button>
              </div>`
            : `
              <input type="file" class="a-imgpicker-input" accept="image/*" hidden />
              <div class="a-imgpicker-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.9-3.9a2 2 0 0 0-2.8 0L5 20.5"/></svg>
                <p class="a-imgpicker-title">Choose an image from your computer</p>
                <p class="a-imgpicker-sub">or drag &amp; drop here &middot; PNG, JPG or WebP &middot; up to ${MAX_SIZE_MB} MB</p>
                <span class="a-btn a-btn-primary">Choose image</span>
              </div>`
          }
        </div>
        <div class="a-imgpicker-meta ${file ? 'is-new' : ''}">
          ${file ? `New image selected: <span style="word-break:break-all;">${esc(file.name)}</span>`
            : existing ? 'Current image is saved. Hover to change or remove.'
            : opts.hint || ''}
        </div>
      </div>`;

    wire();
  }

  async function pick(chosen: File | null) {
    if (!chosen) return;
    const problem = validate(chosen);
    if (problem) { toast(problem, 'error'); return; }
    clearPreview();
    file = chosen;
    previewUrl = buildObjectUrl(chosen);
    // Only re-render once we know the file decodes as an image.
    const img = new Image();
    img.onload = () => render();
    img.onerror = () => { clearPreview(); toast('That file could not be opened as an image.', 'error'); render(); };
    img.src = previewUrl;
  }

  function wire() {
    const box = root.querySelector<HTMLElement>('.a-imgpicker-box');
    const input = root.querySelector<HTMLInputElement>('.a-imgpicker-input');
    const change = root.querySelector<HTMLButtonElement>('.a-imgpicker-change');
    const remove = root.querySelector<HTMLButtonElement>('.a-imgpicker-remove');

    const openPicker = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      input?.click();
    };

    input?.addEventListener('change', () => { void pick(input.files?.[0] ?? null); input.value = ''; });

    box?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.a-imgpicker-remove')) return;
      input?.click();
    });
    box?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input?.click(); }
    });
    change?.addEventListener('click', openPicker);
    remove?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearPreview();
      existing = null;
      render();
    });

    box?.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('a-imgpicker-dragging'); });
    box?.addEventListener('dragleave', () => box.classList.remove('a-imgpicker-dragging'));
    box?.addEventListener('drop', (e) => {
      e.preventDefault();
      box.classList.remove('a-imgpicker-dragging');
      void pick(e.dataTransfer?.files?.[0] ?? null);
    });
  }

  render();

  return {
    getValue(): ImagePickerValue {
      return { existing, file };
    },
    setValue(v: ImagePickerValue) {
      clearPreview();
      existing = v.existing || null;
      file = v.file || null;
      render();
    },
    async upload(pathPrefix: string): Promise<{ url: string } | { error: string }> {
      if (!file) return { error: 'No image selected.' };
      const result = await uploadFile(file, pathPrefix);
      if ('error' in result) return { error: result.error };
      clearPreview();
      existing = result.path;
      render();
      return { url: result.path };
    }
  };
}