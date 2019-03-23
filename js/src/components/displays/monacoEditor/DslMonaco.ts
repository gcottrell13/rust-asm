import * as monaco from 'monaco-editor';
import _ from 'lodash';
import { DslaInstructionRegistration, instructionSignatures } from '../../../utils/language/dsla';
import { labelRegex } from '../../../utils/language/dslaHelpers';
import { isNullOrWhitespace, stringHasContent } from '../../../utils/stringUtils';

const instructionEntries = Object.entries(DslaInstructionRegistration);

const dslInstructionToken = 'dsl-instruction';

const instructionSnippets = _.mapValues(instructionSignatures, params => params.join(' '));

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
			[/^\.data$/, { token: 'region', switchTo: '@dataRegion' }],
			[/^\.text$/, { token: 'region', switchTo: '@textRegion' }],
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

			{ include: '@regionTokens' },
		],

		// defines the text region
		textRegion: [
			{ include: '@whitespace' },

			[labelRegex, 'label'],

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

			{ include: '@regionTokens' },
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
		{ token: 'region', foreground: '008800', fontStyle: 'italic bold' },
		{ token: dslInstructionToken, foreground: '808080', fontStyle: 'bold' },
		{ token: 'label', foreground: '000088', fontStyle: 'bold' },
		{ token: 'identifier', foreground: '000000' },
		{ token: 'invalid', foreground: 'ff0000', background: 'FF0000' },
	],
	colors: {},
	encodedTokensColors: [],
});

//#endregion

function getRegionSuggestion(line: string, ... strings: string[]): monaco.languages.CompletionItem[] {
	const startsWithDot = line.startsWith('.');
	return strings
		.map(x => ({
			label: '.' + x,
			kind: monaco.languages.CompletionItemKind.Keyword,
			insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
			insertText: (startsWithDot ? '' : '.') + x + '\n',
		}));
}

function getCurrentContext(model: monaco.editor.ITextModel, position: monaco.Position)
	: monaco.languages.ProviderResult<monaco.languages.CompletionList> {

	const lines = model.getLinesContent();
	const currentLine = model.getLineContent(position.lineNumber).trim();
	// 0	neither .data nor .text
	// 1.	.data
	// 1.1	defining string
	// 1.2	defining number
	// 1.3	defining array
	// 1.4	defining multi-line array
	// 1.5	unknown define
	// 2.	.text
	// 2.1

	if (currentLine.startsWith('//')) {
		return { suggestions: [] };
	}

	const varNames: string[] = [];

	let region: 'data' | 'text' | null = null;

	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();

		if (region === null) {
			if (line === '.data') {
				region = 'data';
			}
			if (line === '.text') {
				region = 'text';
			}
		}

		if (line.startsWith('var')) {
			const parts = line.split(' ').filter(stringHasContent);
			if (parts.length > 1)
				varNames.push(parts[1]);
		}
	}

	let suggestions: monaco.languages.CompletionItem[] = [];

	if (region === null) {
		suggestions = getRegionSuggestion(currentLine, 'data', 'text');
	}

	else if (region === 'data') {
		suggestions = getRegionSuggestion(currentLine, 'text');
		suggestions = suggestions.concat(
			{
				label: 'var',
				kind: monaco.languages.CompletionItemKind.Keyword,
				insertText: 'var',
			},
			{
				label: 'string',
				kind: monaco.languages.CompletionItemKind.Class,
				insertText: 'string',
			},
			{
				label: 'number',
				kind: monaco.languages.CompletionItemKind.Class,
				insertText: 'number',
			},
			{
				label: 'array',
				kind: monaco.languages.CompletionItemKind.Class,
				insertText: 'array',
			});
	}

	else if (region === 'text') {
		suggestions = getRegionSuggestion(currentLine, 'data');
		const currentInstructions = instructionEntries
			.filter(([key, comment]) => key.startsWith(currentLine));
		if (currentInstructions.length > 0) {
			suggestions = suggestions.concat(currentInstructions
				.map(([x, comment]) => {
					return {
						label: x,
						kind: monaco.languages.CompletionItemKind.Function,
						insertText: `${x} ${instructionSnippets[x]}`,
						documentation: comment,
					};
				}));
		}
		else {
			suggestions = suggestions.concat(varNames
				.map(name => ({
					label: name,
					kind: monaco.languages.CompletionItemKind.Field,
					insertText: name,
				})));
		}
	}


	return {
		suggestions,
	};
}

// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('dsla', {
	provideCompletionItems: (model, position) => {
		return getCurrentContext(model, position);
	},
});