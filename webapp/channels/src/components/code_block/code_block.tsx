import React, {useCallback, useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {usePluginVisibilityInSharedChannel} from 'components/common/hooks/usePluginVisibilityInSharedChannel';
import CopyButton from 'components/copy_button';
import * as SyntaxHighlighting from 'utils/syntax_highlighting';
import * as TextFormatting from 'utils/text_formatting';
import type {GlobalState} from 'types/store';
type Props = {
    code: string;
    language: string;
    searchedContent?: string;
    channelId?: string;
}
const CodeBlock: React.FC<Props> = ({code, language, searchedContent, channelId}: Props) => {
    const getUsedLanguage = useCallback(() => {
        let usedLanguage = language || '';
        usedLanguage = usedLanguage.toLowerCase();
        if (usedLanguage === 'texcode' || usedLanguage === 'latexcode') {
            usedLanguage = 'latex';
        }
        if (usedLanguage === 'html') {
            usedLanguage = 'xml';
        }
        return usedLanguage;
    }, [language]);
    const usedLanguage = getUsedLanguage();
    let className = 'post-code';
    if (!usedLanguage) {
        className += ' post-code--wrap';
    }
    let header: JSX.Element = <></>;
    let lineNumbers: JSX.Element = <></>;
    if (SyntaxHighlighting.canHighlight(usedLanguage)) {
        header = (
            <span className='post-code__language'>
                {SyntaxHighlighting.getLanguageName(usedLanguage)}
            </span>
        );
        lineNumbers = (
            <div className='post-code__line-numbers'>
                {SyntaxHighlighting.renderLineNumbers(code)}
            </div>
        );
    }
    const [content, setContent] = useState(TextFormatting.sanitizeHtml(code));
    useEffect(() => {
        let shouldSetContent = true;
        SyntaxHighlighting.highlight(usedLanguage, code).then((content) => {
            if (shouldSetContent) {
                setContent(content);
            }
        });
        return () => {
            shouldSetContent = false;
        };
    }, [usedLanguage, code]);
    let htmlContent = content;
    if (searchedContent) {
        htmlContent = searchedContent + content;
    }
    const codeBlockActions = useSelector((state: GlobalState) => state.plugins.components.CodeBlockAction);
    const pluginItemsVisible = usePluginVisibilityInSharedChannel(channelId);
    const pluginItems = pluginItemsVisible ? codeBlockActions?.
        map((item) => {
            if (!item.component) {
                return null;
            }
            const Component = item.component as any;
            return (
                <Component
                    key={item.id}
                    code={code}
                />
            );
        }) : [];
    return (
        <div className={className}>
            <div className='post-code__overlay'>
                <CopyButton content={code}/>
                {pluginItems}
                {header}
            </div>
            <div className='hljs'>
                {lineNumbers}
                <code dangerouslySetInnerHTML={{__html: htmlContent}}/>
            </div>
        </div>
    );
};
export default CodeBlock;