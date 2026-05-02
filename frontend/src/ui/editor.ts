import { markdown } from '@codemirror/lang-markdown';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';

export interface MarkdownEditorOptions {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export interface MarkdownEditorController {
  setValue(value: string): void;
  getValue(): string;
  focus(): void;
  setEditable(editable: boolean): void;
  destroy(): void;
}

export function createMarkdownEditor(
  parent: HTMLElement,
  options: MarkdownEditorOptions = {},
): MarkdownEditorController {
  const editableCompartment = new Compartment();
  let isApplyingExternalChange = false;

  const view = new EditorView({
    state: EditorState.create({
      doc: options.initialValue ?? '',
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        editableCompartment.of(EditorView.editable.of(true)),
        EditorView.updateListener.of((update) => {
          if (isApplyingExternalChange || !update.docChanged) {
            return;
          }

          options.onChange?.(update.state.doc.toString());
        }),
      ],
    }),
    parent,
  });

  return {
    setValue(value: string) {
      if (view.state.doc.toString() === value) {
        return;
      }

      isApplyingExternalChange = true;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
      isApplyingExternalChange = false;
    },
    getValue() {
      return view.state.doc.toString();
    },
    focus() {
      view.focus();
    },
    setEditable(editable: boolean) {
      view.dispatch({
        effects: editableCompartment.reconfigure(EditorView.editable.of(editable)),
      });
    },
    destroy() {
      view.destroy();
    },
  };
}