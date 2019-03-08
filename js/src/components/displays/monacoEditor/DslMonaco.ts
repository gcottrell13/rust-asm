import * as monaco from 'monaco-editor';
import { DslaInstructionRegistration } from '../../../utils/language/dsla';

const instructionEntries = Object.entries(DslaInstructionRegistration);

const dslInstructionToken = 'dsl-instruction';

//#region Define language

// Register a new language
monaco.languages.register({ id: 'dsla' });

// Register a tokens provider for the language
monaco.languages.setMonarchTokensProvider('dsla', {
	defaultToken: 'invalid',

	brackets: [
		// { open: '{', close: '}', token: 'delimiter.curly' },
		{ open: '[', close: ']', token: 'delimiter.bracket' },
		// { open: '(', close: ')', token: 'delimiter.parenthesis' },
	],

	keywords: [
		'.data',
		'.text',
	],

	declare: ['declare'],
	varTypes: ['number', 'string', 'array'],

	escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

	instructions: instructionEntries.map(([key]) => key),

	tokenizer: {

		root: [
			// whitespace
			{ include: '@whitespace' },
			{ include: '@regionTokens' },

		],

		// defines the regions for the program
		regionTokens: [
			[/^\.data$/, 'keyword', '@dataRegion'],
			[/^\.text$/, 'keyword', '@textRegion'],
		],

		// defines the data region
		dataRegion: [
			{ include: '@whitespace' },

			[/^var/, 'keyword'],
			[/number|string|array/, 'type'],

			{ include: '@varNames' },
			{ include: '@numbers' },

			// strings
			[/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
			[/"/, 'string', '@string_double'],

			[/[:=]/, ''],
			['.text', { token: 'keyword', switchTo: '@textRegion' }],
		],

		// defines the text region
		textRegion: [
			{ include: '@whitespace' },

			// instructions
			[/^[a-zA-Z_$][a-zA-Z_$\d]*/, {
				cases: {
					'@instructions': dslInstructionToken,
					'@default': 'invalid',
				},
			}],

			[/[{}\[\]()]/, '@brackets'],

			{ include: '@varNames' },
			{ include: '@numbers' },

			['.data', { token: 'keyword', switchTo: '@dataRegion' }],
		],

		// sub-sections
		whitespace: [
			[/[ \t\v\f\r\n]+/, ''],
			[/\/\/.*$/, 'comment'],
		],

		varNames: [
			// identifiers
			[/[a-zA-Z_$][a-zA-Z_$\d]*/, 'identifier'],
		],

		numbers: [
			[/0[xX][0-9a-fA-F_]+/, 'number.hex'],
			[/0[bB][01_]+/, 'number.hex'], // binary: use same theme style as hex
			[/[0-9_]+/, 'number'],
		],

		string_double: [
			[/[^\\"]+/, 'string'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/"/, 'string', '@pop'],
		],

	},
} as any);

// Define a new theme that contains only rules that match this language
monaco.editor.defineTheme('dsla', {
	base: 'vs',
	inherit: true,
	rules: [
		// { token: 'custom-info', foreground: '808080', background: 'ff00ff' },
		// { token: 'custom-error', foreground: 'ff0000', fontStyle: 'bold' },
		// { token: 'custom-notice', foreground: 'FFA500' },
		// { token: 'custom-date', foreground: '008800' },
		{ token: dslInstructionToken, foreground: '808080' },
		{ token: 'identifier', foreground: 'FFA500' },
		{ token: 'invalid', foreground: '000000', background: 'FF0000' },
	],
	colors: {},
	encodedTokensColors: [],
});

//#endregion

function getCurrentContext(model: monaco.editor.ITextModel, position: monaco.Position)
	: monaco.languages.ProviderResult<monaco.languages.CompletionList> {

	const lines = model.getLinesContent();
	const currentLine = model.getLineContent(position.lineNumber);
	// 0	neither .data nor .text
	// 1.	.data
	// 1.1	defining string
	// 1.2	defining number
	// 1.3	defining array
	// 1.4	defining multi-line array
	// 1.5	unknown define
	// 2.	.text
	// 2.1

	if (currentLine.startsWith('#')) {
		return { suggestions: [] };
	}

	let region: 'data' | 'text' | null = null;

	for (let i = lines.length - 1; i >= 0; i++) {
		const line = lines[i].trim();

		if (line === '.data') {
			region = 'data';
			break;
		}
		if (line === '.text') {
			region = 'text';
			break;
		}
	}

	if (region === null) {
		return {
			suggestions: ['.data', '.text']
				.map(x => ({
					label: x,
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: x + '\n',
				})),
		};
	}

	if (region === 'data') {

	}

	return {
		suggestions: [],
	};
}

// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('dsla', {
	provideCompletionItems: (model, position) => {
		return getCurrentContext(model, position);
		//
		// const line = model.getLineContent(position.lineNumber);
		//
		//
		// if (line.startsWith('.')) {
		// 	// either .data or .text
		// 	return {
		// 		suggestions: ['.data', '.text']
		// 			.filter(x => x.startsWith(line))
		// 			.map(x => ({
		// 				label: x,
		// 				kind: monaco.languages.CompletionItemKind.Keyword,
		// 				insertText: x + '\n',
		// 			})),
		// 	};
		// }
		//
		// if (line.startsWith('#')) {
		// 	return { suggestions: [] };
		// }
		//
		// const suggestions = instructionEntries
		// 	.map(([key, comment]) => ({
		// 		label: key,
		// 		kind: monaco.languages.CompletionItemKind.Function,
		// 		insertText: key,
		// 		documentation: comment,
		// 	}));
		//
		//
		// // var suggestions = [{
		// // 	label: 'simpleText',
		// // 	kind: monaco.languages.CompletionItemKind.Text,
		// // 	insertText: 'simpleText',
		// // }, {
		// // 	label: 'testing',
		// // 	kind: monaco.languages.CompletionItemKind.Keyword,
		// // 	insertText: 'testing(${1:condition})',
		// // 	insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
		// // }, {
		// // 	label: 'ifelse',
		// // 	kind: monaco.languages.CompletionItemKind.Snippet,
		// // 	insertText: [
		// // 		'if (${1:condition}) {',
		// // 		'\t$0',
		// // 		'} else {',
		// // 		'\t',
		// // 		'}',
		// // 	].join('\n'),
		// // 	insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
		// // 	documentation: 'If-Else Statement',
		// // }];
		// return { suggestions };
	},
});