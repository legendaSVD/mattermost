import * as monaco from 'monaco-editor';
import {useEffect} from 'react';
const POLICY_LANGUAGE_NAME = 'expressionLanguage';
interface SchemaValue {
    [key: string]: string[] | boolean | SchemaValue;
}
interface SchemaMap {
    [schemaName: string]: string[] | SchemaValue | boolean;
}
interface MonacoLanguageProviderProps {
    schemas: SchemaMap;
}
export function MonacoLanguageProvider({schemas}: MonacoLanguageProviderProps) {
    useEffect(() => {
        if (
            !monaco.languages.
                getLanguages().
                some((lang) => lang.id === POLICY_LANGUAGE_NAME)
        ) {
            monaco.languages.register({id: POLICY_LANGUAGE_NAME});
            monaco.languages.setMonarchTokensProvider(POLICY_LANGUAGE_NAME, {
                tokenizer: {
                    root: [
                        [/\/\/.*$/, 'comment'],
                        [/[a-zA-Z][\w$]*(?=\.)/, 'variable'],
                        [/\./, 'delimiter'],
                        [/[a-zA-Z][\w$]*/, 'property'],
                        [/&&|\|\||==|!=/, 'operator'],
                        [/[ \t\r\n]+/, 'white'],
                        [/[()]/, '@brackets'],
                        [/"([^"\\]|\\.)*$/, 'string.invalid'],
                        [/"/, {token: 'string.quote', bracket: '@open', next: '@string'}],
                        [/'([^'\\]|\\.)*$/, 'string.invalid'],
                        [
                            /'/,
                            {token: 'string.quote', bracket: '@open', next: '@string2'},
                        ],
                        [/\d+/, 'number'],
                    ],
                    string: [
                        [/[^\\"]+/, 'string'],
                        [/"/, {token: 'string.quote', bracket: '@close', next: '@pop'}],
                    ],
                    string2: [
                        [/[^'\\]+/, 'string'],
                        [/'/, {token: 'string.quote', bracket: '@close', next: '@pop'}],
                    ],
                },
            });
        }
        const getPropertiesFromPath = (path: string): string[] => {
            const schemaItem = schemas[path];
            if (!schemaItem) {
                return [];
            }
            if (Array.isArray(schemaItem)) {
                return schemaItem;
            } else if (typeof schemaItem === 'object') {
                return Object.keys(schemaItem);
            }
            return [];
        };
        const getValuesForPath = (fullPath: string): string[] | null => {
            const directValue = schemas[fullPath];
            if (Array.isArray(directValue)) {
                return directValue;
            }
            const pathParts = fullPath.split('.');
            if (pathParts.length >= 2) {
                const property = pathParts.pop();
                if (!property) {
                    return null;
                }
                const parentPath = pathParts.join('.');
                const schemaItem = schemas[parentPath];
                if (!schemaItem || Array.isArray(schemaItem) || typeof schemaItem === 'boolean') {
                    return null;
                }
                const propValue = schemaItem[property];
                if (Array.isArray(propValue)) {
                    return propValue;
                } else if (propValue === true) {
                    return null;
                }
            }
            return null;
        };
        const disposable = monaco.languages.registerCompletionItemProvider(
            'expressionLanguage',
            {
                triggerCharacters: ['.', ' ', '"', "'", '='],
                provideCompletionItems: (model, position) => {
                    const lineNumber = position.lineNumber;
                    const column = position.column;
                    const lineContent = model.getLineContent(lineNumber);
                    const textBeforePosition = lineContent.substring(0, column - 1);
                    const valueOperatorPattern =
                        /(\w+(?:\.\w+)*)\s+(==|!=|>|<|>=|<=)\s+["']?(\w*)$/;
                    const valueMatch = textBeforePosition.match(valueOperatorPattern);
                    if (valueMatch) {
                        const [, fullPath, , currentValue] = valueMatch;
                        const allowedValues = getValuesForPath(fullPath);
                        if (allowedValues && allowedValues.length > 0) {
                            const wordStartColumn = column - currentValue.length;
                            return {
                                suggestions: allowedValues.
                                    filter((val) =>
                                        val.
                                            toString().
                                            toLowerCase().
                                            startsWith(currentValue.toLowerCase()),
                                    ).
                                    map((val) => ({
                                        label: val.toString(),
                                        kind: monaco.languages.CompletionItemKind.Value,
                                        insertText: `"${val}"`,
                                        range: {
                                            startLineNumber: lineNumber,
                                            startColumn: wordStartColumn,
                                            endLineNumber: lineNumber,
                                            endColumn: column,
                                        },
                                    })),
                            };
                        }
                    }
                    const operatorPattern = /(\w+(?:\.\w+)*)\s+$/;
                    const operatorMatch = textBeforePosition.match(operatorPattern);
                    if (operatorMatch) {
                        const operators = ['&&', '||', '==', '!=', 'in'];
                        return {
                            suggestions: operators.map((op) => ({
                                label: op,
                                kind: monaco.languages.CompletionItemKind.Operator,
                                insertText: op + ' ',
                                range: {
                                    startLineNumber: lineNumber,
                                    startColumn: column,
                                    endLineNumber: lineNumber,
                                    endColumn: column,
                                },
                            })),
                        };
                    }
                    const dotMatch = textBeforePosition.match(/(\w+)(?:\.(\w+))*\.$/);
                    if (dotMatch) {
                        const fullPath = dotMatch[0].slice(0, -1);
                        const properties = getPropertiesFromPath(fullPath);
                        if (properties.length > 0) {
                            return {
                                suggestions: properties.map((field) => ({
                                    label: field,
                                    kind: monaco.languages.CompletionItemKind.Field,
                                    insertText: field,
                                    range: {
                                        startLineNumber: lineNumber,
                                        startColumn: column,
                                        endLineNumber: lineNumber,
                                        endColumn: column,
                                    },
                                })),
                            };
                        }
                    }
                    const wordMatch = textBeforePosition.match(
                        /(?:^|\s+|[&|=!<>()]|\()(\w*)$/,
                    );
                    if (wordMatch) {
                        const word = wordMatch[1] || '';
                        const wordStartColumn = column - word.length;
                        const rootSchemas = Object.keys(schemas).filter(
                            (key) => !key.includes('.'),
                        );
                        const suggestions = rootSchemas.
                            filter((schema) =>
                                schema.toLowerCase().startsWith(word.toLowerCase()),
                            ).
                            map((schema) => ({
                                label: schema,
                                kind: monaco.languages.CompletionItemKind.Class,
                                insertText: schema,
                                range: {
                                    startLineNumber: lineNumber,
                                    startColumn: wordStartColumn,
                                    endLineNumber: lineNumber,
                                    endColumn: column,
                                },
                            }));
                        return {suggestions};
                    }
                    return {suggestions: []};
                },
            },
        );
        return () => {
            disposable.dispose();
        };
    }, [schemas]);
    return null;
}