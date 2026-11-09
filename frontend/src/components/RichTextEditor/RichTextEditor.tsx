import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { normalizeLinkUrl } from '@/components/RichTextEditor/utils';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Texto alternativo accesible del área de edición. */
  ariaLabel?: string;
  /**
   * Sube una imagen y devuelve su URL (endpoint `POST /uploads/editor`,
   * disponible desde la Fase 3). Si no se pasa, no se muestra el botón.
   */
  onImageUpload?: (file: File) => Promise<string>;
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />;
}

/**
 * Editor de texto enriquecido (TipTap). Produce solo HTML de la lista blanca
 * de AGENTS.md (p, strong, em, u, s, h2–h4, ul/ol/li, blockquote, a, img, br);
 * la sanitización final la hace el backend al guardar.
 */
export function RichTextEditor({
  value,
  onChange,
  id,
  placeholder = 'Escriba aquí…',
  disabled = false,
  ariaLabel = 'Cuerpo del documento',
  onImageUpload,
}: RichTextEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // Fuera de la lista blanca del backend:
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({ allowBase64: false, inline: false }),
    ],
    content: value,
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'boletin-editor',
        ...(id ? { id } : {}),
        'aria-label': ariaLabel,
      },
    },
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
  });

  // Sincroniza cambios externos del formulario sin mover el cursor del usuario.
  useEffect(() => {
    if (!editor) {
      return;
    }
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onImageUpload || !editor) {
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      const alt = file.name.replace(/\.[^.]+$/, '');
      editor.chain().focus().setImage({ src: url, alt }).run();
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const handleLink = () => {
    if (!editor) {
      return;
    }
    if (editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    const raw = window.prompt('URL del enlace:', 'https://');
    if (raw === null) {
      return;
    }
    const url = normalizeLinkUrl(raw);
    if (!url) {
      setError('URL no válida. Use http://, https://, mailto: o una ruta interna (/…).');
      return;
    }
    setError(null);
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-md border border-input bg-background">
      <div role="toolbar" aria-label="Formato del texto" className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolbarButton label="Deshacer" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Rehacer" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton label="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Título 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título 4"
          active={editor.isActive('heading', { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          <Heading4 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton label="Lista con viñetas" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Cita" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton label={editor.isActive('link') ? 'Quitar enlace' : 'Agregar enlace'} active={editor.isActive('link')} onClick={handleLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        {editor.isActive('link') && (
          <ToolbarButton label="Quitar enlace del texto seleccionado" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
        )}

        {onImageUpload && (
          <>
            <ToolbarDivider />
            <ToolbarButton label="Insertar imagen" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleImageSelect}
            />
          </>
        )}

        <ToolbarDivider />

        <ToolbarButton
          label="Quitar formato"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      {error && (
        <p role="alert" className="border-t bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

