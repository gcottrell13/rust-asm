import * as monaco from 'monaco-editor';
import React from 'react';

import './DslMonaco';

export function processSize(size: string | number) {
	return !/^\d+$/.test(size + '') ? size : `${size}px`;
}

export interface MonacoEditorProps {
	/**
	 * Width of editor. Defaults to 100%.
	 */
	width?: string | number;

	/**
	 * Height of editor. Defaults to 500.
	 */
	height?: string | number;

	/**
	 * The initial value of the auto created model in the editor.
	 */
	defaultValue?: string;

	/**
	 * The initial language of the auto created model in the editor. Defaults to 'javascript'.
	 */
	language?: string;

	/**
	 * Theme to be used for rendering.
	 * The current out-of-the-box available themes are: 'vs' (default), 'vs-dark', 'hc-black'.
	 * You can create custom themes via `monaco.editor.defineTheme`.
	 */
	theme?: string | null;

	/**
	 * Optional, allow to config loader url and relative path of module, refer to require.config.
	 */
	requireConfig?: any;

	/**
	 * Optional, allow to pass a different context then the global window onto which the monaco instance will be loaded. 
	 * Useful if you want to load the editor in an iframe.
	 */
	context?: any;
	
	/**
	 * Value of the auto created model in the editor.
	 * If you specify value property, the component behaves in controlled mode. Otherwise, it behaves in uncontrolled mode.
	 */
	value?: string | null;

	/**
	 * Refer to Monaco interface {monaco.editor.IEditorConstructionOptions}.
	 */
	options?: monaco.editor.IEditorConstructionOptions;

	/**
	 * An event emitted when the editor has been mounted (similar to componentDidMount of React).
	 */
	editorDidMount?: (e: monaco.editor.IStandaloneCodeEditor) => void;

	/**
	 * An event emitted before the editor mounted (similar to componentWillMount of React).
	 */
	editorWillMount?: () => void;

	/**
	 * An event emitted when the content of the current model has changed.
	 */
	onChange?: (str: string) => void;
}

function noop() { }

export class MyMonacoEditor extends React.Component<MonacoEditorProps> {
	containerElement?: HTMLElement | null;
	_currentValue?: string | null;
	editor?: monaco.editor.IStandaloneCodeEditor;
	_preventTriggerChangeEvent: boolean = false;
	
	constructor(props: MonacoEditorProps) {
		super(props);
		this.containerElement = undefined;
		this._currentValue = props.value;
	}

	componentDidUpdate(prevProps: MonacoEditorProps) {
		if (this.props.value !== this._currentValue) {
			// Always refer to the latest value
			this._currentValue = this.props.value;
			// Consider the situation of rendering 1+ times before the editor mounted
			if (this.editor) {
				this._preventTriggerChangeEvent = true;
				this.editor.setValue(this._currentValue || '');
				this._preventTriggerChangeEvent = false;
			}
		}
		if (!this.editor) return;

		if (prevProps.language !== this.props.language) {
			monaco.editor.setModelLanguage(this.editor.getModel()!, this.props.language!);
		}
		if (prevProps.theme !== this.props.theme) {
			monaco.editor.setTheme(this.props.theme!);
		}
		if (
			this.editor &&
			(this.props.width !== prevProps.width || this.props.height !== prevProps.height)
		) {
			this.editor.layout();
		}
		if (prevProps.options !== this.props.options) {
			this.editor.updateOptions(this.props.options!);
		}
	}

	componentWillUnmount() {
		this.destroyMonaco();
	}

	editorWillMount() {
		const { editorWillMount } = this.props;
		const options = editorWillMount && editorWillMount();
		return options || {};
	}

	editorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
		if (this.props.editorDidMount)
			this.props.editorDidMount(editor);
		editor.onDidChangeModelContent((event) => {
			const value = editor.getValue();

			// Always refer to the latest value
			this._currentValue = value;

			// Only invoking when user input changed
			if (!this._preventTriggerChangeEvent && this.props.onChange) {
				this.props.onChange(value);
			}
		});
	}

	initMonaco() {
		const value = this.props.value !== null ? this.props.value : this.props.defaultValue;
		const { language, theme, options } = this.props;
		if (this.containerElement) {
			// Before initializing monaco editor
			Object.assign(options, this.editorWillMount());
			this.editor = monaco.editor.create(this.containerElement, {
				value,
				language,
				...options,
			});
			if (theme) {
				monaco.editor.setTheme(theme);
			}
			// After initializing monaco editor
			this.editorDidMount(this.editor);
		}
	}

	destroyMonaco() {
		if (typeof this.editor !== 'undefined') {
			this.editor.dispose();
		}
	}

	assignRef = (component: HTMLElement | null) => {
		this.containerElement = component;
		setTimeout(() => this.initMonaco(), 1);
	};

	render() {
		const { width, height } = this.props;
		const style = {
			width: String(width),
			height: String(height),
		};

		return <div ref={this.assignRef} style={style} className="react-monaco-editor-container" />;
	}
}