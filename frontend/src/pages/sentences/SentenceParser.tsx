import { useState } from 'react';
import { saveSelectedWords } from '../../services/sentenceService';
import styles from './SentenceParser.module.css';

const SentenceParser = () => {
    const [text, setText] = useState('');
    const [parsedMode, setParsedMode] = useState(false);
    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
    const [saveLoading, setSaveLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // 解析文本 - 实际上只是切换到解析模式，不调用API
    const handleParse = (e: React.FormEvent) => {
        e.preventDefault();

        if (!text.trim()) {
            return;
        }

        setParsedMode(true);
        setSelectedWords(new Set()); // 清空之前的选择
        setMessage(null);
    };

    // 处理单词点击
    const handleWordClick = (word: string) => {
        const newSelected = new Set(selectedWords);

        if (newSelected.has(word)) {
            newSelected.delete(word);
        } else {
            newSelected.add(word);
        }

        setSelectedWords(newSelected);
    };

    // 返回编辑模式
    const handleBackToEdit = () => {
        setParsedMode(false);
    };

    // 保存选中的单词
    const handleSaveWords = async () => {
        if (!text || selectedWords.size === 0) {
            return;
        }

        setSaveLoading(true);
        setMessage(null);

        try {
            const result = await saveSelectedWords({
                originalText: text,
                selectedWords: Array.from(selectedWords)
            });

            setMessage({
                text: result.message || '单词保存成功',
                type: 'success'
            });
        } catch (error: any) {
            console.error('保存单词失败:', error);
            setMessage({
                text: error.response?.data?.message || '保存失败，请重试',
                type: 'error'
            });
        } finally {
            setSaveLoading(false);
            setSelectedWords(new Set());
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>句子解析</h1>
            <p className={styles.description}>
                输入您想要学习的句子或段落，点击解析后可以选择想要添加到生词本的单词。
            </p>

            {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            {!parsedMode ? (
                // 编辑模式
                <form className={styles.form} onSubmit={handleParse}>
                    <textarea
                        className={styles.textarea}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="请输入需要解析的文本..."
                        rows={8}
                    />

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={!text.trim()}
                    >
                        解析
                    </button>
                </form>
            ) : (
                // 解析模式
                <div className={styles.result}>
                    <h2 className={styles.resultTitle}>请选择单词</h2>
                    <div className={styles.parsedText}>
                        {text.split(/\s+/).map((word, index) => {
                            // 清理单词，去除标点符号
                            const cleanWord = word.replace(/[^\w']|_/g, '').toLowerCase();

                            // 忽略空字符串
                            if (!cleanWord) return <span key={index}>{word} </span>;

                            return (
                                <span
                                    key={index}
                                    className={`${styles.word} ${selectedWords.has(cleanWord) ? styles.selected : ''}`}
                                    onClick={() => handleWordClick(cleanWord)}
                                >
                                    {word}{' '}
                                </span>
                            );
                        })}
                    </div>

                    <div className={styles.selectedWordsContainer}>
                        <h3 className={styles.selectedWordsTitle}>已选单词 ({selectedWords.size})</h3>
                        <div className={styles.selectedWordsList}>
                            {Array.from(selectedWords).map(word => (
                                <span key={word} className={styles.selectedWordChip}>
                                    {word}
                                    <button
                                        className={styles.removeWord}
                                        onClick={() => handleWordClick(word)}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        <button
                            className={styles.backButton}
                            onClick={handleBackToEdit}
                        >
                            返回编辑
                        </button>

                        <button
                            className={styles.saveButton}
                            onClick={handleSaveWords}
                            disabled={saveLoading || selectedWords.size === 0}
                        >
                            {saveLoading ? '保存中...' : '保存选中单词'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SentenceParser;